#!/bin/bash
# WOS Manager 完整部署腳本 - 複製到 Cloudways Terminal 執行

set -e

echo "=========================================="
echo "🔧 WOS Manager 完整部署和修復"
echo "=========================================="
echo ""

APP_PATH="/public_html"
cd "$APP_PATH"

# 步驟 1: 清除舊文件
echo "[1/7] 清除舊檔案..."
rm -rf dist node_modules .next
echo "✓ 完成"
echo ""

# 步驟 2: 解壓部署包
echo "[2/7] 解壓部署包..."
if [ -f "wos-manager-deploy.tar.gz" ]; then
    tar -xzf wos-manager-deploy.tar.gz
    echo "✓ 完成"
else
    echo "❌ 找不到 wos-manager-deploy.tar.gz"
    exit 1
fi
echo ""

# 步驟 3: 安裝依賴
echo "[3/7] 安裝 NPM 依賴..."
npm install --production
echo "✓ 完成"
echo ""

# 步驟 4: 生成 Prisma
echo "[4/7] 生成 Prisma 客戶端..."
npx prisma generate
echo "✓ 完成"
echo ""

# 步驟 5: 初始化數據庫
echo "[5/7] 初始化 MySQL 數據庫..."
npx prisma migrate deploy
echo "✓ 完成"
echo ""

# 步驟 6: 配置 PM2
echo "[6/7] 配置 PM2..."
pm2 delete wos-manager 2>/dev/null || true
pm2 start "node dist/server/index.js" --name "wos-manager" --env production
pm2 save
echo "✓ 完成"
echo ""

# 步驟 7: 驗證
echo "[7/7] 驗證應用..."
pm2 status
echo ""

echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📍 應用訪問地址:"
echo "   前端: http://172.105.217.161"
echo "   API: http://172.105.217.161:3001"
echo ""
echo "📝 查看日誌:"
echo "   pm2 logs wos-manager"
