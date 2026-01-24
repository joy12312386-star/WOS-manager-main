<?php
// 启动后端服务器的 PHP 脚本
// 使用此脚本来启动 Node.js 后端

$pid_file = '/tmp/wos_backend.pid';

// 检查后端是否已在运行
if (file_exists($pid_file)) {
    $pid = trim(file_get_contents($pid_file));
    
    // 检查进程是否存活
    $check = @file_get_contents("/proc/$pid/status");
    if ($check !== false) {
        echo "后端已在运行 (PID: $pid)";
        exit;
    }
}

// 启动后端
$command = "cd /home/996734.cloudwaysapps.com/vwvwhgqshd && NODE_ENV=production nohup npm run dev:server > backend.log 2>&1 &";
$output = [];
exec($command, $output, $return_code);

if ($return_code === 0) {
    echo "后端启动命令已执行";
} else {
    echo "后端启动失败";
}
?>
