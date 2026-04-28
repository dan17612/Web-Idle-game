const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('zooEmpireShell', {
  platform: process.platform
})
