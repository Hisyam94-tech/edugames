<?php
// A small in-memory catalogue; no database access or session locks.
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'HEAD') {
    header('Allow: GET, HEAD');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}
header('Cache-Control: public, max-age=300');
$subjects = [
    'math' => ['name' => 'Math', 'icon' => '＋', 'status' => 'OUR FIRST ADVENTURE · COMING SOON', 'description' => 'Make friends with numbers, spot patterns and discover how much you can do, one little challenge at a time.', 'topics' => ['Numbers & counting', 'Addition & subtraction', 'Multiplication & division']],
    'malay' => ['name' => 'Bahasa Melayu', 'icon' => 'Ba', 'status' => 'COMING SOON', 'description' => 'A world of words and stories is waiting. Discover Bahasa Melayu through playful activities.', 'topics' => ['Huruf & suku kata', 'Perkataan & makna', 'Ayat & cerita']],
    'english' => ['name' => 'English', 'icon' => 'Aa', 'status' => 'COMING SOON', 'description' => 'Find the words to share your big ideas. Explore letters, vocabulary and stories.', 'topics' => ['Letters & sounds', 'Everyday vocabulary', 'Reading & sentences']],
    'science' => ['name' => 'Science', 'icon' => '⚗', 'status' => 'COMING SOON', 'description' => 'Let your curiosity lead the way. Explore the wonderful world around you.', 'topics' => ['Living things', 'Materials & everyday objects', 'Earth & space']],
    'agama' => ['name' => 'Agama', 'icon' => '☾', 'status' => 'COMING SOON', 'description' => 'Discover lessons in faith, good manners and kindness through thoughtful learning activities.', 'topics' => ['Adab & akhlak', 'Asas ibadah', 'Huruf hijaiyah']],
];

if ($method === 'HEAD') { exit; }
echo json_encode(isset($subjectKey) ? $subjects[$subjectKey] : $subjects, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
