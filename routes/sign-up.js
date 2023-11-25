'use strict'
const process = require('node:process')
const router = require('express').Router()
const AV = require('leanengine')

const User = AV.Object.extend('_User')

// Comment 列表
router.get('/', (req, res) => {
  if (req.currentUser) {
    res.redirect('/comments')
  }
  else {
    const adminMail = process.env.BLOGGER_EMAIL || process.env.SMTP_USER
    const q = new AV.Query(User)
    q.equalTo('email', adminMail)
    q.find().then((results) => {
      if (results.length > 0) {
        res.redirect('/')
      }
      else {
        res.render('sign-up', {
          email: adminMail,
        })
      }
    })
  }
})

router.post('/', (req, res) => {
  const adminMail = process.env.BLOGGER_EMAIL || process.env.SMTP_USER
  const q = new AV.Query(User)
  q.equalTo('email', adminMail)
  q.find().then((results) => {
    if (results.length > 0) {
      res.redirect('/')
    }
    else {
      const user = new AV.User()
      user.setUsername(req.body.username)
      user.setPassword(req.body.password)
      user.setEmail(req.body.email)
      user.signUp().then(() => {
      })
      res.redirect('/')
    }
  })
})

module.exports = router
