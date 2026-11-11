'use strict';

const express = require('express');

const cfg = require('./config.js');
const logger = require('./utils/logger.js');
const apiRouter = require('./routes/api.js');
const rateLimit = require('./services/rateLimit.js');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // 请求体限制，防止被塞爆内存
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  // 跨域（小程序请求无 Origin，网页端联调时需要）
  app.use((req, res, next) => {
    const origin = cfg.corsOrigin === '*' ? '*' : cfg.corsOrigin;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  });

  // 简单访问日志
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t0}ms`);
    });
    next();
  });

  // 限流只挂在解析接口上，下载中转不限（大文件走的是长连接）
  app.use('/api/parse', rateLimit.middleware());

  app.use('/api', apiRouter);

  // 根路径给个说明，方便部署后浏览器直接访问确认服务活着
  app.get('/', (req, res) => {
    res.type('text/plain; charset=utf-8').send(
      [
        '短视频素材解析接口服务',
        `版本 ${cfg.version}`,
        '',
        'POST /api/parse      { "url": "分享链接" }',
        'GET  /api/health',
        'GET  /api/platforms',
        'GET  /api/download?u=<encoded url>'
      ].join('\n')
    );
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({ code: 1404, message: '接口不存在' });
  });

  // 兜底异常
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error('未捕获异常:', err && err.stack ? err.stack : err);
    if (res.headersSent) return res.end();
    return res.status(500).json({ code: 1500, message: '服务内部错误' });
  });

  return app;
}

module.exports = { createApp };
