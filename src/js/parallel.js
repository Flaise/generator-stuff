
export function start(generatorDefinition, next) {
    setTimeout(() => run(generatorDefinition(), next))
}

// `runnable` is a function, generator, or promise
function run(runnable, next) {
    if(runnable.then) {
        runnable.then(result => next(undefined, result), err => next(err))
        return
    }
    if(!(runnable.next && runnable.throw)) {
        runnable((err, ...results) => next(err, results))
        return
    }

    let status
    try {
        status = runnable.next()
    }
    catch(err) {
        if(next)
            next(err)
        else
            throw err
        return
    }
    /*else*/ {
        let tick = (err, result) => continueRunning(runnable, next, tick, err, result)

        process(status, next, tick)
    }
}

function continueRunning(generator, next, tick, err, results) {
    let status
    try {
        if(err)
            status = generator.throw(err)
        else
            status = generator.next(results)
    }
    catch(err) {
        if(next)
            next(err)
        else
            throw err
        return
    }
    /*else*/ {
        process(status, next, tick)
    }
}

function process(status, next, tick) {
    if(status.done) {
        if(next)
            next(undefined, status.value)
    }
    else if(status.value) {
        let tickOnce = continueOnce(tick)
        if(status.value.constructor === Array) {
            runMany(status.value, tickOnce)
        }
        else
            run(status.value, tickOnce)
    }
    else {
        tick()
    }
}

function continueOnce(impl) {
    let called = false
    return (...args) => {
        if(called)
            throw new Error("Can't reuse continuation function.")
        called = true
        impl(...args)
    }
}

function runMany(targets, next) {
    let length = targets.length
    if(length === 0)
        throw new Error("Can't execute empty array.")

    let stopped = false
    let results = []
    let completions = 0
    let done = (index, err, subResults) => {
        if(stopped)
            return
        if(err) {
            stopped = true
            return next(err)
        }
        results[index] = subResults
        completions += 1
        if(completions === length)
            next(undefined, results)
    }
    for(let i = 0; i < length; i += 1) {
        results.push(undefined)
        run(targets[i], (err, results) => done(i, err, results))
    }
}
