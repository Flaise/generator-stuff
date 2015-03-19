var updaters = []
var changed = undefined

function update() {
    if(updaters.length === 0)
        return
    for(var i = 0; i < updaters.length; i += 1) {
        var updater = updaters[i]
        var value_done = updater.next()
        var value = value_done.value // TODO
        var done = value_done.done
        
        if(done) {
            updaters.splice(i, 1)
            i -= 1
        }
    }
    if(changed)
        changed()
}
setInterval(update, 100)

export function add(updater) {
    updaters.push(updater)
}
export function onChanged(_changed) {
    changed = _changed
}

export function reset() {
    updaters = []
    exports.changed = undefined
}
