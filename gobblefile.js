'use strict'

var debug = false
var mainFileName = 'experiment.html'


function toImageModule(input, options) {
    return ['let image = new Image()\n',
            'image.src = "data:image/png;base64,', input, '"\n',
            'export default image\n'].join('')
}
toImageModule.defaults = {accept: '.png', ext: '.js', sourceEncoding: 'base64'}


function cleanCssSingle(input, options) {
    var CleanCSS = require('clean-css')

    return new CleanCSS(options).minify(input).styles
}
cleanCssSingle.defaults = {accept: '.css', ext: '.css'}


function closureCompileSingle(inputdir, outputdir, options, next) {
    if(!options.fileIn)
        throw new Error('options.fileIn is required')

    var path = require('path')
    var fs = require('fs')
    var cc = require('closurecompiler')

    
    // TODO: just do the entire path recursively
    cc.compile(path.join(inputdir, options.fileIn), options.ccOptions, function(err, result) {
        fs.writeFile(path.join(outputdir, options.fileOut), result, next)
    })
}


function singleFile(inputdir, outputdir, options, next) {
    if(!options.dest)
        throw new Error('options.dest is required')

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

    fs.writeFile(path.join(outputdir, options.dest), output, next)
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


function singleFilePreloader(inputdir, outputdir, options, next) {
    if(!options.dest)
        throw new Error('options.dest is required')
    if(!options.src)
        throw new Error('options.src is required')

    var path = require('path')
    var fs = require('fs')

    var output = [
        '<body></body><script id="preloader" data-src="',
        options.src,
        '">',
        fs.readFileSync(path.join(inputdir, 'index.js')),
        '</script>'
    ].join('')

    fs.writeFile(path.join(outputdir, options.dest), output, next)
}




var ccOptions = {language_in: 'ECMASCRIPT6_STRICT',
                 language_out: 'ECMASCRIPT5_STRICT'}
if(debug)
    ccOptions.formatting = 'pretty_print'
else
    ccOptions.compilation_level = 'ADVANCED_OPTIMIZATIONS'


var gobble = require('gobble')


var preloader = gobble('./src/preloader')
    .transform('esperanto', {
        type: 'cjs',
        strict: true,
        sourceMap: false
    })
    .transform(closureCompileSingle, {
        fileIn: 'index.js',
        fileOut: 'index.js',
        ccOptions: ccOptions
    })
    .transform(singleFilePreloader, {
        dest: 'index.html',
        src: 'experiment.html'
    })

var images = gobble('./src/images')
    .transform(toImageModule)
    .moveTo('./images')

var js = gobble('./src/js')
    .transform(shims)

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

var css = gobble('./src/css')
    .transform('concat', {
        dest: 'index.css',
        files: '**/*.css'
    })
    .transform(cleanCssSingle, {
        advanced: true,
        compatibility: 'ie7'
    })


var main = gobble([js, css]).transform(singleFile, {dest: mainFileName})

var all = gobble([main, preloader]).transform(printSize)


module.exports = all
