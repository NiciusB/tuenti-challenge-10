const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./submitInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

// Calculate output
const outputLines = []
testLines.forEach((line, index) => {
    const [action1, action2] = line.split(' ')
    const result = 'X'
    outputLines.push(`Case #${index + 1}: ${result}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
