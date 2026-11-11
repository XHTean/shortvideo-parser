# 短视频素材解析接口服务
FROM node:20-alpine

WORKDIR /app

# 时区按北京时间
ENV TZ=Asia/Shanghai

# 先装依赖，利用镜像层缓存
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
