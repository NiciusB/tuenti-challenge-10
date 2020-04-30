const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./submitInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

const __DEV__ = process.env.NODE_ENV === 'development'

function restrictedPartition(finalSumNumber, validNumbers) {
    if (validNumbers.length === 0) return 0

    validNumbers = validNumbers.sort((a, b) => a - b) // Sort ASC

    function recursiveCheck(numbersList, initialSum = 0, history = '') {
        let count = 0
        while (numbersList.length) {
            const checkingNumber = parseInt(numbersList[0])
            const sum = initialSum + checkingNumber
            const numHistory = __DEV__ && `${history}${history ? '+' : ''}${checkingNumber}`

            if (__DEV__) console.debug('Iteration', initialSum, numHistory, sum, numbersList)

            if (sum > finalSumNumber) return count

            if (sum === finalSumNumber) {
                if (__DEV__) console.debug('Got result:', numHistory)
                return count + 1
            }
    
            const newValidNumbers = numbersList.slice(0)
            const gain = recursiveCheck(newValidNumbers, sum, numHistory)
            
            count += gain

            numbersList.shift()
        }
        return count
    }

    return recursiveCheck(validNumbers)
}

// Calculate output
const outputLines = []
testLines.forEach((line, index) => {
    let [valueToObtain, ...blacklistNumbers] = line.split(' ')
    valueToObtain = parseInt(valueToObtain)
    blacklistNumbers = blacklistNumbers.map(num => parseInt(num))
    blacklistNumbers.push(valueToObtain)

    const validOperands = new Array(valueToObtain)
        .fill(null)
        .map((_, index) => index + 1)
        .filter(num => !blacklistNumbers.includes(num))
    const result = restrictedPartition(valueToObtain, validOperands)

    const caseID = index + 1
    console.log(`${valueToObtain}: ${result}`)
    outputLines.push(`Case #${caseID}: ${result}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
