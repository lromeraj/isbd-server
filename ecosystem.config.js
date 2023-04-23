module.exports = {
  apps: [{
    name: 'Iridium SBD',
    script: 'build/src/index.js',
    args: '-vvv',
    watch: false,
    autorestart: true,
    max_memory_restart: '100M'
  }]
}
