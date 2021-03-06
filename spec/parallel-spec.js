import {start} from '../src/js/parallel'

describe('Parallel', () => {
    beforeEach(() => {
        jasmine.clock().install()
        jasmine.clock().mockDate()
        
        process.nextTick = callback => setTimeout(callback, 0)
    })
    afterEach(() => {
        jasmine.clock().uninstall()
    })

    it('runs once during next event loop cycle', () => {
        let a = 0
        start(function*() {
            a += 1
        })
        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
    })

    it('runs multiple during next event loop cycle', () => {
        let totalRun = 0
        let runOne = () => {
            start(function*() {
                totalRun += 1
            })
        }
        for(let i = 0; i < 10; i += 1)
            runOne()

        expect(totalRun).toBe(0)
        jasmine.clock().tick(0)
        expect(totalRun).toBe(10)
        jasmine.clock().tick(0)
        expect(totalRun).toBe(10)
    })

    it('returns control after yield', () => {
        let a = 0
        start(function*() {
            for(var i = 0; i < 100; i += 1)
                yield
            a += 1
        })
        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
    })

    it('calls callback when done', () => {
        let a = 0
        let b = 0
        start(
            function*() {
                expect(b).toBe(0)
                a += 1
            },
            err => {
                expect(err).not.toBeDefined()
                expect(a).toBe(1)
                b += 1
            }
        )

        expect(a).toBe(0)
        expect(b).toBe(0)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)
    })

    it('calls an async function that returns a first-arg error', () => {
        let a = 0
        let dontChange = 0
        start(function*() {
            try {
                yield next => next(5)
                dontChange += 1
            }
            catch(frisbee) {
                a += 1
                expect(frisbee).toBe(5)
                return
            }
            fail()
        })
        expect(a).toBe(0)
        expect(dontChange).toBe(0)

        jasmine.clock().tick()
        expect(a).toBe(1)
        expect(dontChange).toBe(0)

        jasmine.clock().tick()
        expect(a).toBe(1)
        expect(dontChange).toBe(0)
    })

    it('calls an async function that returns values', () => {
        let a = 0
        start(function*() {
            let [resultA, resultB] = yield next => next(undefined, 'r', -4)
            expect(resultA).toBe('r')
            expect(resultB).toBe(-4)
            a += 1
        })
        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
    })

    it('cascades from one generator to another', () => {
        let a = 0
        let asyncA = function*() {
            a += 1
            let result = yield asyncB(5, 'asdf')
            expect(result).toBe(999)
            expect(a).toBe(2)
            a += 1
        }
        let asyncB = function*(argA, argB) {
            expect(argA).toBe(5)
            expect(argB).toBe('asdf')
            a += 1
            return 999
        }

        start(asyncA)

        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(3)
    })

    it('calls callback with result', () => {
        let a = 0
        let b = 0
        start(
            function*() {
                expect(b).toBe(0)
                a += 1
                return -8
            },
            (err, result) => {
                expect(result).toBe(-8)
                expect(err).not.toBeDefined()
                expect(a).toBe(1)
                b += 1
            }
        )

        expect(a).toBe(0)
        expect(b).toBe(0)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)
    })

    it('calls callback with first-arg error', () => {
        let a = 0
        let b = 0
        start(
            function*() {
                expect(b).toBe(0)
                a += 1
                throw 'wat'
            },
            (err, result) => {
                expect(result).not.toBeDefined()
                expect(err).toBe('wat')
                expect(a).toBe(1)
                b += 1
            }
        )

        expect(a).toBe(0)
        expect(b).toBe(0)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)
    })

    it('multi-cascades from one generator into many others', () => {
        let a = 0
        let asyncA = function*() {
            a += 1
            let [resultA, resultB] = yield [asyncSubA('r'), asyncSubB('n')]
            expect(resultA).toBe('u')
            expect(resultB).toBe(9)
        }
        let b = 0
        let asyncSubA = function*(arg) {
            expect(a).toBe(1)
            expect(b).toBe(0)
            b += 1
            expect(arg).toBe('r')
            return 'u'
        }
        let c = 0
        let asyncSubB = function*(arg) {
            expect(a).toBe(1)
            expect(c).toBe(0)
            c += 1
            expect(arg).toBe('n')
            return 9
        }
        
        start(asyncA)

        expect(a).toBe(0)
        expect(b).toBe(0)
        expect(c).toBe(0)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)
        expect(c).toBe(1)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)
        expect(c).toBe(1)
    })

    it('multi-cascades from one generator into delayed other generators', () => {
        let a = 0
        let asyncA = function*() {
            expect(a).toBe(0)
            a += 1
            let [resultA, resultB] = yield [asyncSubA('r'), asyncSubB('n')]
            expect(a).toBe(1)
            a += 1
            expect(resultA).toBe('u')
            expect(resultB).toBe(9)
        }
        let b = 0
        let asyncSubA = function*(arg) {
            expect(arg).toBe('r')
            expect(a).toBe(1)
            expect(b).toBe(0)
            b += 1
            yield next => setTimeout(next, 100)
            expect(b).toBe(1)
            b += 1
            return 'u'
        }
        let c = 0
        let asyncSubB = function*(arg) {
            expect(arg).toBe('n')
            expect(a).toBe(1)
            expect(c).toBe(0)
            c += 1
            yield next => setTimeout(next, 50)
            expect(c).toBe(1)
            c += 1
            return 9
        }
        
        start(asyncA)

        expect(a).toBe(0)
        expect(b).toBe(0)
        expect(c).toBe(0)

        jasmine.clock().tick(0)
        expect(a).toBe(1)
        expect(b).toBe(1)
        expect(c).toBe(1)

        jasmine.clock().tick(50)
        expect(a).toBe(1)
        expect(b).toBe(1)
        expect(c).toBe(2)

        jasmine.clock().tick(50)
        expect(a).toBe(2)
        expect(b).toBe(2)
        expect(c).toBe(2)

        jasmine.clock().tick(10)
        expect(a).toBe(2)
        expect(b).toBe(2)
        expect(c).toBe(2)
    })

    it('throws when reusing continuation', () => {
        let a = 0
        start(function*() {
            expect(a).toBe(0)
            a += 1
            let [result] = yield next => {
                expect(a).toBe(1)
                a += 1
                next(undefined, -1)
                expect(next).toThrow()
            }
            expect(result).toBe(-1)
        })
        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(2)
        jasmine.clock().tick(0)
        expect(a).toBe(2)
    })

    it('throws when multi-cascading an empty array', () => {
        let a = 0
        start(function*() {
            yield []
            a += 1
        })

        expect(a).toBe(0)
        expect(() => jasmine.clock().tick(0)).toThrow()
        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(0)
    })

    it('multi-cascades from one generator into async functions', () => {
        let a = 0
        let asyncA = function*() {
            expect(a).toBe(0)
            a += 1
            let [[resultA, resultB], [resultC, resultD]] = yield [
                (next => next(undefined, 1, 2)),
                (next => next(undefined, 3, 4))
            ]
            expect(resultA).toBe(1)
            expect(resultB).toBe(2)
            expect(resultC).toBe(3)
            expect(resultD).toBe(4)
        }
        
        start(asyncA)

        expect(a).toBe(0)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
        jasmine.clock().tick(0)
        expect(a).toBe(1)
    })

    it('throws when yielding non-runnable', () => {
        for(let arg of [0, false, NaN, '', 1, true, -1, [], [1],
                        {}, {a: 'isungroombd'}, {next: true}, {throw: 'omg'}]) {
            start(function*() { yield arg })
            expect(jasmine.clock().tick).toThrow()
        }
    })

    it('yielding nothing returns undefined', () => {
        let a = 0
        start(function*() {
            let r = yield
            expect(r).toBe(undefined)
            let s = yield
            expect(s).toBe(undefined)
            expect(a).toBe(0)
            a += 1
        })

        jasmine.clock().tick()
        expect(a).toBe(1)
    })

    it('yielding nothing after yielding something returns undefined', () => {
        let a = 0
        start(function*() {
            let [t] = yield next => next(undefined, 5)
            expect(t).toBe(5)
            let r = yield
            expect(r).toBe(undefined)
            let s = yield
            expect(s).toBe(undefined)
            expect(a).toBe(0)
            a += 1
        })

        jasmine.clock().tick()
        expect(a).toBe(1)
    })
})

describe('Parallel (no mock clock)', () => {
    it('yields until a promise has resolved', done => {
        let a = 0
        start(function*() {
            expect(a).toBe(0)
            a += 1
            let yieldment = yield new Promise((resolve, reject) => {
                expect(a).toBe(1)
                setTimeout(() => {
                    expect(a).toBe(1)
                    resolve('qwer')
                }, 10)
            })
            expect(yieldment).toBe('qwer')
            expect(a).toBe(1)
            a += 1
        }, done)

        expect(a).toBe(0)
    })

    it('yields until a promise has rejected', done => {
        let a = 0
        start(function*() {
            expect(a).toBe(0)
            a += 1
            try {
                let yieldment = yield new Promise((resolve, reject) => {
                    expect(a).toBe(1)
                    setTimeout(() => {
                        expect(a).toBe(1)
                        reject('qwer')
                    }, 10)
                })
            }
            catch(rejection) {
                expect(rejection).toBe('qwer')
                expect(a).toBe(1)
                a += 1
                return
            }
            fail()
        }, done)

        expect(a).toBe(0)
    })
})