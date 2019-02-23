var express = require('express')

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

    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.post('/api/commands/:command', async function (req, res) {
        const originalLog = console.log
        console.log = () => {}
        const args = req.query.args || []

        const result = await promisifyCommand(req.params.command, args, system)
        console.log = originalLog
        res.send(result);
    });

    app.use('/', express.static(__dirname + '/public'));

    const port = getPortFromSystem(system)

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

module.exports = {
    init
}


