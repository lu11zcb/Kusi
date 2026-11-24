"""Repite Pixel Art Fixer sobre la referencia conservada, sin tocarla."""
from pathlib import Path
import hashlib
import json
import sys

PROJECT = Path(__file__).resolve().parents[2]
LAB = Path('C:/Users/luis/.codex/visualizations/2026/10/20/01a1573c-ba1d-7133-b3a6-5f09fbc4b77d/pixel-art-fixer-review')
OUT = Path('C:/Users/luis/.codex/visualizations/2026/10/22/01a16598-c7d1-7310-8edd-1052663828ab/cuy-production-v1')
sys.path[:0] = [str(LAB / 'deps'), str(LAB / 'source/python')]
from pixelfixer.api import process

source = PROJECT / 'docs/arte/referencias/cuy-pixel-original.png'
raw = source.read_bytes()
result = process(raw, mode='full')
png = result.pop('png')
OUT.mkdir(parents=True, exist_ok=True)
fixed = OUT / 'cuy-fixer-native.png'
fixed.write_bytes(png)
previous = PROJECT / 'docs/arte/referencias/cuy-pixel-native.png'
report = {
    'source': 'docs/arte/referencias/cuy-pixel-original.png',
    'source_sha256': hashlib.sha256(raw).hexdigest(),
    'processor_commit': 'ef376e57e1c272633ca2dbf5f29ec3fcf6596465',
    'method': 'pixelfixer.api.process(bytes, mode="full")',
    'result': result,
    'output_sha256': hashlib.sha256(png).hexdigest(),
    'matches_previous_reference': png == previous.read_bytes(),
    'output': str(fixed),
}
(OUT / 'fixer-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'output':str(fixed),'same_as_previous':report['matches_previous_reference'],'sha256':report['output_sha256']}))
