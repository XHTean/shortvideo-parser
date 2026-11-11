'use strict';

/**
 * 启动入口
 * 用法：
 *   node index.js
 * 环境变量见 .env.example（可以先 cp .env.example .env，再用 dotenv 或部署平台注入）
 */

const cfg = require('./src/config.js');
const logger = require('./src/utils/logger.js');
const { createApp } = require('./src/app.js');

const app = createApp();

const server = app.listen(cfg.port, '0.0.0.0', () => {
  logger.info(`解析服务已启动: http://0.0.0.0:${cfg.port}`);
  logger.info(`上游解析通道: ${cfg.upstreamUrl ? '已启用' : '未配置'}`);
  logger.info(`出口代理: ${cfg.proxyUrl ? '已启用' : '未配置'}`);
});

// 优雅退出
['SIGINT', 'SIGTERM'].forEach((sig) => {
  process.on(sig, () => {
    logger.info(`收到 ${sig}，正在关闭服务…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('未处理的 Promise 拒绝:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('未捕获异常:', err && err.stack ? err.stack : err);
});
