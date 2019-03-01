module.exports = () => {
  let consoleLogResult = ''

  const originalConsoleLog = console.log
  const originalWrite = process.stdout.write

  const consoleLogCatcher = (str) => {
    if (typeof str !== 'string') {
      return
    }

    consoleLogResult += str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
  }

  const catchLog = () => {
    console.log = consoleLogCatcher
    process.stdout.write = consoleLogCatcher
  }

  const releaseLog = () => {
    console.log = originalConsoleLog
    process.stdout.write = originalWrite

    const result = consoleLogResult
    consoleLogResult = ''

    return result
  }

  return {
    catchLog,
    releaseLog
  }
}