import * as updaters from './updaters'


// clear DOM; removes preloader
while(document.body.firstChild)
    document.body.firstChild.remove()

var canvas = document.createElement('canvas')
document.body.appendChild(canvas)
canvas.width = 400
canvas.height = 247 // approximately golden ratio
var context = canvas.getContext('2d')
var renderers = []
function render() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    for(var renderer of renderers) {
        renderer(context)
    }
}
updaters.onChanged(() => requestAnimationFrame(render))


var patrollers = []
function drawPatrollers(context) {
    context.fillStyle = 'black'
    for(var obj of patrollers) {
        context.fillRect(5 * obj.x, 5 * obj.y, 5, 5)
    }
}
renderers.push(drawPatrollers)

function makePatroller(_x, _y) {
    var obj = {}
    obj.x = _x
    obj.y = _y
    obj.behavior = (function *() {
        yield 2000
        while(true) {
            obj.x += 1
            yield 40
            obj.y += 1
            yield 120
            obj.x -= 1
            yield 40
            obj.y -= 1
            yield 120
        }
    })()
    updaters.add(obj.behavior)
    patrollers.push(obj)
    return obj
}


var patrollerMakers = []
function drawPatrollerMakers(context) {
    context.fillStyle = 'green'
    for(var obj of patrollerMakers) {
        context.fillRect(5 * obj.x, 5 * obj.y, 5, 5)
    }
}
renderers.push(drawPatrollerMakers)

function makePatrollerMaker(_x, _y, initialDelay) {
    var obj = {}
    obj.x = _x
    obj.y = _y
    obj.behavior = (function *() {
        yield initialDelay
        for(var i = 0; i < 5; i += 1) {
            makePatroller(obj.x, obj.y)
            obj.x += 1
            yield 900
            obj.x += 1
            yield 200
            obj.x += 1
            yield 200
        }
        var index = patrollerMakers.indexOf(obj)
        if(index < 0)
            throw new Error()
        patrollerMakers.splice(index, 1)
    })()
    updaters.add(obj.behavior)
    patrollerMakers.push(obj)
    return obj
}


makePatroller(5, 5)
makePatroller(7, 3)

makePatrollerMaker(10, 20, 5000)
