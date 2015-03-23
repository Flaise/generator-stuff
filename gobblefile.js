'use strict'

var debug = true
var transpiler = 'closure' // one of: 'closure', 'babel'


function toImageModule(input, options) {
    return 'let image = new Image()\n' +
           'image.src = "data:image/png;base64,' + input + '"\n' +
           'export default image\n'
}
toImageModule.defaults = {accept: '.png', ext: '.js', sourceEncoding: 'base64'}


function cleanCssSingle(input, options) {
    var CleanCSS = require('clean-css')

    return new CleanCSS(options).minify(input).styles
}
cleanCssSingle.defaults = {accept: '.css', ext: '.css'}


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


function shims(input, options) {
    if(this.filename === 'index.js')
        return "import 'es5-shim'\n" +
               "import './excanvas'\n" + 
               input
    else
        return input
}


function printSize(input, options) {
    this.log('result: ' + input.length + ' bytes')
    return input
}


var ccOptions = {language_in: 'ECMASCRIPT6_STRICT',
                 language_out: 'ECMASCRIPT5_STRICT'}
if(debug)
    ccOptions.formatting = 'pretty_print'
else
    ccOptions.compilation_level = 'ADVANCED_OPTIMIZATIONS'


var gobble = require('gobble')


var images = gobble('./src/images')
    .transform(toImageModule)
    .moveTo('./images')


var js = gobble('./src/js').transform(shims)

if(transpiler === 'closure') {
    js = gobble([js, images])
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
}

if(transpiler === 'babel') {
    js = gobble([images, js])
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
    .transform('concat', {
        dest: 'index.css',
        files: '**/*.css'
    })
    .transform(cleanCssSingle, {
        advanced: true,
        compatibility: 'ie7'
    })


var all = gobble([js, css]).transform(singleFile)
                           .transform(printSize)

module.exports = all
