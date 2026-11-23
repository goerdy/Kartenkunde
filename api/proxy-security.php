<?php
// Helpers are independent of HTTP output so guards can be regression tested.
function pq5_bbox($value) {
    if (!is_string($value) || strlen($value)>160) return null;
    $parts=explode(',',$value); if(count($parts)!==4) return null;
    foreach($parts as $part) if(!preg_match('/^-?(?:\d{1,3})(?:\.\d{1,12})?$/D',$part)) return null;
    [$s,$w,$n,$e]=array_map('floatval',$parts);
    if($s< -90||$n>90||$w< -180||$e>180||$n<=$s||$e<=$w||$n-$s>2||$e-$w>4) return null;
    return [$s,$w,$n,$e];
}
function pq5_private_cache() {
    $dir=sys_get_temp_dir().'/kartenkunde-proxy-'.hash('sha256',__DIR__);
    if(!is_dir($dir)&&!@mkdir($dir,0700,true)&&!is_dir($dir)) return null;
    if(is_link($dir)||!is_writable($dir))return null;
    @chmod($dir,0700);return $dir;
}
function pq5_rate_allowed($dir,$ip,$now,$limit=240) {
    $file=@fopen($dir.'/rate.json','c+');if(!$file||!flock($file,LOCK_EX|LOCK_NB)){if($file)fclose($file);return false;}
    @chmod($dir.'/rate.json',0600);$raw=stream_get_contents($file,262145);$state=strlen($raw)<=262144?json_decode($raw,true):null;
    if(!is_array($state))$state=[];foreach($state as $key=>$item)if(!is_array($item)||($item['until']??0)<=$now)unset($state[$key]);
    $key=hash_hmac('sha256',$ip,$dir);if(!isset($state[$key])){if(count($state)>=1024){flock($file,LOCK_UN);fclose($file);return false;}$state[$key]=['until'=>$now+60,'count'=>0];}
    $allowed=$state[$key]['count']<$limit;$state[$key]['count']++;rewind($file);ftruncate($file,0);fwrite($file,json_encode($state));fflush($file);flock($file,LOCK_UN);fclose($file);return $allowed;
}
function pq5_worker($dir,$slots=4) {
    for($i=0;$i<$slots;$i++){$lock=@fopen($dir.'/worker-'.$i.'.lock','c');if($lock&&flock($lock,LOCK_EX|LOCK_NB))return $lock;if($lock)fclose($lock);}return null;
}
function pq5_cache_put($dir,$file,$raw,$maxBytes=33554432,$maxFiles=128) {
    $guard=@fopen($dir.'/cache.lock','c');if(!$guard||!flock($guard,LOCK_EX|LOCK_NB)){if($guard)fclose($guard);return;}
    $files=glob($dir.'/data-*.json');usort($files,fn($a,$b)=>filemtime($a)<=>filemtime($b));$size=0;foreach($files as $f)$size+=filesize($f);
    while($files&&(count($files)>=$maxFiles||$size+strlen($raw)>$maxBytes||filemtime($files[0])<time()-120)){$old=array_shift($files);$size-=filesize($old);@unlink($old);}
    if(strlen($raw)<=$maxBytes){$temp=tempnam($dir,'write-');if($temp){@chmod($temp,0600);if(file_put_contents($temp,$raw,LOCK_EX)!==false)@rename($temp,$file);if(is_file($temp))@unlink($temp);}}
    flock($guard,LOCK_UN);fclose($guard);
}
function pq5_upstream($url,$limit=8388608) {
    $raw='';
    if(function_exists('curl_init')){
        $ch=curl_init($url);
        curl_setopt_array($ch,[CURLOPT_FOLLOWLOCATION=>false,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_TIMEOUT=>12,CURLOPT_CONNECTTIMEOUT=>4,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_USERAGENT=>'KARTENKUNDE.app/1.0 topographic orientation features',CURLOPT_WRITEFUNCTION=>function($curl,$chunk)use(&$raw,$limit){if(strlen($raw)+strlen($chunk)>$limit)return 0;$raw.=$chunk;return strlen($chunk);}]);
        $ok=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);if($ok===false||$status!==200)return null;
    }else{
        $context=stream_context_create(['http'=>['method'=>'GET','header'=>"User-Agent: KARTENKUNDE.app/1.0\r\n",'timeout'=>12,'ignore_errors'=>true,'follow_location'=>0,'max_redirects'=>0],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true,'allow_self_signed'=>false]]);
        $stream=@fopen($url,'rb',false,$context);if(!$stream)return null;$raw=stream_get_contents($stream,$limit+1);$meta=stream_get_meta_data($stream);fclose($stream);
        if($raw===false||strlen($raw)>$limit||!empty($meta['timed_out'])||!preg_match('/\s200\s/',($http_response_header[0]??'')))return null;
    }
    try{$data=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(Throwable $e){return null;}
    if(!is_array($data)||isset($data['remark'])||(!isset($data['elements'])&&($data['type']??'')!=='FeatureCollection'))return null;
    return $raw;
}
