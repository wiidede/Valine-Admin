const AV = require('leanengine');
const mail = require('./utilities/send-mail');
const Comment = AV.Object.extend('Comment');
const request = require('request');

async function sendMailByComment(comment) {
    // 通知站长
    await mail.notice(comment);

    // AT评论通知
    let pid = comment.get('pid');

    if (!pid) {
        console.log("这条评论没有 @ 任何人");
        return;
    }

    // 通过被 @ 的评论 id, 则找到这条评论留下的邮箱并发送通知.
    let query = new AV.Query('Comment');
    const parentComment = await query.get(pid)
    if (!parentComment) {
        console.log("oops, 找不到回复的评论了");
        return;
    }
    if (parentComment.get('mail')) {
        mail.send(comment, parentComment);
    } else {
        console.log(comment.get('nick') + " @ 了" + parentComment.get('nick') + ", 但被 @ 的人没留邮箱... 无法通知");
    }
}


AV.Cloud.afterSave('Comment', async function (request) {
    let currentComment = request.object;
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
    await Promise.all(results.map(async (comment) => {
        sendMailByComment(comment)
    }))
    console.log(`昨日${results.length}条未成功发送的通知邮件处理完毕！`);
    return 'finish'
});

AV.Cloud.define('verify_mail', function (req) {
    return mail.verify();
})

AV.Cloud.define('self_wake', function (req) {
    request(process.env.ADMIN_URL, function (error, response, body) {
        console.log('自唤醒任务执行成功，响应状态码为:', response && response.statusCode);
    });
})
