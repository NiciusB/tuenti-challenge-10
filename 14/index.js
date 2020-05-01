const net = require('net');
const fs = require('fs')

const FINISHED_INTRO_LINE = 'AUTOJOIN CLUSTER ENABLED'
const SELF_SERVER_ID = 9

/*
Intro tutorial:

PREPARE {<positive_int>,9} -> <dest>
ACCEPT {id: {<positive_int>,<positive_int>}, value: {servers: <server_list>, secret_owner: <positive_int>}} -> <dest>
*/

/*
Full round example:

ROUND 781: 7 -> ACCEPTED {servers: [1,2,3,4,5,6,8,9], secret_owner: 1}
ROUND 781: 4 -> ACCEPTED {servers: [1,2,3,4,5,6,8,9], secret_owner: 1}
ROUND 781: 5 -> ACCEPTED {servers: [1,2,3,4,5,6,8,9], secret_owner: 1}
ROUND 781: 6 -> ACCEPTED {servers: [1,2,3,4,5,6,8,9], secret_owner: 1}
ROUND 781: 8 -> ACCEPTED {servers: [1,2,3,4,5,6,8,9], secret_owner: 1}
ROUND 781: 9 -> LEARN {servers: [1,2,3,4,5,6,8,9], secret_owner: 1} (ROUND FINISHED)
*/

/*
All types format:

ROUND 781: 8 -> ACCEPTED {servers: [1,2,3,4,5,6,8,9], secret_owner: 1}

ROUND 746: 9 -> LEARN {servers: [1,2,3,5,7,8,9,10], secret_owner: 2} (ROUND FINISHED)

ROUND 374: PREPARE {2,9} -> 4
ROUND 658: 9 -> PREPARE {150,9}

ROUND 348: 1 -> PROMISE {2,9} no_proposal
ROUND 62: PROMISE {150,9} no_proposal -> 9

ROUND 837: 1 -> PROMISE_DENIAL {2,9} {2,9}

ROUND 332: ACCEPT {id: {150,9}, value: {servers: [1,2,3,4,5,6,7,9], secret_owner: 9}} -> 1

ROUND 540: 1 -> ACCEPT_IGNORE {id: {150,9}, value: {servers: [1,2,3,5,6,7,8,9], secret_owner: 9}} (NOT TRUSTWORTHY TO CHANGE SECRET OWNER)

ROUND 329: 27 -> ACCEPT_DENIAL {400,9} {401,26}
*/

// debug.txt
let debugTxt = ''
fs.writeFileSync('debug.txt', '')
setInterval(() => {
    fs.appendFileSync('debug.txt', debugTxt)
    debugTxt = ''
}, 1000)

async function main() {
    const { sendDataToServer } = await openServerConnection(onServerResponseLine)

    let isInIntro = true
    function onServerResponseLine(line) {
        debugTxt += line + '\n'

        if (isInIntro) {
            if (line === FINISHED_INTRO_LINE) isInIntro = false
            return
        }

        if (line.startsWith('ROUND ')) {
            try {
                const type = /ROUND \d+:(?: \d+ ->)? (\w+)/.exec(line)[1]
                let arrowNum
                if (line.includes('->')) {
                    const numFormat1 = /-> (\d+)/.exec(line)
                    const numFormat2 = /(\d+) ->/.exec(line)
                    arrowNum = parseInt((numFormat1 || numFormat2)[1])
                }

                if (type === 'ACCEPTED' || type === 'LEARN') {
                    const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                    const num = arrowNum
                    const servers = /{servers: \[(.*?)\]/.exec(line)[1].split(',').map(num => parseInt(num))
                    const secretOwner = parseInt(/secret_owner: (\d+)/.exec(line)[1])
                    const roundFinished = /\(ROUND FINISHED\)/.test(line)
                    const fn = type === 'ACCEPTED' ? onAccepted : onLearn
                    fn({ roundID, num, servers, secretOwner, roundFinished })
                    return
                }
                if (type === 'PREPARE') {
                    const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                    const num = arrowNum
                    const ids = /{(\d+),(\d+)}/.exec(line)
                    onPrepare({ roundID, num, id1: parseInt(ids[1]), id2: parseInt(ids[2]) })
                    return
                }
                if (type === 'PROMISE') {
                    const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                    const promisingServer = arrowNum
                    const ids = /{(\d+),(\d+)}/.exec(line)
                    onPromise({ roundID, promisingServer, n: parseInt(ids[1]), preparingServer: parseInt(ids[2]) })
                    return
                }
                if (type === 'PROMISE_DENIAL') {
                    const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                    const num = arrowNum
                    const ids = /{(\d+),(\d+)} {(\d+),(\d+)}/.exec(line)
                    onPromiseDenial({ roundID, num, id1: parseInt(ids[1]), id2: parseInt(ids[2]), id3: parseInt(ids[3]), id4: parseInt(ids[4]) })
                    return
                }
                if (type === 'ACCEPT') {
                    const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                    const ids = /{(\d+),(\d+)}/.exec(line)
                    const targetServer = arrowNum
                    const servers = /{servers: \[(.*?)\]/.exec(line)[1].split(',').map(num => parseInt(num))
                    const secretOwner = parseInt(/secret_owner: (\d+)/.exec(line)[1])
                    onAccept({ roundID, n: parseInt(ids[1]), preparingServer: parseInt(ids[2]), targetServer, servers, secretOwner })
                    return
                }
                if (type === 'ACCEPT_IGNORE') {
                    console.error('ACCEPT_IGNORE', line)
                    return
                }
                if (type === 'ACCEPT_DENIAL') {
                    console.error('ACCEPT_DENIAL', line)
                    return
                }
            } catch (error) {
                console.error(line, error)
                return
            }

            console.error(`Unnown line: ${line}`)
        } else if (line.startsWith('BAD COMMAND IGNORED:')) {
            if (
                line === 'BAD COMMAND IGNORED: Not enough promises' ||
                line === 'BAD COMMAND IGNORED: Cluster membership must be modified one by one' ||
                line.startsWith('BAD COMMAND IGNORED: Invalid Dest Id ')
            ) {
                // ignore these errors, since it's normal for them to happen sometimes.
                // even tho maybe not? i'd have do research
                return
            }

            console.error(line)
        } else {
            console.error(`Unrecognised line: ${line}`)
        }
    }

    // System status
    let serversList = new Set()
    let currentSecretOwner
    function updateServersList(servers, secretOwner) {
        serversList = new Set(servers)
        currentSecretOwner = secretOwner
    }

    // ACCEPTED
    function onAccepted({ roundID, num, servers, secretOwner, roundFinished }) {
        updateServersList(servers, secretOwner)

        //console.log('ACCEPTED', { roundID, num, servers, secretOwner, roundFinished })
    }

    // LEARN
    function onLearn({ roundID, num, servers, secretOwner, roundFinished }) {
        updateServersList(servers, secretOwner)

        //console.log('LEARN', { roundID, num, servers, secretOwner, roundFinished })
    }

    // ACCEPT
    function onAccept({ roundID, n, preparingServer, targetServer, servers, secretOwner }) {
        //console.log('ACCEPT', { roundID, n, preparingServer, targetServer, servers, secretOwner })
    }

    // PROMISE
    function setOnPromiseListener(callback) {
        const callbackID = onPromiseListeners.push(callback) - 1
        return () => onPromiseListeners.splice(callbackID, 1)
    }
    const onPromiseListeners = []
    function onPromise({ roundID, promisingServer, n, preparingServer }) {
        //console.log('PROMISE', { roundID, promisingServer, n, preparingServer })
        onPromiseListeners.forEach(cb => cb({ roundID, promisingServer, n, preparingServer }))
    }

    // PROMISE_DENIAL
    function onPromiseDenial({ roundID, num, id1, id2, id3, id4 }) {
        console.log('PROMISE_DENIAL', { roundID, num, id1, id2, id3, id4 })
    }

    // PREPARE
    function onPrepare({ roundID, num, id1, id2 }) {
        //console.log('PREPARE', { roundID, num, id1, id2 })
    }

    // Send line helpers
    function sendPrepare({ servers, min }) {
        const data = servers
            .map(serverID => `PREPARE {${min},${SELF_SERVER_ID}} -> ${serverID}\n`)
            .join('')
        sendDataToServer(data)
    }
    function sendAccept({ servers, n, preparingServer, secretOwner }) {
        const data = servers
            .map(serverID => `ACCEPT {id: {${n},${preparingServer}}, value: {servers: [${servers.join(',')}], secret_owner: ${secretOwner}}} -> ${serverID}\n`)
            .join('')
        sendDataToServer(data)
    }

    // Hack the system
    let number = 0
    function plotToBecomeOwner() {
        number += 10
        console.log('[plotToBecomeOwner]', serversList)
        startPromisePhase()

        function startPromisePhase() {
            const sentToServers = new Set(serversList)
            const promisedServers = new Set()
            sendPrepare({ min: number, servers: Array.from(sentToServers) })
            const removePromiseListener = setOnPromiseListener(({ roundID, promisingServer, n, preparingServer }) => {
                if (preparingServer !== SELF_SERVER_ID) return
                promisedServers.add(promisingServer)
                if (compareSet(promisedServers, sentToServers)) {
                    clearTimeout(preparsePhaseTimeout)
                    startAcceptPhase({ removePromiseListener, promisedServers })
                }
            })
            const preparsePhaseTimeout = setTimeout(startAcceptPhase, 400, { removePromiseListener, promisedServers })
        }
        function startAcceptPhase({ removePromiseListener, promisedServers }) {
            removePromiseListener()
            setTimeout(plotToBecomeOwner, 1000)
            if (!compareSet(promisedServers, serversList)) return

            const promisedServersArray = Array.from(promisedServers)
            let secretOwner = currentSecretOwner

            if (Math.random() < 0.1) {
                // Maybe i can get enough trust?
                secretOwner = SELF_SERVER_ID
            }

            sendAccept({
                n: number,
                preparingServer: SELF_SERVER_ID,
                secretOwner,
                servers: promisedServersArray,
            })
        }
    }
    setTimeout(plotToBecomeOwner, 1000)
}

function openServerConnection(callback) {
    return new Promise((resolve) => {
        var client = new net.Socket();
        client.connect(2092, '52.49.91.111', function () {
            console.debug('[openServerConnection] Connected');
            const sendDataToServer = (string) => {
                client.write(string)
            }
            resolve({ sendDataToServer })
        });
        let str = ''
        client.on('data', data => {
            str += data.toString()
            while (str.includes('\n')) {
                const split = str.split('\n')
                str = split.pop()
                split.forEach(line => callback(line))
            }
        });
        client.on('close', function () {
            console.debug('[openServerConnection] Connection closed');
        });
        client.on('error', function (err) {
            console.debug('[openServerConnection] Connection error', err);
        });
    })
}

main().catch(console.error)

function compareSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (var a of as) if (!bs.has(a)) return false;
    return true;
}