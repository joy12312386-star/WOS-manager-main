#!/bin/bash
# 在 Cloudways 上启动后端的脚本
# 此脚本不依赖 npm install

APP_DIR="/home/996734.cloudwaysapps.com/vwvwhgqshd"
cd "$APP_DIR/public_html" || exit 1

# 尝试找到 Node.js
NODE_BIN=$(which node || find /usr -name node -type f 2>/dev/null | head -1)
if [ -z "$NODE_BIN" ]; then
    NODE_BIN="/usr/bin/node"
fi

# 尝试找到 npm
NPM_BIN=$(which npm || find /usr -name npm -type f 2>/dev/null | head -1)
if [ -z "$NPM_BIN" ]; then
    NPM_BIN="/usr/bin/npm"
fi

echo "使用 Node: $NODE_BIN"
echo "使用 npm: $NPM_BIN"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    # 尝试不同的 npm 安装方法
    $NPM_BIN install --prefer-offline --no-audit --no-optional --legacy-peer-deps || {
        echo "npm install 失败，尝试清理..."
        rm -rf node_modules
        $NPM_BIN cache clean --force
        $NPM_BIN install
    }
fi

# 启动后端
echo "启动后端服务器..."
export NODE_ENV=production
nohup $NPM_BIN run dev:server > backend.log 2>&1 &

echo "后端已启动"
