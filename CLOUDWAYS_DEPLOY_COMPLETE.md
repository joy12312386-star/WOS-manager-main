# 🚀 WOS Manager 完整部署方案

## 目前的問題
- Cloudways Shell Access 已禁用
- 需要通過 File Manager 和 API 部署

## ✅ 完成度檢查

- ✅ 前端編譯完成 (dist/)
- ✅ 後端代碼準備就緒 (server/)
- ✅ 數據庫 Schema 已配置 (prisma/)
- ✅ 部署包已壓縮 (wos-manager-deploy.tar.gz - 381KB)

## 部署方案 (2 種選擇)

### 方案 A: Cloudways Web 面板 (推薦)

#### 步驟 1: 上傳檔案
1. 登入 Cloudways: https://cloudways.com
2. 進入應用 `vwwwhgqshd`
3. 點擊 **File Manager**
4. 導航到 `/home/svs2438/applications/vwwwhgqshd/public_html`
5. **清空舊文件** (如果存在)
6. **上傳** 這兩個檔案:
   - `wos-manager-deploy.tar.gz` (381KB) - 從本地上傳
   - `deploy.sh` (下方提供) - 從本地上傳

#### 步驟 2: 執行部署
1. 在 Cloudways 面板中找到 **SSH/Terminal** 選項
2. 執行以下命令:

```bash
cd /home/svs2438/applications/vwwwhgqshd/public_html
chmod +x deploy.sh
./deploy.sh
```

#### 步驟 3: 驗證
- 訪問: http://172.105.217.161
- API: http://172.105.217.161:3001

---

### 方案 B: 使用 Cloudways Deploy Token API

如果你有 Cloudways API Token，可以自動化整個過程。

---

## 所需的 deploy.sh 腳本

建立檔案 `deploy.sh`:

```bash
#!/bin/bash
set -e

APP_PATH="/home/svs2438/applications/vwwwhgqshd/public_html"
cd "$APP_PATH"

echo "=========================================="
echo "WOS Manager Cloudways 部署 (v1)"
echo "=========================================="
echo ""

# 清除舊文件
echo "[1/7] 清除舊文件..."
rm -rf dist server prisma node_modules package-lock.json .env 2>/dev/null || true

# 解壓部署包
echo "[2/7] 解壓部署包..."
tar -xzf wos-manager-deploy.tar.gz
rm wos-manager-deploy.tar.gz

# 安裝依賴
echo "[3/7] 安裝依賴..."
npm install --production --silent

# 生成 Prisma
echo "[4/7] 生成 Prisma 客戶端..."
npx prisma generate --silent

# 初始化數據庫
echo "[5/7] 初始化 MySQL 數據庫..."
npx prisma migrate deploy --skip-generate

# PM2 設置
echo "[6/7] 配置 PM2..."
pm2 delete wos-manager 2>/dev/null || true
pm2 start "node dist/server/index.js" --name "wos-manager"
pm2 save

# 驗證
echo "[7/7] 驗證應用..."
pm2 status

echo ""
echo "✅ 部署完成！"
echo ""
echo "訪問地址:"
echo "  前端: http://172.105.217.161"
echo "  API: http://172.105.217.161:3001"
echo ""
echo "查看日誌: pm2 logs wos-manager"
```

---

## 快速檢查清單

在部署前確認:

- [ ] 已登入 Cloudways
- [ ] 已找到應用 `vwwwhgqshd`
- [ ] 已進入 File Manager
- [ ] `wos-manager-deploy.tar.gz` 在本地目錄
- [ ] 可以訪問 Terminal/SSH

---

## 故障排除

### 上傳失敗
- 檢查文件大小是否超過限制 (通常 2GB)
- 嘗試用瀏覽器直接上傳

### PM2 未找到
- 某些 Cloudways 環境需要全域安裝: `npm install -g pm2`

### 數據庫連接失敗
- 確認 `.env` 中的 `DATABASE_URL` 正確
- 驗證 MySQL 服務已啟動

### 應用無法啟動
```bash
pm2 logs wos-manager    # 查看日誌
node dist/server/index.js  # 手動測試
```

---

## 部署後檢查

```bash
# 查看應用狀態
pm2 status

# 查看應用日誌
pm2 logs wos-manager

# 查看前端文件
ls -la dist/

# 測試 API
curl http://localhost:3001/api/health
```

---

## 回滾 (如需要)

```bash
pm2 delete wos-manager
# 上傳舊版本的部署包並重新執行
```

---

**準備好了嗎？** 🚀
