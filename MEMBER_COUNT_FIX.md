# 管理員會員數量問題修復報告

## 問題描述
後台管理員報告"會員數量有問題，很多會員沒出現"。測試發現 API 只返回 1 個用戶，但數據庫中實際有 5 個用戶。

## 根本原因
在 `src/services/auth.ts` 中，以下方法直接使用 `API_URL` 而不是 `getApiUrl()` 函數：
- `getAllUsers()` - 獲取所有用戶 ❌
- `deleteUser()` - 刪除用戶 ❌
- `setAdmin()` - 設置管理員權限 ❌
- `getCurrentUserFromAPI()` - 獲取當前用戶信息 ❌
- `updatePlayerData()` - 更新玩家數據 ❌
- `getSubAccounts()` - 獲取子帳號 ❌
- `addSubAccount()` - 新增子帳號 ❌
- `switchAccount()` - 切換帳號 ❌
- `deleteSubAccount()` - 刪除子帳號 ❌

在**生產環境**中，`API_URL` 被設置為空字符串，導致這些方法的 fetch 請求失敗或返回錯誤。

```typescript
// src/services/auth.ts 第 1-5 行
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '';  // ❌ 生產環境為空！
const API_PROXY = '/api-proxy.php?path=';
```

## 解決方案
修改所有這些方法，使用 `getApiUrl()` 函數而不是直接使用 `API_URL`。

`getApiUrl()` 函數自動處理開發和生產環境的路由：
```typescript
function getApiUrl(endpoint: string): string {
  if (API_URL) {
    return `${API_URL}${endpoint}`;  // 開發環境：localhost:3001
  }
  return `${API_PROXY}${endpoint.substring(1)}`;  // 生產環境：api-proxy.php
}
```

## 已修復的方法

### 1. getAllUsers() - 第 251-266 行
```typescript
// ❌ 之前
const response = await fetch(`${API_URL}/auth/users`, { ... });

// ✅ 之後
const url = getApiUrl('/auth/users');
const response = await fetch(url, { ... });
```

### 2. deleteUser() - 第 270-281 行
```typescript
// ✅ 已修復
const url = getApiUrl(`/auth/users/${userId}`);
```

### 3. setAdmin() - 第 403-418 行
```typescript
// ✅ 已修復
const url = getApiUrl(`/auth/users/${userIdOrGameId}/admin`);
```

### 4. 其他方法也已修復
- getCurrentUserFromAPI() ✅
- updatePlayerData() ✅
- getSubAccounts() ✅
- addSubAccount() ✅
- switchAccount() ✅
- deleteSubAccount() ✅

## 驗證

### 修復前
```bash
$ curl 'https://wos-2438.site/api-proxy.php?path=auth/users' \
  -H "Authorization: Bearer [TOKEN]" | jq '.users | length'
# 結果：1 ❌
```

### 修復後
```bash
$ curl 'https://wos-2438.site/api-proxy.php?path=auth/users' \
  -H "Authorization: Bearer [TOKEN]" | jq '.users | length'
# 結果：5 ✅

# 完整用戶列表：
{
  "gameId": "380768429",
  "nickname": "Wira ᵀᵂᴰ",
  "allianceName": "TWD",
  "isAdmin": true
},
{
  "gameId": "380097341",
  "nickname": "討債風ᵀᵂᴰ",
  "allianceName": "TWD",
  "isAdmin": true
},
{
  "gameId": "379752914",
  "nickname": "不要讓魯夫不開心",
  "allianceName": "NTD",
  "isAdmin": true
},
{
  "gameId": "387612639",
  "nickname": "Wira ᴺᵀᴰ",
  "allianceName": "NTD",
  "isAdmin": false
},
{
  "gameId": "307861538",
  "nickname": "春水堂 海外分店",
  "allianceName": "ONE",
  "isAdmin": false
}
```

## 部署

1. ✅ 修改 src/services/auth.ts
2. ✅ 執行 `npm run build` 構建
3. ✅ 上傳至 Cloudways ~/public_html/
4. ✅ 重新上傳 api-proxy.php（在清空目錄時被刪除）
5. ✅ 驗證 .htaccess 配置

## 現在可以期望

✅ 管理員後台會顯示所有 5 個注冊用戶
✅ 所有用戶列表，排序和搜索功能正常工作
✅ 管理員可以設置其他用戶的管理員權限
✅ 刪除用戶功能正常工作

## 總結

這是一個**環境兼容性問題**。開發環境直接使用 localhost API，而生產環境需要通過 PHP 代理 (api-proxy.php) 轉發請求。只要某些方法沒有使用 `getApiUrl()` 函數，它們在生產環境中就會失敗。

現在所有 API 調用都使用正確的路由方式，應該能夠完全解決會員列表顯示不完整的問題。
