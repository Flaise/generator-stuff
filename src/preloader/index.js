var script = document.getElementById('preloader')
var target = script.getAttribute('data-src')

var req = new XMLHttpRequest()

req.addEventListener("progress", function(event) {
    if(event.lengthComputable) {
        var completion = event.loaded / event.total
        // TODO
    }
    else {
    }
}, false)

req.addEventListener("load", function(event) {
    var e = event.target
    var s = document.createElement("script")
    s.innerHTML = e.responseText
    document.documentElement.appendChild(s)

    s.addEventListener("load", function() {
        // TODO
    })
}, false)

req.open("GET", target)
req.send()
