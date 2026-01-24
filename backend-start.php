<?php
// 内部启动脚本 - 启动 Node.js 后端服务器
// 出于安全考虑，请删除此文件或添加身份验证

// 检查密钥（基础安全）
$key = $_GET['key'] ?? '';
if ($key !== 'start-wos-backend-2024') {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

set_time_limit(0);
error_reporting(0);

$base_dir = '/home/996734.cloudwaysapps.com/vwvwhgqshd';
$pid_file = '/tmp/wos-backend.pid';
$log_file = $base_dir . '/backend.log';

// 检查后端是否已在运行
$backend_running = false;
if (file_exists($pid_file)) {
    $pid = (int)trim(file_get_contents($pid_file));
    if ($pid > 0) {
        // 在 macOS 上检查进程
        $check = shell_exec("ps -p $pid 2>/dev/null || echo 'not_running'");
        if (strpos($check, 'not_running') === false) {
            $backend_running = true;
        }
    }
}

if ($backend_running) {
    echo "✓ 后端已在运行 (PID: " . file_get_contents($pid_file) . ")";
    exit;
}

// 启动后端
$cmd = "cd $base_dir && NODE_ENV=production nohup node -r tsx/cjs server/index.ts > $log_file 2>&1 & echo \$! > $pid_file";

// 使用 shell_exec 启动
$result = shell_exec($cmd . ' 2>&1');

sleep(2);

if (file_exists($pid_file)) {
    $pid = trim(file_get_contents($pid_file));
    echo "✓ 后端启动成功 (PID: $pid)\n";
    echo "日志文件: $log_file\n";
    
    // 显示最新的日志
    if (file_exists($log_file)) {
        echo "\n最新日志:\n";
        echo shell_exec("tail -n 10 $log_file");
    }
} else {
    echo "✗ 后端启动失败\n";
    echo "命令: $cmd\n";
    if (file_exists($log_file)) {
        echo "\n错误日志:\n";
        echo shell_exec("tail -n 20 $log_file");
    }
}
?>
