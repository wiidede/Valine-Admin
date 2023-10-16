'use strict'
const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')
const nodemailer = require('nodemailer')
const ejs = require('ejs')
const AV = require('leanengine')

const config = {
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

if (process.env.SMTP_SERVICE != null) {
  config.service = process.env.SMTP_SERVICE
}
else {
  config.host = process.env.SMTP_HOST
  config.port = Number.parseInt(process.env.SMTP_PORT)
  config.secure = process.env.SMTP_SECURE !== 'false'
}

const transporter = nodemailer.createTransport(config)
const templateName = process.env.TEMPLATE_NAME ? process.env.TEMPLATE_NAME : 'default'
const noticeTemplate = ejs.compile(fs.readFileSync(path.resolve(process.cwd(), 'template', templateName, 'notice.ejs'), 'utf8'))
const sendTemplate = ejs.compile(fs.readFileSync(path.resolve(process.cwd(), 'template', templateName, 'send.ejs'), 'utf8'))

function sendMail(mailOptions) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('sendMail - 发送邮件失败: ', error)
        reject(error)
      }
      resolve(info)
    })
  })
}

// 提醒站长
exports.notice = async function (comment) {
  // 站长自己发的评论不需要通知
  if (comment.get('mail') === process.env.TO_EMAIL
        || comment.get('mail') === process.env.SMTP_USER)
    return 'notice skipped: 站长自己发的评论'

  const emailSubject = `👉 咚！「${process.env.SITE_NAME}」上有新评论了`
  const emailContent = noticeTemplate({
    siteName: process.env.SITE_NAME,
    siteUrl: process.env.SITE_URL,
    name: comment.get('nick'),
    text: comment.get('comment'),
    url: `${process.env.SITE_URL + comment.get('url')}#${comment.get('objectId')}`,
  })

  const mailOptions = {
    from: `"${process.env.SENDER_NAME}" <${process.env.SMTP_USER}>`,
    to: process.env.TO_EMAIL ? process.env.TO_EMAIL : process.env.SMTP_USER,
    subject: emailSubject,
    html: emailContent,
  }

  return await sendMail(mailOptions)
}

// 发送邮件通知他人
exports.send = async function (comment) {
  // @ 评论通知
  const pid = comment.get('pid')
  if (!pid)
    return 'send skipped: 不是回复'
  // 通过被 @ 的评论 id, 则找到这条评论留下的邮箱并发送通知.
  const query = new AV.Query('Comment')
  const parentComment = await query.get(pid)
  if (!parentComment)
    return 'send skipped: oops, 找不到回复的评论了'
  if (parentComment.get('mail')) {
    // 站长被 @ 不需要提醒
    if (parentComment.get('mail') === process.env.TO_EMAIL
            || parentComment.get('mail') === process.env.SMTP_USER)
      return 'send skipped: 站长被 @不需要提醒'

    const emailSubject = `👉 叮咚！「${process.env.SITE_NAME}」上有人@了你`
    const emailContent = sendTemplate({
      siteName: process.env.SITE_NAME,
      siteUrl: process.env.SITE_URL,
      pname: parentComment.get('nick'),
      ptext: parentComment.get('comment'),
      name: comment.get('nick'),
      text: comment.get('comment'),
      url: `${process.env.SITE_URL + comment.get('url')}#${comment.get('pid')}`,
    })
    const mailOptions = {
      from: `"${process.env.SENDER_NAME}" <${process.env.SMTP_USER}>`,
      to: parentComment.get('mail'),
      subject: emailSubject,
      html: emailContent,
    }

    return await sendMail(mailOptions)
  }
  else {
    return `send skipped: ${comment.get('nick')} @ 了${parentComment.get('nick')}, 但被 @ 的人没留邮箱... 无法通知`
  }
}

// 该方法可验证 SMTP 是否配置正确
exports.verify = () => transporter.verify()
