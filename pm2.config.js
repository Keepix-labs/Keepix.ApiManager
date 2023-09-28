module.exports = {
    apps: [{
      name: "API",
      instances: 1,
      script: "npm",
      args: "run start",
      interpreter : "node@18.18.0"
   }]
}