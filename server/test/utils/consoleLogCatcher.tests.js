
const catchLog = require('../../utils/consoleLogCatcher')()
const { expect } = require("chai");

describe('utils', () => {

    describe('consoleLogCatcher', () => {

        it ('should catch console log', () => {
            let result = catchLog(() => console.log('Some logging here'))

            expect(result).to.eq('Some logging here')
        })

        it ('should catch stout write', () => {
            let result = catchLog(() => process.stdout.write('Some logging here'))

            expect(result).to.eq('Some logging here')
        })

    })

})