import {realpathSync} from 'fs'
import {dirname} from 'path'
import {programVisitor} from 'istanbul-lib-instrument'
const testExclude = require('test-exclude')
const findUp = require('find-up')

function getRealpath (n) {
  try {
    return realpathSync(n) || n
  } catch (e) {
    return n
  }
}

let exclude
function shouldSkip (file, opts) {
  if (!exclude) {
    const cwd = getRealpath(process.env.NYC_CWD || process.cwd())
    exclude = testExclude(Object.assign(
      { cwd },
      Object.keys(opts).length > 0 ? opts : {
        configKey: 'nyc',
        configPath: dirname(findUp.sync('package.json', { cwd }))
      }
    ))
  }

  return !exclude.shouldInstrument(file)
}

function makeVisitor ({types: t}) {
  return {
    visitor: {
      Program: {
        enter (path) {
          this.__dv__ = null
          const realPath = getRealpath(this.file.opts.filename)
          if (shouldSkip(realPath, this.opts)) {
            return
          }
          this.__dv__ = programVisitor(t, realPath)
          this.__dv__.enter(path)
        },
        exit (path) {
          if (!this.__dv__) {
            return
          }
          this.__dv__.exit(path)
        }
      }
    }
  }
}

export default makeVisitor
