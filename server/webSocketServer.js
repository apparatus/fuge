const WebSocket = require('ws')
const express = require('express')
const http = require('http')

require('./utils/jsExtensions')

const {
    catchLog,
    releaseLog
} = require('./consoleLogCatcher')()
const { parseTable } = require('./utils/parser')

const app = express()
const server = http.createServer(app)

const tableResultCommands = ['ps', 'zone']
const needPsCommands = ['stop', 'start', 'restart']

const originalStdoutWrite = process.stdout.write
const originalStderrWrite = process.stderr.write

function init(system, commands) {
    const wss = new WebSocket.Server({ server });

    app.use('/', express.static(__dirname + '/public'))

    wss.on('connection', function connection(ws) {

        wrapCommands(commands, ws)

        process.stdout.write = (stream) => {
            const [ ,processName, pid, message ] = stream
                .removeANSIColors()
                .safeMatch(/\[([a-z-]+)\s-\s(\d+)]:(.*)/)

            ws.send(JSON.stringify({ fugeId: 'root', processName, pid, message: JSON.tryParse(message) }));
        }

        process.stderr.write = (stream) => {
            if (stream.match(/\[[a-zA-Z-]*\]\sexit\s-\sstatus:/)) {
                commands.ps.action([], system, () => {})
            }
        }

        ws.on('close', () => {
            unwrapCommands(commands)
            process.stdout.write = originalStdoutWrite
            process.stderr.writr = originalStderrWrite
        })

        ws.on('message', function (message) {
            let [, command, args] = message.match(/([a-zA-Z-]+)\s?(.*)/)
            if (!command) {
                command = 'shell'
            }
            args = args.trim().split(' ').filter(it => !!it)
            commands[command] && commands[command].action(args, system, () => {})

            if (needPsCommands.includes(command)) {
                setTimeout(() => commands.ps.action([], system, () => {}), 1000)
            }
        });

    });

    server.listen(process.env.PORT || 3000, () => {
        console.log(`Server started on port ${server.address().port}`);
    });
}

function wrapCommands(commands, ws) {
    Object.entries(commands).forEach(([command, properties]) => {
        const action = properties.action
        properties.originalAction = action
        properties.action = (args, system, cb) => {
            catchLog()
            action(args, system, cb)
            let result = releaseLog()

            if (tableResultCommands.includes(command)) {
                result = parseTable(result)
            }

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(result))
            } else {
                console.log('HERE', JSON.stringify(result))
            }
        }
    })
}

function unwrapCommands(commands) {
    Object.entries(commands).forEach(([command, properties]) => {
        properties.action = properties.originalAction
        delete properties.originalAction
    })
}

module.exports = {
    init
}
