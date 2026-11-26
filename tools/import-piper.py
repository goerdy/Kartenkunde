#!/usr/bin/env python3
"""Vendor pinned Piper voices and WASM. No runtime third-party downloads."""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
import hashlib,json
root=Path(__file__).resolve().parents[1]/'assets/trainer/piper'
root.mkdir(parents=True,exist_ok=True)
revision='5ec43b186ef915a195d3ddbcfd9916e76c503c3f'
jobs=[]
for voice,quality in [('ramona','low'),('karlsson','low'),('thorsten','medium')]:
    base=f'https://huggingface.co/rhasspy/piper-voices/resolve/{revision}/de/de_DE/{voice}/{quality}/'
    for suffix in ['.onnx','.onnx.json']:
        name=f'de_DE-{voice}-{quality}{suffix}'; jobs.append((name,base+name))
    jobs.append((voice+'-MODEL_CARD.txt',base+'MODEL_CARD'))
for ext in ['js','wasm','data']:
    name='piper_phonemize.'+ext;jobs.append((name,'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/'+name))
for name in ['ort.min.js','ort-wasm.wasm','ort-wasm-simd.wasm']:
    jobs.append((name,'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/'+name))
jobs.extend([('ESPEAK-LICENSE.txt','https://raw.githubusercontent.com/espeak-ng/espeak-ng/master/COPYING')])
jobs.extend([
 ('M-AILABS-README.txt','https://raw.githubusercontent.com/i-celeste-aurora/m-ailabs-dataset/53c4c9fe0f63cb0ae85ee7eb46a32b7316223e8e/README.md'),
 ('PHONEMIZER-BUILD.txt','https://raw.githubusercontent.com/diffusionstudio/piper-wasm/022edba0455ef024574747e1134ef893f1d71b76/README.md'),
 ('piper-phonemize-source.tar.gz','https://codeload.github.com/wide-video/piper-phonemize/tar.gz/bfc2e7549957829b0227c66a305d11cc88167bda'),
 ('espeak-ng-source.tar.gz','https://codeload.github.com/rhasspy/espeak-ng/tar.gz/0f65aa301e0d6bae5e172cc74197d32a6182200f')
])
def download(job):
    name,url=job;path=root/name
    if not path.exists():
        with urlopen(url,timeout=180) as response:path.write_bytes(response.read())
    print(name,path.stat().st_size,flush=True)
    return dict(file=name,url=url,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),bytes=path.stat().st_size)
with ThreadPoolExecutor(max_workers=4) as pool: files=list(pool.map(download,jobs))
(root/'manifest.json').write_text(json.dumps(dict(revision=revision,files=files),indent=2)+'\n')
