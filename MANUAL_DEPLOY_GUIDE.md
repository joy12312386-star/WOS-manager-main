# 🚀 Cloudways 手動部署指南 (Shell 禁用環境)

由於 Cloudways Shell Access 被禁用，需要通過 **Web 面板的 File Manager** 上傳文件。

## 📋 準備工作

確保你有以下文件在 `/Users/wira/Downloads/WOS-manager-main/`:
- ✓ `wos-manager-deploy.tar.gz` (381 KB)
- ✓ `deploy.sh` (部署腳本)

## 🎯 部署步驟 (5 分鐘)

### 1️⃣ 登入 Cloudways
1. 打開瀏覽器進入 https://cloudways.com
2. 使用你的帳號登入
3. 進入應用 **vwwwhgqshd**

### 2️⃣ 打開 File Manager
1. 點擊左側菜單中的 **File Manager**
   - 或在應用詳情頁找到 **Tools** → **File Manager**
2. 會自動進入應用的主目錄

### 3️⃣ 刪除舊文件（重要！）
如果目錄中有舊文件，全部刪除：
- 選擇所有文件: 按 `Ctrl+A`
- 點擊 **Delete**
- 確認刪除

### 4️⃣ 上傳部署包
1. 點擊 **Upload** 按鈕
2. 選擇本地文件: `wos-manager-deploy.tar.gz`
3. 上傳完成會顯示進度條

### 5️⃣ 上傳部署腳本
1. 再次點擊 **Upload** 按鈕
2. 選擇本地文件: `deploy.sh`
3. 上傳完成

上傳完後應該能看到：
```
public_html/
├── wos-manager-deploy.tar.gz
└── deploy.sh
```

### 6️⃣ 執行部署腳本

#### 方式 A: 使用 Cloudways Terminal (推薦)
1. 在 File Manager 中找到 `deploy.sh`
2. 右鍵點擊 → 選擇 **SSH Terminal** 或 **Execute**
3. 或在 Cloudways 面板中找到 **Terminal** 選項
4. 執行以下命令：

```bash
cd /home/svs2438/applications/vwwwhgqshd/public_html
chmod +x deploy.sh
./deploy.sh
```

#### 方式 B: 通過 Cloudways Dashboard
1. 進入應用詳情
2. 找到 **Application Settings** 
3. 查看是否有 **SSH Terminal** 或 **Execute Script** 選項
4. 點擊並執行上述命令

### 7️⃣ 等待部署完成
部署腳本會執行以下步驟（約 3-5 分鐘）：
```
[1/7] 清除舊文件...
[2/7] 解壓部署包...
[3/7] 安裝 Node 依賴...
[4/7] 生成 Prisma 客戶端...
[5/7] 初始化 MySQL 數據庫...
[6/7] 配置 PM2...
[7/7] 驗證應用...
✅ 部署完成！
```

### 8️⃣ 驗證部署成功

部署完成後，應該能訪問：
- 前端: http://172.105.217.161
- API: http://172.105.217.161:3001

如果能正常訪問並登入應用，說明部署成功！ ✅

## 📊 查看應用狀態

部署完成後，要查看應用日誌或狀態，可以：

1. 在 Cloudways **Application Settings** 中查看日誌
2. 或在終端執行：
```bash
pm2 status
pm2 logs wos-manager
```

## ❌ 常見問題

### Q: File Manager 中找不到上傳的文件？
**A:** 
- 確認上傳完成（進度條消失）
- 刷新頁面: `F5`
- 確認在正確的目錄: `/home/svs2438/applications/vwwwhgqshd/public_html`

### Q: 執行腳本時出錯？
**A:**
- 檢查 `deploy.sh` 是否可執行: `chmod +x deploy.sh`
- 查看錯誤日誌: `pm2 logs wos-manager --lines 50`
- 確認 MySQL 數據庫已創建

### Q: 無法訪問應用？
**A:**
- 確認應用已啟動: `pm2 status` (狀態應該是 `online`)
- 檢查防火牆是否打開 80/443 端口
- 等待 1-2 分鐘，DNS 可能需要時間生效
- 檢查瀏覽器緩存

### Q: 數據庫連接失敗？
**A:**
- 確認 `.env` 中的 `DATABASE_URL` 正確
- 檢查 MySQL 是否運行
- 驗證數據庫用戶名/密碼: `vwwwhgqshd` / `S7BsSNaG74`

## 🔄 回滾操作

如果需要回滾到舊版本：

1. 刪除當前應用: `pm2 delete wos-manager`
2. 清空目錄: File Manager 中刪除所有文件
3. 上傳舊版本的 `wos-manager-deploy.tar.gz`
4. 重新執行 `deploy.sh`

## 💡 提示

- 首次部署可能較慢（需要安裝依賴），請耐心等待
- 如果看到 `✅ 部署完成！` 就說明成功了
- 應用啟動後約 30 秒內可訪問

---

**現在就開始上傳吧！** 🎯

有任何問題，查看 `pm2 logs wos-manager` 的日誌。
