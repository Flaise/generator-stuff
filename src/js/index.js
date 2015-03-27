import {start, sleep} from './parallel'
import yelo from './images/yelo'


// clear DOM; removes preloader
while(document.body.firstChild)
    document.body.firstChild.remove()

let canvas = document.createElement('canvas')
document.body.appendChild(canvas)


let context = canvas.getContext('2d')
let renderers = [] 
function render() {
    if(canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
    }
    else {
        context.clearRect(0, 0, canvas.width, canvas.height)
    }

    context.drawImage(yelo, 0, 0)

    for(let renderer of renderers) {
        renderer(context)
    }
}

function updateSleep(milliseconds) {
    requestAnimationFrame(render)
    return sleep(milliseconds)
}


let patrollers = []
function drawPatrollers(context) {
    context.fillStyle = 'black'
    for(let obj of patrollers) {
        context.fillRect(5 * obj.x, 5 * obj.y, 5, 5)
    }
}
renderers.push(drawPatrollers)

function makePatroller(_x, _y) {
    let obj = {}
    obj.x = _x
    obj.y = _y
    start(function*() {
        yield updateSleep(2000)
        while(true) {
            obj.x += 1
            yield updateSleep(40)
            obj.y += 1
            yield updateSleep(120)
            obj.x -= 1
            yield updateSleep(40)
            obj.y -= 1
            yield updateSleep(120)
        }
    })
    patrollers.push(obj)
    return obj
}


let patrollerMakers = []
function drawPatrollerMakers(context) {
    context.fillStyle = 'green'
    for(let obj of patrollerMakers) {
        context.fillRect(5 * obj.x, 5 * obj.y, 5, 5)
    }
}
renderers.push(drawPatrollerMakers)

function makePatrollerMaker(_x, _y, initialDelay) {
    let obj = {}
    obj.x = _x
    obj.y = _y
    start(function*() {
        yield updateSleep(initialDelay)
        for(let i = 0; i < 8; i += 1) {
            makePatroller(obj.x, obj.y)
            obj.x += 1
            yield updateSleep(900)
            obj.x += 1
            yield updateSleep(300)
            obj.x += 1
            yield updateSleep(200)
        }
        let index = patrollerMakers.indexOf(obj)
        if(index < 0)
            throw new Error()
        patrollerMakers.splice(index, 1)
    })
    patrollerMakers.push(obj)
    return obj
}


makePatroller(5, 5)
makePatroller(7, 3)

makePatrollerMaker(10, 20, 5000)
