const WebSocket = require('ws');
const {
    catchLog,
    releaseLog
} = require('./consoleLogCatcher')()

const tableResultCommands = ['ps', 'zone']
const needPsCommands = ['stop', 'start', 'restart']

const originalStdoutWrite = process.stdout.write
const originalStderrWrite = process.stderr.write

function init(system, commands) {
    const wss = new WebSocket.Server({ port: 8080 });

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
            process.stdout.write = originalStdoutWrite
            process.stderr.writr = originalStderrWrite
        })

        ws.on('message', function (message) {
            let [, command, args] = message.match(/([a-zA-Z-]+)\s?(.*)/)
            if (!command) {
                command = 'shell'
            }
            args = args.trim().split(' ').filter(it => !!it)
            ws.send(JSON.stringify({ command, args }))
            commands[command] && commands[command].action(args, system, () => {})

            if (needPsCommands.includes(command)) {
                setTimeout(() => commands.ps.action([], system, () => {}), 1000)
            }
        });

    });
}

function parseTable(table) {
    const [firstLine, ...splitted] = getFormattedLinesFromTable(table)
    const columns = getColumnsFromLine(firstLine)
    return getRowsFromTable(splitted, columns)

}

function getFormattedLinesFromTable(table) {
    return table
        .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') // Remove ANSI colors
        .split('\n')
}

function getColumnsFromLine(line) {
    const matches = line.replace(/\b\s\b/g, '-').match(/(\b[a-z-]+\s+)/g)
    if (!matches) {
        return line
    }
    return matches.map(it => ({
        key: it.trim(),
        length: it.length
    }))
}

function getRowsFromTable(table, columns) {
    return table.map(nextLine => {
        let substringStart = 0

        return columns.reduce((previous, current) => {
            const result = {
                ...previous,
                [current.key]: nextLine
                    .substring(substringStart, substringStart + current.length)
                    .trim()
            }
            substringStart += current.length

            return result
        }, {})
    })
}

function wrapCommands(commands, ws) {
    Object.entries(commands).forEach(([command, properties]) => {
        const action = properties.action
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
                console.log(JSON.stringify(result))
            }
        }
    })
}

String.prototype.removeANSIColors = function() {
    return this.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
}

String.prototype.safeMatch = function(regex) {
    const matches = this.match(regex)
    if (!matches) {
        return []
    }
    return matches
}

JSON.tryParse = function(string) {
    try {
        return JSON.parse(string)
    } catch (error) {
        return string
    }
}

module.exports = {
    init

}
