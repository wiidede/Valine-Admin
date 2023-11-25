![valine-mail](./valine-mail.svg)

# valine-mail

本仓库是fork于 [Druadach/Valine-Admin](https://github.com/Druadach/Valine-Admin)

可以追溯到 [DesertsP/Valine-Admin](https://github.com/DesertsP/Valine-Admin)

## ✨✨✨目的

1. 更好的邮件通知
2. 旧的唤醒策论需要LeanCloud实例的域名，但目前只能绑定备案后的域名，所以这里我直接在node程序中遍历未发送邮件的评论。
3. ✨你无需再绑定域名（仅针对邮件功能）
4. ✨**你无需再创建定时任务**！！！
5. ✨服务器启动1分钟后尝试第一次扫描评论，然后每隔2分钟扫描一次评论，如果昨天的评论，都是通知过的，则结束循环
6. ✨引入eslint
7. ✨async/await function，所有云函数都改为异步，逻辑更合理
8. ✨更详细的log输出
9. 旧的策略依旧有效，但这不是本项目的目的

## 简介

此项目是一个对 [Valine](https://valine.js.org) 评论系统的拓展应用，可增强 `Valine` 的邮件通知功能。基于 Leancloud 的云引擎与云函数。可以提供邮件 `通知站长` 和 `@ 通知` 的功能，而且还支持自定义邮件通知模板。

<a href="/高级配置.md#邮件通知展示" target="_black">点击查看演示</a>

## 快速开始

首先需要确保 Valine 的基础功能是正常的，参考 [Valine Docs](https://valine.js.org)。

然后进入 [Leancloud](https://leancloud.cn/dashboard/applist.html#/apps) 对应的 Valine 应用中。

点击 `云引擎 -> 设置` 填写代码库并保存：`https://github.com/wiidede/Valine-Admin`

<img width="700" src="https://cdn.jun6.net/201804211508_545.png" />

切换到部署标签页，分支使用 master，点击部署即可：
<img width="700" src="https://cdn.jun6.net/201801112055_212.png" />
<img width="700" src="https://cdn.jun6.net/201804211336_271.png" />

## 配置项

此外，你需要设置云引擎的环境变量以提供必要的信息，点击云引擎的设置页，设置如下信息：

<img width="700" src="https://cdn.jun6.net/201806062257_798.png" />

### 详情

变量 | 示例 | 说明
--- | ------ | ---------
SITE_NAME | Deserts | [必填]博客名称
SITE_URL  | https://panjunwen.com | [必填]首页地址
**SMTP_SERVICE** | QQ | [新版支持]邮件服务提供商，支持 QQ、163、126、Gmail 以及 [更多](https://nodemailer.com/smtp/well-known/#supported-services)
SMTP_USER | xxxxxx@qq.com | [必填]SMTP登录用户
SMTP_PASS | ccxxxxxxxxch | [必填]SMTP登录密码（QQ邮箱需要获取独立密码）
SENDER_NAME | Deserts | [必填]发件人
SENDER_EMAIL | xxxxxx@qq.com | [必填]发件邮箱
ADMIN_URL | https://xxx.leanapp.cn/ | [建议]Web主机二级域名（云引擎域名），用于自动唤醒
BLOGGER_EMAIL | xxxxx@gmail.com | [可选]博主通知收件地址，默认使用SENDER_EMAIL
AKISMET_KEY | xxxxxxxx | [可选]Akismet Key 用于垃圾评论检测，设为MANUAL_REVIEW开启人工审核，留空不使用反垃圾

## 高级配置

[垃圾评论检测](/高级配置.md#垃圾评论检测)

[自定义邮件模板](/高级配置.md#自定义邮件模板)

[自定义收件邮箱](/高级配置.md#自定义收件邮箱)

[自定义邮件服务器](/高级配置.md#自定义邮件服务器)

[Web 评论管理](/高级配置.md#web-评论管理)

[Leancloud 休眠策略(必看)](/高级配置.md#leancloud-休眠策略)~~

[开发指南](/高级配置.md#开发)

## 更新历史

* 12.01 新增自助添加定时器方式。详见: [LeanCloud 自带定时器[推荐方式]](/高级配置.md#leancloud-自带定时器推荐)

* 7.30 修复 @ 邮件通知出错 bug (需 [Valine 1.3.0](https://valine.js.org/changelog.html#v1-3-0-2018-07-29) 支持)，优化发件逻辑，站长发的评论不再收到邮件通知。
* 7.7 兼容 `valine v1.2.0-beta` 版本对 at 的更改 [点击查看](https://valine.js.org/changelog.html#v1-2-0-beta-2018-06-30)
* 7.1 修复 `Web` 后台登录安全 `bug`
* 6.14 添加自定义邮件服务器功能. [点击查看](/高级配置.md#自定义邮件服务器)

## 常见问题

### 为什么我收不到邮件？

* 请确认评论时留下的邮箱不是环境变量里的 `SMTP_USER` 或 `TO_EMAIL` 里的邮箱，原因详见 7.30 更新日志。
* 请确认修改环境变量后已重启容器。
* 对于 QQ / 网易 163 邮箱，请确认你输入的是 SMTP 的授权码，而不是登陆密码。[QQ邮箱获取授权码](https://service.mail.qq.com/cgi-bin/help?subtype=1&id=28&no=1001256)  [网易邮箱获取授权码](http://help.mail.163.com/faqDetail.do?code=d7a5dc8471cd0c0e8b4b8f4f8e49998b374173cfe9171305fa1ce630d7f67ac2cda80145a1742516)

### 为什么我刚开始测试的时候是正常的，但后面的邮件没有通知？

请确认已针对 `LeanCloud` 的**免费容器休眠策略**配置了定时器，详见：[LeanCloud 休眠策略](https://github.com/zhaojun1998/Valine-Admin/blob/master/%E9%AB%98%E7%BA%A7%E9%85%8D%E7%BD%AE.md#leancloud-休眠策略)。

### 如何重启容器？

<img width="500" src="https://cdn.jun6.net/201807081507_968.png"/>

> **注: 更新新版本与更改环境变量均需要重启容器后生效。**
