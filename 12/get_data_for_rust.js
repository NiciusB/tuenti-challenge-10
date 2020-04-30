// https://crypto.stackexchange.com/questions/1693/is-it-possible-to-figure-out-the-public-key-from-encrypted-text

const fs = require('fs')

// Prepare test
const ciphered1 = fs.readFileSync('./ciphered/test1.txt')
const ciphered2 = fs.readFileSync('./ciphered/test2.txt')
const plaintext1 = fs.readFileSync('./plaintexts/test1.txt')
const plaintext2 = fs.readFileSync('./plaintexts/test2.txt')

const exponent = 65537n
const ciphered1Num = BigInt('0x' + ciphered1.toString('hex'))
const ciphered2Num = BigInt('0x' + ciphered2.toString('hex'))
const plainText1Num = BigInt('0x' + plaintext1.toString('hex'))
const plainText2Num = BigInt('0x' + plaintext2.toString('hex'))

console.log(plainText1Num)
console.log(ciphered1Num)
console.log(plainText2Num)
console.log(ciphered2Num)
