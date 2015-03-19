'use strict'

var debug = true


var gobble = require('gobble')

function singlePage(input, options) {
    return '<body></body><script>' + input + '</script>'
}

var result =
    gobble('./src/js')
        .transform('babel', {sourceMap: false})
                                      // (debug? 'inline': false)}) // inline source map not working
        .transform('browserify', {
            entries: './index.js',
            dest: './bundle.js',
            debug: debug
        })

if(!debug)
    result = result.transform('uglifyjs')

result = result.transform(singlePage)
               .transform('rename', {from: 'bundle.js', to: 'index.html'})
               .moveTo('../../../bin')

module.exports = result
