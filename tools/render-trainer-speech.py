#!/usr/bin/env python3
"""Render fixed Piper dialogues once; requires piper-tts==1.8.0 and ffmpeg."""
from pathlib import Path
import json,subprocess,hashlib,wave,tempfile,os
from piper import PiperVoice
root=Path(__file__).resolve().parents[1];out=root/'assets/trainer/speech';out.mkdir(exist_ok=True)
lines=json.loads(subprocess.check_output(['node','tools/trainer-speech-catalog.mjs'],cwd=root))
voices={'instructor':'de_DE-ramona-low','dispatch':'de_DE-karlsson-low','self':'de_DE-thorsten-medium'}
manifest={'version':1,'voices':voices,'generator':'piper-tts 1.8.0; libopus 32k mono','clips':{}}
for role,model in voices.items():
    voice=PiperVoice.load(root/'assets/trainer/piper'/f'{model}.onnx')
    for line in [line for line in lines if line['role']==role]:
        key=role+'\n'+line['text'];digest=hashlib.sha256(key.encode()).hexdigest()[:24];filename=digest+'.ogg';path=out/filename
        if not path.exists():
            with tempfile.TemporaryDirectory() as tmp:
                wav=Path(tmp)/'speech.wav'
                with wave.open(str(wav),'wb') as stream:voice.synthesize_wav(line['text'],stream)
                subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-c:a','libopus','-b:a','32k',str(path)],check=True)
        manifest['clips'][key]={'file':filename,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    print(role,len(manifest['clips']),flush=True)
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for obsolete in out.glob('*.ogg'):
    if obsolete.name not in {e['file'] for e in manifest['clips'].values()}:obsolete.unlink()
print('Rendered',len(manifest['clips']),'clips,',sum(e['bytes'] for e in manifest['clips'].values()),'bytes',flush=True)
