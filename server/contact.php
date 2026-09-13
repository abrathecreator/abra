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
$ymClientId = trim((string) ($_POST['ym_client_id'] ?? ''));
$timeOnSiteRaw = $_POST['time_on_site_seconds'] ?? null;
$timeOnSite = is_numeric($timeOnSiteRaw) ? (int) $timeOnSiteRaw : null;
$utm = [];
foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $utmKey) {
    $utmValue = trim((string) ($_POST[$utmKey] ?? ''));
    if ($utmValue !== '') {
        $utm[$utmKey] = $utmValue;
    }
}

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
    'ym_client_id' => $ymClientId,
    'time_on_site_seconds' => $timeOnSite,
    'utm' => $utm,
];

$logFile = '/var/log/abra-contact/submissions.log';
$logLine = json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n";
if (@file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Не удалось сохранить заявку']);
    exit;
}

// Общий текст деталей — используется и в письме, и в Telegram, чтобы при
// добавлении нового поля не забывать одно из двух мест.
$utmLine = '';
if ($utm) {
    $utmParts = [];
    foreach ($utm as $utmKey => $utmValue) {
        $utmParts[] = "{$utmKey}={$utmValue}";
    }
    $utmLine = 'UTM: ' . implode(', ', $utmParts) . "\n";
}
$detailsText = "Имя: {$name}\n"
    . "Телефон: {$phone}\n"
    . ($messengers ? 'Мессенджер: ' . implode(', ', $messengers) . "\n" : '')
    . "IP: {$entry['ip']}\n"
    . ($ymClientId ? "Яндекс.Метрика ClientID: {$ymClientId}\n" : '')
    . ($timeOnSite !== null ? "Время на сайте: {$timeOnSite} сек\n" : '')
    . $utmLine
    . "Время: {$entry['time']}\n";

// Письмо — best effort. Заявка уже сохранена в лог выше, поэтому даже если
// SMTP ещё не настроен (relay через smarthost добавляется отдельно), ни одна
// заявка не теряется — её видно в логе.
$mailTo = 'artemutyashev@gmail.com';
$subject = '=?UTF-8?B?' . base64_encode('Новая заявка с a-bra.ru') . '?=';
$body = $detailsText;
$headers = "From: a-bra.ru <noreply@a-bra.ru>\r\nContent-Type: text/plain; charset=UTF-8";

@mail($mailTo, $subject, $body, $headers);

// Telegram — тоже best effort, тоже после лога. Токен и chat_id живут в
// переменных окружения php-fpm на сервере, не в репозитории. Через
// file_get_contents со stream context, а не curl — расширения curl на
// сервере нет, только openssl/allow_url_fopen.
// Идёт не напрямую на api.telegram.org, а через Cloudflare Worker-релей:
// у хостера VPS (FirstByte) исходящий трафик на всю подсеть Telegram
// блокируется на сетевом уровне (timeout на все IP, и v4, и v6, при этом
// остальной интернет с сервера работает нормально) — сам воркер только
// пробрасывает путь и тело запроса на api.telegram.org, секретов не хранит.
$telegramRelayBase = 'https://abra-telegram-relay.artemutyashev.workers.dev';
$telegramToken = getenv('TELEGRAM_BOT_TOKEN');
$telegramChatId = getenv('TELEGRAM_CHAT_ID');
if ($telegramToken && $telegramChatId) {
    $telegramText = "Новая заявка с a-bra.ru\n" . rtrim($detailsText);
    $telegramContext = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query(['chat_id' => $telegramChatId, 'text' => $telegramText]),
            'timeout' => 5,
            'ignore_errors' => true,
        ],
    ]);
    @file_get_contents("{$telegramRelayBase}/bot{$telegramToken}/sendMessage", false, $telegramContext);
}

http_response_code(200);
echo json_encode(['ok' => true]);
