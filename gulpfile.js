const ejs = require('gulp-ejs')
const rename = require('gulp-rename')
const { dest, src, watch, parallel } = require('gulp')
const browserSync = require('browser-sync').create()
const MailHandler = require('./classes/MailHandler')

const mH = MailHandler.init()
require('dotenv').config()

async function compileEJS() {
  const { data } = await mH.formMailData(
    './dev/data/jane@email.com-mail-0.yaml'
  )
  console.log(data)
  // compile our ejs when any change occures
  return src('./email-templates/index.ejs')
    .pipe(ejs({ data }))
    .pipe(rename({ extname: '.html' }))
    .pipe(dest('./dev'))
}

function compileCSS() {
  return src('./email-templates/css/**/*.css').pipe(dest('./dev/css/'))
}

function watcher() {
  watch('./email-templates', compile)
}

function serve() {
  // init browserSync
  browserSync.init({
    server: './dev'
  })
  // watch our file and do the need fule
  watch('./email-templates', parallel(compileCSS, compileEJS))
  watch('./dev').on('change', browserSync.reload)
}

exports.compile = parallel(compileCSS, compileEJS)
exports.watch = watcher
exports.serve = serve
