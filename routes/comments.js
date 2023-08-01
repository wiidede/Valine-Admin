'use strict'
const process = require('node:process')
const router = require('express').Router()
const AV = require('leanengine')

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
        domain: process.env.SITE_URL,
        comment_list: results,
      })
    }, (err) => {
      if (err.code === 101) {
        res.render('comments', {
          title: `${process.env.SITE_NAME}上的评论`,
          domain: process.env.SITE_URL,
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

router.get('/delete', (req, res, next) => {
  if (req.currentUser) {
    const query = new AV.Query(Comment)
    query.get(req.query.id).then((object) => {
      object.destroy()
      res.redirect('/comments')
    }, (err) => {
      if (err)
        console.error(err)
    }).catch(next)
  }
  else {
    res.redirect('/')
  }
})

module.exports = router
