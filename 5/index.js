const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./submitInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

const tuentisticNumbers = [
    20n, 21n, 22n, 23n, 24n, 25n, 26n, 27n, 28n, 29n
]

// Math.max doesn't work for BigInt
function bigIntMax(...numbers) {
    let max = numbers[0]
    numbers.forEach(number => {
        if (number > max) max = number
    })
    return max
}
function getMaxElmsInTuentisticSum(number) {
    if (number <= 19n || (number >= 30n && number <= 39n) || number === 59n) {
        // Known impossible numbers
        return 0n
    }
    if (tuentisticNumbers.includes(number)) {
        // Already a tuentistic number
        return 1n
    }

    let extraFromOptimization = 0n
    while (number >= 80n) {
        const numberDigits = number.toString(10).length
        const multiplier = BigInt(Math.pow(10, Math.max(0, numberDigits - 3)))
        number -= 20n * multiplier
        extraFromOptimization += 1n * multiplier
    }

    const maxOfChildren = bigIntMax(...tuentisticNumbers.map(tuentiNum => getMaxElmsInTuentisticSum(number - tuentiNum)))
    return maxOfChildren + 1n + extraFromOptimization
}

// Calculate output
const outputLines = []
testLines.forEach((line, index) => {
    const result = getMaxElmsInTuentisticSum(BigInt(line)) || 'IMPOSSIBLE'
    console.log(`Case #${index + 1}: ${result} (${line})`)
    outputLines.push(`Case #${index + 1}: ${result}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
