#!/usr/bin/env bash
# 冒烟测试：部署完先跑一遍，看哪条链路是通的
# 用法：bash smoke-test.sh https://api.your-domain.com

set -u
BASE="${1:-http://127.0.0.1:3000}"
BASE="${BASE%/}"

PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
dim()   { printf "\033[90m%s\033[0m\n" "$1"; }

check() {
  local name="$1"; local ok="$2"; local extra="${3:-}"
  if [ "$ok" = "1" ]; then
    green "  ✔ $name"
    PASS=$((PASS+1))
  else
    red   "  ✘ $name"
    [ -n "$extra" ] && dim "      $extra"
    FAIL=$((FAIL+1))
  fi
}

echo "目标: $BASE"
echo

echo "[1/5] 健康检查"
H=$(curl -s -m 15 "$BASE/api/health" || true)
echo "$H" | grep -q '"status":"ok"' && check "服务存活" 1 || check "服务存活" 0 "$H"

echo "[2/5] 平台列表"
P=$(curl -s -m 15 "$BASE/api/platforms" || true)
echo "$P" | grep -q '"key":"douyin"' && check "平台接口正常" 1 || check "平台接口正常" 0 "$P"

echo "[3/5] 参数校验"
C=$(curl -s -m 15 -o /dev/null -w '%{http_code}' -X POST "$BASE/api/parse" \
      -H 'content-type: application/json' -d '{"url":""}')
[ "$C" = "400" ] && check "空参数被拦截(400)" 1 || check "空参数被拦截(400)" 0 "实际 $C"

echo "[4/5] 真实解析（抖音）"
R=$(curl -s -m 60 -X POST "$BASE/api/parse" \
      -H 'content-type: application/json' \
      -d '{"url":"https://v.douyin.com/L4NpDJ6"}' || true)
if echo "$R" | grep -q '"code":0'; then
  TITLE=$(echo "$R" | sed -n 's/.*"title":"\([^"]*\)".*/\1/p' | head -1)
  check "抖音解析成功" 1
  dim "      标题: $TITLE"
  MEDIA=$(echo "$R" | sed -n 's/.*"media":\[{"type":"[a-z]*","url":"\([^"]*\)".*/\1/p' | head -1)
  if [ -n "$MEDIA" ]; then
    echo "[5/5] 下载中转"
    ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$MEDIA" 2>/dev/null || echo "$MEDIA")
    DC=$(curl -s -m 60 -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-200000' "$BASE/api/download?u=$ENC")
    if [ "$DC" = "200" ] || [ "$DC" = "206" ]; then
      check "素材中转可下载($DC)" 1
    else
      check "素材中转可下载" 0 "HTTP $DC"
    fi
  else
    dim "  跳过下载测试（未取到直链）"
  fi
else
  check "抖音解析成功" 0 "$(echo "$R" | head -c 200)"
  dim "  解析失败通常是平台风控或接口变更，详见 README 第四节"
fi

echo
echo "结果: 通过 $PASS 项，失败 $FAIL 项"
[ "$FAIL" -eq 0 ] && green "全部通过" || red "有项目未通过"
exit 0
