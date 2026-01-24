<?php
// 诊断页面 - 用于检查和启动后端
// 访问 URL: /diagnostic.php?key=start-wos-backend

$key = $_GET['key'] ?? '';

if ($key !== 'start-wos-backend') {
    http_response_code(403);
    die('Access denied');
}

header('Content-Type: application/json');

$result = [
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => [],
    'action' => 'none'
];

// 检查 1: curl 连接测试
$ch = curl_init('http://127.0.0.1:3001/api/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 2);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

$result['checks'][] = [
    'name' => '后端连接测试',
    'status' => $http_code === 200 ? 'success' : 'failed',
    'http_code' => $http_code,
    'error' => $error ?: null
];

// 检查 2: 后端 PID 文件
$pid_file = '/tmp/wos-backend.pid';
$pid_exists = file_exists($pid_file);
$pid_content = $pid_exists ? trim(file_get_contents($pid_file)) : null;

$result['checks'][] = [
    'name' => 'PID 文件',
    'path' => $pid_file,
    'exists' => $pid_exists,
    'pid' => $pid_content
];

// 检查 3: 应用目录权限
$app_dir = '/home/996734.cloudwaysapps.com/vwvwhgqshd';
$app_exists = is_dir($app_dir);
$app_writable = is_writable($app_dir);

$result['checks'][] = [
    'name' => '应用目录',
    'path' => $app_dir,
    'exists' => $app_exists,
    'writable' => $app_writable
];

// 检查 4: 后端日志
$log_file = $app_dir . '/backend.log';
$log_exists = file_exists($log_file);
$log_size = $log_exists ? filesize($log_file) : 0;

$result['checks'][] = [
    'name' => '后端日志',
    'path' => $log_file,
    'exists' => $log_exists,
    'size' => $log_size,
    'last_modified' => $log_exists ? date('Y-m-d H:i:s', filemtime($log_file)) : null
];

// 如果后端未运行，尝试启动
if ($http_code !== 200) {
    $result['action'] = 'starting_backend';
    
    $start_cmd = "cd $app_dir && NODE_ENV=production nohup npm run dev:server > backend.log 2>&1 &";
    $output = shell_exec($start_cmd . ' 2>&1');
    
    $result['startup'] = [
        'command' => $start_cmd,
        'output' => $output
    ];
    
    // 等待后端启动
    sleep(3);
    
    // 再次测试连接
    $ch = curl_init('http://127.0.0.1:3001/api/health');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    $result['post_startup_check'] = [
        'status' => $http_code === 200 ? 'success' : 'failed',
        'http_code' => $http_code,
        'error' => $error ?: null
    ];
}

// 显示最后 20 行日志
if ($log_exists) {
    $log_content = file_get_contents($log_file);
    $log_lines = explode("\n", $log_content);
    $result['last_log_lines'] = array_slice($log_lines, -20);
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
