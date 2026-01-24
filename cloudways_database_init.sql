#!/bin/bash

# Cloudways MySQL 資料庫初始化腳本
# 此腳本在 Cloudways MySQL 控制面板 SQL 編輯器中執行

# 資料庫已自動建立: vwwwhgqshd
# 使用者: vwwwhgqshd
# 密碼: S7BsSNaG74
# 主機: 172.105.217.161

# ============================================
# 1. 建立使用者表
# ============================================

DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY COMMENT '使用者唯一 ID',
  gameId VARCHAR(50) NOT NULL UNIQUE COMMENT '遊戲 ID',
  password VARCHAR(255) NOT NULL COMMENT '加密密碼',
  allianceId VARCHAR(10) COMMENT '聯盟 ID',
  nickname VARCHAR(100) COMMENT '暱稱',
  isAdmin BOOLEAN DEFAULT FALSE COMMENT '是否為管理員',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  INDEX idx_gameId (gameId),
  INDEX idx_allianceId (allianceId),
  INDEX idx_isAdmin (isAdmin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家使用者表';

# ============================================
# 2. 建立時段提交表
# ============================================

DROP TABLE IF EXISTS timeslot_submissions;
CREATE TABLE timeslot_submissions (
  id VARCHAR(36) PRIMARY KEY COMMENT '提交唯一 ID',
  userId VARCHAR(36) NOT NULL COMMENT '使用者 ID',
  reportDate DATE NOT NULL COMMENT '報告日期',
  slotType ENUM('tuesday', 'thursday', 'friday') NOT NULL COMMENT '時段類型',
  fireSparkle INT DEFAULT 0 COMMENT '火晶微粒數量',
  fireGem INT DEFAULT 0 COMMENT '火石數量',
  refinedFireGem INT DEFAULT 0 COMMENT '精煉火石數量',
  researchAccel INT DEFAULT 0 COMMENT '研究加速天數',
  generalAccel INT DEFAULT 0 COMMENT '將軍加速天數',
  notes TEXT COMMENT '備註',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_submission (userId, reportDate, slotType),
  INDEX idx_userId (userId),
  INDEX idx_reportDate (reportDate),
  INDEX idx_slotType (slotType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='時段提交記錄表';

# ============================================
# 3. 建立聯盟統計表
# ============================================

DROP TABLE IF EXISTS alliance_statistics;
CREATE TABLE alliance_statistics (
  id VARCHAR(36) PRIMARY KEY COMMENT '統計唯一 ID',
  allianceId VARCHAR(10) NOT NULL COMMENT '聯盟 ID',
  recordDate DATE NOT NULL COMMENT '統計日期',
  totalSubmissions INT DEFAULT 0 COMMENT '提交數量',
  totalFireSparkle INT DEFAULT 0 COMMENT '火晶微粒總數',
  totalFireGem INT DEFAULT 0 COMMENT '火石總數',
  totalResearchAccel INT DEFAULT 0 COMMENT '研究加速總天數',
  totalGeneralAccel INT DEFAULT 0 COMMENT '將軍加速總天數',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  UNIQUE KEY unique_alliance_date (allianceId, recordDate),
  INDEX idx_allianceId (allianceId),
  INDEX idx_recordDate (recordDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聯盟日統計表';

# ============================================
# 4. 建立 SVS 報名表
# ============================================

DROP TABLE IF EXISTS svs_applications;
CREATE TABLE svs_applications (
  id VARCHAR(36) PRIMARY KEY COMMENT '報名唯一 ID',
  userId VARCHAR(36) NOT NULL COMMENT '使用者 ID',
  svsRound INT NOT NULL COMMENT 'SVS 輪次',
  status ENUM('not_applied', 'applied', 'confirmed') DEFAULT 'not_applied' COMMENT '報名狀態',
  notes TEXT COMMENT '備註',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_svs_app (userId, svsRound),
  INDEX idx_userId (userId),
  INDEX idx_svsRound (svsRound)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='SVS 報名表';

# ============================================
# 5. 建立聯盟群組表
# ============================================

DROP TABLE IF EXISTS alliance_groups;
CREATE TABLE alliance_groups (
  id VARCHAR(36) PRIMARY KEY COMMENT '群組唯一 ID',
  allianceId VARCHAR(10) NOT NULL COMMENT '聯盟 ID',
  groupName VARCHAR(100) NOT NULL COMMENT '群組名稱',
  description TEXT COMMENT '群組說明',
  isPublic BOOLEAN DEFAULT TRUE COMMENT '是否公開',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  UNIQUE KEY unique_group_name (allianceId, groupName),
  INDEX idx_allianceId (allianceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聯盟群組表';

# ============================================
# 6. 建立官職位置表
# ============================================

DROP TABLE IF EXISTS officer_positions;
CREATE TABLE officer_positions (
  id VARCHAR(36) PRIMARY KEY COMMENT '位置唯一 ID',
  userId VARCHAR(36) NOT NULL COMMENT '使用者 ID',
  positionName VARCHAR(100) NOT NULL COMMENT '官職名稱',
  rank INT COMMENT '排名',
  allianceId VARCHAR(10) NOT NULL COMMENT '聯盟 ID',
  joinDate DATE COMMENT '加入日期',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_allianceId (allianceId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='官職位置表';

# ============================================
# 7. 建立稽核日誌表
# ============================================

DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日誌唯一 ID',
  adminId VARCHAR(36) COMMENT '管理員 ID',
  action VARCHAR(100) NOT NULL COMMENT '操作類型',
  targetUserId VARCHAR(36) COMMENT '目標使用者 ID',
  details JSON COMMENT '操作細節（JSON）',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
  INDEX idx_adminId (adminId),
  INDEX idx_action (action),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='稽核日誌表';

# ============================================
# 8. 建立每日提交摘要檢視
# ============================================

DROP VIEW IF EXISTS daily_submission_summary;
CREATE VIEW daily_submission_summary AS
SELECT 
  DATE(ts.reportDate) as report_date,
  ts.slotType,
  COUNT(DISTINCT ts.userId) as total_players,
  SUM(ts.fireSparkle) as total_fire_sparkle,
  SUM(ts.fireGem) as total_fire_gem,
  SUM(ts.researchAccel) as total_research_accel,
  SUM(ts.generalAccel) as total_general_accel
FROM timeslot_submissions ts
GROUP BY DATE(ts.reportDate), ts.slotType;

# ============================================
# 9. 初始化超級管理員
# ============================================

-- 超級管理員將在應用程式首次啟動時自動建立
-- 遊戲 ID: 380768429
-- 密碼: (由應用程式生成)

INSERT INTO users (id, gameId, password, isAdmin) 
VALUES ('super-admin-001', '380768429', '***auto-generated***', TRUE)
ON DUPLICATE KEY UPDATE isAdmin = TRUE;

-- ============================================
-- 10. 建立索引以提高查詢效能
-- ============================================

ALTER TABLE timeslot_submissions ADD INDEX idx_userId_reportDate (userId, reportDate);
ALTER TABLE alliance_statistics ADD INDEX idx_allianceId_recordDate (allianceId, recordDate);

# ============================================
# 完成！
# ============================================
-- 所有資料表已成功建立
-- 應用程式現在可以連接到 Cloudways MySQL 資料庫
