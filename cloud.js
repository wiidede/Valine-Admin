const process = require('node:process')
const AV = require('leanengine')
const request = require('request')
const mail = require('./utilities/send-mail')
const spam = require('./utilities/check-spam')

const Comment = AV.Object.extend('Comment')

function formatComment(comment) {
  return `评论(${comment.get('objectId')}) by ${comment.get('nick')} - 【${comment.get('comment')}】`
}

async function sendMailByComment(comment, defaultIp) {
  const isSpam = comment.get('isSpam')
  if (isSpam === true)
    return
  if (isSpam === undefined) {
    const ip = comment.get('ip') || defaultIp
    const spamResult = await spam.checkSpam(comment, ip).catch(e => console.error(e))
    if (spamResult)
      return
    if (process.env.AKISMET_KEY === 'MANUAL_REVIEW') {
      mail.notice(comment).catch((e) => {
        console.error(`通知站长审核失败: ${formatComment(comment)}`, e)
      }).then((msg) => {
        if (typeof msg === 'string' && msg.startsWith('notice skipped'))
          console.log(`跳过(${msg.slice('notice skipped'.length)}): ${formatComment(comment)}`)
        else
          console.log(`通知站长审核成功: ${formatComment(comment)}`)
        comment.set('notifyStatus', 'noticed')
      })
      return
    }
  }

  const taskList = []
  let err = false
  const isNotified = comment.get('isNotified')
  const notifyStatus = comment.get('notifyStatus')
  if (!isNotified && notifyStatus !== 'noticed') {
    taskList.push(mail.notice(comment).catch((e) => {
      err = true
      console.error(`通知站长失败: ${formatComment(comment)}`, e)
    }).then((msg) => {
      if (typeof msg === 'string' && msg.startsWith('notice skipped'))
        console.log(`跳过(${msg.slice('notice skipped'.length)}): ${formatComment(comment)}`)
      else
        console.log(`通知站长成功: ${formatComment(comment)}`)
      comment.set('notifyStatus', 'noticed')
    }))
  }
  if (!isNotified && notifyStatus !== 'sended') {
    taskList.push(mail.send(comment).catch((e) => {
      err = true
      console.error(`发送被@者失败: ${formatComment(comment)}`, e)
    }).then((msg) => {
      if (typeof msg === 'string' && msg.startsWith('send skipped'))
        console.log(`跳过(${msg.slice('send skipped'.length)}): ${formatComment(comment)}`)
      else
        console.log(`发送被@者成功: ${formatComment(comment)}`)
      comment.set('notifyStatus', 'sended')
    }))
  }
  await Promise.allSettled(taskList)

  if (!err) {
    comment.set('isNotified', true)
    comment.set('notifyStatus', 'finish')
  }
  comment.save()
  if (err)
    throw new Error('发送邮件失败')
}

AV.Cloud.afterSave('Comment', async (request) => {
  const currentComment = request.object
  console.log('hook(after save comment - 收到一条评论): ', formatComment(currentComment))
  await sendMailByComment(currentComment, request.meta.remoteAddress)
  return 'finish'
})

AV.Cloud.define('resend_mails', async () => {
  const query = new AV.Query(Comment)
  query.greaterThanOrEqualTo('createdAt', new Date(new Date().getTime() - 24 * 60 * 60 * 1000))
  query.notEqualTo('isNotified', true)
  query.notEqualTo('isSpam', true)
  // 如果你的评论量很大，可以适当调高数量限制，最高1000
  query.limit(200)
  const results = await query.find()
  await Promise.allSettled(results.map(comment => sendMailByComment(comment)))
  console.log(`昨日${results.length}条未成功发送的通知邮件处理完毕！`)
  return results.length
})

AV.Cloud.define('verify_mail', async () => {
  const res = await mail.verify()
  console.log(res)
  return res
})

AV.Cloud.define('self_wake', () => {
  request(process.env.ADMIN_URL, (error, response) => {
    if (error)
      console.error('自唤醒任务执行失败', error)
    console.log('自唤醒任务执行成功，响应状态码为:', response && response.statusCode)
  })
})
