const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./submitInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

// Calculate output
const outputLines = []
let matchID = 0
testLines.forEach((caseLine, index) => {
    if (caseLine.includes(' ')) return // Ignore matches in the main loop

    matchID++
    const matchesCount = parseInt(caseLine)
    const possibleWinners = new Set()
    const matches = []
    let playersCount = 1

    const caseLines = testLines.slice(index + 1, index + matchesCount + 1)
    caseLines.forEach(caseLine => {
        // Parse match
        const [player1, player2, matchResult] = caseLine.split(' ')
        const winner = parseInt(matchResult === '1' ? player1 : player2)
        const loser = parseInt(matchResult === '0' ? player1 : player2)

        possibleWinners.add(winner)
        if (loser > playersCount) playersCount = loser
        if (winner > playersCount) playersCount = winner
        matches.push({ winner, loser })
    })

    // Calculate winner
    const allPlayerWins = {}
    matches.forEach(match => {
        const wins = allPlayerWins[match.winner] || []
        const winnerWins = new Set(wins)
        winnerWins.add(match.loser)
        allPlayerWins[match.winner] = winnerWins

        recursiveDeleteFromPossibleWinners(match.loser)
    })


    function recursiveDeleteFromPossibleWinners(userID) {
        possibleWinners.delete(userID)
        const wins = allPlayerWins[userID] || []
        wins.forEach(recursiveDeleteFromPossibleWinners)
    }

    // Sanity check
    if (possibleWinners.size > 1) {
        throw new Error(`More than 1 winner: ${possibleWinners.size}`)
    }

    const winnerID = Array.from(possibleWinners)[0]
    outputLines.push(`Case #${matchID}: ${winnerID}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
