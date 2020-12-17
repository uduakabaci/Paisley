(async () => {
  const SubscribersHandler = require('./classes/SubscribersHandler.js')
  const sh = SubscribersHandler.init()
  await sh.load()
  await sh.start()

  const MailHandler = require('./classes/MailHandler.js')
  const mh = MailHandler.init()
  await mh.start()
})()
  .then(d => console.log('all done'))
  .catch(e => console.log(e))
