#!/usr/bin/env python3
"""
WOS Manager Cloudways 完整自動部署工具
支持 SFTP 上傳 + 遠程命令執行
"""

import os
import sys
import time
import paramiko
from pathlib import Path
from getpass import getpass

class CloudwaysAutoDeployment:
    def __init__(self):
        self.host = "172.105.217.161"
        self.user = "svs2438"
        self.password = None
        self.remote_path = "/home/svs2438/applications/vwwwhgqshd/public_html"
        self.base_path = Path(__file__).parent
        self.package_file = self.base_path / "wos-manager-deploy.tar.gz"
        self.deploy_script = self.base_path / "deploy.sh"
        
        # SSH 客戶端
        self.ssh = None
        self.sftp = None
        
    def print_header(self, text):
        """列印標題"""
        print("\n" + "=" * 70)
        print(f"🚀 {text}")
        print("=" * 70 + "\n")
    
    def print_step(self, step_num, total, text):
        """列印步驟"""
        print(f"📌 [{step_num}/{total}] {text}")
    
    def print_success(self, text):
        """列印成功信息"""
        print(f"✅ {text}\n")
    
    def print_error(self, text):
        """列印錯誤信息"""
        print(f"❌ {text}\n")
        sys.exit(1)
    
    def print_info(self, text):
        """列印信息"""
        print(f"   {text}")
    
    def check_files(self):
        """檢查本地必要文件"""
        self.print_step(1, 7, "檢查本地文件")
        
        if not self.package_file.exists():
            self.print_error(f"找不到部署包: {self.package_file}")
        
        if not self.deploy_script.exists():
            self.print_error(f"找不到部署腳本: {self.deploy_script}")
        
        self.print_info(f"部署包: {self.package_file.name} ({self.package_file.stat().st_size / 1024:.0f} KB)")
        self.print_info(f"部署腳本: {self.deploy_script.name}")
        self.print_success("本地文件檢查完成")
    
    def connect_ssh(self):
        """連接到 Cloudways 伺服器"""
        self.print_step(2, 7, "連接到伺服器")
        
        if not self.password:
            self.print_info(f"伺服器: {self.host}")
            self.print_info(f"用戶: {self.user}")
            self.password = getpass("請輸入 Cloudways SSH 密碼: ")
        
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            self.print_info(f"正在連接到 {self.user}@{self.host}...")
            self.ssh.connect(
                hostname=self.host,
                username=self.user,
                password=self.password,
                timeout=10,
                look_for_keys=False,
                allow_agent=False
            )
            
            self.sftp = self.ssh.open_sftp()
            self.print_success(f"已連接到 {self.host}")
            
        except paramiko.AuthenticationException:
            self.print_error("認證失敗 - 密碼不正確")
        except paramiko.SSHException as e:
            self.print_error(f"SSH 連接失敗: {e}")
        except Exception as e:
            self.print_error(f"連接失敗: {e}")
    
    def upload_file(self, local_file, remote_file, description):
        """上傳文件到遠程"""
        self.print_step(3, 7, f"上傳 {description}")
        
        try:
            file_size = local_file.stat().st_size
            self.print_info(f"本地文件: {local_file.name} ({file_size / 1024:.0f} KB)")
            self.print_info(f"遠程路徑: {remote_file}")
            self.print_info("上傳中...")
            
            # 建立進度回調
            def upload_callback(bytes_transferred, total_bytes):
                percent = (bytes_transferred / total_bytes) * 100
                print(f"\r   進度: {percent:.0f}% ({bytes_transferred / 1024:.0f} KB / {total_bytes / 1024:.0f} KB)", end='', flush=True)
            
            self.sftp.put(str(local_file), remote_file, callback=upload_callback)
            print()  # 新行
            
            # 驗證上傳
            remote_size = self.sftp.stat(remote_file).st_size
            if remote_size == file_size:
                self.print_info(f"遠程文件大小: {remote_size / 1024:.0f} KB ✓")
                self.print_success(f"{description} 上傳成功")
            else:
                self.print_error(f"文件大小不匹配 - 本地: {file_size}, 遠程: {remote_size}")
                
        except Exception as e:
            self.print_error(f"上傳 {description} 失敗: {e}")
    
    def execute_remote_command(self, command, description=""):
        """執行遠程命令"""
        if description:
            self.print_info(f"{description}")
        
        try:
            stdin, stdout, stderr = self.ssh.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()
            
            output = stdout.read().decode('utf-8', errors='ignore').strip()
            error = stderr.read().decode('utf-8', errors='ignore').strip()
            
            if exit_code != 0 and error:
                print(f"   錯誤: {error[:200]}")
                return False
            
            if output:
                output_lines = output.split('\n')
                for line in output_lines[:5]:  # 只顯示前 5 行
                    print(f"   {line}")
                if len(output_lines) > 5:
                    remaining = len(output_lines) - 5
                    print(f"   ... (還有 {remaining} 行)")
            
            return exit_code == 0
            
        except Exception as e:
            print(f"   執行命令失敗: {e}")
            return False
    
    def prepare_remote(self):
        """準備遠程環境"""
        self.print_step(4, 7, "準備遠程環境")
        
        commands = [
            (f"ls -lh {self.remote_path} | head -10", "查看現有文件"),
            (f"chmod +x {self.remote_path}/deploy.sh", "設置部署腳本權限"),
        ]
        
        for cmd, desc in commands:
            self.execute_remote_command(cmd, desc)
        
        self.print_success("遠程環境準備完成")
    
    def execute_deploy(self):
        """執行部署腳本"""
        self.print_step(5, 7, "執行部署腳本 (約 3-5 分鐘)")
        
        deploy_cmd = f"cd {self.remote_path} && bash ./deploy.sh"
        
        self.print_info("部署開始...")
        print()
        
        try:
            stdin, stdout, stderr = self.ssh.exec_command(deploy_cmd, get_pty=True)
            
            # 實時顯示輸出
            while True:
                line = stdout.readline()
                if not line:
                    break
                print(f"   {line.rstrip()}")
                time.sleep(0.1)
            
            exit_code = stdout.channel.recv_exit_status()
            
            if exit_code != 0:
                error_output = stderr.read().decode('utf-8', errors='ignore')
                if error_output:
                    self.print_error(f"部署失敗: {error_output[:500]}")
                else:
                    self.print_error("部署腳本執行失敗")
            
            self.print_success("部署腳本執行完成")
            
        except Exception as e:
            self.print_error(f"執行部署腳本失敗: {e}")
    
    def verify_deployment(self):
        """驗證部署"""
        self.print_step(6, 7, "驗證部署")
        
        commands = [
            (f"pm2 status", "應用狀態"),
            (f"ls -lh {self.remote_path} | grep dist", "檢查前端文件"),
        ]
        
        for cmd, desc in commands:
            self.execute_remote_command(cmd, desc)
        
        self.print_success("部署驗證完成")
    
    def print_summary(self):
        """列印部署摘要"""
        self.print_step(7, 7, "部署完成！")
        
        print("\n" + "=" * 70)
        print("✅ WOS Manager 已成功部署到 Cloudways")
        print("=" * 70 + "\n")
        
        print("📍 應用訪問地址:")
        print("   前端: http://172.105.217.161")
        print("   API: http://172.105.217.161:3001\n")
        
        print("📊 查看應用狀態:")
        print("   ssh svs2438@172.105.217.161")
        print("   pm2 status")
        print("   pm2 logs wos-manager\n")
        
        print("💡 提示:")
        print("   - 應用約需 30 秒完全啟動")
        print("   - 如有問題，查看日誌: pm2 logs wos-manager")
        print("   - 要回滾: pm2 delete wos-manager\n")
    
    def deploy(self):
        """執行完整部署流程"""
        self.print_header("WOS Manager Cloudways 自動部署工具")
        
        try:
            # 步驟 1: 檢查文件
            self.check_files()
            
            # 步驟 2: 連接伺服器
            self.connect_ssh()
            
            # 步驟 3-4: 上傳文件
            self.print_step(3, 7, "上傳部署文件")
            self.upload_file(self.package_file, f"{self.remote_path}/wos-manager-deploy.tar.gz", "部署包")
            self.upload_file(self.deploy_script, f"{self.remote_path}/deploy.sh", "部署腳本")
            self.print_success("所有文件上傳完成")
            
            # 步驟 5: 準備環境
            self.prepare_remote()
            
            # 步驟 6: 執行部署
            self.execute_deploy()
            
            # 步驟 7: 驗證
            self.verify_deployment()
            
            # 列印摘要
            self.print_summary()
            
        except KeyboardInterrupt:
            print("\n\n❌ 部署已被中止")
            sys.exit(1)
        except Exception as e:
            self.print_error(f"部署過程出錯: {e}")
        finally:
            self.cleanup()
    
    def cleanup(self):
        """清理連接"""
        if self.sftp:
            try:
                self.sftp.close()
            except:
                pass
        if self.ssh:
            try:
                self.ssh.close()
            except:
                pass

if __name__ == "__main__":
    deployer = CloudwaysAutoDeployment()
    deployer.deploy()
