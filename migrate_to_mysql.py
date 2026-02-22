#!/usr/bin/env python3
"""將 SQLite 資料遷移到本地 MySQL"""

import sqlite3
import pymysql
from datetime import datetime

def convert_timestamp(val):
    """將毫秒時間戳轉換為 MySQL datetime"""
    if val is None:
        return None
    if isinstance(val, int) or (isinstance(val, str) and val.isdigit()):
        ts = int(val)
        if ts > 1e12:  # 毫秒
            ts = ts / 1000
        return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
    return val

# 日期時間欄位
datetime_cols = ['createdAt', 'updatedAt', 'registrationStart', 'registrationEnd']

# 連接 SQLite
sqlite_conn = sqlite3.connect('prisma/dev.db')
sqlite_conn.row_factory = sqlite3.Row

# 連接 MySQL
mysql_conn = pymysql.connect(
    host='localhost',
    user='root',
    password='',
    database='wos_manager',
    charset='utf8mb4'
)
mysql_cursor = mysql_conn.cursor()

# 要遷移的表
tables_to_migrate = ['User', 'Event', 'OfficerAssignment', 'TimeslotSubmission']

for tbl in tables_to_migrate:
    rows = sqlite_conn.execute(f"SELECT * FROM {tbl}").fetchall()
    if not rows:
        print(f"{tbl}: 無資料")
        continue
    
    cols = [desc[0] for desc in sqlite_conn.execute(f"SELECT * FROM {tbl} LIMIT 1").description]
    
    # 構建 INSERT 語句
    placeholders = ', '.join(['%s'] * len(cols))
    col_names = ', '.join([f'`{c}`' for c in cols])
    
    inserted = 0
    for row in rows:
        values = []
        for i, val in enumerate(row):
            col_name = cols[i]
            if col_name in datetime_cols:
                values.append(convert_timestamp(val))
            else:
                values.append(val)
        
        try:
            mysql_cursor.execute(f"INSERT INTO `{tbl}` ({col_names}) VALUES ({placeholders})", values)
            inserted += 1
        except pymysql.err.IntegrityError as e:
            if 'Duplicate' in str(e):
                print(f"  跳過重複: {values[0]}")
            else:
                print(f"  錯誤: {e}")
        except Exception as e:
            print(f"  錯誤 ({tbl}): {e}")
    
    print(f"✓ {tbl}: 導入 {inserted} 筆")

mysql_conn.commit()
mysql_conn.close()
sqlite_conn.close()
print("\n✓ 資料遷移完成!")
