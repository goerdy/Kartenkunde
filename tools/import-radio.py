#!/usr/bin/env python3
"""Import user-created Radio Florian recordings; requires ffmpeg and ffprobe."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
destination = Path(__file__).resolve().parents[1] / 'assets/trainer/radio'
files = sorted(args.source.glob('florian_*.wav'))
if not files:
    parser.error('No florian_*.wav recordings found')
entries = []
for source in files:
    name = source.stem.lower() + '.ogg'
    subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', str(source),
                    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '48000',
                    '-c:a', 'libopus', '-b:a', '64k', str(destination / name)], check=True)
    duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                    'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(destination / name)]))
    entries.append({'src': name, 'label': source.stem, 'durationSeconds': round(duration, 3),
                    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()})
announcements = [entry for entry in entries if '_jingle_' not in entry['src']]
jingles = [entry for entry in entries if '_jingle_' in entry['src']]
playlist = []
for index, entry in enumerate(announcements):
    playlist.append(entry)
    if index % 2 == 1 and jingles:
        playlist.append(jingles.pop(0))
playlist.extend(jingles)
program = {'station': 'Radio Florian', 'music': 'florian-loop.wav',
           'firstAnnouncementSeconds': 10, 'announcementIntervalSeconds': 30,
           'announcements': playlist}
(destination / 'program.json').write_text(json.dumps(program, indent=2, ensure_ascii=False) + '\n')
print(f'Imported {len(entries)} recordings ({sum((destination / e["src"]).stat().st_size for e in entries):,} bytes).')
