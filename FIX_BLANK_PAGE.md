# ⚠️ 部署修復指南

## 🔍 問題診斷

應用空白的原因：
- ❌ `dist/` 目錄為空 - 前端沒有編譯
- ❌ `node_modules/` 不存在 - 依賴未安裝
- ⚠️ `deploy.sh` 沒有正確執行

**原因**: Cloudways Shell Access 被禁用，腳本無法自動執行

---

## 🔧 修復步驟

### 1️⃣ 進入 Cloudways Terminal

**A. 使用 Cloudways 面板 (推薦)**
1. 進入 https://cloudways.com
2. 選擇應用 **vwwwhgqshd**
3. 在應用詳情找到 **SSH Terminal** 或 **Terminal**
4. 點擊進入終端

**B. 或通過 SSH 連接**
```bash
ssh -i /Users/wira/.ssh/cloudways_rsa svs2438@172.105.217.161
```

### 2️⃣ 複製粘貼以下命令到 Terminal 執行

```bash
cd /public_html && bash << 'DEPLOY_EOF'
set -e

echo "=========================================="
echo "🔧 WOS Manager 完整部署"
echo "=========================================="
echo ""

# 步驟 1: 清除舊檔案
echo "[1/7] 清除舊檔案..."
rm -rf dist node_modules .next
echo "✓ 完成"
echo ""

# 步驟 2: 解壓部署包
echo "[2/7] 解壓部署包..."
tar -xzf wos-manager-deploy.tar.gz
echo "✓ 完成"
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
echo "📍 應用訪問:"
echo "   前端: http://172.105.217.161"
echo "   API: http://172.105.217.161:3001"

DEPLOY_EOF
```

### 3️⃣ 等待執行完成（約 3-5 分鐘）

應該看到類似輸出：
```
[1/7] 清除舊檔案...
[2/7] 解壓部署包...
[3/7] 安裝 NPM 依賴...
[4/7] 生成 Prisma 客戶端...
[5/7] 初始化 MySQL 數據庫...
[6/7] 配置 PM2...
[7/7] 驗證應用...
✅ 部署完成！
```

### 4️⃣ 驗證應用

訪問:
- 🌐 **前端**: http://172.105.217.161
- 🔌 **API**: http://172.105.217.161:3001

應該能看到登入頁面！

---

## 📊 故障排除

### 安裝依賴卡住
- 等待 2-3 分鐘，npm 安裝可能比較慢
- 或檢查伺服器網絡連接

### 數據庫遷移失敗
```bash
# 檢查數據庫連接
mysql -u vwwwhgqshd -p

# 手動檢查 .env
cat .env | grep DATABASE_URL
```

### 應用未啟動
```bash
# 查看日誌
pm2 logs wos-manager

# 手動啟動測試
node dist/server/index.js
```

### 前端仍是空白
```bash
# 檢查前端文件
ls -lh dist/

# 查看伺服器日誌
pm2 logs wos-manager --lines 50
```

---

## 💡 快速命令參考

```bash
# 查看應用狀態
pm2 status

# 查看應用日誌
pm2 logs wos-manager

# 重啟應用
pm2 restart wos-manager

# 停止應用
pm2 stop wos-manager

# 檢查前端文件
ls -lh /public_html/dist/

# 檢查依賴
ls /public_html/node_modules | wc -l
```

---

**立即複製上方腳本到 Cloudways Terminal 執行！** 🚀
