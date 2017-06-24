var acorn = require('acorn')
var isBuffer = require('is-buffer')
var MagicString = require('magic-string')

module.exports = function astTransform (source, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (typeof source === 'object' && !isBuffer(source)) {
    options = source
  }
  if (options.source) {
    source = options.source
    delete options.source
  }
  if (isBuffer(source)) {
    source = source.toString('utf8')
  }

  var parse = (options.parser || acorn).parse

  var string = new MagicString(source, options)
  var ast = parse(source + '', options)

  walk(ast, null)

  string.inspect = string.toString
  return string

  function walk (node, parent) {
    node.parent = parent
    node.getSource = function () {
      return string.slice(node.start, node.end)
    }
    if (!node.source) node.source = node.getSource
    node.update = Object.assign(function (replacement) {
      string.overwrite(node.start, node.end, replacement)
      return node
    }, node.update || {})
    node.append = function (append) {
      string.appendLeft(node.end, append)
      return node
    }
    node.prepend = function (prepend) {
      string.prependRight(node.start, prepend)
      return node
    }

    Object.keys(node).forEach(function (key) {
      if (key === 'parent') return null
      if (Array.isArray(node[key])) {
        node[key].forEach(function (child) {
          if (child && typeof child.type === 'string') {
            walk(child, node)
          }
        })
      }
      if (node[key] && typeof node[key].type === 'string') {
        walk(node[key], node)
      }
    })

    cb(node)
  }
}
