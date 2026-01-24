#!/usr/bin/env python3
"""
WOS Manager Cloudways 自動部署工具
自動上傳部署包並執行遠程部署
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# 配置
CLOUDWAYS_USER = "svs2438"
CLOUDWAYS_HOST = "172.105.217.161"
REMOTE_PATH = "/home/svs2438/applications/vwwwhgqshd/public_html"
DEPLOY_PACKAGE = "wos-manager-deploy.tar.gz"
DEPLOY_SCRIPT = "deploy.sh"

class CloudwaysDeploy:
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.package_file = self.base_path / DEPLOY_PACKAGE
        self.script_file = self.base_path / DEPLOY_SCRIPT
        
    def check_files(self):
        """檢查必要文件"""
        print("🔍 檢查必要文件...")
        
        if not self.package_file.exists():
            print(f"❌ 錯誤: 找不到 {DEPLOY_PACKAGE}")
            print(f"   位置: {self.package_file}")
            sys.exit(1)
            
        if not self.script_file.exists():
            print(f"❌ 錯誤: 找不到 {DEPLOY_SCRIPT}")
            print(f"   位置: {self.script_file}")
            sys.exit(1)
        
        print(f"✓ {DEPLOY_PACKAGE} ({self.package_file.stat().st_size / 1024:.0f}KB)")
        print(f"✓ {DEPLOY_SCRIPT}")
        print()
        
    def run_command(self, cmd, description=""):
        """執行命令"""
        if description:
            print(f"📌 {description}")
        print(f"   命令: {cmd}")
        
        try:
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                print(f"❌ 命令失敗")
                if result.stderr:
                    print(f"   錯誤: {result.stderr[:200]}")
                return False
            
            if result.stdout:
                print(f"   輸出: {result.stdout[:100].strip()}")
            print()
            return True
            
        except subprocess.TimeoutExpired:
            print("❌ 命令超時")
            return False
        except Exception as e:
            print(f"❌ 執行出錯: {e}")
            return False
    
    def upload_file(self, local_file, remote_file):
        """上傳文件到 Cloudways"""
        cmd = f'scp -o ConnectTimeout=10 "{local_file}" {CLOUDWAYS_USER}@{CLOUDWAYS_HOST}:"{remote_file}"'
        return self.run_command(cmd, f"上傳 {local_file.name}")
    
    def execute_remote(self, commands):
        """在遠程執行命令"""
        # 創建本地臨時腳本
        remote_cmds = "; ".join(commands)
        cmd = f'ssh -o ConnectTimeout=10 {CLOUDWAYS_USER}@{CLOUDWAYS_HOST} "{remote_cmds}"'
        return self.run_command(cmd, "遠程執行命令")
    
    def deploy(self):
        """執行部署流程"""
        print("=" * 60)
        print("🚀 WOS Manager Cloudways 自動部署")
        print("=" * 60)
        print()
        
        # 步驟 1: 檢查文件
        self.check_files()
        
        # 步驟 2: 上傳部署包
        print("[步驟 1/5] 上傳部署包...")
        if not self.upload_file(self.package_file, f"{REMOTE_PATH}/{DEPLOY_PACKAGE}"):
            print("❌ 上傳部署包失敗")
            sys.exit(1)
        
        # 步驟 3: 上傳部署腳本
        print("[步驟 2/5] 上傳部署腳本...")
        if not self.upload_file(self.script_file, f"{REMOTE_PATH}/{DEPLOY_SCRIPT}"):
            print("❌ 上傳部署腳本失敗")
            sys.exit(1)
        
        # 步驟 4: 準備遠程環境
        print("[步驟 3/5] 準備遠程環境...")
        prep_cmds = [
            f"cd {REMOTE_PATH}",
            f"chmod +x {DEPLOY_SCRIPT}",
            "ls -lh | head -5"
        ]
        if not self.execute_remote(prep_cmds):
            print("❌ 準備遠程環境失敗")
            sys.exit(1)
        
        # 步驟 5: 執行部署腳本
        print("[步驟 4/5] 執行部署腳本 (這可能需要 3-5 分鐘)...")
        deploy_cmds = [
            f"cd {REMOTE_PATH}",
            f"./{DEPLOY_SCRIPT}"
        ]
        if not self.execute_remote(deploy_cmds):
            print("❌ 部署腳本執行失敗")
            sys.exit(1)
        
        # 步驟 6: 驗證部署
        print("[步驟 5/5] 驗證部署...")
        verify_cmds = [
            "pm2 status",
            "pm2 describe wos-manager || true"
        ]
        if not self.execute_remote(verify_cmds):
            print("⚠️  驗證命令失敗（但應用可能已成功部署）")
        
        print()
        print("=" * 60)
        print("✅ 部署流程完成！")
        print("=" * 60)
        print()
        print("📍 訪問地址:")
        print("   前端: http://172.105.217.161")
        print("   API: http://172.105.217.161:3001")
        print()
        print("📊 查看應用狀態:")
        print("   ssh svs2438@172.105.217.161")
        print("   pm2 status")
        print("   pm2 logs wos-manager")
        print()

if __name__ == "__main__":
    try:
        deployer = CloudwaysDeploy()
        deployer.deploy()
    except KeyboardInterrupt:
        print("\n\n❌ 部署已取消")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ 部署出錯: {e}")
        sys.exit(1)
