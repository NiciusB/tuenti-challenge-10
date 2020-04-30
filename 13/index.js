const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./submitInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

const MAX_INPUT_PACKS = 4611686018427387904n
const REFERENCE_DETAIL = 20n // 20n sounds good for large inputs

function getFortressPacks({ length, width, height }) {
    let packs = width * length * height

    do {
        height -= 2n
        width += 2n
        length += 2n
        packs += (width * 2n + length * 2n - 4n) * height
        height++
        width += 2n
        length += 2n
        packs += (width * 2n + length * 2n - 4n) * height
    } while (height > 2)

    return packs
}

function getUnitFortressPacks(height) {
    return getFortressPacks({ length: 1n, width: 1n, height })
}

function binarySearch({ lowPosition, highPosition, objectiveValue, getValueFromPos }) {
    let lastMiddlePosition
    while (1) {
        const middlePosition = (highPosition + lowPosition) / 2n
        const middleValue = getValueFromPos(middlePosition)

        if (lastMiddlePosition === middlePosition) {
            const lowValue = getValueFromPos(lowPosition)
            const highValue = getValueFromPos(highPosition)
            // Never go higher than objectiveValue. not really binary search but oh well
            if (objectiveValue === highValue) return highPosition
            if (objectiveValue === lowValue) return lowPosition
            if (middleValue > objectiveValue) return lowPosition
            return middlePosition
        }
        lastMiddlePosition = middlePosition

        if (middleValue < objectiveValue) {
            lowPosition = middlePosition
        } else {
            highPosition = middlePosition + 1n
        }
    }
}

function calculateMaxDimensionsForPacks(maxPacks) {
    const index = unitFortressReference.findIndex(ref => ref.packs > maxPacks)
    if (index === 0) return null

    const height = binarySearch({
        lowPosition: unitFortressReference[index - 1].height,
        highPosition: unitFortressReference[index].height,
        objectiveValue: maxPacks,
        getValueFromPos: getUnitFortressPacks
    })

    const getPacks = size => getFortressPacks({ length: size, width: size, height })

    const size = binarySearch({ lowPosition: 1n, highPosition: 9999999n, objectiveValue: maxPacks, getValueFromPos: getPacks })
    const extraUnitOnSide = getFortressPacks({ length: size + 1n, width: size, height }) <= maxPacks

    return {
        length: size + (extraUnitOnSide ? 1n : 0n),
        height,
        width: size,
    }
}

console.debug('Preparing reference array')
const unitFortressReference = []
let height = 3n
while (1) {
    const packs = getUnitFortressPacks(height)
    unitFortressReference.push({
        packs,
        height
    })
    console.debug('Progress: (ends at 0n)', MAX_INPUT_PACKS / packs)
    if (packs >= MAX_INPUT_PACKS) break

    if (height <= REFERENCE_DETAIL) height++
    else height += height / REFERENCE_DETAIL
}
console.debug('Done preparing reference array')

// Calculate output
const outputLines = []
testLines.forEach((line, index) => {
    const availablePacks = BigInt(line)
    const dimensions = calculateMaxDimensionsForPacks(availablePacks)
    if (!dimensions) {
        outputLines.push(`Case #${index + 1}: IMPOSSIBLE`)
        return
    }
    const maxPacksForDimensions = getFortressPacks(dimensions)
    console.debug(`Case #${index + 1}: ${dimensions.height} ${maxPacksForDimensions}`)
    outputLines.push(`Case #${index + 1}: ${dimensions.height} ${maxPacksForDimensions}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
