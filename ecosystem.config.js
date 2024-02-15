module.exports = {
  apps : [{
    name: 'eth-heartbeat',
    cwd: 'dist',
    script: 'index.js',
    restart_delay: 1000,
    watch: 'index.js',
    out_file: 'main.log',
    error_file: 'main.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss:SSS',
  }],
};

