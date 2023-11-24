'use strict'
const process = require('node:process')
const router = require('express').Router()
const AV = require('leanengine')
const mail = require('../utilities/send-mail')
const spam = require('../utilities/check-spam')

const Comment = AV.Object.extend('Comment')

// Comment 列表
router.get('/', (req, res, next) => {
  if (req.currentUser) {
    const query = new AV.Query(Comment)
    query.descending('createdAt')
    query.limit(50)
    query.find().then((results) => {
      res.render('comments', {
        title: `${process.env.SITE_NAME}上的评论`,
        comment_list: results,
      })
    }, (err) => {
      if (err.code === 101) {
        res.render('comments', {
          title: `${process.env.SITE_NAME}上的评论`,
          comment_list: [],
        })
      }
      else {
        next(err)
      }
    }).catch(next)
  }
  else {
    res.redirect('/')
  }
})

router.get('/resend-email', (req, res, next) => {
  if (req.currentUser) {
    const query = new AV.Query(Comment)
    query.get(req.query.id).then((object) => {
      query.get(object.get('rid')).then((parent) => {
        mail.send(object, parent)
        res.redirect('/comments')
      }).catch(next)
    }).catch(next)
  }
  else {
    res.redirect('/')
  }
})

router.get('/delete', (req, res, next) => {
  if (req.currentUser) {
    const query = new AV.Query(Comment)
    query.get(req.query.id).then((object) => {
      object.destroy()
      res.redirect('/comments')
    }).catch(next)
  }
  else {
    res.redirect('/')
  }
})

router.get('/not-spam', (req, res, next) => {
  if (req.currentUser) {
    const query = new AV.Query(Comment)
    query.get(req.query.id).then((object) => {
      object.set('isSpam', false)
      object.set('ACL', { '*': { read: true } })
      object.save()
      spam.submitHam(object)
      res.redirect('/comments')
    }).catch(next)
  }
  else {
    res.redirect('/')
  }
})
router.get('/mark-spam', (req, res, next) => {
  if (req.currentUser) {
    const query = new AV.Query(Comment)
    query.get(req.query.id).then((object) => {
      object.set('isSpam', true)
      object.set('ACL', { '*': { read: false } })
      object.save()
      spam.submitSpam(object)
      res.redirect('/comments')
    }).catch(next)
  }
  else {
    res.redirect('/')
  }
})

module.exports = router
