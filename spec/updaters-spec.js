import * as updaters from '../updaters'


describe('Updater', () => {
    beforeEach(() => {
        jasmine.clock().install()
        jasmine.clock().mockDate()
        
        process.nextTick = callback => setTimeout(callback, 0)
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })
    
    it('stuff', () => {
        let a = 0
        setTimeout(() => {
            a = 1
            expect('a').toBe('a')
        }, 100)
        expect(a).toBe(0)
        jasmine.clock().tick(100)
        expect(a).toBe(1)
    })
    
    it('import stuff', () => {
        console.log(updaters)
        expect(updaters.add).toBeDefined()
    })
})
