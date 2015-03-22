'use strict'

var debug = true
var transpiler = 'closure' // one of: 'closure', 'babel'


function closureCompileSingle(inputdir, outputdir, options, callback) {
    var path = require('path')
    var fs = require('fs')
    var cc = require('closurecompiler')
    
    cc.compile(path.join(inputdir, options.fileIn), options.ccOptions, function(err, result) {
        fs.writeFile(path.join(outputdir, options.fileOut), result, callback)
    })
}


function singleFile(inputdir, outputdir, options, callback) {
    var path = require('path')
    var fs = require('fs')

    var output = [
        '<head><meta http-equiv="Content-Type" content="text/html"><style>',
        fs.readFileSync(path.join(inputdir, 'index.css')),
        '</style></head>',
        '<body></body><script>',
        fs.readFileSync(path.join(inputdir, 'index.js')),
        '</script>'
    ].join('')

    fs.writeFileSync(path.join(outputdir, 'index.html'), output)
    callback()
}


function babelPolyfill(input, options) {
    if(this.filename === 'index.js')
        return "import 'babel/polyfill'\n" + input
    else
        return input
}


function es5Shims(input, options) {
    if(this.filename === 'index.js')
        return "import 'es5-shim'\n" +
               "import './excanvas'\n" + 
               input
    else
        return input
}


function printSize(input, options) {
    console.log('\nresult: ' + input.length + ' bytes')
    return input
}


var ccOptions = {language_in: 'ECMASCRIPT6_STRICT',
    language_out: 'ECMASCRIPT5_STRICT',
    compilation_level: 'ADVANCED_OPTIMIZATIONS'}
if(debug)
    ccOptions.formatting = 'pretty_print'


var gobble = require('gobble')

var js = gobble('./src/js').transform(es5Shims)

if(transpiler === 'closure')
    js = js
        .transform('esperanto', {
            type: 'cjs',
            strict: true,
            //sourceMap: (debug? 'inline': false)
            sourceMap: false // inline source mapping leads to a crash
        })
        .transform('browserify', {
            entries: './index.js',
            dest: './index.js',
            debug: debug
        })
        .transform(closureCompileSingle, {
            fileIn: 'index.js',
            fileOut: 'index.js',
            ccOptions: ccOptions
        })

if(transpiler === 'babel') {
    js = js
        .transform(babelPolyfill)
        .transform('babel', {sourceMap: false})
                                      // (debug? 'inline': false)}) // inline source map not working
        .transform('browserify', {
            entries: './index.js',
            dest: './index.js',
            debug: debug
        })

    if(!debug)
        js = js.transform('uglifyjs')
}

var css = gobble('./src/css')

var all = gobble([js, css]).transform(singleFile)
                           .transform(printSize)

module.exports = all
