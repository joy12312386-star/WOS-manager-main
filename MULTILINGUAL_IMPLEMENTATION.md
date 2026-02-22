# 多語系功能實現 (Multi-Language Implementation)

## 概述 (Overview)

應用程式現已支持 4 種語言，且根據用戶的瀏覽器地區/語言設置自動選擇默認語言。

**Supported Languages:**
- 🇹🇼 繁體中文 (Traditional Chinese - Taiwan): `zh-TW`
- 🇨🇳 簡體中文 (Simplified Chinese - China): `zh-CN`  
- 🇬🇧 英文 (English): `en`
- 🇰🇷 韓文 (Korean): `ko`

## 語言偵測邏輯 (Language Detection Logic)

系統使用三層檢測機制自動選擇語言：

### 第 1 層：用戶偏好設定 (User Preference)
```
檢查 localStorage 中保存的 'wos_language' 鍵值
✓ 如果找到已保存的語言，使用該語言
✗ 如果未找到，進行第 2 層檢測
```

### 第 2 層：瀏覽器地區偵測 (Browser Locale Detection)
```
解析 navigator.language 及 navigator.locale
格式: language-COUNTRY (例如: zh-TW, zh-CN, ko-KR)

根據國家代碼判斷：
- TW (台灣) → zh-TW (繁體中文)
- CN (中國) → zh-CN (簡體中文)
- MY (馬來西亞) → zh-CN (簡體中文)
- KR (韓國) → ko (韓文)
- 其他 → en (英文)
```

### 第 3 層：瀏覽器語言回退 (Browser Language Fallback)
```
如果地區偵測失敗，檢查瀏覽器語言代碼：
- 中文 (zh) → 默認 zh-TW (繁體)
- 韓文 (ko) → ko
- 其他 → en
```

### 默認值 (Default)
```
如果以上均失敗 → 使用英文 (en)
```

## 實現細節 (Implementation Details)

### 檔案結構 (File Structure)

**src/i18n/I18nProvider.tsx**
- React Context 提供程式
- `getDefaultLanguage()` 函數：實現上述偵測邏輯
- `useI18n()` Hook：供組件使用翻譯

**src/i18n/translations.ts**
- 包含 4 種語言的完整翻譯字典
- 每種語言有 40+ 個翻譯鍵值
- 類型安全的 `TranslationKey` 類型定義

### 核心函數 (Core Function)

```tsx
const getDefaultLanguage = (): Language => {
  // 1. 檢查已保存的語言偏好
  const saved = localStorage.getItem('wos_language') as Language | null;
  if (saved && ['zh-TW', 'zh-CN', 'en', 'ko'].includes(saved)) {
    return saved;
  }

  // 2. 獲取瀏覽器語言和地區
  const browserLang = navigator.language.toLowerCase();
  const locale = navigator.locale?.toLowerCase() || browserLang;
  
  // 3. 根據地區判斷中文方言
  if (browserLang.startsWith('zh')) {
    if (locale.includes('tw') || locale.includes('zh-tw')) return 'zh-TW';
    if (locale.includes('cn') || locale.includes('zh-cn') || locale.includes('my')) return 'zh-CN';
    return 'zh-TW'; // 中文默認繁體
  }
  
  // 4. 韓文判斷
  if (browserLang.startsWith('ko') || locale.includes('kr')) return 'ko';
  
  // 5. 默認英文
  return 'en';
};
```

## 使用方法 (Usage)

### 在組件中使用 (In Components)

```tsx
import { useI18n } from '@/i18n/I18nProvider';

export const MyComponent = () => {
  const { language, setLanguage, t } = useI18n();
  
  return (
    <div>
      {/* 獲取翻譯 */}
      <p>{t('login')}</p>
      
      {/* 切換語言 */}
      <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
        <option value="zh-TW">繁體中文</option>
        <option value="zh-CN">簡體中文</option>
        <option value="en">English</option>
        <option value="ko">한국어</option>
      </select>
    </div>
  );
};
```

### 添加新翻譯鍵值 (Adding New Translation Keys)

1. 在 `src/i18n/translations.ts` 中的所有 4 種語言對象中添加新鍵值：

```tsx
export const translations = {
  'zh-TW': {
    newKey: '新翻譯',
    // ...
  },
  'zh-CN': {
    newKey: '新翻译',
    // ...
  },
  'en': {
    newKey: 'New Translation',
    // ...
  },
  'ko': {
    newKey: '새로운 번역',
    // ...
  }
};
```

2. 類型自動更新，可在組件中使用新鍵值

## 部署狀態 (Deployment Status)

✅ **已部署到 Cloudways**
- 前端構建已更新：`dist/assets/index-BTdAoFIU.js` (428.74 KB gzip)
- I18nProvider 已包含在構建中
- 所有翻譯均已嵌入

## 測試方法 (Testing)

### 測試台灣用戶
```
1. 設置瀏覽器語言為繁體中文
2. 或 locale 為 zh-TW
3. 刷新應用程式
4. 應顯示繁體中文界面 ✓
```

### 測試中國用戶
```
1. 設置瀏覽器語言為簡體中文
2. 或 locale 為 zh-CN
3. 刷新應用程式
4. 應顯示簡體中文界面 ✓
```

### 測試韓國用戶
```
1. 設置瀏覽器語言為韓文
2. 或 locale 為 ko-KR
3. 刷新應用程式
4. 應顯示韓文界面 ✓
```

### 測試語言切換
```
1. 點擊頁面右上角語言切換按鈕
2. 選擇不同語言
3. 應立即切換整個界面語言 ✓
4. 刷新後仍保持所選語言 ✓
```

## 相關組件 (Related Components)

- **LanguageSwitcher.tsx**: 語言切換選擇器組件
- **App.tsx**: 包裝了 I18nProvider
- 所有使用 `useI18n()` Hook 的組件

## 翻譯覆蓋範圍 (Translation Coverage)

已翻譯的功能模塊：

✅ 通用詞彙 (General Terms)
✅ 登入/註冊 (Login/Registration)
✅ 玩家信息 (Player Info)
✅ 聯盟管理 (Alliance Management)
✅ 時段報告 (Timeslot Reports)
✅ 火石報告 (Fire Stone Reports)
✅ 加速時間 (Acceleration)
✅ SVS 管理 (SVS Management)
✅ 管理後台 (Admin Panel)
✅ 錯誤消息 (Error Messages)

## 注意事項 (Important Notes)

1. **馬來西亞地區**: 配置為簡體中文 (`zh-CN`) 以符合當地習慣
2. **localStorage 優先級**: 用戶手動選擇的語言優先於自動偵測
3. **缺少翻譯的回退**: 如果某個鍵值缺少翻譯，系統會使用繁體中文版本
4. **類型安全**: 所有翻譯鍵值都通過 TypeScript 類型檢查

---

**實現日期**: 2025-01-24  
**多語系版本**: 1.0  
**支持的語言**: 4 (zh-TW, zh-CN, en, ko)
