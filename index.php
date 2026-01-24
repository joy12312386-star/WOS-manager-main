<?php
// 处理静态文件请求
$request_uri = $_SERVER['REQUEST_URI'];

// 移除查询字符串
$path = parse_url($request_uri, PHP_URL_PATH);

// 去除前导斜杠
$path = ltrim($path, '/');

// 定义允许的静态文件扩展名
$static_exts = ['js', 'css', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'eot', 'map'];
$file_ext = pathinfo($path, PATHINFO_EXTENSION);

// 如果是静态文件请求，尝试从 dist 提供
if (in_array($file_ext, $static_exts)) {
    $file_path = __DIR__ . '/dist/' . $path;
    
    // 安全检查：确保文件在 dist 目录内
    $real_path = realpath($file_path);
    $dist_path = realpath(__DIR__ . '/dist');
    
    if ($real_path && strpos($real_path, $dist_path) === 0 && file_exists($real_path)) {
        // 设置正确的 Content-Type
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

// 对于所有其他请求（包括 /index.html），提供 SPA index.html
$index_path = __DIR__ . '/dist/index.html';
if (file_exists($index_path)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($index_path);
} else {
    header('HTTP/1.0 404 Not Found');
    echo '404 - File not found';
}
?>
