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

module.exports = {
    parseTable
}