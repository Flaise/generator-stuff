
export function sleep(milliseconds) {
    return next => setTimeout(next, milliseconds)
}

export function start(generatorDefinition, next) {
    setTimeout(() => run(generatorDefinition(), next))
}

function run(generator, next) {
    let tick = (err, ...results) => continueRunning(generator, err, results, next, tick)

    let status
    try {
        status = generator.next()
    }
    catch(err) {
        if(next)
            next(err)
        else
            throw err
        return
    }

    process(status, next, tick)
}

function continueRunning(generator, err, results, next, tick) {
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

    process(status, next, tick)
}

function process(status, next, tick) {
    if(status.done) {
        if(next)
            next(undefined, status.value)
    }
    else if(status.value) {
        let called = false
        let tickOnce = (err, ...results) => {
            if(called)
                throw new Error("Can't reuse continuation function.")
            called = true
            tick(err, ...results)
        }
        if(status.value.constructor === Array) {
            runMany(status.value, tickOnce)
        }
        else if(status.value.next && status.value.throw)
            run(status.value, tickOnce)
        else
            status.value(tickOnce)
    }
    else {
        tick()
    }
}

function runMany(targets, next) {
    let length = targets.length
    if(length === 0)
        throw new Error("Can't execute empty array.")

    let stopped = false
    let results = [undefined] // first element is error
    let processes = []
    let completions = 0
    let done = (err, result, index) => {
        if(stopped)
            return
        if(err) {
            stopped = true
            return tick(err)
        }
        results[index + 1] = result
        completions += 1
        if(completions === length)
            next(...results)
    }
    for(let i = 0; i < length; i += 1) {
        results.push(undefined)
        processes.push(run(targets[i], (err, result) => done(err, result, i)))
    }
}
