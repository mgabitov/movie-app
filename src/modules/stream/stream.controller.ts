import { Router } from 'express'
import WebTorrent from 'webtorrent'

const router = Router()
const client = new WebTorrent()

let state = {
    progress: 0,
    downloadSpeed: 0,
    ratio: 0
}

let error

client.on('error', (err: Error) => {
    console.error('err', err.message)
    error = err.message
})

client.on('torrent', () => {
    console.log(client.progress)
    state = {
        progress: Math.round(client.progress * 100 * 100) / 100,
        downloadSpeed: client.downloadSpeed,
        ratio: client.ratio
    }
})

router.get('/stats', (req, res) => {
    res.status(200).send(state)
})

export default router