const mockPage = {
  goto() {
    return Promise.resolve()
  },

  $$() {
    return Promise.resolve([])
  },

  $() {
    return Promise.resolve()
  },

  $eval() {
    return Promise.resolve()
  },

  on() {
    return true
  },

  setOfflineMode(value) {
    return value
  }
}

const mockBrowser = {
  newPage() {
    return Promise.resolve(mockPage)
  },

  close() {
    return Promise.resolve()
  }
}

const mockPuppeteer = {
  launch() {
    return Promise.resolve(mockBrowser)
  }
}

const mockElementHandle = {
  $eval() {
    return Promise.resolve()
  }
}

module.exports = { mockPage, mockBrowser, mockPuppeteer, mockElementHandle }
