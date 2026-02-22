# i18n 迁移指南

## 已完成的工作

### 1. AdminDashboard.tsx
- ✅ 添加了 `import { useI18n } from '../i18n/I18nProvider';`
- ✅ 添加了 `const { t } = useI18n();` 到组件主函数
- ✅ 替换了以下关键字符串：
  - `clearAllAssignments` → `t('clearAllAssignments')`
  - `selectingPlayer` → `t('selectingPlayer')`
  - `pleaseClickSlot` → `t('pleaseClickSlot')`
  - `allocatedSlot` → `t('allocatedSlot')`
  - `movedToNewSlot` → `t('movedToNewSlot')`

### 2. translations.ts (所有4种语言)
添加了5个新的翻译键：
- `clearAllAssignments`: '已清除所有排定' (zh-TW)
- `selectingPlayer`: '已選擇' (zh-TW)
- `pleaseClickSlot`: '請點擊右邊時段添加' (zh-TW)
- `allocatedSlot`: '已分配至時段' (zh-TW)
- `movedToNewSlot`: '已移動至新時段' (zh-TW)

## 剩余工作

### AdminDashboard.tsx 中需要替换的硬编码字符串（按优先级排序）：

#### 高优先级 (关键功能消息)
1. 官职配置相关:
   - `官職配置已保存 (${eventDate})` → `${t('officerConfigSaved')} (${eventDate})`
   - `已自動分配 ${assignedCount} 位 ${...} 玩家` → `${assignedCount} ${t('officersAllocated')} ...`
   - `所有符合條件的玩家都已分配` → `t('allEligiblePlayersAllocated')`
   - `沒有符合志願時段的空位` → `t('noAvailableSlots')`

2. 玩家选择相关:
   - `${submission.playerName} 已在時段 ${check.slotIndex! + 1} 中，請先移除` → 需要 i18n 键
   - `此時段已有人安排，一個時段只能安排一人` → 需要 i18n 键
   - `${selectedPlayer.playerName} 已在時段 ${check.slotIndex! + 1} 中，一人只能在一個時段` → 需要 i18n 键

3. 事件管理相关:
   - `請填寫場次日期、報名開始和結束時間` → `t('fillAllEventFields')`
   - `場次更新成功` → `t('eventUpdateSuccess')`
   - `場次創建成功` → `t('eventCreateSuccess')`
   - `狀態更新成功` → `t('statusUpdateSuccess')`
   - `場次已刪除` → `t('eventDeleted')`

4. 玩家搜索相关:
   - `請輸入玩家 ID` → `t('pleaseEnterPlayerId')`
   - `找到會員: ${player.nickname}` → `${t('memberFound')}: ${player.nickname}`
   - `找到玩家: ${player.nickname}` → `${t('playerFound')}: ${player.nickname}`
   - `查詢玩家失敗` → `t('searchPlayerFailed')`

5. 快速添加玩家相关:
   - `請先查詢玩家資料` → `t('pleaseSearchPlayerFirst')`
   - `請選擇聯盟` → `t('pleaseSelectAlliance')`
   - `請輸入自訂聯盟名稱` → `t('pleaseEnterCustomAlliance')`

#### RegistrationForm.tsx 中需要替换的硬编码字符串：

1. 玩家数据相关:
   - `玩家資料已更新` → `t('playerDataUpdated')`（已存在）
   - `刷新失敗` → `t('refreshFailed')`（已存在）
   - `更新聯盟失敗` → `t('updateAllianceFailed')`（已存在）
   - `聯盟已更新，所有報名記錄已同步` → `t('allianceUpdated')`（已存在）

2. 报名验证相关:
   - `請至少選擇一個時段` → `t('selectAtLeastOne')`（已存在）
   - `${day} 請填寫研究加速時間` → 需要 i18n 键
   - `${day} 請選擇完整的可接受時段` → 需要 i18n 键
   - `${day} 起迄時間不能相同` → `t('startEndTimeSame')`（已存在）
   - `${day} 時段不能重複` → `t('timeslotDuplicate')`（已存在）
   - `${day} 請填寫火精微粒數量` → 需要 i18n 键

3. 提交报名相关:
   - `報名已更新` → `t('submissionUpdated')`（已存在）
   - `報名成功！` → `t('submissionSuccess')`（已存在）
   - `提交失敗` → 需要 i18n 键
   - `報名已刪除` → `t('submissionDeleted')`（已存在）

4. 帐号管理相关:
   - `請輸入遊戲 ID` → `t('enterGameId_error')`（已存在）
   - `不能添加當前登入的帳號` → 需要 i18n 键
   - `無法獲取玩家資料，請檢查遊戲 ID 是否正確` → `t('fetchPlayerDataFailed')`（已存在）
   - `子帳號新增成功` → 需要 i18n 键
   - `新增失敗` → 需要 i18n 键
   - `已切換到帳號 ${targetGameId}` → 需要 i18n 键
   - `切換失敗` → 需要 i18n 键
   - `已解除綁定` → 需要 i18n 键
   - `解除綁定失敗` → 需要 i18n 键
   - `操作失敗，請稍後再試` → 需要 i18n 键

## 建议的实施方案

### 方案1: 手动逐个替换 (已开始)
继续使用 `replace_string_in_file` 或 `multi_replace_string_in_file` 进行替换

### 方案2: 编写自动化脚本 (推荐用于大规模替换)
创建一个 Node.js 脚本来自动处理所有替换，然后在项目中运行

## 翻译键命名约定

- 组件状态: `${action}Success`, `${action}Failed`
- 用户输入验证: `please${Action}`, `enter${Field}`
- 操作结果: `${object}${Action}`, 例如 `eventDeleted`, `playerAllocated`
- 错误消息: 使用现有的通用键或创建特定的错误键

## 验证清单

在提交之前，请检查：
- [ ] 所有 addToast() 调用都使用 i18n 翻译（除了需要动态内容的情况）
- [ ] 所有涉及中文用户界面文本的字符串都已翻译
- [ ] 模板字符串中混合的文本已正确处理 (使用 `\`${t('key')} ${variable}\``)
- [ ] 所有4种语言的翻译键都已添加到 translations.ts
- [ ] TypeScript 类型检查通过
- [ ] 没有红色错误提示

## 需要添加到 translations.ts 的新键

（基于剩余的硬编码字符串）

### zh-TW (Traditional Chinese)
```typescript
officerConfigSaved: '官職配置已保存',
officersAllocated: '位',  // 或 '名' 取决于上下文
allEligiblePlayersAllocated: '所有符合條件的玩家都已分配',
noAvailableSlots: '沒有符合志願時段的空位',
fillAllEventFields: '請填寫場次日期、報名開始和結束時間',
eventUpdateSuccess: '場次更新成功',
eventCreateSuccess: '場次創建成功',
statusUpdateSuccess: '狀態更新成功',
eventDeleted: '場次已刪除',
pleaseEnterPlayerId: '請輸入玩家 ID',
memberFound: '找到會員',
playerFound: '找到玩家',
searchPlayerFailed: '查詢玩家失敗',
pleaseSearchPlayerFirst: '請先查詢玩家資料',
pleaseSelectAlliance: '請選擇聯盟',
pleaseEnterCustomAlliance: '請輸入自訂聯盟名稱',
// ... 以及其他需要翻译的键
```

（并对应添加到 zh-CN, en, ko 版本）
