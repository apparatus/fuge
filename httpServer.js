const express = require('express')
const Wreck = require("wreck");

function init(system, commands) {
    function promisifyCommand(command = '',  args = [], system) {
        const commandObj = commands[command]
        return new Promise((resolve, reject) => {
            commandObj.action(args, system, (error, result) => {
                if (error) {
                    reject(error)
                }
                resolve(result)
            })
        })
    }

    var app = express();
    const port = getPortFromSystem(system)
    const forwardPorts = getForwardPortsFromSystem(system)

    console.log({ forwardPorts })

    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.post('/api/commands/:command', consoleLogWrapper(async function (req, res) {
        const command = req.params.command
        const args = req.query.args || []

        const result = await promisifyCommand(command, args, system).catch(err => 'error') || []
        const forwardResults = await forwardRequest(forwardPorts, 'post', `/api/commands/${command}`, args )

        res.send([ ...result, ...forwardResults]);
    }));

    app.use('/', express.static(__dirname + '/public'));

    app.listen(port, function () {
        console.log(`Fuge http server listening on port ${port}`);
        console.log(`Open http client at http://localhost:${port}`);
    });
}

function getPortFromSystem(system) {
    const { global: { http_server } } = system
    if (!http_server) {
        return 3000
    }

    const port = http_server.find(it => it.match(/port=/)).replace(/port=/, '')
    console.log('PORT', port)

    return port
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
    const ports = forwardToPorts.replace(/forward_to_ports=/, '').split(',')
    console.log('PORTS', ports)

    return ports
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
    const response = await await Wreck.request(method, url);
    const bodyBuffer = await Wreck.read(response);
    return parseBodyBuffer(bodyBuffer)
}

function parseBodyBuffer(bodyBuffer) {
    bodyBuffer = bodyBuffer.toString()
    try {
        return JSON.parse(bodyBuffer)
    } catch (error) {
        return bodyBuffer
    }
}

function consoleLogWrapper(cb) {
    return async function (req, res) {
        const originalLog = console.log
        console.log = () => {}
        const result = await cb(req, res)
        console.log = originalLog
        return result
    }
}

module.exports = {
    init
}


