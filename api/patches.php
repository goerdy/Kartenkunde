<?php
declare(strict_types=1);
// Local, administrator-provided images only. No upload or remote URL interface.
function patch_catalog(string $source, string $cache): array {
    if (!extension_loaded('gd')) throw new RuntimeException('Image conversion unavailable');
    if (!is_dir($cache) && !mkdir($cache, 0750, true) && !is_dir($cache)) throw new RuntimeException('Image cache unavailable');
    $lock = fopen($cache.'/catalog.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Image cache busy');
    try {
        $files = glob($source.'/*') ?: [];
        natcasesort($files); $patches = []; $skipped = 0;
        foreach ($files as $file) {
            if (is_link($file) || !is_file($file) || !preg_match('/\.(png|jpe?g|webp|gif)$/i', $file)) continue;
            $size = filesize($file);
            if (!$size || $size > 20*1024*1024) { $skipped++; continue; }
            $info = @getimagesize($file);
            if (!$info || !in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)
                || $info[0] < 1 || $info[1] < 1 || $info[0] > 12000 || $info[1] > 12000 || $info[0]*$info[1] > 24000000) { $skipped++; continue; }
            $hash = hash('sha256', 'patch-512-v1:'.hash_file('sha256', $file));
            $target = $cache.'/'.$hash.'.png';
            if (!is_file($target)) {
                $image = @imagecreatefromstring(file_get_contents($file));
                if (!$image) { $skipped++; continue; }
                // Respect portrait/landscape orientation of JPEG photographs when EXIF is available.
                $orientation = $info[2] === IMAGETYPE_JPEG && function_exists('exif_read_data') ? (int)(@exif_read_data($file)['Orientation'] ?? 1) : 1;
                if (in_array($orientation, [2, 5, 7], true)) imageflip($image, IMG_FLIP_HORIZONTAL);
                if ($orientation === 4) imageflip($image, IMG_FLIP_VERTICAL);
                $angle = [3=>180, 5=>90, 6=>-90, 7=>-90, 8=>90][$orientation] ?? 0;
                if ($angle) $image = imagerotate($image, $angle, 0);
                $w = imagesx($image); $h = imagesy($image); $factor = min(1, 512/max($w, $h));
                $width = max(1, (int)round($w*$factor)); $height = max(1, (int)round($h*$factor));
                $thumb = imagecreatetruecolor($width, $height);
                imagealphablending($thumb, false); imagesavealpha($thumb, true);
                imagefill($thumb, 0, 0, imagecolorallocatealpha($thumb, 0, 0, 0, 127));
                imagecopyresampled($thumb, $image, 0, 0, 0, 0, $width, $height, $w, $h);
                $temp = tempnam($cache, 'patch-');
                if (!$temp || !imagepng($thumb, $temp, 7) || !rename($temp, $target)) throw new RuntimeException('Image conversion failed');
                chmod($target, 0640);
            }
            $thumbInfo = getimagesize($target);
            $patches[] = ['id'=>$hash, 'label'=>str_replace(['_', '-'], ' ', pathinfo($file, PATHINFO_FILENAME)),
                'src'=>'?image='.$hash, 'width'=>$thumbInfo[0], 'height'=>$thumbInfo[1]];
        }
        return ['patches'=>$patches, 'skipped'=>$skipped];
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    header('X-Content-Type-Options: nosniff');
    $cache = dirname(__DIR__).'/var/patches';
    try {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') { header('Allow: GET'); http_response_code(405); exit; }
        if (isset($_GET['image'])) {
            if (count($_GET) !== 1 || !is_string($_GET['image']) || !preg_match('/^[a-f0-9]{64}$/D', $_GET['image'])) { http_response_code(400); exit; }
            $file = $cache.'/'.$_GET['image'].'.png';
            if (!is_file($file)) { http_response_code(404); exit; }
            header('Content-Type: image/png'); header('Cache-Control: public, max-age=31536000, immutable');
            header('Content-Length: '.filesize($file)); readfile($file); exit;
        }
        if ($_GET) { http_response_code(400); exit; }
        header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
        echo json_encode(patch_catalog(dirname(__DIR__).'/assets/trainer/patches', $cache), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        error_log('Patch wall: '.$error->getMessage()); http_response_code(503);
        header('Content-Type: application/json; charset=utf-8'); header('Cache-Control: no-store');
        echo '{"error":"Patchwand vorübergehend nicht verfügbar"}';
    }
}
