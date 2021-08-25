const DataHandler = require('../classes/DataHandler')
const { mkdirSync, readFileSync, writeFileSync } = require('fs')

const rimraf = require('rimraf')

const dataDir = './tests/test-data'

beforeAll(() => {
  try {
    mkdirSync(dataDir)
  } catch (e) {}
})

afterAll((cb) => rimraf(dataDir, cb))

jest.mock('download', () => () => {
  const Stream = require('stream')
  const readable = new Stream.Readable()
  readable.push('[1, 2, 3]')
  readable.push(null)
  return readable
})
describe('Test if we can write file to', () => {
  test('fs', () => {
    const data = [1, 2, 3]
    const filename = `${dataDir}/writefile.yaml`
    DataHandler.write(filename, data)
    const fileData = readFileSync(filename, 'utf8')
    for (let d of data) {
      expect(fileData).toEqual(expect.stringContaining(`- ${d}`))
    }
  })
})

describe('Test that we can read file from', () => {
  test('fs', async () => {
    const filename = `${dataDir}/readfile.yaml`
    const data = [1, 2, 3]
    let string = ''
    for (let d of data) {
      string += `- ${d} \n`
    }
    writeFileSync(filename, string)
    const fileData = await DataHandler.read(filename)
    expect(fileData).toEqual(expect.arrayContaining(data))
  })

  test('link', async () => {
    const link = 'https://www.somelink.com'
    const data = [1, 2, 3]
    const fileData = await DataHandler.read(link)
    expect(fileData).toEqual(expect.arrayContaining(data))
  })
})
