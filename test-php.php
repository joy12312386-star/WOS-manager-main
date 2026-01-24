<?php
// 简单的测试脚本 - 用于调试

echo "PHP 执行测试\n";
echo "现在: " . date('Y-m-d H:i:s') . "\n";
echo "工作目录: " . getcwd() . "\n";
echo "应用目录是否存在: " . (is_dir('/home/996734.cloudwaysapps.com/vwvwhgqshd') ? 'yes' : 'no') . "\n";

// 测试 shell_exec
echo "\n测试 shell_exec:\n";
$output = shell_exec('whoami 2>&1');
echo "当前用户: " . trim($output) . "\n";

// 测试 npm
$npm_test = shell_exec('which npm 2>&1');
echo "npm 路径: " . trim($npm_test) . "\n";

// 测试后端连接
echo "\n测试后端连接:\n";
$ch = curl_init('http://127.0.0.1:3001/api/health');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 2);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP 状态码: $http_code\n";
echo "错误: " . ($error ?: 'none') . "\n";
echo "响应: " . substr($response, 0, 100) . "\n";

// 尝试启动后端
if ($http_code !== 200) {
    echo "\n尝试启动后端:\n";
    $app_dir = '/home/996734.cloudwaysapps.com/vwvwhgqshd';
    $cmd = "cd $app_dir && npm install 2>&1 | head -5";
    $output = shell_exec($cmd);
    echo "npm install 输出: " . $output . "\n";
}
?>
