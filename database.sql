# 完整的 WOS Manager 數據庫 Schema
# 適用於 MySQL 8.0+

-- ==================== 用戶表 ====================
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  fid VARCHAR(20) UNIQUE NOT NULL COMMENT '遊戲ID',
  nickname VARCHAR(100) NOT NULL COMMENT '暱稱',
  passwordHash VARCHAR(255) NOT NULL COMMENT '密碼雜湊',
  alliance VARCHAR(10) COMMENT '聯盟代碼',
  isAdmin BOOLEAN DEFAULT FALSE COMMENT '是否管理員',
  role VARCHAR(20) DEFAULT 'member' COMMENT '角色：member/admin/superadmin',
  createdAt BIGINT NOT NULL COMMENT '建立時間戳',
  updatedAt BIGINT COMMENT '更新時間戳',
  deletedAt BIGINT COMMENT '刪除時間（軟刪除）',
  
  INDEX idx_fid (fid),
  INDEX idx_alliance (alliance),
  INDEX idx_isAdmin (isAdmin),
  INDEX idx_createdAt (createdAt),
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='用戶基本信息表';

-- ==================== 玩家時段報名表 ====================
CREATE TABLE timeslot_submissions (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL COMMENT '用戶ID',
  alliance VARCHAR(10) COMMENT '聯盟代碼',
  
  -- 報名日期信息
  dayOfWeek INT NOT NULL COMMENT '星期幾（0-6）',
  submissionDate DATE NOT NULL COMMENT '報名日期',
  
  -- 研究加速
  researchAccelDays INT DEFAULT 0,
  researchAccelHours INT DEFAULT 0,
  researchAccelMinutes INT DEFAULT 0,
  researchAccelTotal INT DEFAULT 0 COMMENT '總秒數（反正規化）',
  
  -- 將軍加速
  generalAccelDays INT DEFAULT 0,
  generalAccelHours INT DEFAULT 0,
  generalAccelMinutes INT DEFAULT 0,
  generalAccelTotal INT DEFAULT 0 COMMENT '總秒數（反正規化）',
  
  -- T11升級和火石
  upgradeT11 BOOLEAN DEFAULT FALSE,
  fireSparkleCount INT COMMENT '火晶微粒數量',
  fireGemCount INT DEFAULT 0 COMMENT '火石數量',
  refinedFireGemCount INT DEFAULT 0 COMMENT '精煉火石數量',
  
  -- 時間槽位（JSON）
  timeSlots JSON COMMENT '[{start: "08:00", end: "10:00"}]',
  
  -- 狀態
  status VARCHAR(20) DEFAULT 'submitted' COMMENT 'submitted/approved/rejected',
  submittedAt BIGINT NOT NULL,
  updatedAt BIGINT,
  reviewedAt BIGINT,
  reviewedBy VARCHAR(50) COMMENT '審核者ID',
  notes TEXT COMMENT '審核備註',
  
  UNIQUE KEY unique_daily_submission (userId, dayOfWeek, submissionDate),
  INDEX idx_userId (userId),
  INDEX idx_alliance (alliance),
  INDEX idx_submissionDate (submissionDate),
  INDEX idx_dayOfWeek (dayOfWeek),
  INDEX idx_status (status),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='玩家時段報名表';

-- ==================== 聯盟統計表 ====================
CREATE TABLE alliance_statistics (
  id VARCHAR(50) PRIMARY KEY,
  alliance VARCHAR(10) NOT NULL,
  dayOfWeek INT NOT NULL,
  reportDate DATE NOT NULL,
  
  -- 統計數據
  totalMembers INT DEFAULT 0 COMMENT '聯盟總人數',
  submittedCount INT DEFAULT 0 COMMENT '已報名人數',
  submissionRate DECIMAL(5,2) COMMENT '報名率百分比',
  
  -- 聚集統計
  totalResearchAccel BIGINT DEFAULT 0 COMMENT '累計研究加速（秒）',
  totalGeneralAccel BIGINT DEFAULT 0 COMMENT '累計將軍加速（秒）',
  totalFireSparkles INT DEFAULT 0 COMMENT '累計火晶微粒',
  totalFireGems INT DEFAULT 0 COMMENT '累計火石',
  totalRefinedFireGems INT DEFAULT 0 COMMENT '累計精煉火石',
  t11UpgradeCount INT DEFAULT 0 COMMENT 'T11升級人數',
  
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT,
  
  UNIQUE KEY unique_alliance_day_date (alliance, dayOfWeek, reportDate),
  INDEX idx_reportDate (reportDate),
  INDEX idx_alliance (alliance),
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='聯盟統計報表（反正規化表用於性能）';

-- ==================== SVS官方報名表 ====================
CREATE TABLE svs_applications (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL,
  alliance VARCHAR(10),
  
  -- SVS信息
  svsRound INT COMMENT 'SVS輪次',
  status VARCHAR(20) COMMENT 'notOpened/opening/closed/applied/notApplied',
  applicationDate DATE,
  appliedAt BIGINT COMMENT '實際報名時間',
  
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT,
  
  UNIQUE KEY unique_user_svs (userId, svsRound),
  INDEX idx_alliance (alliance),
  INDEX idx_applicationDate (applicationDate),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='SVS官方報名狀態表';

-- ==================== 簽到記錄表 ====================
CREATE TABLE daily_checkins (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL,
  checkinDate DATE NOT NULL,
  checkinTime BIGINT NOT NULL,
  ipAddress VARCHAR(45),
  
  UNIQUE KEY unique_daily_checkin (userId, checkinDate),
  INDEX idx_userId (userId),
  INDEX idx_checkinDate (checkinDate),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='玩家每日簽到記錄';

-- ==================== 後台：聯盟分組表 ====================
CREATE TABLE groups (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '分組名稱',
  alliance VARCHAR(10) NOT NULL COMMENT '所屬聯盟',
  description TEXT COMMENT '分組描述',
  
  createdBy VARCHAR(50) NOT NULL COMMENT '建立者ID',
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT,
  
  memberCount INT DEFAULT 0 COMMENT '成員數量（反正規化）',
  
  INDEX idx_alliance (alliance),
  INDEX idx_createdBy (createdBy),
  
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='後台分組管理';

-- ==================== 分組成員表 ====================
CREATE TABLE group_members (
  id VARCHAR(50) PRIMARY KEY,
  groupId VARCHAR(50) NOT NULL,
  userId VARCHAR(50) NOT NULL,
  joinedAt BIGINT NOT NULL,
  role VARCHAR(20) DEFAULT 'member' COMMENT '分組內角色：member/leader',
  
  UNIQUE KEY unique_group_user (groupId, userId),
  INDEX idx_groupId (groupId),
  INDEX idx_userId (userId),
  
  FOREIGN KEY (groupId) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='分組成員管理';

-- ==================== 後台：官職表 ====================
CREATE TABLE positions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '官職名稱',
  alliance VARCHAR(10) NOT NULL COMMENT '所屬聯盟',
  level INT COMMENT '等級（用於排序）',
  description TEXT,
  
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT,
  
  INDEX idx_alliance (alliance),
  INDEX idx_level (level),
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='後台官職管理';

-- ==================== 官職分配表 ====================
CREATE TABLE position_assignments (
  id VARCHAR(50) PRIMARY KEY,
  positionId VARCHAR(50) NOT NULL,
  userId VARCHAR(50) NOT NULL,
  
  -- 時間安排
  timeSlot INT NOT NULL COMMENT '時間槽位（0-23代表小時）',
  dayOfWeek INT COMMENT '星期幾（0-6）',
  
  -- 分配信息
  assignedBy VARCHAR(50) NOT NULL COMMENT '指派者ID',
  assignedAt BIGINT NOT NULL,
  dueAt BIGINT COMMENT '到期時間',
  
  status VARCHAR(20) DEFAULT 'active' COMMENT 'active/inactive/expired',
  
  UNIQUE KEY unique_position_slot (positionId, timeSlot, dayOfWeek, userId),
  INDEX idx_userId (userId),
  INDEX idx_positionId (positionId),
  INDEX idx_timeSlot (timeSlot),
  INDEX idx_status (status),
  
  FOREIGN KEY (positionId) REFERENCES positions(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE SET NULL,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='官職分配管理';

-- ==================== 操作日誌表 ====================
CREATE TABLE audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) COMMENT '操作者ID',
  action VARCHAR(50) NOT NULL COMMENT '操作類型：create/update/delete/login',
  entityType VARCHAR(50) COMMENT '實體類型：user/group/position/submission',
  entityId VARCHAR(50) COMMENT '實體ID',
  
  -- 變更內容
  changes JSON COMMENT '變更詳細信息',
  ipAddress VARCHAR(45),
  
  createdAt BIGINT NOT NULL,
  
  INDEX idx_userId (userId),
  INDEX idx_createdAt (createdAt),
  INDEX idx_action (action),
  INDEX idx_entityId (entityId),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='操作審計日誌';

-- ==================== 會員變動日誌表 ====================
CREATE TABLE membership_changes (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50) NOT NULL,
  oldAlliance VARCHAR(10),
  newAlliance VARCHAR(10),
  
  changeType VARCHAR(20) COMMENT 'joined/left/kicked/transferred',
  changedAt BIGINT NOT NULL,
  changedBy VARCHAR(50),
  reason TEXT,
  
  INDEX idx_userId (userId),
  INDEX idx_changedAt (changedAt),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  
  CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) ENGINE=InnoDB COMMENT='會員變動審計';

-- ==================== 創建視圖：每日報名匯總 ====================
CREATE VIEW daily_submission_summary AS
SELECT 
  DATE(FROM_UNIXTIME(submittedAt / 1000)) as report_date,
  alliance,
  dayOfWeek,
  COUNT(DISTINCT userId) as submitted_count,
  COUNT(DISTINCT CASE WHEN upgradeT11 = TRUE THEN userId END) as t11_count,
  SUM(researchAccelTotal) as total_research_accel,
  SUM(generalAccelTotal) as total_general_accel,
  SUM(fireSparkleCount) as total_sparkles,
  SUM(fireGemCount) as total_gems,
  SUM(refinedFireGemCount) as total_refined_gems
FROM timeslot_submissions
WHERE status = 'submitted'
GROUP BY DATE(FROM_UNIXTIME(submittedAt / 1000)), alliance, dayOfWeek;
