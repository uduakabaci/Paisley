const mockPage = {
	goto(url) {
		return Promise.resolve()
	},

	$$(selector) {
		return Promise.resolve([])
	},

	$(selector) {
		return Promise.resolve()
	},

	$eval(selector, pageFunction) {
		return Promise.resolve()
	},

  on(event, cb) {
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
