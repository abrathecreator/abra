<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Honeypot: боты его заполняют, люди не видят. Тихий "успех" без обработки.
if (!empty($_POST['_gotcha'])) {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

$name = trim((string) ($_POST['name'] ?? ''));
$phone = trim((string) ($_POST['phone'] ?? ''));
$consent = isset($_POST['consent']) && $_POST['consent'] !== '';
$messengers = $_POST['messenger'] ?? [];
if (!is_array($messengers)) {
    $messengers = [$messengers];
}
$messengers = array_values(array_filter(array_map('strval', $messengers)));

$errors = [];
if ($name === '') {
    $errors[] = ['field' => 'name', 'message' => 'Укажите имя.'];
}
if ($phone === '') {
    $errors[] = ['field' => 'phone', 'message' => 'Укажите номер телефона.'];
}
if (!$consent) {
    $errors[] = ['field' => 'consent', 'message' => 'Нужно согласие на обработку персональных данных.'];
}

if ($errors) {
    http_response_code(422);
    echo json_encode(['errors' => $errors]);
    exit;
}

$entry = [
    'time' => date('c'),
    'name' => $name,
    'phone' => $phone,
    'messenger' => $messengers,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
];

$logFile = '/var/log/abra-contact/submissions.log';
$logLine = json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
if (@file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Не удалось сохранить заявку']);
    exit;
}

// Письмо — best effort. Заявка уже сохранена в лог выше, поэтому даже если
// SMTP ещё не настроен (relay через smarthost добавляется отдельно), ни одна
// заявка не теряется — её видно в логе.
$mailTo = 'artemutyashev@gmail.com';
$subject = '=?UTF-8?B?' . base64_encode('Новая заявка с a-bra.ru') . '?=';
$body = "Имя: {$name}\n"
    . "Телефон: {$phone}\n"
    . ($messengers ? 'Мессенджер: ' . implode(', ', $messengers) . "\n" : '')
    . "IP: {$entry['ip']}\n"
    . "Время: {$entry['time']}\n";
$headers = "From: a-bra.ru <noreply@a-bra.ru>\r\nContent-Type: text/plain; charset=UTF-8";

@mail($mailTo, $subject, $body, $headers);

http_response_code(200);
echo json_encode(['ok' => true]);
