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
    MAP_CHARS.knight,
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
        fs.writeFile('./mapString.txt', mapString, () => { })
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
        //console.debug(relativeMapArray)
        if (msg) console.debug('New message!: ', msg)
        //console.debug('absolute location:', absoluteKnightLocation)
        console.debug('visited squares count:', Object.values(alreadyVisitedLocations).length)

        const knightPosition = map.getThingSquarePosition(MAP_CHARS.knight)

        if (!pathToFollow) {
            // Get path for princess
            const pathForPrincess = map.pathfinder(knightPosition, move => move.thingThere === MAP_CHARS.princess)
            if (pathForPrincess) {
                // We found a path to the princess
                console.debug('We found a path to the princess:', pathForPrincess)
                pathToFollow = pathForPrincess
            }
        }
        if (!pathToFollow) {
            // Get path for non-visited square
            const pathForNotVisitedSquare = map.pathfinder(knightPosition, move => {
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
        const validMoves = map.calculateValidMoves(knightPosition)
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

    calculateValidMoves(position) {
        return KNIGHT_MOVE_OFFSETS.map(([yDiff, xDiff]) => {
            const thingThere = this.getSquareContent(position.x + xDiff, position.y + yDiff)
            return {
                finalY: position.y + yDiff,
                finalX: position.x + xDiff,
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

    pathfinder(knightPosition, moveCheckCallback) {
        const visited = {}
        const heap = [{ position: knightPosition, parent: null }]

        while (heap.length) {
            const { position, parent } = heap.shift()
            if (visited[`${position.y},${position.x}`]) continue
            visited[`${position.y},${position.x}`] = true

            const validMoves = this.calculateValidMoves(position)
            for (const move of validMoves) {
                if (moveCheckCallback(move)) {
                    const result = [move]
                    let nextParent = parent
                    while (nextParent) {
                        result.unshift(nextParent.move)
                        nextParent = nextParent.parent
                    }
                    return result
                }
                heap.push({
                    move,
                    position: { y: move.finalY, x: move.finalX },
                    parent: { move, parent }
                })
            }
        }

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
