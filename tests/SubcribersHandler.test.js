const { mockPuppeteer } = require('./PuppeteerMock')
const { rm, readdirSync, mkdirSync, writeFileSync } = require('fs')
const SubscribersHandler = require('../classes/SubscribersHandler.js')
const DataHandler = require('../classes/DataHandler')

const dataDir = './tests/test-data'
const subscribersFile = `${dataDir}/subscribers-schema.yaml`
process.env.SCRAPPER_SCHEMA_FILE = 'scrapper-schema.yaml'
process.env.SUBSCRIBERS_SCHEMA_FILE = subscribersFile
process.env.MAIL_DATA_DIR = dataDir

jest.mock('puppeteer', () => mockPuppeteer)
let sH
const email = 'jane@mail.com'
const hour = new Date().getHours()
const mailDataGen = (email, hour) => {
  return `
-
  email: ${email}
  mails:
    -
      cron: '* ${hour} * * *'
      name: Daily Digest
      list:
        -
          base: indiehackers
          name: 'Indie Hackers'
          count: 6
        -
          base: hackernews
          name: Hacker News
          count: 6
`
}
const mailData = mailDataGen(email, hour)
const mailData2 = mailDataGen(email, hour + 1)
beforeAll(() => {
  try {
    mkdirSync(dataDir)
  } catch (e) {}
  writeFileSync(subscribersFile, mailData)
})

afterAll((cb) => rm(dataDir, { recursive: true, force: true }, cb))
beforeEach(() => {
  sH = SubscribersHandler.init()
  sH.quiet = false
})

test('if init is working as expected', () => {
  expect(sH).toEqual(expect.any(SubscribersHandler))
})
describe('start is working as expected on', () => {
  test('when cron matches', async () => {
    const count = await sH.start()
    expect(count).toBe(1)
    const dirData = readdirSync(dataDir)
    expect(dirData).toEqual(expect.arrayContaining([`${email}-mail-0.yaml`]))
    expect(await DataHandler.read(`${dataDir}/${email}-mail-0.yaml`))
      .toMatchInlineSnapshot(`
      Object {
        "0": Object {
          "config": Object {
            "count": 6,
            "ignore": "^(ascending|outsideContext|ignore|count|name|channel|post|website)$",
            "link": "https://indiehackers.com",
            "name": "Indie Hackers",
            "post": ".feed-item",
            "website": "https://indiehackers.com",
          },
          "posts": Array [],
        },
        "1": Object {
          "config": Object {
            "count": 6,
            "ignore": "^(ascending|outsideContext|ignore|count|name|channel|post|website)$",
            "link": "https://news.ycombinator.com/news",
            "name": "Hacker News",
            "outsideContext": true,
            "post": " .athing",
            "website": "https://news.ycombinator.com/news",
          },
          "posts": Array [],
        },
        "cron": "* ${hour} * * *",
        "name": "Daily Digest",
      }
    `)
  })

  test('when cron dont match', async () => {
    writeFileSync(subscribersFile, mailData2)
    sH = SubscribersHandler.init()
    sH.quiet = false
    const count = await sH.start()
    expect(count).toBe(0)
  })
})
test('if handleMail is working as expected', async () => {
  const mail = {
    cron: `* ${hour} * * *`,
    name: 'Daily Digest',
    list: [
      {
        base: 'indiehackers',
        name: 'Indie Hackers',
        count: 6
      }
    ]
  }
  await sH.load()
  expect(await sH.handleMail(mail)).toMatchInlineSnapshot(`
    Array [
      Object {
        "config": Object {
          "count": 6,
          "ignore": "^(ascending|outsideContext|ignore|count|name|channel|post|website)$",
          "link": "https://indiehackers.com",
          "name": "Indie Hackers",
          "post": ".feed-item",
          "website": "https://indiehackers.com",
        },
        "posts": Array [],
      },
    ]
  `)
})
test('if load is working as expected', async () => {
  // now load us some data
  await sH.load()
  expect(sH).toEqual(
    expect.objectContaining({
      subscribers: [expect.anything()],
      scrapperSchema: expect.any(Object)
    })
  )
})
test('if writeMailData is working as expected', async () => {
  // write the mail data to disk
  const data = {
    a: 'foo',
    b: 'bar'
  }
  const filename = 'testmail.yaml'
  const fileLink = `${dataDir}/${filename}`
  await sH.writeMailData(fileLink, data)
  const dirData = readdirSync(dataDir)
  expect(dirData).toEqual(expect.arrayContaining([filename]))
  expect(await DataHandler.read(fileLink)).toEqual(data)
})
