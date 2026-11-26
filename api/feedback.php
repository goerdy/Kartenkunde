<?php
declare(strict_types=1);
ini_set('display_errors','0');
// No uploads, client filenames, HTML output or commands. Reports stay in protected var/.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function fail_report(int $status, string $message): never { http_response_code($status); echo json_encode(['error'=>$message]); exit; }
function report_number(mixed $v): float|int {
 if ((!is_int($v) && !is_float($v)) || !is_finite((float)$v) || abs($v)>1000000) fail_report(400,'Ungültiger Spielzustand.');
 return round($v,2);
}
function report_word(mixed $v): string {
 if (!is_string($v) || !preg_match('/\A[a-zA-Z0-9_. -]{1,64}\z/D',$v)) fail_report(400,'Ungültiger Spielzustand.');
 return $v;
}
function report_keys(mixed $v, array $keys): array {
 if (!is_array($v) || count($v)!==count($keys) || array_diff($keys,array_keys($v))) fail_report(400,'Ungültiger Spielzustand.');
 return $v;
}
if (($_SERVER['REQUEST_METHOD']??'')!=='POST') { header('Allow: POST'); fail_report(405,'Nur POST ist erlaubt.'); }
if ($_GET || ($_SERVER['HTTP_X_KARTENKUNDE_FEEDBACK']??'')!=='1' || strtolower(trim(explode(';',$_SERVER['CONTENT_TYPE']??'')[0]))!=='application/json') fail_report(400,'Ungültige Anfrage.');
// Custom header requires a same-origin browser request; no CORS permission is granted.
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && !in_array($_SERVER['HTTP_SEC_FETCH_SITE'],['same-origin','none'],true)) fail_report(403,'Anfrage von anderer Website abgewiesen.');
if (isset($_SERVER['HTTP_ORIGIN'])) {
 $origin=parse_url($_SERVER['HTTP_ORIGIN']);
 $authority=strtolower(($origin['host']??'').(isset($origin['port'])?':'.$origin['port']:''));
 if (!in_array($origin['scheme']??'', ['http','https'],true) || $authority!==strtolower($_SERVER['HTTP_HOST']??'')) fail_report(403,'Anfrage von anderer Website abgewiesen.');
}
if ((int)($_SERVER['CONTENT_LENGTH']??0)>16384) fail_report(413,'Meldung zu groß.');
$raw=file_get_contents('php://input',false,null,0,16385);
if ($raw===false || strlen($raw)>16384) fail_report(413,'Meldung zu groß.');
try { $data=json_decode($raw,true,16,JSON_THROW_ON_ERROR); } catch (Throwable $e) { fail_report(400,'Ungültiges JSON.'); }
$data=report_keys($data,['text','consent','context']);
$text=$data['text'];
if ($data['consent']!==true || !is_string($text) || !preg_match('//u',$text) || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$text)) fail_report(400,'Text oder Einwilligung ungültig.');
$text=trim(str_replace(["\r\n","\r"],"\n",$text));
$length=preg_match_all('/./us',$text);
if ($length<5 || $length>4000) fail_report(400,'Bitte 5 bis 4000 Zeichen eingeben.');
$c=report_keys($data['context'],['build','mode','slot','position','yaw','pitch','map','hand','items','instrument','mission','quality','vehicle','helicopter']);
foreach (['build','mode','map','hand','instrument','mission','quality'] as $key) $c[$key]=report_word($c[$key]);
if (!is_int($c['slot']) || $c['slot']<1 || $c['slot']>9) fail_report(400,'Ungültiger Inventarplatz.');
$c['position']=report_keys($c['position'],['e','n']);
foreach (['e','n'] as $key) $c['position'][$key]=report_number($c['position'][$key]);
foreach (['yaw','pitch'] as $key) $c[$key]=report_number($c[$key]);
$c['items']=report_keys($c['items'],['compass','romer','pencil','binoculars','radio','notepad']);
foreach ($c['items'] as $key=>$value) $c['items'][$key]=report_word($value);
foreach (['vehicle','helicopter'] as $type) {
 $c[$type]=report_keys($c[$type],$type==='vehicle'?['occupied','speed']:['occupied','speed','altitude']);
 if (!is_bool($c[$type]['occupied'])) fail_report(400,'Ungültiger Fahrzeugzustand.');
 foreach ($c[$type] as $key=>$value) if ($key!=='occupied') $c[$type][$key]=report_number($value);
}
$dir=dirname(__DIR__).'/var/feedback';
umask(0077);
if ((!is_dir($dir) && !@mkdir($dir,0700,true)) || is_link(dirname($dir)) || is_link($dir)) fail_report(503,'Speicherung derzeit nicht möglich.');
// Defence in depth in addition to root .htaccess; never serve reports through an API.
if (!is_file($dir.'/.htaccess') && file_put_contents($dir.'/.htaccess',"Require all denied\n",LOCK_EX)===false) fail_report(503,'Speicherung derzeit nicht möglich.');
$lock=@fopen($dir.'/.lock','c+');
if (!$lock || !flock($lock,LOCK_EX|LOCK_NB)) fail_report(503,'Bitte gleich erneut versuchen.');
$now=time();
$rateFile=$dir.'/.rate.json';
$rates=json_decode(@file_get_contents($rateFile)?:'{}',true)?:[];
foreach ($rates as $key=>$entry) if (($entry['since']??0)<$now-600) unset($rates[$key]);
// Only an HMAC pseudonym in the temporary rate record, never a raw address in reports.
$secretFile=$dir.'/.secret';
if (!is_file($secretFile) && file_put_contents($secretFile,random_bytes(32),LOCK_EX)!==32) fail_report(503,'Speicherung derzeit nicht möglich.');
$secret=file_get_contents($secretFile);
if (!$secret || strlen($secret)!==32) fail_report(503,'Speicherung derzeit nicht möglich.');
$key=hash_hmac('sha256',$_SERVER['REMOTE_ADDR']??'', $secret);
if (($rates[$key]['count']??0)>=3) { header('Retry-After: 600'); fail_report(429,'Bitte vor der nächsten Meldung einige Minuten warten.'); }
$files=glob($dir.'/*.txt')?:[];$bytes=0;
foreach ($files as $file) $bytes+=filesize($file)?:0;
if (count($files)>=10000 || $bytes>=50000000 || count($rates)>=1000) fail_report(503,'Meldungsspeicher derzeit ausgelastet.');
$id=gmdate('Ymd-His').'-'.bin2hex(random_bytes(8));
// JSON quoting preserves user text verbatim without forging diagnostic headings/lines.
$contents="Kartenkunde.app – Fehler / Verbesserungsvorschlag\nUTC: ".gmdate('c')."\nID: ".$id."\nEinwilligung: ja\nText (JSON-kodiert):\n".json_encode($text,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\nSpielzustand (vor Öffnen des Funkgeräts; e/n in Metern, Winkel in Grad, Geschwindigkeit m/s):\n".json_encode($c,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)."\n";
$rates[$key]=['since'=>$rates[$key]['since']??$now,'count'=>($rates[$key]['count']??0)+1];
if (file_put_contents($rateFile,json_encode($rates),LOCK_EX)===false) fail_report(503,'Speicherung derzeit nicht möglich.');
$file=@fopen($dir.'/'.$id.'.txt','x');
if (!$file) fail_report(503,'Speicherung derzeit nicht möglich.');
$ok=fwrite($file,$contents)===strlen($contents);fclose($file);
if (!$ok) { @unlink($dir.'/'.$id.'.txt'); fail_report(503,'Speicherung derzeit nicht möglich.'); }
flock($lock,LOCK_UN);fclose($lock);
http_response_code(201);echo json_encode(['id'=>$id]);
