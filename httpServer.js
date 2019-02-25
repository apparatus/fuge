const express = require('express')
const Wreck = require("wreck");

const tableResultCommands = ['ps', 'zone']

function init(system, commands) {

    var app = express();
    const port = getPortFromSystem(system)
    const forwardPorts = getForwardPortsFromSystem(system)

    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.post('/api/commands/:command', async function (req, res) {
        const command = req.params.command
        const args = req.query.args || []

        const result = await promisifyCommand(command, args, commands, system).catch(error => console.log('>', error, '<')) || []
        const forwardResults = await forwardRequest(forwardPorts, 'post', `/api/commands/${command}`, args )

        if (Array.isArray(result)) {
            res.send([ ...result, ...forwardResults]);
        } else if (typeof  result === 'string') {
            res.send(`${result}\n${forwardResults.join('\n')}`)
        } else {
            res.send({ ...result, ...forwardResults })
        }
    });

    app.use('/', express.static(__dirname + '/public'));

    app.listen(port, function () {
        console.log(`Fuge http server listening on port ${port}`);
        console.log(`Open http client at http://localhost:${port} `);
    });
}

function promisifyCommand(command = '',  args = [], commands, system) {
    return new Promise((resolve, reject) => {
        const commandObj = commands[command] || commands.shell

        const originalConsoleLog = console.log
        let consoleLogResult = null

        console.log = (str) => consoleLogResult = str

        commandObj.action(args, system, (error) => {
            console.log = originalConsoleLog
            if (error) {
                reject(error)
            }

            if (tableResultCommands.includes(command)) {
                resolve(parseTable(consoleLogResult))
            }

            resolve(consoleLogResult)
        })
    })
}

function getPortFromSystem(system) {
    const { global: { http_server } } = system
    if (!http_server) {
        return 3000
    }

    return http_server.find(it => it.match(/port=/)).replace(/port=/, '')
}

function getForwardPortsFromSystem(system) {
    const { global: { http_server } } = system
    if (!http_server) {
        return []
    }

    const forwardToPorts = http_server.find(it => it.match(/forward_to_ports=/))
    if (!forwardToPorts) {
        return []
    }

    return forwardToPorts.replace(/forward_to_ports=/, '').split(',')
}

async function forwardRequest(forwardPorts, method, url, args) {
    let results = []
    const queryString = args.map(it => `args[]=${it}`).join('&')

    for (let i = 0; i < forwardPorts.length; i++) {
        url = `http://localhost:${forwardPorts[i]}${url}?${queryString}`
        const body = await performRequest(method, url)
        body.forEach(it => it.forwadPort = forwardPorts[i])

        results = [...results, ...body]
    }

    return results
}

async function performRequest(method, url) {
    try {
        const response = await await Wreck.request(method, url);
        const bodyBuffer = await Wreck.read(response);
        return JSON.parse(bodyBuffer.toString)
        return bodyBuffer
    } catch (error) {
        return  []
    }
}

function parseTable(table) {
  const [ firstLine, ...splitted ] = table
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') // Remove ANSI colors
    .split('\n')

  const columns = firstLine.replace(/\b\s\b/g, '-')
    .match(/(\b[a-z-]+\s+)/g)
    .map(it => ({
      key: it.trim(),
      length: it.length
    }))

    console.log({ columns })

  return splitted.map(nextLine => {
    let substringStart = 0

    return columns.reduce((previous, current) => {
      const result = { ...previous, [current.key]: nextLine.substring(substringStart, substringStart + current.length).trim() }
      substringStart += current.length
      return result
    }, {})
  })
}

module.exports = {
    init
}
