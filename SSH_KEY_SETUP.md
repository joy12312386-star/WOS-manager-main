# 🔐 Cloudways SSH Key 設定指南

## 你的公鑰

複製下方公鑰到 Cloudways:

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDHHdDo8IuKqLEK/irxVNhJs8/3f5SQmi84xvAal4LAFVrOtqccjgSBfB0eDcDq7H0mY/yr1R+3T5vpbmG77SI2yBdFWj08v75up3ZXnWTux/s/UO8JthkhXlCOXgiNVBfq0A39v1hnOWFR1mK18rBrVbGI3TKwGw1gbS2Cd5mAmDw9ad5Wkcdr4GX/SK2i/xJJnh72sR9F/iU/47Plb/hvEGAHGCaFfV8D6ImeCZL/mPB86RHPPGsXatR2TYnFBHxWTvxNyDC+cRRHmWsLz9cr2pgI2pl098apVmAzIwIaeyT12ENt5f+h9kMhRl80GgwEjWLfuuYBzFekt1est8kY/XaK7FDpG19Z/JLEUlu6Y0fdYYBC3Y2fS6BiVGTlu1G9l5LO5g2anXEVfPpqmj+7ynH378QctBAm85rEa5HLn/uZNJn8Si6X6QjUJlpOJ7tMtZ+ZxMgwTw5aqKvkoa8Fy5AYexKG7IFyNrzVG0PwVHLLgrV8Qos5tNs6nHi78JGi9H60XRhs00IqZ2ke6klDz63oqnuAYEWkbMmYyH9Z2YdOj8u1pkNWHnzE2ObSJlQ8g4XzIQzHAhLUwNNhDVeHhx+TCkrlzE7Cni+5IwUDdcAVRcR+UZC/6LWJfrbDC0WbYoPZLMJubPVk8pWTCSA3CJEjiYFfuooehHwU/grLjw== wos-manager@cloudways
```

## 📋 Cloudways 設定步驟

### 1️⃣ 進入帳戶設定
1. 登入 https://cloudways.com
2. 點擊右上角頭像 → **Account Settings**
3. 在左側菜單找到 **SSH Keys**

### 2️⃣ 添加新 SSH Key
1. 點擊 **Add SSH Key** 按鈕
2. 給 Key 起個名字: `WOS-Manager Deployment`
3. 複製上方的完整公鑰到文本框
4. 點擊 **Save**

### 3️⃣ 等待同步
- Cloudways 會自動將 Key 同步到所有伺服器
- 通常需要 30 秒 - 2 分鐘

## 🚀 設定完成後使用

設定完成後，執行自動部署：

```bash
cd /Users/wira/Downloads/WOS-manager-main

# 使用新的自動部署工具（無需輸入密碼）
/Users/wira/Downloads/WOS-manager-main/.venv/bin/python auto_deploy_with_key.py
```

## 📁 金鑰文件位置

- **私鑰**: `/Users/wira/.ssh/cloudways_rsa` (保密)
- **公鑰**: `/Users/wira/.ssh/cloudways_rsa.pub` (提交給 Cloudways)

## 🔍 驗證 Key 是否生效

設定完成後，在終端測試連接：

```bash
ssh -i /Users/wira/.ssh/cloudways_rsa svs2438@172.105.217.161 "whoami"
```

如果顯示 `svs2438`，說明 Key 已生效！

---

**⏱️ 預計設定時間: 3-5 分鐘**

設定完成後告訴我，我會執行自動部署! 🎯
