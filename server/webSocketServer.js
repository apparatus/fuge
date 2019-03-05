const WebSocket = require('ws')
const express = require('express')
const http = require('http')

require('./utils/jsExtensions')

const catchLog = require('./utils/consoleLogCatcher')()
const { parseTable } = require('./utils/parser')


const PROCESS_LOG_REGEX = /\[([a-z-]+)\s-\s(\d+)]:(.*)/
const PROCESS_EXIT_STATUS_REGEX = /\[[a-zA-Z-]*\]\sexit\s-\sstatus:/
const COMMAND_ARGS_REGEX = /([a-zA-Z-]+)\s?(.*)/

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

wss.broadcast = message => wss.clients.forEach(client => client.send(message))

process.stdout.write = (stream) => {
    const [ ,processName, pid, message ] = stream
        .removeANSIColors()
        .safeMatch(PROCESS_LOG_REGEX)

    wss.broadcast(JSON.stringify({ fugeId: 'root', processName, pid, message: JSON.tryParse(message) }))
}

function getPortFromSystem(system) {
    const {global: {http_server}} = system
    if (!http_server || !http_server.port) {
        return
    }

    return http_server.port
}

function wrapCommands(commands, wss) {
    Object.entries(commands).forEach(([command, properties]) => {
        properties.originalAction = properties.action
        properties.action = (args, system, cb) => {
            let result = catchLog(() => properties.originalAction(args, system, cb))

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
    process.stderr.write = (stream) => {
        if (stream.match(PROCESS_EXIT_STATUS_REGEX)) {
            commands.ps.action([], system, () => {})
        }
    }

    const handleOnConnectionClose = () => {
        if (wss.clients.size > 1) {
            return
        }

        unwrapCommands(commands)
        process.stdout.write = originalStdoutWrite
        process.stderr.write = originalStderrWrite
    }

    const commandAndArgsFromMessage = (message) => {
        let [, commandName, args] = message.match(COMMAND_ARGS_REGEX)
        const command = commands[commandName] || commands.shell

        args = args.trim().split(' ').filter(it => !!it)

        return { commandName, command, args}
    }

    const handleOnMessage = (message) => {
        const { commandName, command, args } = commandAndArgsFromMessage(message)

        command.action(args, system, () => {})

        if (needPsCommands.includes(commandName)) {
            setTimeout(() => commands.ps.action([], system, () => {}), 1000)
        }
    }

    const handleNewConnection = (ws) => {
        if (wss.clients && wss.clients.size === 1) {
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
