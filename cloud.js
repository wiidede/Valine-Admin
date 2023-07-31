const AV = require('leanengine');
const mail = require('./utilities/send-mail');
const Comment = AV.Object.extend('Comment');
const request = require('request');

async function sendMailByComment(comment) {
    const taskList = [];
    let err = false
    const status = comment.get('isNotified');
    if (!status || status === 'noticed') {
        taskList.push(mail.notice(comment).catch(e => {
            err = true
            console.error(`评论(${comment.get('objectId')})【${comment.get('comment')}】 通知站长失败 `, e);
        }).then(() => {
            comment.set('isNotified', 'noticed')
        }))
    }
    if (!status || status === 'sended') {
        taskList.push(mail.send(comment).catch(e => {
            err = true
            console.error(`评论(${comment.get('objectId')})【${comment.get('comment')}】 发送被@者失败 `, e);
        }).then(() => {
            comment.set('isNotified', 'sended')
        }))
    }
    await Promise.allSettled(taskList)
    if (!err) {
        comment.set('isNotified', true)
    }
    comment.save()
    if (err) {
        throw new Error('发送邮件失败');
    }
}


AV.Cloud.afterSave('Comment', async function (request) {
    let currentComment = request.object;
    console.log('hook(after save comment - 收到一条评论): ', JSON.stringify(currentComment));
    await sendMailByComment(currentComment)
    return 'finish'
});

AV.Cloud.define('resend_mails', async function (req) {
    let query = new AV.Query(Comment);
    query.greaterThanOrEqualTo('createdAt', new Date(new Date().getTime() - 24 * 60 * 60 * 1000));
    query.notEqualTo('isNotified', true);
    // 如果你的评论量很大，可以适当调高数量限制，最高1000
    query.limit(200);
    const results = await query.find();
    await Promise.all(results.map(comment => sendMailByComment(comment)))
    console.log(`昨日${results.length}条未成功发送的通知邮件处理完毕！`);
    return 'finish'
});

AV.Cloud.define('verify_mail', async function (req) {
    const res = await mail.verify();
    console.log(res);
    return res
})

AV.Cloud.define('self_wake', function (req) {
    request(process.env.ADMIN_URL, function (error, response, body) {
        console.log('自唤醒任务执行成功，响应状态码为:', response && response.statusCode);
    });
})
