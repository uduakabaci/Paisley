const puppeteer = require('puppeteer')

class PostCrawler {
  constructor({ quiet }) {
    this.quiet = quiet
  }

  async crawl(website) {
    // lets know what made our crawling stop
    const browser = await puppeteer.launch({
      headless: !false,
      args: ['--no-sandbox']
    })
    let data = {}
    let link = website.website
    website.ignore = website.ignore ? website.ignore : /''/
    // process.exit()
    // some link will come with variable, adjust it for convinience
    let part = link.match(/\$\{(.+)?\}/)
    part = part ? part[1] : part
    if (part) link = link.replace('${' + part + '}', website[part])
    const page = await browser.newPage()
    page.setOfflineMode(false)
    // stop loading shits when the page is all parsed!
    page.on('domcontentloaded', () => page.setOfflineMode(true))
    // here is were we will navigate to the page
    await page.goto(link, { waitUntil: 'domcontentloaded' })
    this.quiet && console.log(`${link} reached`)
    let posts = await page.$$(website['post'])
    posts = await this.parsePosts(posts, website, page)
    // posts = this.sortPosts(posts, website.isChart)
    this.quiet && console.log(posts)
    const config = this.getConfig(website)
    data = { posts, config: { ...config, link } }
    await browser.close()
    return data
  }

  async parsePosts(posts, website, page) {
    return new Promise(async (resolve) => {
      const regex = new RegExp(website.ignore)
      const myposts = []
      // if the post has other value out the context of the element, use id
      for (let post of posts) {
        const data = {}
        for (let key in website) {
          if (regex.test(key)) {
            continue
          } else {
            // i want to be able to query these outside context posts with their
            // id
            const id = website.outsideContext
              ? `[id='${await post.evaluate((node) => node.id)}']`
              : ''

            const selector = (id + ' ' + website[key]).trim()
            let prop = 'innerText'
            const imageMatch = key.match(/^image(.*)/i)
            const styleMatch = key.match(/^style-(.*)/i)
            let isStyle = false
            // handle link differently
            if (key.search(/link/i) != -1) {
              prop = 'href'
            } else if (imageMatch) {
              // grab the real match
              prop = imageMatch[1]
            } else if (styleMatch) {
              // to access a style property, prefix the property with style-
              key = prop = styleMatch[1]
              isStyle = true
            }
            let datum = await this.selector({
              post,
              selector,
              prop,
              isOutsideContext: website.outsideContext,
              page,
              isStyle
            })
            data[key] = datum
          }
        }
        // do some margic for some value
        myposts.push(this.sanitize(data))
      }
      this.quiet && console.log('posts parsed!')
      resolve(myposts)
    })
  }

  async selector({ post, selector, prop, isOutsideContext, page, isStyle }) {
    try {
      // choose the context for selecting
      const context = !isOutsideContext ? post : page
      if (isStyle) {
        let value = await context.$eval(
          selector,
          (el, prop) => el.style[prop],
          prop
        )
        // if it's wrapped in url unwrap it
        const u = value.match(/url\(['"](.*)['"]\)/)
        value = u ? u[1] : value
        return value
      }
      return await context.$eval(selector, (el, prop) => el[prop].trim(), prop)
    } catch (e) {
      // this.quiet && console.log(e)
      return '0'
    }
  }

  getConfig(website) {
    const regex = new RegExp(website.ignore)
    const config = {}
    for (const key in website) {
      if (regex.test(key)) config[key] = website[key]
    }

    return config
  }

  sanitize(data) {
    for (let key in data) {
      // do some magic for the the artist
      if (key == 'artist') {
        const parts = data.artist.split(/featuring/i)
        if (parts[1]) {
          data.artist = parts[0].trim()
          data.title = `${data.title} (feat. ${parts[1].trim()})`
        }
      } else if (key === 'comments' || key == 'points') {
        data[key] = data[key].split(/\s/)[0]
      } else if (key.match(/^image(.*)/i) && data[key] !== '0') {
        data.imagesrc = data[key]
      }
    }
    return data
  }
}

module.exports = PostCrawler
