<?php
/**
 * 靜態文件服務器
 * 處理所有 /assets/* 的請求
 */

header('Cache-Control: public, max-age=31536000, immutable');

$path = $_SERVER['REQUEST_URI'];
if (strpos($path, '?') !== false) {
    $path = substr($path, 0, strpos($path, '?'));
}

// 移除查詢字符串後的路徑
$file = __DIR__ . '/dist' . $path;
$realpath = realpath($file);
$dist_realpath = realpath(__DIR__ . '/dist');

// 安全檢查：確保文件在 dist 目錄內
if (!$realpath || !$dist_realpath || strpos($realpath, $dist_realpath) !== 0) {
    http_response_code(404);
    die('Not found');
}

// 檢查文件是否存在且可讀
if (!file_exists($realpath) || !is_file($realpath) || !is_readable($realpath)) {
    http_response_code(404);
    die('Not found');
}

// MIME 類型
$ext = strtolower(pathinfo($realpath, PATHINFO_EXTENSION));
$mimes = [
    'js' => 'application/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'html' => 'text/html; charset=utf-8',
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
    'map' => 'application/json',
    'json' => 'application/json'
];

header('Content-Type: ' . ($mimes[$ext] ?? 'application/octet-stream'));
readfile($realpath);
exit;
?>
