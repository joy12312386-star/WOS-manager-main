<?php
/**
 * API 请求处理器 - 带有自动后端启动功能
 * 如果后端未运行，此脚本会尝试启动它
 */

// 获取原始请求路径
// 从 REQUEST_URI 中提取真实路径
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// 处理直接访问 .php 文件的情况
// 如果访问 /test-php.php、/diagnostic.php 等，直接包含文件
$script_name = basename($path);
if (in_array($script_name, ['diagnostic.php', 'test-php.php']) && file_exists(__DIR__ . '/' . $script_name)) {
    include __DIR__ . '/' . $script_name;
    exit;
}

// ===== 处理 API 请求 =====
if (strpos($path, '/api/') === 0) {
    $method = $_SERVER['REQUEST_METHOD'];
    $body = file_get_contents('php://input');
    $query_string = $_SERVER['QUERY_STRING'] ?? '';
    
    // 后端 API 地址
    $backend_url = 'http://127.0.0.1:3001' . $path;
    if ($query_string) {
        $backend_url .= '?' . $query_string;
    }
    
    // 尝试发送请求到后端
    $ch = curl_init($backend_url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    
    // 复制请求头
    $headers = [];
    if (function_exists('getallheaders')) {
        foreach (getallheaders() as $key => $value) {
            if (!in_array(strtolower($key), ['host', 'connection'])) {
                $headers[] = "$key: $value";
            }
        }
    }
    
    if (!empty($body)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        if (!in_array('Content-Type: application/json', $headers)) {
            $headers[] = 'Content-Type: application/json';
        }
    }
    
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    // 如果连接被拒绝，尝试启动后端
    if (strpos($curl_error, 'Connection refused') !== false || $http_code == 0) {
        // 尝试启动后端
        $start_cmd = 'cd /home/996734.cloudwaysapps.com/vwvwhgqshd && NODE_ENV=production nohup npm run dev:server > backend.log 2>&1 &';
        shell_exec($start_cmd);
        
        // 等待后端启动
        sleep(3);
        
        // 重新尝试
        $ch = curl_init($backend_url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        
        if (!empty($body)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            $headers[] = 'Content-Type: application/json';
        }
        if (!empty($headers)) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $content_type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $curl_error = curl_error($ch);
        curl_close($ch);
    }
    
    // 转发响应
    if (!empty($content_type)) {
        header("Content-Type: $content_type");
    } else {
        header('Content-Type: application/json');
    }
    
    if ($http_code > 0) {
        http_response_code($http_code);
    }
    
    if ($curl_error) {
        header('HTTP/1.1 503 Service Unavailable');
        echo json_encode(['error' => 'Backend service unavailable', 'details' => $curl_error]);
    } else {
        echo $response;
    }
    exit;
}

// ===== 处理静态文件 =====
$path = ltrim($path, '/');
$file_ext = pathinfo($path, PATHINFO_EXTENSION);
$static_exts = ['js', 'css', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'map'];

if (in_array($file_ext, $static_exts)) {
    $file_path = __DIR__ . '/dist/' . $path;
    $real_path = realpath($file_path);
    $dist_path = realpath(__DIR__ . '/dist');
    
    if ($real_path && strpos($real_path, $dist_path) === 0 && file_exists($real_path)) {
        $mime_types = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'eot' => 'application/vnd.ms-fontobject',
            'map' => 'application/json'
        ];
        
        header('Content-Type: ' . ($mime_types[$file_ext] ?? 'application/octet-stream'));
        header('Cache-Control: public, max-age=31536000');
        readfile($real_path);
        exit;
    }
}

// ===== SPA 回退 =====
$index_path = __DIR__ . '/dist/index.html';
if (file_exists($index_path)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($index_path);
} else {
    header('HTTP/1.0 404 Not Found');
    echo '404 - File not found';
}
?>
