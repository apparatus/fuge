
const parser = require('../../utils/parser')
const { expect } = require("chai");

describe('utils', () => {

    describe('parser', () => {

        it ('should split header and body', () => {
            const table = `FOO  BAR  BAZ
f1   b11  b12
f2   b21  b22
f3   b31  b32`

            const { header, body } = parser.splitHeaderAndBody(table)

            expect(header).to.deep.equal('FOO  BAR  BAZ')
            expect(body).to.deep.equal([ 'f1   b11  b12', 'f2   b21  b22', 'f3   b31  b32' ])
        })

        it('should extract column names from header string', () => {
            const columns = parser.getColumnsFromHeader('FOO  BAR  BAZ  ')

            expect(columns).to.deep.equal([
                { key: 'FOO', length: 5 },
                { key: 'BAR', length: 5 },
                { key: 'BAZ', length: 5 }
            ])
        })

        it('should extract rows names from table', () => {
            const table = `FOO  BAR  BAZ  
f1...b11..b12..
f2...b21..b22..
f3...b31..b32..`
            const { header, body } = parser.splitHeaderAndBody(table)
            const columns = parser.getColumnsFromHeader(header)
            const rows = parser.getRowsFromTable(body, columns)

            expect(rows).to.deep.equal([
                { FOO: 'f1...', BAR: 'b11..', BAZ: 'b12..' },
                { FOO: 'f2...', BAR: 'b21..', BAZ: 'b22..' },
                { FOO: 'f3...', BAR: 'b31..', BAZ: 'b32..' }
            ])
        })



    })

})