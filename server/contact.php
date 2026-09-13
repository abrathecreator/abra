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

// Порядковый номер заявки — общий счётчик в отдельном файле, инкремент под
// flock, чтобы две одновременные заявки не получили один и тот же номер.
$leadNumber = null;
$counterHandle = @fopen('/var/log/abra-contact/counter.txt', 'c+');
if ($counterHandle !== false) {
    if (flock($counterHandle, LOCK_EX)) {
        $leadNumber = (int) trim((string) fread($counterHandle, 20)) + 1;
        ftruncate($counterHandle, 0);
        rewind($counterHandle);
        fwrite($counterHandle, (string) $leadNumber);
        flock($counterHandle, LOCK_UN);
    }
    fclose($counterHandle);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? '';

// Геолокация по IP — best effort, отдельный бесплатный сервис без ключа
// (ipwho.is), напрямую по HTTPS: в отличие от Telegram, для него никакой
// сетевой блокировки у хостера VPS нет. Но у этого VPS в принципе битый
// исходящий IPv6 (не только до Telegram) — на любой хост с AAAA-записью
// file_get_contents виснет на IPv6-попытке на несколько секунд и не
// успевает попробовать IPv4 в рамках вменяемого таймаута (curl не страдает
// от этого, потому что параллелит v4/v6, а stream-обёртка PHP — нет).
// Поэтому резолвим хост вручную через gethostbyname() (только A-записи,
// IPv6 не видит в принципе) и стучимся сразу на IPv4-адрес, а исходное имя
// оставляем в Host-заголовке и SNI, чтобы TLS-сертификат сошёлся.
$geo = '';
if ($ip !== '') {
    $geoHost = 'ipwho.is';
    $geoIp = gethostbyname($geoHost);
    $geoContext = stream_context_create([
        'http' => [
            'timeout' => 3,
            'ignore_errors' => true,
            'header' => "Host: {$geoHost}\r\n",
        ],
        'ssl' => ['peer_name' => $geoHost, 'SNI_enabled' => true],
    ]);
    $geoResponse = @file_get_contents("https://{$geoIp}/" . urlencode($ip), false, $geoContext);
    $geoData = $geoResponse ? json_decode($geoResponse, true) : null;
    if (is_array($geoData) && !empty($geoData['success'])) {
        $geoParts = array_filter([$geoData['city'] ?? '', $geoData['country'] ?? '']);
        $geo = implode(', ', $geoParts);
        if (!empty($geoData['connection']['isp'])) {
            $geo .= ' (' . $geoData['connection']['isp'] . ')';
        }
    }
}

$entry = [
    'number' => $leadNumber,
    'time' => date('c'),
    'name' => $name,
    'phone' => $phone,
    'messenger' => $messengers,
    'ip' => $ip,
    'geo' => $geo,
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
    . ($geo ? "Гео: {$geo}\n" : '')
    . ($ymClientId ? "Яндекс.Метрика ClientID: {$ymClientId}\n" : '')
    . ($timeOnSite !== null ? "Время на сайте: {$timeOnSite} сек\n" : '')
    . $utmLine
    . "Время: {$entry['time']}\n";

// Письмо — best effort. Заявка уже сохранена в лог выше, поэтому даже если
// SMTP ещё не настроен (relay через smarthost добавляется отдельно), ни одна
// заявка не теряется — её видно в логе.
$mailTo = 'artemutyashev@gmail.com';
$titleText = $leadNumber ? "Новая заявка №{$leadNumber} с a-bra.ru" : 'Новая заявка с a-bra.ru';
$subject = '=?UTF-8?B?' . base64_encode($titleText) . '?=';
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
    $telegramText = "{$titleText}\n" . rtrim($detailsText);
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
