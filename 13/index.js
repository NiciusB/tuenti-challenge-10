const fs = require('fs')

// Prepare test
const testLines = fs.readFileSync('./sampleInput.txt').toString().split('\n')
testLines.shift()
testLines.pop()

const MAX_INPUT_PACKS = 4611686018427387904n
const REFERENCE_DETAIL = 2n // 20n sounds good for large inputs

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

console.debug('Preparing reference array')

const unitFortressReference = []
let height = 3n
while(1) {
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

function kindaBinarySearch({ lowPosition, highPosition, objectiveValue, getValueFromPos }) {
    while (1) {
        const middlePosition = (highPosition + lowPosition) / 2n
        const lowValue = getValueFromPos(lowPosition)
        const middleValue = getValueFromPos(middlePosition)
        const highValue = getValueFromPos(highPosition)
        if (objectiveValue - middleValue > lowValue - middleValue && objectiveValue - middleValue < highValue - middleValue) {
            return middleValue
        } else if (middleValue > lowPosition) {
            lowPosition -= middlePosition / 2n
        } else {
            highPosition += middlePosition / 2n
        }
    }
}

function calculateMaxDimensionsForPacks(maxPacks) {
    const index = unitFortressReference.findIndex(ref => ref.packs >= maxPacks)
    if (index === 0) return null

    let high = unitFortressReference[index]
    let low = unitFortressReference[index - 1]
    let diff = high.height - low.height
    while (diff > 1n) {
        high.height -= diff / 2n
        high.packs = getUnitFortressPacks(high.height)
        diff = high.height - low.height
        if (diff === 0n) break
        low.height += diff / 2n
        low.packs = getUnitFortressPacks(low.height)
        diff = high.height - low.height
    }
    const height = low.height

    const getPacks = size => getFortressPacks({ length: size, width: size, height })

    high = { size: 100000000n, packs: getPacks(100000000n) }
    low = { size: 1n, packs: getPacks(1n) }
    diff = high.size - low.size
    while (diff > 1n) {
        const isHighClosest = high.packs - low.packs > maxPacks
        if (isHighClosest) {
            low.size += diff / 2n
            low.packs = getPacks(high.size)
        } else {
            high.size -= diff / 2n
            high.packs = getPacks(high.size)
        }
        diff = high.size - low.size
    }
    const size = low.size
    const extraUnitOnSide = false

    return {
        height,
        length: size + (extraUnitOnSide ? 1n : 0n),
        width: size,
    }
}

// Calculate output
const outputLines = []
testLines.forEach((line, index) => {
    const availablePacks = parseInt(line)
    const dimensions = calculateMaxDimensionsForPacks(availablePacks)
    if (!dimensions) {
        outputLines.push(`Case #${index + 1}: IMPOSSIBLE`)
        return
    }
    const maxPacksForDimensions = getFortressPacks(dimensions)
    outputLines.push(`Case #${index + 1}: ${dimensions.height} ${maxPacksForDimensions}`)
})

fs.writeFileSync('./result.txt', outputLines.join('\n'))
