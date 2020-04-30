const net = require('net');

const FINISHED_INTRO_LINE = 'AUTOJOIN CLUSTER ENABLED'

/*
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
ROUND 348: 1 -> PROMISE {2,9} no_proposal
ROUND 837: 1 -> PROMISE_DENIAL {2,9} {2,9}
*/

async function main() {
    const { sendLineToServer } = await openServerConnection(onServerResponse)

    let isInIntro = true
    function onServerResponse(serverData) {
        serverData.split('\n').filter(Boolean).forEach(str => onServerResponseLine(str))
    }
    function onServerResponseLine(line) {
        if (isInIntro) {
            if (line === FINISHED_INTRO_LINE) isInIntro = false
            return
        }

        if (line.startsWith('ROUND ')) {
            const type = /ROUND \d+:(?: \d+ ->)? (\w+)/.exec(line)[1]

            if (type === 'ACCEPTED' || type === 'LEARN') {
                const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                const num = parseInt(/(\d+)\ ->/.exec(line)[1])
                const servers = /{servers: \[(.*?)\], secret/.exec(line)[1].split(',').map(num => parseInt(num))
                const secretOwner = parseInt(/, secret_owner: (\d+)/.exec(line)[1])
                const roundFinished = /\(ROUND FINISHED\)/.test(line)
                const fn = type === 'ACCEPTED' ? onAccepted : onLearn
                fn({ roundID, num, servers, secretOwner, roundFinished })
                return
            }
            if (type === 'PREPARE') {
                const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                const num = parseInt(/-> (\d+)/.exec(line)[1])
                const ids = /{(\d+),(\d+)}/.exec(line)
                onPrepare({ roundID, num, id1: parseInt(ids[1]), id2: parseInt(ids[2]) }) 
                return
            }
            if (type === 'PROMISE') {
                const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                const num = parseInt(/(\d+)\ ->/.exec(line)[1])
                const ids = /{(\d+),(\d+)}/.exec(line)
                onPromise({ roundID, num, id1: parseInt(ids[1]), id2: parseInt(ids[2]) }) 
                return
            }
            if (type === 'PROMISE_DENIAL') {
                const roundID = parseInt(/(\d+)\:/.exec(line)[1])
                const num = parseInt(/(\d+)\ ->/.exec(line)[1])
                const ids = /{(\d+),(\d+)} {(\d+),(\d+)}/.exec(line)
                onPromiseDenial({ roundID, num, id1: parseInt(ids[1]), id2: parseInt(ids[2]), id3: parseInt(ids[3]), id4: parseInt(ids[4]) }) 
                return
            }

            throw new Error(`Unnown type ${type}: ${line}`)
        } else if (line.startsWith('BAD COMMAND IGNORED:')) {
            throw new Error(line)
        } else {
            throw new Error(`Unrecognised line: ${line}`)
        }
    }

    function onAccepted({ roundID, num, servers, secretOwner, roundFinished }) {
        console.log('ACCEPTED', { roundID, num, servers, secretOwner, roundFinished })
    }
    function onLearn({ roundID, num, servers, secretOwner, roundFinished }) {
        console.log('LEARN', { roundID, num, servers, secretOwner, roundFinished })
    }
    function onPromise({ roundID, num, id1, id2 }) {
        console.log('PROMISE', { roundID, num, id1, id2 })
    }
    function onPromiseDenial({ roundID, num, id1, id2, id3, id4 }) {
        console.log('PROMISE_DENIAL', { roundID, num, id1, id2, id3, id4 })
    }
    function onPrepare({ roundID, num, id1, id2 }) {
        console.log('PREPARE', { roundID, num, id1, id2 })
    }

    function sendPrepare(min, dest) {
        sendLineToServer(`PREPARE {${min},9} -> ${dest}`)
    }
    function sendAccept(id1, id2, servers, secretOwner, dest) {
        sendLineToServer(`ACCEPT {id: {${id1},${id2}}, value: {servers: [${servers.join(',')}], secret_owner: ${secretOwner}}} -> ${dest}`)
    }
}

function openServerConnection(callback) {
    return new Promise((resolve) => {
        var client = new net.Socket();
        client.connect(2092, '52.49.91.111', function () {
            console.debug('[openServerConnection] Connected');
            const sendLineToServer = (string) => {
                client.write(string + '\n')
            }
            resolve({ sendLineToServer })
        });
        client.on('data', data => {
            callback(data.toString())
        });
        client.on('close', function () {
            console.debug('[openServerConnection] Connection closed');
        });
    })
}

main().catch(console.error)
