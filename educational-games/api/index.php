<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
    header('Allow: GET, HEAD');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
header('Cache-Control: public, max-age=300');
if ($_SERVER['REQUEST_METHOD'] === 'HEAD') { exit; }
readfile(__DIR__ . '/catalogue.json');
