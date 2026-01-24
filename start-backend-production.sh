#!/bin/bash
# 启动 WOS Manager 后端
# 此脚本在 Cloudways 服务器上运行

APP_DIR="/home/996734.cloudwaysapps.com/vwvwhgqshd"
PID_FILE="$APP_DIR/backend.pid"
LOG_FILE="$APP_DIR/backend.log"

# 进入应用目录
cd "$APP_DIR" || exit 1

# 检查后端是否已在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "后端已在运行 (PID: $OLD_PID)"
        exit 0
    fi
fi

# 安装依赖（首次运行）
npm install > /dev/null 2>&1

# 生成 Prisma 客户端
npm run prisma:generate > /dev/null 2>&1

# 启动后端服务器
# 使用 nohup 和 & 使其在后台持续运行
NODE_ENV=production nohup npm run dev:server > "$LOG_FILE" 2>&1 &

# 保存进程 ID
echo $! > "$PID_FILE"

echo "✓ 后端已启动 (PID: $(cat "$PID_FILE"))"
