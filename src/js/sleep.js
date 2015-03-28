
export function sleep(milliseconds) {
    return next => setTimeout(next, milliseconds)
}


// TODO...
let sleepers = []

export function stableSleep(milliseconds) {
    return sleep(milliseconds)
    return next => {
        sleepers.push()
    }
}




function* scheduler() {

}
