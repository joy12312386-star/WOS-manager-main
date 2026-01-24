#!/usr/bin/env python3
"""
WOS Manager 快速修復 - 手動執行部署步驟
用於修復部署不完整的情況
"""

import paramiko
from pathlib import Path
import time

HOST = "172.105.217.161"
USER = "svs2438"
KEY_PATH = str(Path.home() / ".ssh" / "cloudways_rsa")
REMOTE_PATH = "/public_html"

def run_remote_commands(ssh, commands, description):
    """執行一系列遠程命令"""
    print(f"\n📌 {description}")
    print("-" * 60)
    
    for cmd in commands:
        print(f"  執行: {cmd}")
        try:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_code = stdout.channel.recv_exit_status()
            
            output = stdout.read().decode('utf-8', errors='ignore').strip()
            if output and len(output) < 200:
                print(f"  ✓ {output}")
            else:
                print(f"  ✓ 完成")
                
            if exit_code != 0:
                error = stderr.read().decode('utf-8', errors='ignore').strip()
                if error:
                    print(f"  ⚠️ {error[:100]}")
                    
        except Exception as e:
            print(f"  ❌ {e}")

def fix_deployment():
    print("=" * 70)
    print("🔧 WOS Manager 部署修復")
    print("=" * 70)
    
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=HOST, username=USER, key_filename=KEY_PATH, timeout=10)
        print("\n✅ 已連接到伺服器")
        
        # 步驟 1: 檢查當前狀態
        print("\n📂 檢查當前狀態...")
        stdin, stdout, stderr = ssh.exec_command(f"ls -la {REMOTE_PATH} | grep -E '(dist|node_modules|server)' | wc -l")
        result = stdout.read().decode().strip()
        print(f"  找到 {result} 個項目")
        
        # 步驟 2: 清除舊文件
        print("\n📌 清除舊文件...")
        run_remote_commands(ssh, [
            f"cd {REMOTE_PATH} && rm -rf dist node_modules .next",
        ], "清除編譯和依賴目錄")
        
        # 步驟 3: 解壓部署包
        print("\n📌 解壓部署包...")
        run_remote_commands(ssh, [
            f"cd {REMOTE_PATH} && tar -xzf wos-manager-deploy.tar.gz -C . --strip-components=0 2>&1 | head -1 || echo '✓ 解壓完成'",
        ], "解壓 tar.gz 包")
        
        # 步驟 4: 安裝依賴
        print("\n📌 安裝 NPM 依賴 (約 1-2 分鐘)...")
        run_remote_commands(ssh, [
            f"cd {REMOTE_PATH} && npm install --production",
        ], "安裝依賴包")
        
        # 步驟 5: 生成 Prisma
        print("\n📌 生成 Prisma 客戶端...")
        run_remote_commands(ssh, [
            f"cd {REMOTE_PATH} && npx prisma generate",
        ], "Prisma 生成")
        
        # 步驟 6: 初始化數據庫
        print("\n📌 初始化 MySQL 數據庫...")
        run_remote_commands(ssh, [
            f"cd {REMOTE_PATH} && npx prisma migrate deploy 2>&1 | head -5",
        ], "數據庫遷移")
        
        # 步驟 7: 停止舊應用
        print("\n📌 停止舊應用...")
        run_remote_commands(ssh, [
            "pm2 stop wos-manager 2>/dev/null || true",
            "pm2 delete wos-manager 2>/dev/null || true",
        ], "停止應用")
        
        # 步驟 8: 啟動新應用
        print("\n📌 啟動應用...")
        run_remote_commands(ssh, [
            f"cd {REMOTE_PATH} && pm2 start 'node dist/server/index.js' --name 'wos-manager'",
            "pm2 save",
        ], "啟動應用")
        
        # 步驟 9: 驗證
        print("\n📌 驗證應用...")
        run_remote_commands(ssh, [
            "pm2 status",
            f"ls -lh {REMOTE_PATH}/dist/index.html 2>/dev/null || echo '⚠️ 前端文件未找到'",
        ], "驗證部署")
        
        ssh.close()
        
        print("\n" + "=" * 70)
        print("✅ 修復完成!")
        print("=" * 70)
        print("\n📍 訪問應用:")
        print("   前端: http://172.105.217.161")
        print("   API: http://172.105.217.161:3001\n")
        
    except Exception as e:
        print(f"\n❌ 修復失敗: {e}")

if __name__ == "__main__":
    fix_deployment()
