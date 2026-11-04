<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const FIREBASE_PROJECT_ID = 'bd-amor09';
// Firebase Web API keys are public identifiers; authorization is enforced by the ID token and role check below.
const FIREBASE_WEB_API_KEY = 'AIzaSyAFb2nTmv_GVWvihFtipmFgoeLkXUfgr24';
const MAX_UPLOAD_BYTES = 104857600;

function respond(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function firebaseRequest(string $url, array $payload, ?string $idToken = null): array {
    if (!function_exists('curl_init')) {
        respond(500, ['error' => 'El servidor no tiene habilitada la extensión cURL de PHP.']);
    }
    $headers = ['Content-Type: application/json'];
    if ($idToken !== null) $headers[] = 'Authorization: Bearer ' . $idToken;
    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    $decoded = is_string($response) ? json_decode($response, true) : null;
    if (!is_array($decoded)) $decoded = [];
    return [$status, $decoded];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Método no permitido.']);
}

$requestHeaders = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
$authorization = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? $requestHeaders['authorization']
    ?? '';
if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
    respond(401, ['error' => 'Inicia sesión para subir archivos.', 'code' => 'unauthenticated']);
}
$idToken = trim($matches[1]);

[$authStatus, $authResponse] = firebaseRequest(
    'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . FIREBASE_WEB_API_KEY,
    ['idToken' => $idToken]
);
$firebaseUser = $authResponse['users'][0] ?? null;
if ($authStatus !== 200 || !is_array($firebaseUser) || !empty($firebaseUser['disabled'])) {
    respond(401, ['error' => 'Tu sesión venció. Inicia sesión de nuevo e inténtalo.', 'code' => 'unauthenticated']);
}
$email = strtolower(trim((string) ($firebaseUser['email'] ?? '')));
if ($email === '') respond(403, ['error' => 'No pudimos identificar el correo de tu cuenta.', 'code' => 'permission-denied']);

// Match the same admin document used by the Lugares page before allowing server writes.
$roleQuery = [
    'structuredQuery' => [
        'from' => [['collectionId' => 'usuarios']],
        'where' => ['fieldFilter' => [
            'field' => ['fieldPath' => 'correo'],
            'op' => 'EQUAL',
            'value' => ['stringValue' => $email],
        ]],
        'limit' => 10,
    ],
];
[$roleStatus, $roleResponse] = firebaseRequest(
    'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/databases/(default)/documents:runQuery',
    $roleQuery,
    $idToken
);
$isAdmin = false;
if ($roleStatus === 200) {
    foreach ($roleResponse as $result) {
        if (($result['document']['fields']['rol']['stringValue'] ?? '') === 'admin') {
            $isAdmin = true;
            break;
        }
    }
}
if (!$isAdmin) respond(403, ['error' => 'Solo una cuenta administradora puede cargar archivos.', 'code' => 'permission-denied']);

$folder = (string) ($_POST['folder'] ?? '');
if (!in_array($folder, ['Albun', 'Ubicaciones'], true)) {
    respond(400, ['error' => 'La carpeta de destino no es válida.', 'code' => 'invalid-folder']);
}
if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    respond(400, ['error' => 'Selecciona un archivo para subir.', 'code' => 'missing-file']);
}
$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $status = in_array((int) $file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 413 : 400;
    respond($status, ['error' => $status === 413 ? 'El servidor rechazó el archivo por su tamaño. Reduce el archivo o aumenta el límite de carga de PHP en Hostinger.' : 'No se pudo recibir el archivo. Vuelve a seleccionarlo.']);
}
$size = (int) ($file['size'] ?? 0);
if ($size < 1 || $size > MAX_UPLOAD_BYTES) {
    respond(413, ['error' => 'El archivo debe pesar menos de 100 MB.', 'code' => 'file-too-large']);
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
$extensions = [
    'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
    'image/gif' => 'gif', 'image/avif' => 'avif', 'image/heic' => 'heic',
    'image/heif' => 'heif', 'video/mp4' => 'mp4', 'video/webm' => 'webm',
    'video/quicktime' => 'mov', 'video/ogg' => 'ogv', 'video/x-m4v' => 'm4v',
];
if (!isset($extensions[$mime])) {
    respond(415, ['error' => 'El archivo no es una imagen o un video compatible.', 'code' => 'unsupported-media']);
}

$directory = dirname(__DIR__) . '/assets/img/' . $folder;
if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
    respond(500, ['error' => 'No se pudo crear la carpeta de destino en Hostinger.']);
}
if (!is_writable($directory)) {
    respond(500, ['error' => 'Hostinger no permite escribir en assets/img/' . $folder . '. Revisa los permisos de esa carpeta.']);
}
$filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
if (!move_uploaded_file((string) $file['tmp_name'], $directory . '/' . $filename)) {
    respond(500, ['error' => 'No se pudo guardar el archivo en Hostinger. Revisa los permisos y el límite de carga de PHP.']);
}

respond(201, ['path' => 'img/' . $folder . '/' . $filename]);
