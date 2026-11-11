'use strict';

const { hostOf } = require('../utils/url.js');

/**
 * 平台识别：按域名匹配，命中不了就当通用网页处理
 */
const PLATFORMS = [
  {
    key: 'douyin',
    name: '抖音',
    hosts: ['v.douyin.com', 'douyin.com', 'iesdouyin.com', 'douyinpic.com', 'douyinvod.com'],
    share: /(douyin\.com|iesdouyin\.com)/
  },
  {
    key: 'kuaishou',
    name: '快手',
    hosts: ['v.kuaishou.com', 'kuaishou.com', 'gifshow.com', 'chenzhongtech.com', 'kwimgs.com'],
    share: /(kuaishou\.com|chenzhongtech\.com)/
  },
  {
    key: 'xiaohongshu',
    name: '小红书',
    hosts: ['xhslink.com', 'xiaohongshu.com', 'xhscdn.com'],
    share: /(xiaohongshu\.com|xhslink\.com)/
  },
  {
    key: 'bilibili',
    name: '哔哩哔哩',
    hosts: ['b23.tv', 'bilibili.com', 'hdslb.com', 'bilivideo.com'],
    share: /(bilibili\.com|b23\.tv)/
  },
  {
    key: 'weibo',
    name: '微博',
    hosts: ['weibo.com', 'weibo.cn', 't.cn', 'sinaimg.cn'],
    share: /(weibo\.(com|cn)|t\.cn)/
  },
  {
    key: 'xigua',
    name: '西瓜视频',
    hosts: ['ixigua.com', 'xigua.com', 'ixiguavideo.com'],
    share: /(ixigua|xigua)\.com/
  },
  {
    key: 'pipixia',
    name: '皮皮虾',
    hosts: ['pipixia.com', 'ippapp.com'],
    share: /(pipixia|ippapp)\.com/
  },
  {
    key: 'weishi',
    name: '微视',
    hosts: ['weishi.qq.com', 'isee.weishi.qq.com'],
    share: /weishi\.qq\.com/
  }
];

function detect(url) {
  const host = hostOf(url);
  if (!host) return 'generic';
  for (const p of PLATFORMS) {
    for (const h of p.hosts) {
      if (host === h || host.endsWith(`.${h}`)) return p.key;
    }
  }
  return 'generic';
}

function platformName(key) {
  const p = PLATFORMS.find((x) => x.key === key);
  return p ? p.name : '其他';
}

/** 是不是需要先还原短链的平台（短链域名一眼能看出来） */
const SHORT_HOSTS = [
  'v.douyin.com',
  'v.kuaishou.com',
  'xhslink.com',
  'b23.tv',
  't.cn',
  'v.ixigua.com'
];

function isShortLink(url) {
  const host = hostOf(url);
  return SHORT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

module.exports = { detect, platformName, isShortLink, PLATFORMS };
