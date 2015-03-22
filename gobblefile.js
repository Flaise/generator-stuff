'use strict'

var debug = true
var transpiler = 'closure' // one of: 'closure', 'babel'


function readDirRecSync(dir, shortNames, filelist) {
    filelist = filelist || []
   
    var fs = require('fs')
    var path = require('path')
    
    var files = fs.readdirSync(dir)
    files.forEach(function(file) {
        var fullFile = path.join(dir, file)
        if(fs.statSync(fullFile).isDirectory())
            filelist = readDirRecSync(fullFile, shortNames, filelist)
        else if(shortNames)
            filelist.push(file)
        else
            filelist.push(fullFile)
    })
    return filelist
}



function es6ModuleTranspiler(inputdir, outputdir, options, callback) {
    var path = require('path')
    var ncp = require('ncp').ncp
    ncp.limit = 16 // concurrency limit

    // First copy input to output because es6-module-transpiler will be modifying the input instead
    // of creating a modified copy like it's supposed to.
    ncp(inputdir, outputdir, function(err) {
        if(err)
            return callback(err)
        
        var cmd = 'node ./node_modules/es6-module-transpiler/bin/compile-modules convert'
        
        // If this option is missing, it outputs to stdout. Multiple files are not supported.
        // For multiple files, the contents of this option is ignored. es6-module-transpiler
        // always modifies the input directory.
        cmd += ' --output '
            + '!@#$%^&*()' // comment out when es6-module-transpiler is fixed
            // + outputdir // uncomment when es6-module-transpiler is fixed
        
        cmd += ' --format commonjs'
        cmd += ' ' + readDirRecSync(outputdir).join(' ')
        
        var cp = require('child_process')
        cp.exec(cmd, function(err, stdout, stderr) {
            if(err)
                return callback(err)
            
            stderr = stderr.toString()
            if(stderr)
                callback(stderr)
            else
                callback()
        })
    })
}

function closureDependencies(inputdir, outputdir, options, callback) {
    return callback(undefined, readDirRecSync(inputdir))
    
    // TODO: calcdeps appears to be calculating relative to a test root file that has nothing to do
    //       with this project
//    var cp = require('child_process')
//    
//    var cmd = 'node ./node_modules/calcdeps/bin/calcdeps --input=' + inputdir
//    cp.exec(cmd, function(err, stdout, stderr) {
//        if(err)
//            return callback(err)
//        
//        stderr = stderr.toString()
//        stdout = stdout.toString().trim()
//        
//        if(!stdout)
//            return callback(stderr || 'Unknown error')
//        else if(stderr && !options.suppressWarnings)
//            console.warn(stderr)
//        callback(undefined, stdout.split('\n'))
//    })
}

function passthrough(transformations, optionHashes) {
    optionHashes = optionHashes || []
    return function passthrough(inputdir, outputdir, options_ignored, callback) {
        var index = 0
        function callNext(err, data) {
            if(err)
                return callback(err)
            if(index >= transformations.length)
                return callback()
            
            var transformation = transformations[index]
            var optionHash = optionHashes[index]
            index += 1
            console.log('\nSub-transformation: ' + transformation.name)
            transformation(inputdir, outputdir, optionHash, callNext, data)
        }
        callNext()
    }
}


function closureCompile(inputdir, outputdir, options, callback, fileList) {
    var cc = require('closurecompiler')
    var fs = require('fs')
    var path = require('path')
    
    cc.compile(fileList, options, function(err, result) {
        if(!result)
            return callback(err || 'Unknown error')
        else if(err && !options.suppressWarnings)
            console.warn('\n' + err)
        
        fs.writeFile(path.join(outputdir, 'index.js'), result, callback)
    })
}


function es6ModulesCommonJS(input, options) {
    var compile = require('es6-modules-commonjs').compile

    return compile(input)
}


function singlePage(input, options) {
    return '<body></body><script>' + input + '</script>'
}
singlePage.defaults = {accept: '.js', ext: '.html'}


function importBabelPolyfill(input, options) {
    if(this.filename === 'index.js')
        return "import 'babel/polyfill'\n" + input
    else
        return input
}


var ccOptions = {language_in: 'ECMASCRIPT6_STRICT',
    language_out: 'ECMASCRIPT5_STRICT',
    compilation_level: 'ADVANCED_OPTIMIZATIONS'}
if(debug)
    ccOptions.formatting = 'pretty_print'


var gobble = require('gobble')

var result = gobble('./src/js')

if(transpiler === 'closure')
    result = result
        .transform(es6ModuleTranspiler)
        .transform('browserify', {
            entries: './index.js',
            dest: './index.js',
            debug: debug
        })
        .transform(passthrough(
            [closureDependencies, closureCompile],
            [{suppressWarnings: false}, ccOptions]
        ))

if(transpiler === 'babel') {
    result = result
        .transform(importBabelPolyfill)
        .transform('babel', {sourceMap: false})
                                      // (debug? 'inline': false)}) // inline source map not working
        .transform('browserify', {
            entries: './index.js',
            dest: './index.js',
            debug: debug
        })

    if(!debug)
        result = result.transform('uglifyjs')
}

result = result.transform(singlePage)

module.exports = result
