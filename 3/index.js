const fs = require('fs')

const MIN_WORD_LENGTH = 3
const VALID_WORDS_REGEXP = /[^abcdefghijklmnñopqrstuvwxyzáéíóúü ]/g
const INPUT_PATH = './submitInput.txt'

// Prepare book words
const allWords = fs.readFileSync('./pg17013.txt')
    .toString()
    .toLowerCase()
    .replace(VALID_WORDS_REGEXP, ' ')
    .replace(/  +/g, ' ')
    .split(' ')
    .filter(word => word.length >= MIN_WORD_LENGTH)
    .sort((a, b) => a > b ? 1 : -1) // Comparing strings in JS follows unicode order

// Rank words
const wordInstancesObj = {}
allWords.forEach(word => {
    if (!wordInstancesObj[word]) wordInstancesObj[word] = 1
    else wordInstancesObj[word]++
})
const instanceCountsObj = {}
allWords.forEach(word => {
    const count = wordInstancesObj[word]
    if (!instanceCountsObj[count]) instanceCountsObj[count] = []
    instanceCountsObj[count].push(word)
})
const rankedWords = []
const wordRanking = {}
Object.entries(instanceCountsObj)
    .sort((a, b) => parseInt(a[0]) > parseInt(b[0]) ? -1 : 1)
    .forEach(allWordsWithSameInstanceCount => {
        allWordsWithSameInstanceCount[1].forEach(word => {
            if (wordRanking[word]) return // already seen
            rankedWords.push(word)
            wordRanking[word] = rankedWords.length
        })
    })

// Functions for calculating output without messing with
// the internals of how the ranks are calculated
function getNumberOfInstancesOfWord(word) {
    return wordInstancesObj[word] || 0
}
function getWordRanking(word) {
    return wordRanking[word]
}
function getWordInRankingN(pos) {
    return rankedWords[pos - 1]
}

// Calculate output
const input = fs.readFileSync(INPUT_PATH)
    .toString()
    .split('\n')
    .map(line => isNaN(line) ? line : parseInt(line))
input.shift()
input.pop()

const outputLines = []
input.forEach((line, index) => {
    let result
    if (typeof line === 'number') {
        const wordInRanking = getWordInRankingN(line)
        const numberOfInstances = getNumberOfInstancesOfWord(wordInRanking)
        result = `${wordInRanking} ${numberOfInstances}`
    } else {
        const numberOfInstances = getNumberOfInstancesOfWord(line)
        const ranking = getWordRanking(line)
        result = `${numberOfInstances} #${ranking}`
    }
    outputLines.push(`Case #${index + 1}: ${result}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
