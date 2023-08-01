const cluster = require('node:cluster')
const process = require('node:process')

// 进程数量建议设置为可用的 CPU 数量
const workers = process.env.LEANCLOUD_AVAILABLE_CPUS || 1

if (cluster.isMaster) {
  for (let i = 0; i < workers; i++)
    cluster.fork()

  cluster.on('exit', (worker) => {
    console.log('worker %s died, restarting...', worker.process.pid)
    cluster.fork()
  })
}
else {
  require('./server.js')
}
