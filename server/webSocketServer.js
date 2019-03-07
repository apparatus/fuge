const WebSocket = require('ws')
const express = require('express')
const http = require('http')
const catchLog = require('./utils/consoleLogCatcher')()
const { parseTable, commandAndArgsFromMessage } = require('./utils/parser')
require('./utils/jsExtensions')

const PROCESS_LOG_REGEX = /\[([a-z-]+)\s-\s(\d+)]:(.*)/
const PROCESS_EXIT_STATUS_REGEX = /\[[a-zA-Z-]*\]\sexit\s-\sstatus:/

const tableResultCommands = ['ps', 'zone']
const needPsCommands = ['stop', 'start', 'restart']

const app = express()
const server = http.createServer(app)

const options = {
    server,
    clientTracking: true
}
const wss = new WebSocket.Server(options)
app.use('/', express.static(__dirname + '/public'))

const originalStdoutWrite = process.stdout.write
const originalStderrWrite = process.stderr.write

wss.broadcast = function broadcast(msg) {
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};



function getPortFromSystem(system) {
    const {global: {http_server}} = system
    if (!http_server || !http_server.port) {
        return
    }

    return http_server.port
}

function wrapCommands(commands, wss) {
    Object.entries(commands).forEach(([command, properties]) => {
        const action = properties.action
        properties.originalAction = action
        properties.action = (args, system, cb) => {
            let result = catchLog(() => action(args, system, cb))

            if (tableResultCommands.includes(command)) {
                result = parseTable(result)
            }

            wss.broadcast(JSON.stringify(result))
        }
    })
}

function unwrapCommands(commands) {
    Object
        .entries(commands)
        .forEach(([command, properties]) => {
        properties.action = properties.originalAction
        delete properties.originalAction
    })
}

function init(system, commands) {

    const handleOnMessage = (message) => {
        const { commandName, args } = commandAndArgsFromMessage(message)
        const command = commands[commandName] || commands.shell
        command.action(args, system, () => {})

        if (needPsCommands.includes(commandName)) {
            setTimeout(() => commands.ps.action([], system, () => {}), 1000)
        }
    }

    const handleOnConnectionClose = () => {
        if (wss.clients.size) {
            return
        }

        unwrapCommands(commands)
        releaseLogs()
    }

    const catchLogs = () => {
        process.stdout.write = (chunk) => {
            chunk = chunk.removeANSIColors().trim()
            const [ ,processName, pid, message ] = chunk.safeMatch(PROCESS_LOG_REGEX)

            if (processName) {
                wss.broadcast(JSON.stringify({ fugeId: 'root', processName, pid, message: JSON.tryParse(message) }))
            } else if (chunk.length > 1) {
                wss.broadcast(JSON.stringify({ fugeId: 'root', processName: process.title, pid: process.pid, message: chunk }))
            }
        }

        process.stderr.write = (chunk) => {
            if (chunk.match(PROCESS_EXIT_STATUS_REGEX)) {
                commands.ps.action([], system, () => {})
            }
        }
    }

    const releaseLogs = () => {
        process.stdout.write = originalStdoutWrite
        process.stderr.write = originalStderrWrite
    }

    const handleNewConnection = (ws) => {
        if (wss.clients && wss.clients.size === 1) {
            catchLogs()
            wrapCommands(commands, wss)
        }

        ws.on('close', handleOnConnectionClose)
        ws.on('message', handleOnMessage)
        commands.ps.action([], system, () => {})
        commands.shell.action(['docker-compose ps'], system, () => {})
    }

    wss.on('connection', handleNewConnection)

    server.listen(process.env.PORT || getPortFromSystem(system) || 3000, () => {
        console.log(`Server started on port ${server.address().port}`)
    })
}

module.exports = {
    init
}
