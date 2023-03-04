module.exports = {
  apps: [{
    name: 'Iridium SBD',
    script: 'build/index.js',
    watch: false,
    autorestart: true,
    max_memory_restart: '100M'
  }]
}
