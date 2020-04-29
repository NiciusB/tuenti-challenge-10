const fs = require('fs')
const fetch = require('node-fetch')

fetch('http://steam-origin.contest.tuenti.net:9876/games/cat_fight/get_key', {
    headers: {
        Host: 'pre.steam-origin.contest.tuenti.net'
    }
}).then(res => res.json()).then(res => {
    console.log(res)

    fs.writeFileSync('./result.txt', res.key)
}).catch(err => {
    console.error(err)
})
