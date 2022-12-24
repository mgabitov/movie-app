import { Router, Response, Request, NextFunction } from 'express'
import WebTorrent, { Torrent, TorrentFile} from 'webtorrent'

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


router.get('/add/:magnet', (req, res) => {
    const magnet = req.params.magnet
    const torrentId = 'magnet:?xt=urn:btih:bd4120b2e28481e551746cb77f159548933e5f5a&dn=RUTOR.ORG_%D0%9F%D0%BE%D1%82%D1%80%D1%8F%D1%81%D0%B0%D1%8E%D1%89%D0%B5%D0%B5+%D0%A0%D0%BE%D0%B6%D0%B4%D0%B5%D1%81%D1%82%D0%B2%D0%BE+/+A+Holiday+Spectacular+(2022)+WEB-DL+1080p+%D0%BE%D1%82+ExKinoRay+|+Jaskier&tr=udp://opentor.net:6969&tr=http://retracker.local/announce'
    console.log(torrentId)
    client.add(torrentId, torrent => {
        const files = torrent.files.map(data => ({
            name: data.name,
            length: data.length
        }))
        console.log(files)
 
        res.status(200).send(files)
    })
})

router.get('/stats', (req, res) => {
    state = {
        progress: Math.round(client.progress * 100 * 100) / 100,
        downloadSpeed: client.downloadSpeed,
        ratio: client.ratio
    }
    res.status(200).send(state)
})

interface StreamRequest extends Request {
    params: {
        magnet: string,
        fileName: string 
    }
    headers: {
        range: string
    }
}

interface ErrorWithStatus extends Error {
    status: number
}

router.get('/:magnet/:fileName', (req: StreamRequest, res: Response, next: NextFunction) => {
    const {
        params: {magnet, fileName},
        headers: {range}
    } = req

    if (!range) {
        const err = new Error('Range is not defined, make request') as ErrorWithStatus
        err.status = 416
        return next()
    }

    const torrentFile = client.get(magnet) as Torrent
    let file = <TorrentFile>{}
    for (let i = 0; i < torrentFile.files.length; i++){
        const currentTorrentPiece = torrentFile.files[i]
        if (currentTorrentPiece.name === fileName) {
            file = currentTorrentPiece
        } 
    }

    const fileSize = file.length
    const [startParsed, endParsed] = range.replace(/bytes=/,'').split('-')

    const start = Number(startParsed)
    const end = endParsed ? Number(endParsed) : fileSize - 1

    const chunkSize = end - start + 1

    const headers = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
    }

    res.writeHead(206, headers)
    
    const streamPositions = {
        start,
        end
    }

    const stream = file.createReadStream(streamPositions)

    stream.pipe(res)

    stream.on('error', err => {
        return next(err)
    })
})


export default router