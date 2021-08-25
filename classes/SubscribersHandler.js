const DataHandler = require('./DataHandler')
const PostCrawler = require('./PostCrawler')
const date = require('date-and-time')
const parser = require('cron-parser')
const { mkdirSync } = require('fs')

class SubscribersHandler extends PostCrawler {
  constructor({ subscribersFile, scrapperSchemaFile, dataDir, quiet }) {
    super({ quiet })
    this.subscribersFile = subscribersFile
    this.scrapperSchemaFile = scrapperSchemaFile
    this.dataDir = dataDir
    this.quiet = !quiet
  }

  async start() {
    await this.load()
    // try to create data dir
    try {
      mkdirSync(this.dataDir)
    } catch (e) {
      /* shut up */
    }
    console.log('crawling started')
    // for each subscriber, loop through all the mail and crawl all its websites
    // write the to the email file in a way specified by the subscriber
    let count = 0
    for (const subscriber of this.subscribers) {
      // here is where the magic will happen
      let mailsCount = 0
      for (const mail of subscriber.mails) {
        const cron = parser.parseExpression(mail.cron)
        const next5Minutes = date.addMinutes(new Date(), 5)
        let nextCronDate = new Date(cron.next()._date.toString())
        // if this mail should not be sent in this hour, forget it
        if (nextCronDate > next5Minutes) continue

        const data = await this.handleMail(mail)
        await this.writeMailData(
          `${this.dataDir}/${subscriber.email}-mail-${mailsCount++}.yaml`,
          {
            name: mail.name,
            cron: mail.cron,
            ...data
          }
        )
        count++
      }
      this.quiet && console.log(`${count} mails crawled!`)
    }
    return count
  }

  async handleMail(mail) {
    // handle the mail
    const data = []
    for (let website of mail.list) {
      website = Object.assign({}, this.scrapperSchema[website.base], website)
      const structure = website.structure ? website.structure : null
      delete website.base
      delete website.structure
      // crawl the website here before attaching our structure back
      const datum = await this.crawl(website)
      structure
        ? (datum.config = Object.assign({}, data.config, { structure }))
        : null
      data.push(datum)
    }
    return data
  }

  async load() {
    this.subscribers = await DataHandler.read(this.subscribersFile)
    this.scrapperSchema = await DataHandler.read(this.scrapperSchemaFile)
  }

  async writeMailData(name, data) {
    return await DataHandler.write(name, data)
  }

  static init() {
    DataHandler.loadConfig()
    const scrapperSchemaFile = process.env.SCRAPPER_SCHEMA_FILE
    const subscribersFile = process.env.SUBSCRIBERS_SCHEMA_FILE
    const dataDir = process.env.MAIL_DATA_DIR
    const quiet = process.env.NODE_ENV != 'development'
    return new SubscribersHandler({
      scrapperSchemaFile,
      subscribersFile,
      dataDir,
      quiet
    })
  }
}

module.exports = SubscribersHandler
