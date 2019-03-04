const ANSI_COLORS_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
const COLUM_SLASH_REGEX = /\b\s\b/g
const TABLE_COLUMN_REGEX = /(\b[a-zA-Z-]+\b\s*)/g

function parseTable(table) {
    const { header, body } = splitHeaderAndBody(table)
    const columns = getColumnsFromHeader(header)
    return getRowsFromTable(body, columns)
}

function splitHeaderAndBody(table) {
    const [header, ...body] =  table
        .replace(ANSI_COLORS_REGEX, '')
        .split('\n')

    return { header, body }
}

function getColumnsFromHeader(header) {
    const matches = header
        .replace(COLUM_SLASH_REGEX, '-')
        .match(TABLE_COLUMN_REGEX)

    if (!matches) {
        return header
    }
    return matches.map(it => ({
        key: it.trim(),
        length: it.length
    }))
}

function getRowsFromTable(table, columns) {
    const regex = Object.values(columns).map(column => `(.{${column.length}})`).join('')
    const columnsRegex = new RegExp(regex)

    return table.map(nextLine => {
        let i = 0
        const [, ...matches] = nextLine.match(columnsRegex)

        return columns.reduce((previous, current) => ({ ...previous,  [current.key]: matches[i++].trim() }), {})
    })
}

module.exports = {
    splitHeaderAndBody,
    getColumnsFromHeader,
    getRowsFromTable,
    parseTable
}