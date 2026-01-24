#!/bin/bash
# 后端启动脚本

# 进入应用目录
cd /home/996734.cloudwaysapps.com/vwvwhgqshd

# 安装依赖（如果需要）
npm install

# 生成 Prisma 客户端
npm run prisma:generate

# 启动后端服务器
# 使用 nohup 使其在后台运行
nohup npm run dev:server > backend.log 2>&1 &

# 记录进程 ID
echo $! > backend.pid

echo "Backend started. PID: $(cat backend.pid)"
