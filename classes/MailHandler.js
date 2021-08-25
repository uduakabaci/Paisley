const DataHandler = require('./DataHandler')
const path = require('path')
const { readdirSync, mkdirSync } = require('fs')
const ejs = require('ejs')
const mailer = require('nodemailer')
const Juice = require('juice')

class MailHandler {
  constructor({
    username,
    password,
    host,
    port,
    fromEmail,
    dataDir,
    viewsDir,
    quiet
  }) {
    if (!username) throw new Error('username not provided')
    if (!password) throw new Error('password not provided')
    if (!host) throw new Error('host not provided')
    if (!port) throw new Error('port not provided')
    if (!fromEmail) throw new Error('fromEmail not provided')
    if (!dataDir) throw new Error('dataDir not provided')
    if (!viewsDir) throw new Error('viewsDir not provided')

    this.port = port
    this.username = username
    this.password = password
    this.host = host
    this.fromEmail = fromEmail
    this.dataDir = dataDir
    this.viewsDir = viewsDir
    this.emailRegex = /(.+)-mail-[0-9]+\.yaml$/
    this.quiet = !quiet
  }

  async start() {
    this.quiet && console.log('mailing started!')
    let count = 0
    // make sure we have email present before sending 'em
    // read all the files in mail-data folder and send them
    let files = []
    try {
      files = readdirSync(this.dataDir)
    } catch (e) {
      // create the directory here
      mkdirSync(this.dataDir)
    }
    for (let file of files) {
      // dont parse this file if it does not pass meet our requirement
      if (!this.emailRegex.test(file)) continue
      const data = await this.constructMailData(`${this.dataDir}/${file}`)
      await this.sendMail(data.email, data.mail, data.name)
      count++
    }
    this.quiet && console.log(`${count} mails sent`)
    return count
  }

  async constructMailData(file) {
    return new Promise(async (resolve, reject) => {
      let { email, data } = await this.formMailData(file)
      let mail = await ejs.renderFile(
        `${this.viewsDir}/index.ejs`,
        { data },
        {
          views: [this.viewsDir]
        }
      )

      // juice the mail with resources. we will inline most of the content here
      Juice.juiceResources(
        mail,
        {
          webResources: { relativeTo: process.env.ASSETS_URL }
        },
        (err, mail) => {
          if (err) return reject(err)
          resolve({ mail, email, name: data.name })
        }
      )
    })
  }

  async formMailData(file) {
    // grab the email from the filename
    const email = path.basename(file).match(this.emailRegex)[1]
    let data = this.convertMailDataToArray(await DataHandler.read(file))
    data = this.transformPosts(data)
    data.date = this.formDate()
    return { data, email }
  }

  sendMail(email, mail, name) {
    // send the mail here.
    const transporter = mailer.createTransport(
      {
        host: this.host,
        port: this.port,
        secure: false,
        auth: {
          user: this.username,
          pass: this.password
        }
      },
      {
        from: this.fromEmail
      }
    )

    // initialize the options
    const option = {
      to: email,
      html: mail,
      subject: name
    }

    return new Promise((resolve, reject) => {
      transporter.sendMail(option, (err, data) => {
        if (err) return reject(err)
        resolve(data)
      })
    })
  }

  formDate() {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ]
    const months = [
      'january',
      'febuary',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ]
    const now = new Date()
    const date = {
      date: `${now.getDate()}`,
      weekDay: days[now.getDay()],
      month: months[now.getMonth()],
      year: `${now.getFullYear()}`
    }
    return date
  }

  transformPosts(data) {
    // take the config and transform the the mail
    let tempData = data
    tempData.mails = data.mails.map((posts) => {
      const structure = posts.config.structure
      if (typeof structure == 'object' && Object.keys(structure).length > 0) {
        const sectionArray = []
        for (let key in structure) {
          // direct assignment messes thing up. big time.
          let tempPosts = Object.assign({}, posts)
          // grab the config for this section from from it's key
          tempPosts.config = structure[key]
          tempPosts = this.sortAndSlicePost(tempPosts)
          sectionArray.push(tempPosts)
        }
        posts = { sections: sectionArray }
      } else {
        posts = this.sortAndSlicePost(posts)
      }

      return posts
    })
    return tempData
  }

  sortAndSlicePost(posts) {
    const config = posts.config
    const sort = config.sort ? config.sort : 'points'
    const ascending = config.ascending
    // filter the array if we need to
    if (config.property && config.value) {
      const regex = new RegExp(config.value)
      posts.posts = posts.posts.filter((post) =>
        regex.test(post[config.property])
      )
    }
    const count = config.count ? config.count : 6
    posts.posts = posts.posts
      .sort((a, z) => {
        // if an array was given, then it must contain the first operand
        // operator and second operand
        if (Array.isArray(sort) && sort.length == 3) {
          let [fo, op, so] = sort
          const expA = fetchProp(a, fo) + op + fetchProp(a, so)
          const expZ = fetchProp(z, fo) + op + fetchProp(z, so)
          a = eval(expA)
          z = eval(expZ)
        } else {
          // just go ahead with sorting
          a = fetchProp(a, sort)
          z = fetchProp(z, sort)
        }

        function fetchProp(data, prop) {
          // zero if the demanded prop does not exist
          let result = 0
          if (typeof prop == 'string' && data[prop]) result = data[prop]

          // turn it into number either way
          return !Number(result) ? 0 : Number(result)
        }

        return ascending ? a - z : z - a
      })
      .slice(0, count)
    return posts
  }

  convertMailDataToArray(mail) {
    const tempMail = []
    const name = mail.name
    for (let key in mail) {
      tempMail.push(mail[key])
    }
    return { mails: tempMail.slice(0, tempMail.length - 2), name }
  }

  static init() {
    DataHandler.loadConfig()
    const host = process.env.HOST
    const port = process.env.PORT
    const username = process.env.LOGIN
    const password = process.env.PASSWORD
    const fromEmail = process.env.FROM_EMAIL
    const dataDir = process.env.MAIL_DATA_DIR
    const viewsDir = process.env.VIEWS_DIR
    return new MailHandler({
      host,
      port,
      username,
      password,
      fromEmail,
      viewsDir,
      dataDir
    })
  }
}

module.exports = MailHandler
