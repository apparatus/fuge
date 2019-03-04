const express = require('express')
const Wreck = require("wreck");

const {
  catchLog,
  releaseLog
} = require('./consoleLogCatcher')()

const tableResultCommands = ['ps', 'zone']

function init(system, commands) {

  var app = express();
  const port = getPortFromSystem(system)
  const forwardPorts = getForwardPortsFromSystem(system)

  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });

  app.post('/api/commands/docker-compose/ps', async function (req, res) {
    const result = await promisifyCommand('shell', ['docker-compose', 'ps'].join(' '), commands, system)

    res.send(formatDockerComposePs(result))
  })

  app.post('/api/commands/docker-compose', async function (req, res) {
    const args = req.query.args || []

    const result = await promisifyCommand('shell', ['docker-compose', ...args].join(' '), commands, system)
      .catch(error => res.status(404).send(error))

      if (!result) {
        return
      }

      res.send(result)
  })

  app.post('/api/commands/:command', async function (req, res) {
    const command = req.params.command
    const args = req.query.args || []

    const result = await promisifyCommand(command, args, commands, system).catch(error => {
      res.status(404).send(error)
    })

    if (!result) {
      return
    }

    const forwardResults = await forwardRequest(forwardPorts, 'post', `/api/commands/${command}`, args)

    if (Array.isArray(result)) {
      result.forEach(it => it.fugeId = 'root')
      res.send([...result, ...forwardResults]);
    } else if (typeof result === 'string') {
      res.send({ root: result })
    } else {
      res.send(result)
    }
  });

  app.use('/', express.static(__dirname + '/public'));

  app.listen(port, function () {
    console.log(`Fuge http server listening on port ${port}\nOpen http client at http://localhost:${port}`);
  });
}

function promisifyCommand(command = '', args = [], commands, system) {
  return new Promise((resolve, reject) => {
    const commandObj = commands[command] || commands.shell
    catchLog()

    commandObj.action(args, system, (error) => {
      const consoleLogResult = releaseLog()

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
  const {global: {http_server}} = system
  if (!http_server || !http_server.port) {
    return 3000
  }

  return http_server.port
}

function getForwardPortsFromSystem(system) {
  const { global: { http_server } } = system

  if (!http_server || !http_server.forward_to_ports) {
    return {}
  }

  return http_server.forward_to_ports
}

async function forwardRequest(forwardPorts, method, url, args) {
  let results = []
  const queryString = args.map(it => `args[]=${it}`).join('&')

  for (let fugeId of Object.keys(forwardPorts)) {
    const port = forwardPorts[fugeId]
    url = `http://localhost:${port}${url}?${queryString}`
    const body = await performRequest(method, url)

    if (Array.isArray(body)) {
      body.forEach(it => results.push({ ...it, fugeId }) )
    }

  }

  return results
}

async function performRequest(method, url) {
  try {
    const response = await await Wreck.request(method, url);
    const bodyBuffer = await Wreck.read(response);
    return JSON.parse(bodyBuffer.toString())
  } catch (error) {
    return null
  }
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
  return line.replace(/\b\s\b/g, '-')
    .match(/(\b[a-z-]+\s+)/g)
    .map(it => ({
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

function formatDockerComposePs(result) {
  if (typeof result !== 'string') {
    return []
  }

  try {
    return result
      .trim()
      .split('\n')
      .slice(2)
      .map(it => {
        const matches = it.match(/^([a-z-]+)\s+(.*)(Up|Exit\s\d+)\s*(.*)$/).slice(1,5)
        const [name, process, status, tcpStatus] = matches
        return {
          name: name.trim(),
          process: process.trim(),
          status: status.trim(),
          tcpStatus: (tcpStatus || '').trim()
        }
      })
  } catch (error) {
    return []
  }

}

module.exports = {
  init
}
