import { motion } from 'framer-motion';
import {
  Link2,
  ShieldCheck,
  Smartphone,
  Layers,
  Gauge,
  HardDriveDownload,
  Terminal,
  Server,
  CheckCircle2,
  Braces,
  Sparkles,
} from 'lucide-react';
import { Section, Grid } from './components/layout/Section';
import {
  PhoneFrame,
  ParseScreen,
  PreviewScreen,
  HistoryScreen,
  AboutScreen,
} from './components/screens';

const fadeUp = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
};

/* ============================ 顶栏 ============================ */
function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="container-fluid flex items-center justify-between px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/40">
              <i className="ml-[2px] block h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-white" />
            </div>
          </div>
          <span className="font-title text-[15px] font-extrabold tracking-tight">光影解析</span>
        </div>
        <nav className="hidden items-center gap-7 text-[14px] text-ink-soft sm:flex">
          <a href="#features" className="transition-colors hover:text-ios-blue">
            功能
          </a>
          <a href="#screens" className="transition-colors hover:text-ios-blue">
            界面
          </a>
          <a href="#arch" className="transition-colors hover:text-ios-blue">
            架构
          </a>
          <a href="#start" className="transition-colors hover:text-ios-blue">
            部署
          </a>
        </nav>
        <span className="pill">
          <Sparkles size={12} />
          iOS 设计语言
        </span>
      </div>
    </header>
  );
}

/* ============================ Hero ============================ */
function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
      <Section className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
          <motion.div {...fadeUp}>
            <span className="pill">
              <Smartphone size={12} />
              微信原生小程序 · 前后端分离
            </span>

            <h1 className="fs-hero mt-5 font-extrabold">
              把分享链接丢进来，
              <br />
              取回 <span className="grad-text">无水印原片</span>
            </h1>

            <p className="fs-body mt-5 max-w-[38rem] text-ink-soft">
              一套 iOS 设计语言的短视频素材解析工具。磨砂毛玻璃、大圆角卡片、原生弹簧动效，
              从输入框到加载指示器全部按 iOS 规范重做，手上就是原生 App 的手感。
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#start"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition-transform hover:scale-[1.02]"
                style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
              >
                <Terminal size={16} />
                三步跑起来
              </a>
              <a
                href="#screens"
                className="inline-flex items-center gap-2 rounded-full border border-canvas-line bg-white px-6 py-3 text-[15px] font-semibold text-ink-base transition-colors hover:border-ios-blue/30 hover:text-ios-blue"
              >
                看看界面
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2.5 text-[13px] text-ink-mute">
              {['无广告 · 无付费', '数据只存本机', '服务端不落库', '一套代码自部署'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-ios-green" />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center gap-5 lg:justify-end"
          >
            <div className="hidden sm:block">
              <PhoneFrame>
                <PreviewScreen />
              </PhoneFrame>
            </div>
            <div className="animate-float">
              <PhoneFrame>
                <ParseScreen />
              </PhoneFrame>
            </div>
          </motion.div>
        </div>
      </Section>
    </div>
  );
}

/* ============================ 功能 ============================ */
const FEATURES = [
  {
    icon: Link2,
    title: '链接解析',
    desc: '大圆角输入框配剪贴板一键粘贴，自动从分享文案里抠出链接。格式错误、网络异常、解析失败全部走 iOS 样式弹窗，提示简洁克制。',
  },
  {
    icon: HardDriveDownload,
    title: '预览与导出',
    desc: '视频在线播放、图文左右滑动预览。一键保存到相册，图片可逐张或整组保存；接口中转解决 CDN 域名白名单与防盗链。',
  },
  {
    icon: Smartphone,
    title: '本地历史',
    desc: '解析记录只写进本机 Storage，不上传服务端。列表左滑删除、支持一键清空，动效贴原生手感。',
  },
  {
    icon: ShieldCheck,
    title: '隐私优先',
    desc: '不采集任何个人信息，服务端只做链接解析、不落库、不留存链接与素材，中转下载为流式透传不写磁盘。',
  },
  {
    icon: Layers,
    title: '三层解析架构',
    desc: '上游通道 → 平台专用解析器 → 通用媒体提取器，任何一层失效自动往下落，平台接口变了不用重写项目。',
  },
  {
    icon: Gauge,
    title: '服务端防护',
    desc: '参数校验、单 IP 滑动窗口限流、异常统一捕获、内网地址拦截（防 SSRF），请求体限 32KB。',
  },
];

function Features() {
  return (
    <Section id="features" className="bg-white/60">
      <motion.div {...fadeUp} className="max-w-[42rem]">
        <span className="pill">
          <Braces size={12} />
          功能清单
        </span>
        <h2 className="fs-display mt-4 font-extrabold">该有的都有，不该有的一律没有</h2>
        <p className="fs-body mt-4 text-ink-soft">
          需求文档里的四个模块全部落地，另外补齐了服务端防护与可维护性设计。
        </p>
      </motion.div>

      <Grid minItemWidth={300} className="mt-12">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            {...fadeUp}
            transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="card-surface p-6"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ios-blue/10 text-ios-blue">
              <f.icon size={20} />
            </div>
            <h3 className="fs-subheading mt-4 font-bold">{f.title}</h3>
            <p className="fs-small mt-2.5 text-ink-soft">{f.desc}</p>
          </motion.div>
        ))}
      </Grid>
    </Section>
  );
}

/* ============================ 界面 ============================ */
const SCREENS = [
  { Comp: ParseScreen, label: '① 链接解析' },
  { Comp: PreviewScreen, label: '② 预览与导出' },
  { Comp: HistoryScreen, label: '③ 本地历史' },
  { Comp: AboutScreen, label: '④ 项目说明' },
];

function Screens() {
  return (
    <div id="screens" className="relative overflow-hidden">
      <Section>
        <motion.div {...fadeUp} className="max-w-[42rem]">
          <span className="pill">
            <Smartphone size={12} />
            四个页面
          </span>
          <h2 className="fs-display mt-4 font-extrabold">iOS 原生观感，不是"仿"出来的</h2>
          <p className="fs-body mt-4 text-ink-soft">
            配色、圆角、阴影、缓动全部收在一条设计系统里，页面里不写死任何色值；
            缓动用的是 iOS 系统的 <code className="rounded bg-ink-faint/20 px-1.5 py-0.5 text-[0.9em]">cubic-bezier(0.32, 0.72, 0, 1)</code>，
            加载指示器是 12 根渐隐线条绕圈的原生菊花。
          </p>
        </motion.div>

        <motion.div {...fadeUp} className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-12 lg:gap-x-10">
          {SCREENS.map(({ Comp, label }) => (
            <PhoneFrame key={label} label={label}>
              <Comp />
            </PhoneFrame>
          ))}
        </motion.div>

        <p className="fs-small mx-auto mt-10 max-w-[34rem] text-center text-ink-mute">
          右侧三张为界面示意，实际动效（滚动收起大标题、左滑橡皮筋回弹、弹窗缩放入场）需在真机或开发者工具里体验。
        </p>
      </Section>
    </div>
  );
}

/* ============================ 架构 ============================ */
const LAYERS = [
  {
    n: '01',
    title: '上游解析通道',
    desc: '可选项。填一个 UPSTREAM_URL 就能顶上，服务端转发并归一化结果，不绑死任何一家。',
    tone: 'text-ios-purple',
  },
  {
    n: '02',
    title: '平台专用解析器',
    desc: '抖音 / 快手 / 小红书 / 哔哩哔哩 / 微博，一个平台一个文件。某个平台改版只动它自己那一个文件。',
    tone: 'text-ios-blue',
  },
  {
    n: '03',
    title: '通用媒体提取器',
    desc: '兜底。从 og 标签、JSON-LD、内嵌 JSON、页面扫描四路挖媒体直链，任何网页都能试一把。',
    tone: 'text-ios-green',
  },
];

function Arch() {
  return (
    <Section id="arch" className="bg-white/60">
      <motion.div {...fadeUp} className="max-w-[42rem]">
        <span className="pill">
          <Layers size={12} />
          解析架构
        </span>
        <h2 className="fs-display mt-4 font-extrabold">平台风控天天变，架构得扛得住</h2>
        <p className="fs-body mt-4 text-ink-soft">
          短视频平台这两年把接口签名（抖音的 a_bogus、小红书的 xsec_token、B 站的 buvid 风控）陆续上了，
          接口变更属于常态。所以解析做成分层可插拔：一层失效，自动往下一层落。
        </p>
      </motion.div>

      <div className="mt-12 space-y-4">
        {LAYERS.map((l, i) => (
          <motion.div
            key={l.n}
            {...fadeUp}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="card-surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-7"
          >
            <span className={`font-title text-[28px] font-extrabold ${l.tone}`}>{l.n}</span>
            <div className="min-w-0">
              <h3 className="fs-subheading font-bold">{l.title}</h3>
              <p className="fs-small mt-1.5 text-ink-soft">{l.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} className="glass-panel mt-8 p-6 sm:p-8">
        <h3 className="fs-subheading font-bold">接口失效了怎么办</h3>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            ['冒烟测试', 'bash smoke-test.sh <接口地址>，一眼看出哪个平台挂了'],
            ['配上游通道', '.env 填 UPSTREAM_URL，优先走上游，本地解析器留作兜底'],
            ['改对应文件', 'src/parsers/ 下一个平台一个文件，互不影响'],
          ].map(([t, d], i) => (
            <div key={t}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ios-blue/10 text-[12px] font-bold text-ios-blue">
                  {i + 1}
                </span>
                <span className="font-semibold">{t}</span>
              </div>
              <p className="fs-small mt-2 text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </Section>
  );
}

/* ============================ 部署 ============================ */
function Start() {
  return (
    <Section id="start">
      <motion.div {...fadeUp} className="max-w-[42rem]">
        <span className="pill">
          <Server size={12} />
          部署
        </span>
        <h2 className="fs-display mt-4 font-extrabold">后端三步跑起来</h2>
        <p className="fs-body mt-4 text-ink-soft">
          服务器建议放国内 —— 抖音、快手、小红书对海外机房 IP 有风控，国内服务器命中率明显更高。
        </p>
      </motion.div>

      <Grid minItemWidth={320} className="mt-12">
        {[
          {
            n: '1',
            title: '起服务',
            code: 'cd server\ncp .env.example .env\ndocker compose up -d --build',
            note: '不想用 Docker 就 npm install && npm start，或用 PM2。',
          },
          {
            n: '2',
            title: '挂 HTTPS',
            code: 'sudo certbot --nginx \\\n  -d api.your-domain.com',
            note: '小程序只允许 https 接口，nginx.conf.example 里有现成配置。',
          },
          {
            n: '3',
            title: '填地址',
            code: "// miniprogram/utils/config.js\nAPI_BASE: 'https://api.your-domain.com'",
            note: '改这一行，导入微信开发者工具就能跑。',
          },
        ].map((s, i) => (
          <motion.div
            key={s.n}
            {...fadeUp}
            transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="card-surface overflow-hidden"
          >
            <div className="flex items-center gap-3 px-6 pt-6">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ios-blue/10 text-[13px] font-bold text-ios-blue">
                {s.n}
              </span>
              <h3 className="fs-subheading font-bold">{s.title}</h3>
            </div>
            <pre className="mx-6 mt-4 overflow-x-auto rounded-xl bg-[#10131A] px-4 py-3.5 text-[12.5px] leading-relaxed text-[#C9D6EA]">
              <code>{s.code}</code>
            </pre>
            <p className="fs-small px-6 pb-6 pt-3.5 text-ink-soft">{s.note}</p>
          </motion.div>
        ))}
      </Grid>

      <motion.div {...fadeUp} className="mt-10 rounded-3xl border border-ios-blue/15 bg-ios-blue/[0.04] p-6 sm:p-8">
        <h3 className="fs-subheading font-bold">还有一件事别忘</h3>
        <p className="fs-body mt-3 text-ink-soft">
          小程序后台 →「开发」→「开发设置」→「服务器域名」，把接口域名同时加进
          <strong className="mx-1 text-ink-base">request 合法域名</strong>和
          <strong className="mx-1 text-ink-base">downloadFile 合法域名</strong>。
          后者不加的话，保存到相册会直接失败 —— 这是最容易漏的一步。
        </p>
      </motion.div>
    </Section>
  );
}

/* ============================ 页脚 ============================ */
function Footer() {
  return (
    <footer className="border-t border-canvas-line bg-white/70">
      <div className="container-fluid px-5 py-10 text-center sm:px-8">
        <p className="font-title text-[15px] font-extrabold">光影解析</p>
        <p className="fs-small mx-auto mt-3 max-w-[36rem] text-ink-mute">
          仅用于技术学习与演示，不提供任何内容存储与分发服务。请仅处理你本人拥有完整著作权的素材，
          严禁未经授权提取、转载他人作品。解析结果均来自第三方平台公开链接，本程序不对其内容的合法性负责。
        </p>
        <p className="fs-small mt-6 text-ink-faint">微信原生小程序 · Node.js 接口服务 · 个人开发者的技术实践作品</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main>
        <Hero />
        <Features />
        <Screens />
        <Arch />
        <Start />
      </main>
      <Footer />
    </div>
  );
}
