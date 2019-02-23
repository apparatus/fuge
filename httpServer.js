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
        const args = req.query.args || []

        const result = await promisifyCommand(req.params.command, args, system)
        res.send(result);
    });

    app.use('/', express.static(__dirname + '/public'));

    app.listen(3000, function () {
        console.log('Example app listening on port 3000!');
    });
}



module.exports = {
    init
}


