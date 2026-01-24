#!/bin/bash
set -e

# WOS Manager Cloudways 部署腳本
# 適用於 Shell 禁用的 Cloudways 環境
# 使用方式: 
#   1. 通過 Cloudways File Manager 上傳 wos-manager-deploy.tar.gz
#   2. SSH 進應用並執行此腳本: ./deploy.sh

APP_PATH="/home/svs2438/applications/vwwwhgqshd/public_html"
cd "$APP_PATH"

echo "=========================================="
echo "WOS Manager Cloudways 自動部署"
echo "=========================================="
echo ""

# 步驟 1: 清除舊文件
echo "[1/7] 清除舊文件..."
rm -rf dist server prisma node_modules package-lock.json .env .git 2>/dev/null || true
echo "✓ 已清除"
echo ""

# 步驟 2: 解壓部署包
echo "[2/7] 解壓部署包..."
if [ ! -f "wos-manager-deploy.tar.gz" ]; then
  echo "❌ 錯誤: 未找到 wos-manager-deploy.tar.gz"
  echo "請通過 Cloudways File Manager 上傳此檔案"
  exit 1
fi
tar -xzf wos-manager-deploy.tar.gz
rm wos-manager-deploy.tar.gz
echo "✓ 已解壓"
echo ""

# 步驟 3: 安裝 Node 依賴
echo "[3/7] 安裝 Node 依賴..."
npm install --production
echo "✓ 已安裝"
echo ""

# 步驟 4: 生成 Prisma 客戶端
echo "[4/7] 生成 Prisma 客戶端..."
npx prisma generate
echo "✓ 已生成"
echo ""

# 步驟 5: 初始化 MySQL 數據庫
echo "[5/7] 初始化 MySQL 數據庫..."
npx prisma migrate deploy
echo "✓ 數據庫已初始化"
echo ""

# 步驟 6: 配置 PM2 進程管理
echo "[6/7] 配置 PM2..."
npm install -g pm2
pm2 delete wos-manager 2>/dev/null || true
pm2 start "node dist/server/index.js" --name "wos-manager" --env production
pm2 save
echo "✓ PM2 已配置"
echo ""

# 步驟 7: 驗證應用狀態
echo "[7/7] 驗證應用..."
pm2 status
echo ""

echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📍 訪問地址:"
echo "   前端: http://172.105.217.161"
echo "   API: http://172.105.217.161:3001"
echo ""
echo "📊 查看日誌:"
echo "   pm2 logs wos-manager"
echo ""
echo "🔍 應用狀態:"
pm2 describe wos-manager

# 5. 啟動應用
echo "🎬 步驟 5/5：啟動應用..."
ssh ${SSH_USER}@${SSH_HOST} << 'EOF'
  cd /home/svs2438/applications/vwwwhgqshd/public_html
  # 確保 PM2 已安裝
  npm install -g pm2 2>/dev/null || true
  
  # 停止舊進程（如果存在）
  pm2 delete wos-manager 2>/dev/null || true
  
  # 啟動新應用
  pm2 start "node dist/server/index.js" --name "wos-manager"
  pm2 save
  
  echo "✅ 應用已啟動"
  pm2 list
EOF

echo ""
echo "=================================="
echo "🎉 部署完成！"
echo "=================================="
echo "前端地址: http://172.105.217.161"
echo "後端 API: http://172.105.217.161:3001"
echo ""
echo "部署過程摘要："
echo "✅ 舊應用已清除"
echo "✅ 新檔案已上傳"
echo "✅ 依賴已安裝"
echo "✅ 數據庫已初始化"
echo "✅ 應用已啟動"
