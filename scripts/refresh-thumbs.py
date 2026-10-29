#!/usr/bin/env python3
"""Refresh local product thumbnails from verified Gumroad source URLs.

Run from the repository root:

    python3 scripts/refresh-thumbs.py

The script reads media/thumbs/manifest.json. For each product it downloads
the recorded source URL, compares the SHA-256 digest, and rebuilds the
600px and 480px WebP files only when the source bytes changed or an output
file is missing. It does not invent covers and it does not delete files.

Requires ffmpeg. A changed cover stays on the old thumbnail until this
script is run and the new files are committed.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'media' / 'thumbs' / 'manifest.json'
OUT_DIR = ROOT / 'media' / 'thumbs'


def download(url, dest):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'samsuc-thumb-refresh',
        'Accept': 'image/jpeg,image/png;q=0.9',
    })
    with urllib.request.urlopen(req, timeout=40) as response:
        data = response.read()
        kind = data[:12]
        if not (kind.startswith(b'\xff\xd8') or kind.startswith(b'\x89PNG\r\n\x1a\n')):
            raise SystemExit('Refusing non-image response for ' + url)
        dest.write_bytes(data)


def encode(source, dest, size, quality):
    subprocess.run(
        [
            'ffmpeg', '-y', '-i', str(source),
            '-vf', 'scale=%d:%d' % (size, size),
            '-c:v', 'libwebp', '-quality', str(quality), '-compression_level', '6',
            str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main():
    manifest = json.loads(MANIFEST.read_text())
    changed = []
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for item in manifest['products']:
            pid = item['id']
            source = tmp / (pid + '.src')
            download(item['source'], source)
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            full = OUT_DIR / (pid + '.webp')
            small = OUT_DIR / (pid + '-480.webp')
            stale = digest != item.get('sha256') or not full.exists() or not small.exists()
            if stale:
                encode(source, full, 600, 80)
                encode(source, small, 480, 78)
                item['sha256'] = digest
                changed.append(pid)
                print('updated', pid, digest[:12], full.stat().st_size, small.stat().st_size)
            else:
                print('unchanged', pid, digest[:12])
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    if changed:
        print('Rebuilt:', ', '.join(changed))
        return 0
    print('No thumbnail changes.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
