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
const WALKABLE_SQUARES = [
    MAP_CHARS.validSquare,
    MAP_CHARS.princess,
]
const MAP_SIZE = { width: 220, height: 220 }
const INITIAL_KNIGHT_LOCATION = { y: MAP_SIZE.height / 2, x: MAP_SIZE.width / 2 }

async function main() {
    const { sendInputToServer } = await openServerConnection(onServerResponse)

    const absoluteKnightLocation = INITIAL_KNIGHT_LOCATION
    const alreadyVisitedLocations = {}
    let pathToFollow = null
    let map = new Map(Map.generateEmptyMapArray())

    setInterval(() => {
        const mapString = map.mapArray.map(row => row.join('')).join('\n')
        fs.writeFile('./mapString.txt', mapString, () => {})
    }, 1000)

    function sendMove(move) {
        // console.debug('Sending move:', move.command);
        absoluteKnightLocation.y = move.finalY
        absoluteKnightLocation.x = move.finalX
        sendInputToServer(move.command)
    }

    function onServerResponse(serverData) {
        alreadyVisitedLocations[`${absoluteKnightLocation.y},${absoluteKnightLocation.x}`] = true

        // Parse serverData to map array, and msg if any
        let relativeMapArray = serverData.split('\n').filter(line => line.length)
        let msg = undefined
        if (relativeMapArray.slice(-1).toString().startsWith('---')) msg = relativeMapArray.pop()
        relativeMapArray = relativeMapArray.map(row => row.split(''))
        map.updateMapWithRelativeMap(relativeMapArray, absoluteKnightLocation)

        // Debug info
        if (msg) console.debug('New message!: ', msg)
        // console.debug('absolute location:', absoluteKnightLocation)
        console.debug('visited squares count:', Object.values(alreadyVisitedLocations).length)

        if (!pathToFollow) {
            // Get path for princess
            const pathForPrincess = map.pathfinder(move => move.thingThere === MAP_CHARS.princess)
            if (pathForPrincess) {
                // We found a path to the princess
                console.debug('We found a path to the princess:', pathForPrincess)
                pathToFollow = pathForPrincess
            }
        }
        if (!pathToFollow) {
            // Get path for non-visited square
            const pathForNotVisitedSquare = map.pathfinder(move => {
                return !alreadyVisitedLocations[`${move.finalY},${move.finalX}`]
            })
            if (pathForNotVisitedSquare) {
                pathToFollow = pathForNotVisitedSquare
            }
        }

        // Follow path
        if (pathToFollow) {
            sendMove(pathToFollow.shift())
            if (pathToFollow.length === 0) {
                pathToFollow = null
            }
            return
        }

        // Random move to already visited palce
        const validMoves = map.calculateValidMoves()
        if (validMoves.length) {
            console.debug('Unable to find unvisited squares. Moving to a random one')
            const move = validMoves[Math.floor(Math.random() * validMoves.length)]
            sendMove(move)
            return
        }

        // No valid moves. Shouldn't ever fire
        throw new Error('No valid moves found!')
    }
}

class Map {
    constructor(mapArray) {
        this.mapArray = mapArray
    }

    static generateEmptyMapArray() {
        const mapArray = []
        for (let col = 0; col <= MAP_SIZE.height; col++) {
            mapArray[col] = []
            for (let row = 0; row <= MAP_SIZE.width; row++) {
                mapArray[col][row] = MAP_CHARS.unknown
            }
        }
        return mapArray
    }

    updateMapWithRelativeMap(relativeMapArray, position) {
        relativeMapArray.forEach((row, rowIndex) => {
            row.forEach((thing, colIndex) => {
                const x = position.x + colIndex - 2
                const y = position.y + rowIndex - 2
                this.setSquareContent(x, y, thing)
            })
        })
    }

    // Replaces knight with invalidSquare so that we don't go back to same thing
    // Pretty bad code, pretty fast to implement
    getNewMapWithSimulatedKnightMove(xDiff, yDiff) {
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
                finalY: knightPosition.y + yDiff,
                finalX: knightPosition.x + xDiff,
                yDiff,
                xDiff,
                thingThere,
            }
        }).filter(({ thingThere }) => {
            return WALKABLE_SQUARES.includes(thingThere)
        }).map(({ finalY, finalX, yDiff, xDiff, thingThere }) => {
            const yAxis = yDiff > 0 ? `${yDiff}D` : `${-yDiff}U`
            const xAxis = xDiff > 0 ? `${xDiff}R` : `${-xDiff}L`
            return {
                finalY,
                finalX,
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
            return { y: rowIndex, x: colIndex }
        }).find(Boolean)
    }

    getSquareContent(x, y) {
        if (!this.mapArray[y] || !this.mapArray[y][x]) return MAP_CHARS.invalidSquare
        return this.mapArray[y][x]
    }

    setSquareContent(x, y, thing) {
        if (!this.mapArray[y] || !this.mapArray[y][x]) return
        this.mapArray[y][x] = thing
    }

    pathfinder(moveCheckCallback, previousMoves = [], alreadyTriedSquares = {}) {
        // Limit depth
        if (previousMoves.length >= 500) return null

        // Find ramification options
        const possiblePaths = this.calculateValidMoves()
            .filter(move => {
                return !alreadyTriedSquares[`${move.finalY},${move.finalX}`]
            })
            .map(move => {
                alreadyTriedSquares[`${move.finalY},${move.finalX}`] = true
    
                // Find accepted moves
                if (moveCheckCallback(move)) {
                    return [...previousMoves, move]
                }

                // Go deeper
                const newMap = this.getNewMapWithSimulatedKnightMove(move.xDiff, move.yDiff)
                return newMap.pathfinder(moveCheckCallback, [...previousMoves, move], alreadyTriedSquares)
            })
            .filter(Boolean)
            .sort((a, b) => a.length > b.length ? 1 : -1)
        if (possiblePaths.length) return possiblePaths[0]

        // Nothing found
        return null
    }
}

function openServerConnection(callback) {
    return new Promise((resolve) => {
        var client = new net.Socket();
        client.connect(2003, '52.49.91.111', function () {
            console.debug('[requestCastleFromServer] Connected');
            const sendInputToServer = (...params) => {
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
