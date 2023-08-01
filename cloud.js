const process = require('node:process')
const AV = require('leanengine')
const request = require('request')
const mail = require('./utilities/send-mail')

const Comment = AV.Object.extend('Comment')

async function sendMailByComment(comment) {
  const taskList = []
  let err = false
  const isNotified = comment.get('isNotified')
  const notifyStatus = comment.get('notifyStatus')
  if (!isNotified || notifyStatus === 'noticed') {
    taskList.push(mail.notice(comment).catch((e) => {
      err = true
      console.error(`评论(${comment.get('objectId')})【${comment.get('comment')}】 通知站长失败 `, e)
    }).then(() => {
      comment.set('notifyStatus', 'noticed')
    }))
  }
  if (!isNotified || notifyStatus === 'sended') {
    taskList.push(mail.send(comment).catch((e) => {
      err = true
      console.error(`评论(${comment.get('objectId')})【${comment.get('comment')}】 发送被@者失败 `, e)
    }).then(() => {
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
  console.log('hook(after save comment - 收到一条评论): ', JSON.stringify(currentComment))
  await sendMailByComment(currentComment)
  return 'finish'
})

AV.Cloud.define('resend_mails', async () => {
  const query = new AV.Query(Comment)
  query.greaterThanOrEqualTo('createdAt', new Date(new Date().getTime() - 24 * 60 * 60 * 1000))
  query.notEqualTo('isNotified', true)
  // 如果你的评论量很大，可以适当调高数量限制，最高1000
  query.limit(200)
  const results = await query.find()
  await Promise.all(results.map(comment => sendMailByComment(comment)))
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
