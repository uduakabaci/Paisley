const {
  mockPage,
  mockBrowser,
  mockPuppeteer,
  mockElementHandle } = require('./PuppeteerMock')
const { rm, readdirSync, mkdirSync } = require('fs')
const puppeteer = require('puppeteer')
const dataDir = './tests/test-data'
let pC
jest.mock('puppeteer', () => mockPuppeteer)
const PostCrawler = require('../classes/PostCrawler')
beforeAll(() => {
  try {
   mkdirSync(dataDir)
  } catch (e) {}
})

afterAll(cb => rm(dataDir, { recursive: true , force: true }, cb))

beforeEach(() => {
  pC = new PostCrawler({ quiet: true })
})

const config = {
  ignore: /^(ignore|outsideContext|website$)/,
  website: 'www.fakewebsite.com',
  title: 'title',
  comments: 'comments',
  imagesrc: 'image',
  link: 'link',
  'style-background-color': 'foo'
}

test('if is crawl working as expected', async () => {
  const data = await pC.crawl(config)

  expect(data).toEqual(expect.objectContaining({
        posts: [],
        config: {
          ignore: /^(ignore|outsideContext|website$)/,
          website: 'www.fakewebsite.com',
          link: 'www.fakewebsite.com'
        }
      })
    )
})
describe('parsePosts working as expected on posts', () => {
  const id = '1234'
  const element = {
    comments: {
      innerText: '20 comments',
    },

    image: {
      src: 'www.fakeimageurl.com'
    },

    link: {
      href: 'www.myfakelink.com'
    },

    title: {
      innerText: 'shining in paris',
    },
    foo: {
      style: {
        'background-color': 'red'
      }
    }
  }
  // i need a new element with id prefixed
  let element2 = Object.assign({}, element)
  Object.keys(element2).forEach(key => {
    const newKey = `[id='${id}'] ${key}`
    element2[newKey] = element2[key]
    delete element2[key]
  })

  const post = {
    $eval: jest.fn((selector, cb, prop) => cb(element[selector], prop)),
    evaluate: jest.fn((cb) => cb({ id }))
  }

  const page = {
    $eval: jest.fn((selector, cb, prop) => cb(element2[selector], prop))
  }

  let posts = [Object.assign({}, post)]

  test('outside context', async () => {
    // mock the evaluate function
    const myposts = await pC.parsePosts(
      posts,
      { ...config, outsideContext: true },
      page
    )
    expect(myposts).toEqual(expect.arrayContaining([
      {
        title: 'shining in paris',
        comments: '20',
        imagesrc: 'www.fakeimageurl.com',
        link: 'www.myfakelink.com',
        'background-color': 'red'
      }
    ]))
  })

  test('inside context', async () => {
    const myposts = await pC.parsePosts(posts, config, page)
    expect(myposts).toEqual(expect.arrayContaining([
      {
        title: 'shining in paris',
        comments: '20',
        imagesrc: 'www.fakeimageurl.com',
        link: 'www.myfakelink.com',
        'background-color': 'red'
      }
    ]))
  })
})

describe('selector working as expected', () => {
  const element = {
    a: {
      comments: '20 comments',
      title: 'shining in paris',
      src: 'www.fakeimageurl.com',
      href: 'www.myfakelink.com'
    },

    b: {
      comments: '40 comments',
      title: 'with the beatles',
      src: 'www.fakeimageurl.com',
      href: 'www.myfakelink.com'
    }
  }

  const element2 = Object.assign({}, element)
  element2.a.href = element2.a.href + '77'
  element2.b.href = element2.b.href + '776'

  const post = {}
  post['$eval'] = jest.fn((selector, cb, prop) => {
    return cb(element2[selector], prop)
  })

  const page = {}
  page['$eval'] = jest.fn((selector, cb, prop) => {
    return cb(element[selector], prop)
  })

  test('on posts inside context', async () => {
    Object.keys(element).forEach(selector => {
      Object.keys(element[selector]).forEach(async prop => {
        const d = await pC.selector({
          post,
          selector,
          prop,
          isOutsideContext: false,
          page,
          isStyle: false
        })
        expect(d).toBe(element[selector][prop])
      })
    })
  })

  test('on posts outside context', async () => {
    Object.keys(element).forEach(selector => {
      Object.keys(element[selector]).forEach(async prop => {
        const d = await pC.selector({
          post,
          selector,
          prop,
          isOutsideContext: true,
          page,
          isStyle: false
        })
        // make sure that the context was switched here
        expect(d).toBe(element[selector][prop])
      })
    })
  })
})

test('if is getConfig working as expected', () => {
  const data = {
    name: 'scram',
    goofy: 'shoot',
    ignore: /(name|ignore)/
  }
  const config = pC.getConfig(data)
  expect(config).toEqual({
    name: 'scram',
    ignore: /(name|ignore)/
  })
})

test('if is sanitize working as expected', async () => {
  const data = {
    artist: 'jane featuring john',
    title: 'song',
    comments: '20 comments',
    points: '20',
    imageShoot: 'link-to-image',
    imageZero: '0'
  }
  const sanitizedData = pC.sanitize(data)
  expect(data.artist).toBe('jane')
  expect(data.title).toBe('song (feat. john)')
  expect(data.comments).toEqual(expect.stringMatching(/^\d+$/))
  expect(data.points).toEqual(expect.stringMatching(/^\d+$/))
  expect(data.imagesrc).toBe(data.imageShoot)
  expect(data.imageZero).toBe(data.imageZero)

})
