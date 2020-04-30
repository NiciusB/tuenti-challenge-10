// https://crypto.stackexchange.com/questions/1693/is-it-possible-to-figure-out-the-public-key-from-encrypted-text

const fs = require('fs')
const bigintCryptoUtils = require('bigint-crypto-utils')

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

const byteValue = bigintCryptoUtils.gcd(plainText1Num ** exponent - ciphered1Num, plainText2Num ** exponent - ciphered2Num)

const output = BigInt('0x' + byteValue.toString('hex'))
console.log(output)
fs.writeFileSync('./result.txt', output)
