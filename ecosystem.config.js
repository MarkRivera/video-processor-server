module.exports = {
  apps: [
  {
    name   : "Receiver",
    script: "./dist/src/rabbit/receiver.js",
    instances: 3,
    exec_mode : "cluster"
  },
  {
    name: "Video Upload Server",
    script: "./dist/server.js",
    instances: 1
  }
  ]
}
