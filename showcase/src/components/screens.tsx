import type { ReactNode } from 'react';
import { ChevronLeft, Clock, Info, Search, Play, Download, Link2, Type, Film } from 'lucide-react';

/* ============================================================
   手机外壳 + 状态栏
   ============================================================ */
export function PhoneFrame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative shrink-0 overflow-hidden rounded-[2.6rem] border-[7px] border-ink-base bg-white"
        style={{ width: 288, boxShadow: 'var(--shadow-phone)' }}
      >
        {/* 刘海 */}
        <div className="absolute left-1/2 top-2 z-20 h-[18px] w-[86px] -translate-x-1/2 rounded-full bg-ink-base" />
        {/* 状态栏 */}
        <div className="flex items-center justify-between px-5 pb-1 pt-[9px] text-[10px] font-semibold text-ink-base">
          <span>9:41</span>
          <span className="flex items-center gap-[3px]">
            <span className="flex items-end gap-[1.5px]">
              {[3, 5, 7, 9].map((h) => (
                <i key={h} className="block w-[2px] rounded-sm bg-ink-base" style={{ height: h }} />
              ))}
            </span>
            <i className="ml-1 block h-[7px] w-[12px] rounded-[2px] border border-ink-base/70" />
            <i className="block h-[5px] w-[9px] rounded-[1px] bg-ink-base" />
          </span>
        </div>
        <div className="h-[420px] overflow-hidden bg-canvas-base">{children}</div>
        {/* Home 指示条 */}
        <div className="flex justify-center bg-white pb-[6px] pt-[5px]">
          <i className="block h-[4px] w-[92px] rounded-full bg-ink-base/80" />
        </div>
      </div>
      {label ? <span className="fs-small text-ink-mute">{label}</span> : null}
    </div>
  );
}

function NavTitle({ title, back }: { title: string; back?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-[13px] font-semibold">
      {back ? <ChevronLeft size={16} className="text-ios-blue" /> : <span className="w-4" />}
      <span>{title}</span>
      <span className="w-4" />
    </div>
  );
}

/* ============================================================
   1. 解析首页
   ============================================================ */
export function ParseScreen() {
  return (
    <div className="h-full">
      <NavTitle title="光影解析" />
      <div className="px-4">
        <p className="text-[8px] font-bold tracking-[0.18em] text-ios-blue/70">
          SHORT VIDEO TOOLKIT
        </p>
        <h4 className="mt-1 text-[24px] font-extrabold leading-none text-ink-base">光影解析</h4>
        <p className="mt-1.5 text-[11px] text-ink-mute">粘贴分享链接，取回无水印原片</p>

        <div className="mt-4 rounded-2xl bg-white p-3 shadow-soft">
          <p className="min-h-[52px] text-[11px] leading-relaxed text-ink-faint">
            https://v.douyin.com/L4NpDJ6/ 让你在几秒钟之内记住我…
          </p>
          <div className="mt-2 flex items-center gap-2 border-t border-canvas-line pt-2">
            <span className="flex items-center gap-1 rounded-full bg-ios-blue/10 px-2 py-[3px] text-[9px] font-medium text-ios-blue">
              <i className="block h-[5px] w-[5px] rounded-full bg-ios-blue" />
              读取剪贴板
            </span>
            <span className="rounded-full bg-ink-faint/20 px-2 py-[3px] text-[9px] text-ink-mute">
              清空
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex h-[38px] items-center justify-center rounded-2xl text-[13px] font-semibold text-white"
          style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
        >
          开始解析
        </div>
        <p className="mt-2 text-center text-[9px] text-ink-faint">
          只做链接解析，不留存任何素材
        </p>

        <p className="mt-4 text-[11px] font-semibold text-ink-base">支持的平台</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            ['抖音', '#000000'],
            ['快手', '#FF4906'],
            ['小红书', '#FF2442'],
            ['哔哩哔哩', '#00A1D6'],
            ['微博', '#E6162D'],
          ].map(([name, c]) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-[5px] text-[9px] text-ink-soft shadow-soft"
            >
              <i className="block h-[6px] w-[6px] rounded-full" style={{ background: c }} />
              {name}
            </span>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-semibold text-ink-base">最近解析</p>
        <div className="mt-2 space-y-0 overflow-hidden rounded-2xl bg-white shadow-soft">
          {[
            ['让你在几秒钟之内记住我', '抖音'],
            ['骑白马的也可以是公主', '抖音'],
          ].map(([t, p], i) => (
            <div key={t} className={`flex items-center gap-2.5 px-3 py-2.5 ${i ? 'border-t border-canvas-line' : ''}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E7ECF5] to-[#D9E3F3]">
                <Play size={10} className="text-white" fill="white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-medium">{t}</p>
                <p className="mt-0.5 text-[9px] text-ink-faint">
                  <span className="font-semibold text-ink-mute">{p}</span> · 刚刚
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   2. 预览与导出
   ============================================================ */
export function PreviewScreen() {
  const rows = [
    [Download, '保存视频到相册', 'bg-ios-blue/12 text-ios-blue'],
    [Link2, '复制原片直链', 'bg-ios-green/14 text-ios-green'],
    [Type, '复制标题文案', 'bg-ios-orange/14 text-ios-orange'],
    [Film, '复制原始分享链接', 'bg-ink-faint/22 text-ink-mute'],
  ] as const;

  return (
    <div className="h-full">
      <NavTitle title="预览与导出" back />
      <div className="px-4">
        <div className="relative h-[176px] overflow-hidden rounded-3xl bg-[#0B0B0F] shadow-lift">
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 backdrop-blur">
              <Play size={16} className="ml-0.5 text-white" fill="white" />
            </div>
            <span className="text-[9px] text-white/45">00:14</span>
          </div>
          <div className="absolute bottom-2 right-2 h-[6px] w-[52%] rounded-full bg-white/16">
            <div className="h-full w-[38%] rounded-full bg-white/70" />
          </div>
        </div>

        <div className="mt-3 rounded-3xl bg-white p-3 shadow-soft">
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-black/8 px-2 py-[3px] text-[9px] font-semibold text-ink-base">
              抖音
            </span>
            <span className="rounded-full bg-ink-faint/20 px-2 py-[3px] text-[9px] text-ink-mute">
              视频
            </span>
            <span className="rounded-full bg-ink-faint/20 px-2 py-[3px] text-[9px] text-ink-mute">
              0:14
            </span>
          </div>
          <p className="mt-2 text-[13px] font-semibold leading-snug">
            让你在几秒钟之内记住我
          </p>
          <p className="mt-1 text-[10px] text-ink-faint">@Real机智张</p>
        </div>

        <p className="mt-4 text-[11px] font-semibold">导出</p>
        <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-soft">
          {rows.map(([Icon, label, tone], i) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 px-3 py-2.5 ${i ? 'border-t border-canvas-line' : ''}`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={12} />
              </div>
              <span className="flex-1 text-[11px]">{label}</span>
              <ChevronLeft size={11} className="rotate-180 text-ink-faint" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   3. 历史（含左滑删除）
   ============================================================ */
export function HistoryScreen() {
  const items = [
    ['让你在几秒钟之内记住我', '抖音', '#000000', false],
    ['骑白马的也可以是公主#百万转场变身', '抖音', '#000000', false],
    ['周末探店：这条街的咖啡都在这里', '小红书', '#FF2442', true],
  ] as const;

  return (
    <div className="h-full">
      <NavTitle title="解析历史" />
      <div className="px-4">
        <h4 className="text-[22px] font-extrabold leading-tight">解析历史</h4>
        <p className="mt-1 text-[10.5px] text-ink-soft">共 3 条 · 只存在你自己的设备上</p>

        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-soft">
          {items.map(([t, p, c, swiped], i) => (
            <div key={t} className={`relative ${i ? 'border-t border-canvas-line' : ''}`}>
              <div className="absolute inset-y-0 right-0 flex w-[62px] items-center justify-center bg-ios-red text-[10px] font-medium text-white">
                删除
              </div>
              <div
                className="relative flex items-center gap-2.5 bg-white px-3 py-3 transition-transform"
                style={{ transform: swiped ? 'translateX(-62px)' : 'none' }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E7ECF5] to-[#D9E3F3]">
                  <Play size={11} className="text-white" fill="white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10.5px] font-medium leading-snug">{t}</p>
                  <p className="mt-0.5 text-[9px] text-ink-faint">
                    <span className="font-semibold" style={{ color: c }}>
                      {p}
                    </span>{' '}
                    · 2 小时前
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex h-[38px] items-center justify-center rounded-2xl bg-ios-red/10 text-[12px] font-semibold text-ios-red">
          清空全部记录
        </div>
        <p className="mt-2 text-center text-[9px] text-ink-faint">左滑单条可以删除</p>
      </div>
    </div>
  );
}

/* ============================================================
   4. 关于（分组式设置页）
   ============================================================ */
export function AboutScreen() {
  return (
    <div className="h-full">
      <NavTitle title="关于" />
      <div className="px-4">
        <div className="flex flex-col items-center pb-4 pt-1">
          <div
            className="relative flex h-[62px] w-[62px] items-center justify-center rounded-[20px]"
            style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30">
              <Play size={14} className="ml-0.5 text-white" fill="white" />
            </div>
          </div>
          <p className="mt-2.5 text-[15px] font-bold">光影解析</p>
          <p className="mt-0.5 text-[9.5px] text-ink-faint">版本 1.0.0 · 技术演示版</p>
        </div>

        <p className="mb-1.5 px-2 text-[10px] text-ink-mute">运行状态</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          {[
            ['解析服务', '连接正常', true],
            ['服务地址', 'api.…com', false],
            ['本地记录', '12 条', false],
          ].map(([k, v, ok], i) => (
            <div
              key={k as string}
              className={`flex items-center justify-between px-3 py-2.5 text-[11px] ${i ? 'border-t border-canvas-line' : ''}`}
            >
              <span>{k}</span>
              <span className={`flex items-center gap-1.5 ${ok ? 'text-ios-green' : 'text-ink-faint'}`}>
                {ok ? (
                  <i className="block h-[5px] w-[5px] rounded-full bg-ios-green shadow-[0_0_0_3px_rgba(52,199,89,0.16)]" />
                ) : null}
                {v}
              </span>
            </div>
          ))}
        </div>

        <p className="mb-1.5 mt-3.5 px-2 text-[10px] text-ink-mute">隐私与数据</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          {[
            ['个人信息', '不采集'],
            ['解析记录', '仅本机存储'],
            ['服务端留存', '不落库'],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-center justify-between px-3 py-2.5 text-[11px] ${i ? 'border-t border-canvas-line' : ''}`}
            >
              <span>{k}</span>
              <span className="text-ink-faint">{v}</span>
            </div>
          ))}
        </div>

        <p className="mb-1.5 mt-3.5 px-2 text-[10px] text-ink-mute">技术信息</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          {[
            ['客户端', '微信原生小程序'],
            ['服务端', 'Node.js 接口服务'],
            ['数据存储', '本地 Storage'],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-center justify-between px-3 py-2.5 text-[11px] ${i ? 'border-t border-canvas-line' : ''}`}
            >
              <span>{k}</span>
              <span className="text-ink-faint">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tab 栏（给首页预览用，可选）
   ============================================================ */
export function TabBar({ active = 0 }: { active?: number }) {
  const tabs = [
    { icon: Search, label: '解析' },
    { icon: Clock, label: '历史' },
    { icon: Info, label: '关于' },
  ];
  return (
    <div className="mt-1 flex border-t border-canvas-line bg-white/90 px-6 pt-1.5 backdrop-blur">
      {tabs.map((t, i) => (
        <div
          key={t.label}
          className={`flex flex-1 flex-col items-center gap-0.5 text-[8px] ${
            i === active ? 'text-ios-blue' : 'text-ink-mute'
          }`}
        >
          <t.icon size={13} />
          {t.label}
        </div>
      ))}
    </div>
  );
}
