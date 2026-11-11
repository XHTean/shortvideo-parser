// PM2 进程配置（不想用 Docker 就直接 pm2 start ecosystem.config.js）
module.exports = {
  apps: [
    {
      name: 'shortvideo-parser-api',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      merge_logs: true,
      time: true
    }
  ]
};
