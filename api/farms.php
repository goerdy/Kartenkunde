<?php
ini_set('display_errors','0');
header_remove('X-Powered-By');
require_once __DIR__.'/proxy-security.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
function fail_farms($status,$message){http_response_code($status);echo json_encode(['error'=>$message]);exit;}
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){header('Allow: GET');fail_farms(405,'Method not allowed');}
if(($_SERVER['HTTP_SEC_FETCH_SITE']??'')==='cross-site')fail_farms(403,'Cross-site requests are not supported');
if(!array_key_exists('bbox',$_GET)||array_diff(array_keys($_GET),['bbox','farms'])||(array_key_exists('farms',$_GET)&&$_GET['farms']!=='0'))fail_farms(400,'Expected bbox=south,west,north,east');
$includeFarms=!array_key_exists('farms',$_GET);
$bounds=pq5_bbox($_GET['bbox']);if($bounds===null)fail_farms(400,'Invalid bounding box');
[$s,$w,$n,$e]=$bounds;$box=implode(',',$bounds);$dir=pq5_private_cache();if($dir===null)fail_farms(503,'Data service unavailable');
if(!pq5_rate_allowed($dir,$_SERVER['REMOTE_ADDR']??'unknown',time())){header('Retry-After: 60');fail_farms(429,'Request limit exceeded; retry later');}
$cache=$dir.'/data-'.hash('sha256',($includeFarms?'with-farms:':'without-farms:').$box).'.json';
if(is_file($cache)&&filemtime($cache)>time()-60&&filesize($cache)<=8388608){readfile($cache);exit;}
$worker=pq5_worker($dir);if(!$worker){header('Retry-After: 5');fail_farms(503,'Data service busy; retry later');}
$filters = json_decode(file_get_contents(__DIR__.'/tk-filters.json'), true);
if (!is_array($filters)) fail_farms(500, 'Missing TK feature configuration');
if(!$includeFarms)$filters=array_values(array_filter($filters,fn($tags)=>($tags['place']??null)!=='farm'));
$sqlParts = []; $overpassParts = [];
foreach ($filters as $tags) {
    $sqlParts[] = "tags @> '".json_encode($tags)."'::jsonb";
    $conditions = ''; foreach ($tags as $key=>$value) $conditions .= '['.json_encode($key).'='.json_encode($value).']';
    $overpassParts[] = 'nwr'.$conditions.'('.$box.');';
}
$sql = "SELECT osm_id, osm_type, tags, CASE WHEN tags->>'power' IN ('line','minor_line') OR tags->>'landuse'='military' OR tags ? 'military' OR tags->>'landuse'='cemetery' OR tags->>'amenity'='grave_yard' THEN geom ELSE ST_PointOnSurface(geom) END AS geom FROM postpass_pointlinepolygon WHERE geom && ST_MakeEnvelope(".implode(',',[$w,$s,$e,$n]).',4326) AND ('.implode(' OR ', $sqlParts).')';
$query = '[out:json][timeout:10];('.implode('', $overpassParts).');out body geom;';

foreach(['https://postpass.geofabrik.de/api/interpreter','https://overpass-api.de/api/interpreter'] as $endpoint){
    $url=$endpoint.'?'.http_build_query(['data'=>strpos($endpoint,'postpass.geofabrik.de')!==false?$sql:$query]);
    $raw=pq5_upstream($url);if($raw===null)continue;
    pq5_cache_put($dir,$cache,$raw);echo $raw;exit;
}
fail_farms(502,'Upstream data unavailable; retry later');
