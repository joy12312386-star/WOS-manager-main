#!/usr/bin/env python3
import paramiko
from pathlib import Path

host = "172.105.217.161"
user = "svs2438"
key_path = Path.home() / ".ssh" / "cloudways_rsa"
package_file = Path.cwd() / "wos-manager-deploy.tar.gz"
deploy_script = Path.cwd() / "deploy.sh"

print("🔍 探查遠程伺服器路徑...")

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(hostname=host, username=user, key_filename=str(key_path), timeout=10)
    sftp = ssh.open_sftp()
    
    print("\n✅ SFTP 連接成功\n")
    
    # 探查路徑
    paths_to_check = [
        "/",
        "/home",
        "/var",
        "/opt",
        "/srv",
    ]
    
    for path in paths_to_check:
        try:
            items = sftp.listdir(path)
            print(f"📂 {path}:")
            for item in items[:5]:
                print(f"   {item}")
            if len(items) > 5:
                print(f"   ... ({len(items)} items)")
        except Exception as e:
            print(f"📂 {path}: ❌ {type(e).__name__}")
        print()
    
    sftp.close()
    ssh.close()
    
except Exception as e:
    print(f"❌ 連接失敗: {e}")
