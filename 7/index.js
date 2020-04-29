// Used shazam to find out song name
// Used google to correlate with dvorak
// Used https://awsm-tools.com/text/keyboard-layout to get conversion easily

const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./submitInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

function dvorakToQwerty(word) {
    // All ASCII chars
    const qwerty = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`
    const dvorak = ` !Q#$%&q()*}w'e[0123456789:zW]E{@ANIHDYUJGCVPMLSRXO:KF><BT?-\=^_\`anihdyujgcvpmlsrxo;kf.,bt/_|+~`

    if (qwerty.indexOf(word) === -1) return '?'
    return dvorak[qwerty.indexOf(word)]
}

// Calculate output
const outputLines = []
testLines.forEach((line, index) => {
    const result = line.split('').map(dvorakToQwerty).join('')
    outputLines.push(`Case #${index + 1}: ${result}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
