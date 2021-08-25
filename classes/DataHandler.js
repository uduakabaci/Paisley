const { readFileSync, writeFileSync } = require('fs')
const url = require('valid-url')
const yaml = require('js-yaml')
const download = require('download')
const stream2string = require('stream-to-string')
const path = require('path')

class DataHandler {
  constructor() {}

  static async read(filename) {
    const isUri = url.isUri(filename)
    let string = ''
    if (isUri) {
      const stream = download(filename)
      string = await stream2string(stream)
    } else {
      string = readFileSync(filename, 'utf8')
    }

    const data = yaml.safeLoad(string)
    return data
  }

  static async write(filename, data) {
    const content = yaml.safeDump(data)
    return writeFileSync(filename, content)
  }

  static loadConfig() {
    // load this according to the environment we are on
    const env = process.env.NODE_ENV
    const mainDir = path.parse(__dirname).dir
    const filename = `${mainDir}/.${env}.env`
    try {
      // try to read this file, if failed, resort to the default
      readFileSync(filename)
      require('dotenv').config({ path: filename })
    } catch (e) {
      require('dotenv').config()
    }
  }
}

module.exports = DataHandler
