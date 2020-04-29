const fs = require('fs')
const net = require('net');

const MAP_CHARS = {
    knight: 'K',
    princess: 'P',
    invalidSquare: '#',
    validSquare: '.',
    unknown: '?',
}
const KNIGHT_MOVE_OFFSETS = [
    [-2, 1],
    [-1, 2],
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
]

async function main() {
    const { sendInputToServer } = await openServerConnection(onServerResponse)

    const absoluteLocation = { y: 0, x: 0 }
    const alreadyVisitedLocations = {}
    function sendMove(move) {
        absoluteLocation.x += move.xDiff
        absoluteLocation.y += move.yDiff
        alreadyVisitedLocations[`${absoluteLocation.x}${absoluteLocation.y}`] = true
        sendInputToServer(move.command)
    }

    function onServerResponse(serverData) {
        // Parse serverData to map array, and msg if any
        let mapArray = serverData.split('\n').filter(line => line.length)
        let msg = undefined
        if (mapArray.slice(-1).toString().startsWith('---')) msg = mapArray.pop()
        mapArray = mapArray.map(row => row.split(''))
        const map = new Map(mapArray)

        // Debug info
        if (msg) console.debug('New message!: ', msg)
        console.debug('absoluteLocation', absoluteLocation)
        console.debug(map.mapArray)

        const finalMoves = traverseAllMoveOptionsToFindPrincessMove(map)
        if (finalMoves) {
            // We found a path to the princess
            console.debug('We found a path to the princess:', finalMoves)
            sendMove(finalMoves[0])
            return
        }

        const validMoves = map.calculateValidMoves()

        // Random move to nonvisited place
        const nonVisitedMoves = validMoves.filter(move => {
            const moveLocation = {
                x: absoluteLocation.x + move.xDiff,
                y: absoluteLocation.y + move.yDiff,
            }
            return !alreadyVisitedLocations[`${moveLocation.x}${moveLocation.y}`]
        })
        if (nonVisitedMoves.length) {
            const move = nonVisitedMoves[Math.floor(Math.random() * nonVisitedMoves.length)]
            sendMove(move)
            return
        }

        // Random move to already visited palce
        if (validMoves.length) {
            const move = validMoves[Math.floor(Math.random() * validMoves.length)]
            sendMove(move)
            return
        }

        // No valid moves. Shouldn't ever fire
        throw new Error('No valid moves found!')
    }

    const result = ''
    fs.writeFileSync('./result.txt', result)
}

function traverseAllMoveOptionsToFindPrincessMove(map, previousMoves = []) {
    // Found princess
    if (previousMoves.slice(-1).thingThere === MAP_CHARS.princess) {
        return previousMoves
    }

    // Find ramification options
    const validMoves = map.calculateValidMoves()
    const possiblePaths = validMoves.map(move => {
        const newMap = map.getNewMapWithSimulatedMove(move.xDiff, move.yDiff)
        return traverseAllMoveOptionsToFindPrincessMove(newMap, [...previousMoves, move])
    })
    return possiblePaths.find(Boolean) || null
}

class Map {
    constructor(mapArray) {
        this.mapArray = mapArray
    }

    // Replaces knight with invalidSquare so that we don't go back to same thing
    // Pretty bad code, pretty fast to implement
    getNewMapWithSimulatedMove(xDiff, yDiff) {
        const newMapArray = JSON.parse(JSON.stringify(this.mapArray))
        const newMap = new Map(newMapArray)
        const knightPosition = newMap.getThingSquarePosition(MAP_CHARS.knight)
        newMap.setSquareContent(knightPosition.x, knightPosition.y, MAP_CHARS.invalidSquare)
        newMap.setSquareContent(knightPosition.x + xDiff, knightPosition.y + yDiff, MAP_CHARS.knight)
        return newMap
    }

    calculateValidMoves() {
        const knightPosition = this.getThingSquarePosition(MAP_CHARS.knight)

        return KNIGHT_MOVE_OFFSETS.map(([yDiff, xDiff]) => {
            const thingThere = this.getSquareContent(knightPosition.x + xDiff, knightPosition.y + yDiff)
            return {
                yDiff,
                xDiff,
                thingThere,
            }
        }).filter(({ thingThere }) => {
            return thingThere === MAP_CHARS.validSquare || thingThere === MAP_CHARS.princess
        }).map(({ yDiff, xDiff, thingThere }) => {
            const yAxis = yDiff > 0 ? `${yDiff}D` : `${-yDiff}U`
            const xAxis = xDiff > 0 ? `${xDiff}R` : `${-xDiff}L`
            return {
                yDiff,
                xDiff,
                thingThere,
                command: `${yAxis}${xAxis}`,
            }
        })
    }

    getThingSquarePosition(thing) {
        return this.mapArray.map((row, rowIndex) => {
            const colIndex = row.findIndex(tile => tile === thing)
            if (colIndex === -1) return false
            return { x: colIndex, y: rowIndex }
        }).find(Boolean)
    }

    getSquareContent(x, y) {
        if (!this.mapArray[y] || !this.mapArray[y][x]) return MAP_CHARS.unknown
        return this.mapArray[y][x]
    }

    setSquareContent(x, y, thing) {
        if (!this.mapArray[y] || !this.mapArray[y][x]) return
        this.mapArray[y][x] = thing
    }
}

function openServerConnection(callback) {
    return new Promise((resolve) => {
        var client = new net.Socket();
        client.connect(2003, '52.49.91.111', function () {
            console.debug('[requestCastleFromServer] Connected');
            const sendInputToServer = (...params) => {
                console.debug('[requestCastleFromServer] Sending input: ' + params);
                client.write(...params)
            }
            resolve({ sendInputToServer })
        });
        client.on('data', data => {
            callback(data.toString())
        });
        client.on('close', function () {
            console.debug('[requestCastleFromServer] Connection closed');
        });
    })
}

main().catch(console.error)
