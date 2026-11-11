# 光影解析 · 短视频素材解析小程序

一套**前后端分离**的短视频素材解析工具，采用 iOS 设计语言，含微信原生小程序客户端 + Node.js 接口服务。

> 技术实践项目，无广告、无付费、无会员。仅供学习演示，请仅处理你本人拥有完整著作权的素材。

---

## 目录结构

```
shortvideo-parser/
├── miniprogram/              小程序客户端（微信原生 WXML + WXSS + JS）
│   ├── pages/
│   │   ├── index/            链接解析（大圆角输入框 + 剪贴板读取 + iOS 加载指示器）
│   │   ├── preview/          资源预览与导出（在线播放 / 图片预览 / 保存到相册）
│   │   ├── history/          本地历史（左滑删除 + 批量清空）
│   │   └── about/            项目说明（分组式设置页 + 免责声明）
│   ├── components/           iOS 风格公共组件
│   │   ├── ios-navbar/       毛玻璃导航栏（滚动淡入标题）
│   │   ├── ios-loading/      原生菊花加载遮罩
│   │   └── ios-modal/        iOS 弹窗
│   ├── utils/
│   │   ├── config.js         ★ 全局配置（只有这里需要改）
│   │   ├── api.js            接口封装
│   │   ├── storage.js        本地存储
│   │   └── util.js           通用工具
│   └── app.wxss              设计系统（颜色/圆角/阴影/缓动 全走 CSS 变量）
│
└── server/                   接口服务（Node.js + Express）
    ├── index.js              启动入口
    ├── src/
    │   ├── config.js         配置（全部读环境变量）
    │   ├── app.js            Express 装配
    │   ├── routes/api.js     接口路由
    │   ├── parsers/          平台解析器（一个平台一个文件，坏了好修）
    │   └── services/         抓取层 / 提取器 / 限流 / 上游通道
    ├── Dockerfile
    ├── docker-compose.yml
    ├── ecosystem.config.js   PM2 配置
    ├── nginx.conf.example    Nginx + HTTPS 示例
    └── .env.example

└── showcase/                 项目展示页（React + Vite，可选，用于对外介绍）
```

> 展示页是纯前端，和功能无关，不需要可以整个删掉。
> 重新构建：`cd showcase && npm install && npm run build`。

---

## 一、后端：三步跑起来

### 方式 A：Docker（推荐）

```bash
cd server
cp .env.example .env
# 按需改 .env（不配也能跑）
docker compose up -d --build
```

### 方式 B：直接跑 / PM2

```bash
cd server
npm install
cp .env.example .env
npm start                 # 直接前台跑
# 或
npm i -g pm2 && pm2 start ecosystem.config.js
```

启动后访问 `http://127.0.0.1:3000/api/health`，返回 `{"code":0,...}` 就成了。

### 上线要点

1. **必须挂 HTTPS**。微信小程序只允许 https 接口。用 `nginx.conf.example` + certbot 三步搞定：
   ```bash
   sudo certbot --nginx -d api.your-domain.com
   ```
2. **服务器放国内**。抖音/快手/小红书对海外机房 IP 有风控，国内服务器命中率明显更高。
3. 开放安全组 80 / 443 端口。

---

## 二、小程序端：填一个地址就能跑

### 1. 改配置

打开 `miniprogram/utils/config.js`，把 `API_BASE` 换成你自己的接口地址：

```js
API_BASE: 'https://api.your-domain.com',
```

### 2. 导入开发者工具

微信开发者工具 →「导入项目」→ 目录选 `miniprogram/` → 填你自己的 AppID（没有就选「测试号」）。

### 3. 本地联调

开发者工具 →「详情」→「本地设置」→ 勾上
**不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**
这样 `http://127.0.0.1:3000` 也能直接调。

### 4. 真机 / 发布前必做

小程序后台 →「开发」→「开发设置」→「服务器域名」，把接口域名加进**两处**：

| 类型 | 填什么 | 为什么 |
|---|---|---|
| request 合法域名 | `https://api.your-domain.com` | 调解析接口 |
| downloadFile 合法域名 | `https://api.your-domain.com` | 保存素材要走接口中转，不加会下载失败 |

> 平台要求这两个域名都已备案。没有备案域名的话，开发阶段勾「不校验合法域名」也能用，只是不能正式发布。

---

## 三、接口文档

### `POST /api/parse`

解析一条分享链接。

**请求**

```json
{ "url": "https://v.douyin.com/xxxxxxx/" }
```

`url` 可以直接丢一整段分享文案进来，服务端会自动把链接抠出来。

**成功响应**

```json
{
  "code": 0,
  "data": {
    "platform": "douyin",
    "platformName": "抖音",
    "type": "video",
    "title": "作品标题",
    "author": "作者名",
    "cover": "https://...jpg",
    "duration": 14,
    "media": [
      { "type": "video", "url": "https://...mp4", "quality": "original" }
    ],
    "sourceUrl": "https://...",
    "parsedAt": 1792175173777
  },
  "cost": 1469
}
```

**失败响应**

```json
{ "code": 1003, "message": "这条链接没解析出可用素材，换个链接或者稍后再试" }
```

| code | 含义 |
|---|---|
| 1400 | 参数缺失 / 超长 |
| 1401 | 没识别到有效链接 |
| 1402 | 不支持内网地址 |
| 1429 | 触发限流 |
| 1002 | 链接格式不对 |
| 1003 | 没解析出素材 |
| 1500 | 服务内部错误 |

### `GET /api/download?u=<urlencoded>`

素材中转下载。**为什么需要它**：视频 CDN 域名是动态的，小程序最多只能配 20 个 `downloadFile` 合法域名，根本配不全；而且这些 CDN 大多有 Referer 防盗链。走接口中转一次性解决两件事。

支持 `Range` 断点续传，直接透传上游的 `Content-Type` / `Content-Length`。

### `GET /api/health` / `GET /api/platforms`

健康检查 / 支持平台列表。

---

## 四、解析能力与维护

### 分层设计

```
请求 ──▶ ① 上游解析通道（配了才走）
          └─▶ ② 平台专用解析器（parsers/ 下一个平台一个文件）
                └─▶ ③ 通用媒体提取器（任何带 og:video / 内嵌媒体链接的网页）
```

任何一层拿不到，自动往下一层落。

### 各平台现状

| 平台 | 实现方式 | 说明 |
|---|---|---|
| 抖音 | 分享页会话 + Web 详情接口 | 可拿到标题/作者/封面/时长 + 无水印直链 |
| 快手 | 分享页内嵌状态（`__APOLLO_STATE__`） | 需要页面能 SSR 出状态 |
| 小红书 | 笔记页 `__INITIAL_STATE__` | 未登录态可能拿不到，建议配上游通道 |
| 哔哩哔哩 | `view` + `playurl` 公开接口 | 清晰度受未登录策略限制 |
| 微博 | 移动端页面 `page_info` | |
| 其他网页 | 通用提取器 | og / JSON-LD / 内嵌 JSON 三路挖 |

### 接口失效了怎么办（这份代码的设计前提）

平台的风控策略会不定期升级，**这不是 bug，是常态**。三种处理方式，按顺序试：

1. **冒烟测试**：`bash smoke-test.sh https://api.your-domain.com` 看哪个平台挂了。
2. **配上游通道**（最快）：`.env` 里填 `UPSTREAM_URL`，服务端会优先走它，本地解析器留作兜底。不用改一行代码。
3. **改对应的解析器文件**：`src/parsers/douyin.js` 之类，一个平台一个文件，互相不影响。
   抖音如果要做 Web 接口签名，把签名服务地址填到 `DOUYIN_SIGNER_URL`（约定：`POST {url}` → `{"a_bogus":"..."}`）。

### 环境变量一览

| 变量 | 默认 | 说明 |
|---|---|---|
| `PORT` | 3000 | 监听端口 |
| `RATE_LIMIT_PER_MIN` | 30 | 单 IP 每分钟请求上限 |
| `HTTP_TIMEOUT` | 15000 | 上游请求超时(ms) |
| `PROXY_URL` | 空 | 出口代理，服务器在海外时可填 |
| `UPSTREAM_URL` | 空 | 上游解析通道 |
| `UPSTREAM_TOKEN` | 空 | 上游鉴权头 |
| `DOUYIN_SIGNER_URL` | 空 | 抖音签名服务 |
| `LOG_LEVEL` | info | error / warn / info / debug |

---

## 五、设计说明

### 视觉体系

全站设计 Token 收在 `app.wxss` 的 `page` 选择器里，页面里不写死任何色值：

- **材质**：毛玻璃（`backdrop-filter: blur(40rpx)`）用在导航栏与加载遮罩
- **圆角**：12 / 20 / 28 / 36 / 44rpx 五档
- **主色**：iOS 蓝 `#0A84FF`
- **缓动**：`cubic-bezier(0.32, 0.72, 0, 1)` —— iOS 系统的 spring 曲线
- **按压反馈**：`scale(0.972)` + 透明度，跟原生按钮手感一致

### 几个细节

- 导航栏大标题随滚动淡入，跟 iOS 原生一致
- 加载指示器是 12 根渐隐线条绕圈的**原生菊花**，不是转圈图标
- 历史列表用 `movable-view` 做左滑，不跟页面纵向滚动打架
- 预览视频时卸载原生 `video` 组件，避免它盖住弹窗（小程序原生组件层级问题）

### 隐私

- 不采集任何个人信息
- 解析历史只存本机 `Storage`，不上传
- 服务端只做链接解析，不落库、不留存链接和素材
- 中转下载是流式透传，不写磁盘

---

## 六、冒烟测试

```bash
bash smoke-test.sh http://127.0.0.1:3000
```

会依次测健康检查、平台列表、链接识别、真实解析、下载中转，输出通过 / 失败清单。

---

## 许可

本项目采用 [MIT License](LICENSE) 开源。

Copyright (c) 2026 SorenX

第三方依赖（如 Express、React 等）仍遵循各自许可证。解析到的素材版权归原作者所有，请仅处理你本人拥有完整著作权的素材。
