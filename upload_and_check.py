#!/usr/bin/env python3
import paramiko
import os
from pathlib import Path

# 配置
HOST = "172.105.217.161"
USER = "svs2438"
KEY_PATH = str(Path.home() / ".ssh" / "cloudways_rsa")

# 嘗試的路徑（從最可能到次可能）
POSSIBLE_PATHS = [
    "/home/svs2438/applications/vwwwhgqshd/public_html",
    "/home/svs2438/www/vwwwhgqshd",
    "/var/www/vwwwhgqshd/public_html",
    "/home/svs2438/public_html",
    "/opt/applications/vwwwhgqshd/public_html",
]

def test_path(sftp, path):
    """測試路徑是否存在"""
    try:
        sftp.stat(path)
        return True
    except:
        return False

def find_app_path(sftp):
    """找到正確的應用路徑"""
    print("🔍 尋找應用路徑...\n")
    
    for path in POSSIBLE_PATHS:
        if test_path(sftp, path):
            print(f"✅ 找到: {path}\n")
            return path
        else:
            print(f"   ✗ {path}")
    
    print("\n❌ 找不到應用路徑")
    print("\n試著列出 /home 目錄...")
    try:
        for item in sftp.listdir("/home"):
            print(f"   {item}")
    except:
        pass
    
    return None

def upload_and_deploy():
    print("=" * 70)
    print("🚀 WOS Manager 自動部署")
    print("=" * 70 + "\n")
    
    # 連接伺服器
    print("📌 連接到伺服器...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname=HOST, username=USER, key_filename=KEY_PATH, timeout=10)
        sftp = ssh.open_sftp()
        print("✅ 已連接\n")
    except Exception as e:
        print(f"❌ 連接失敗: {e}\n")
        return
    
    # 找到應用路徑
    app_path = find_app_path(sftp)
    if not app_path:
        sftp.close()
        ssh.close()
        return
    
    # 上傳部署包
    print("📌 上傳部署包...\n")
    local_package = Path.cwd() / "wos-manager-deploy.tar.gz"
    remote_package = f"{app_path}/wos-manager-deploy.tar.gz"
    
    try:
        file_size = local_package.stat().st_size
        print(f"   本地: {local_package.name} ({file_size / 1024:.0f} KB)")
        print(f"   遠程: {remote_package}")
        sftp.put(str(local_package), remote_package)
        print("✅ 上傳成功\n")
    except Exception as e:
        print(f"❌ 上傳失敗: {e}\n")
        sftp.close()
        ssh.close()
        return
    
    # 上傳部署腳本
    print("📌 上傳部署腳本...\n")
    local_script = Path.cwd() / "deploy.sh"
    remote_script = f"{app_path}/deploy.sh"
    
    try:
        sftp.put(str(local_script), remote_script)
        print("✅ 上傳成功\n")
    except Exception as e:
        print(f"❌ 上傳失敗: {e}\n")
        sftp.close()
        ssh.close()
        return
    
    # 設置權限並執行
    print("📌 執行部署腳本...\n")
    try:
        # 由於 Shell 被禁用，嘗試通過 SFTP 的 stat 查看文件
        print("   注意: Shell 被禁用，無法遠程執行腳本")
        print("   請通過 Cloudways File Manager 手動執行:\n")
        print(f"   1. 進入 {app_path}")
        print("   2. 右鍵點擊 deploy.sh")
        print("   3. 選擇 Execute 或 SSH Terminal")
        print("   4. 執行: chmod +x deploy.sh && ./deploy.sh\n")
    except Exception as e:
        print(f"   錯誤: {e}\n")
    
    # 列出已上傳的文件
    print("📌 已上傳文件:\n")
    try:
        files = sftp.listdir(app_path)
        for f in files[-5:]:
            print(f"   {f}")
    except:
        pass
    
    sftp.close()
    ssh.close()
    
    print("\n" + "=" * 70)
    print("✅ 文件上傳完成！")
    print("=" * 70)

if __name__ == "__main__":
    upload_and_deploy()
