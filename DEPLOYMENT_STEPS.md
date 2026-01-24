# WOS Manager Cloudways 部署指南

## 伺服器信息
- **IP**: 172.105.217.161
- **SSH 用戶**: svs2438
- **應用路徑**: /home/svs2438/applications/vwwwhgqshd/public_html
- **MySQL 數據庫**: vwwwhgqshd
- **MySQL 用戶**: vwwwhgqshd
- **MySQL 密碼**: S7BsSNaG74

## 部署步驟

### 步驟 1: 準備部署包 ✅
部署包已準備完成：`wos-manager-deploy.tar.gz` (381KB)

包含文件：
- `dist/` - 前端編譯版本
- `server/` - 後端源代碼
- `prisma/` - 數據庫 schema
- `package.json` - 依賴配置
- `.env` - 環境變數

### 步驟 2: 上傳到 Cloudways

**方式 A: 通過 Cloudways 面板 (推薦新手)**
1. 登入 https://cloudways.com
2. 進入應用 → File Manager
3. 導航到 `/home/svs2438/applications/vwwwhgqshd/public_html`
4. 刪除所有現有文件
5. 上傳 `wos-manager-deploy.tar.gz`
6. 在面板中解壓

**方式 B: 通過 SSH/SFTP**
```bash
cd /Users/wira/Downloads/WOS-manager-main
scp wos-manager-deploy.tar.gz svs2438@172.105.217.161:/home/svs2438/applications/vwwwhgqshd/public_html/
```

### 步驟 3: 遠程服務器配置

SSH 進入服務器：
```bash
ssh svs2438@172.105.217.161
```

在服務器上執行：
```bash
cd /home/svs2438/applications/vwwwhgqshd/public_html

# 清除舊文件並解壓
rm -rf *
tar -xzf wos-manager-deploy.tar.gz
rm wos-manager-deploy.tar.gz

# 安裝依賴
npm install --production

# 生成 Prisma 客戶端
npx prisma generate

# 初始化 MySQL 數據庫
npx prisma migrate deploy

# 安裝 PM2 (用於進程管理)
npm install -g pm2

# 啟動應用
pm2 start "node dist/server/index.js" --name "wos-manager"
pm2 save
pm2 startup

# 驗證運行狀態
pm2 status
```

### 步驟 4: Cloudways 面板設置

在 Cloudways 應用設置中配置環境變數：
- `NODE_ENV` = `production`
- `PORT` = `3001`
- `DATABASE_URL` = `mysql://vwwwhgqshd:S7BsSNaG74@localhost:3306/vwwwhgqshd`

## 驗證部署

✓ 前端訪問: http://172.105.217.161
✓ 後端 API: http://172.105.217.161:3001
✓ 應該能完整登入並使用所有功能

## 故障排除

### 無法連接 MySQL
```bash
# 檢查連接
mysql -h localhost -u vwwwhgqshd -p

# 查看 .env
cat .env | grep DATABASE_URL
```

### 應用未啟動
```bash
# 查看 PM2 日誌
pm2 logs wos-manager

# 手動測試
node dist/server/index.js
```

### 數據庫遷移失敗
```bash
# 嘗試重新推送 schema
npx prisma db push

# 或查看遷移狀態
npx prisma migrate status
```

## 回滾指令

如需回滾到上一版本：
```bash
pm2 delete wos-manager
# 恢復舊文件或上傳舊版本 tar.gz
# 重新執行部署步驟 3
```
