import {start} from '../src/js/parallel'
import {sleep, stableSleep} from '../src/js/sleep'

describe('Parallel - Sleep', () => {
    beforeEach(() => {
        jasmine.clock().install()
        jasmine.clock().mockDate()
        
        process.nextTick = callback => setTimeout(callback, 0)
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })

    it('calls sleep()', () => {
        let a = 0
        start(function*() {
            let [result] = yield sleep(100)
            expect(result).not.toBeDefined()
            a += 1
        })
        expect(a).toBe(0)
        jasmine.clock().tick(99)
        expect(a).toBe(0)
        jasmine.clock().tick(1)
        expect(a).toBe(1)
    })

    // Jasmine doesn't provide a way to simulate a timeout resolving late.
    xit('stays on schedule when called late', () => {
        let startTime = Date.now()
        let a = 0
        start(function*() {
                            // console.log(Date.now())
            expect(a).toBe(0)
            a += 1
            yield stableSleep(100)
            expect(Date.now()).toBe(startTime + 110)
                            // console.log(Date.now())
            expect(a).toBe(1)
            a += 1
            yield stableSleep(100)
                            // console.log(Date.now())
            expect(a).toBe(2)
            a += 1
        })

        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
        jasmine.clock().tick(110)
        expect(a).toBe(2)
        jasmine.clock().tick(90)
        expect(a).toBe(3)
    })

    xit('stays on schedule when running slow', () => {
        let a = 0
        start(function*() {
            expect(a).toBe(0)
            a += 1
            yield stableSleep(100)
            jasmine.clock().tick(10)
            expect(a).toBe(1)
            a += 1
            yield stableSleep(100)
            expect(a).toBe(2)
            a += 1
        })

        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
        jasmine.clock().tick(100)
        expect(a).toBe(2)
        jasmine.clock().tick(90)
        expect(a).toBe(3)
    })
})
