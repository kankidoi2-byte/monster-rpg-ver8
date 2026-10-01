"""Stream one adopted WebM through libvpx; never retain all decoded frames.

Usage: python3 scripts/audit-motion-alpha.py VIDEO OUTPUT_JSON SAMPLE_DIR
Requires ffmpeg, ffprobe, numpy, Pillow. Measurements are not visual acceptance.
"""
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import numpy as np
from PIL import Image

video, output, samples = map(pathlib.Path, sys.argv[1:])
probe = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)]))
streams = probe['streams']
v = next(s for s in streams if s['codec_type'] == 'video')
assert v['codec_name'] == 'vp9', 'Only the evaluated VP9 decoder is supported'
w, h = v['width'], v['height']
samples.mkdir(parents=True, exist_ok=True)
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-threads', '1', '-c:v', 'libvpx-vp9',
    '-i', str(video), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], stdout=subprocess.PIPE)
count = 0
union = [w, h, -1, -1]
alpha_ranges, edge_frames, steps = [], [], []
first = previous = None
sample_indices = {0, 30, 60, 120, 180, 239}
while True:
    data = p.stdout.read(w*h*4)
    if not data:
        break
    assert len(data) == w*h*4, 'Truncated decoded frame'
    frame = np.frombuffer(data, dtype=np.uint8).reshape(h, w, 4)
    a = frame[:, :, 3]
    ys, xs = np.where(a > 8)
    assert len(xs), 'Empty visible frame'
    box = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    union = [min(union[0], box[0]), min(union[1], box[1]),
             max(union[2], box[2]), max(union[3], box[3])]
    alpha_ranges.append([int(a.min()), int(a.max())])
    if box[0] == 0 or box[1] == 0 or box[2] == w-1 or box[3] == h-1:
        edge_frames.append(count)
    # Premultiplied RGB ignores arbitrary RGB hidden by alpha.
    premult = frame[:, :, :3].astype(np.float32) * (a[:, :, None] / 255)
    if first is None:
        first = premult.copy()
    if previous is not None:
        steps.append(float(np.abs(premult-previous).mean()))
    previous = premult
    if count in sample_indices:
        encoded = io.BytesIO()
        Image.fromarray(frame).save(encoded, format='PNG')
        sample = samples / f'frame-{count:03}.png'
        sample.write_bytes(encoded.getvalue())
        with Image.open(sample) as check:
            check.load()
    count += 1
assert p.wait() == 0 and count > 1, 'Decoder failed'
result = {
    'scope': 'Full sequential alpha/bbox and numeric endpoint audit; visual/runtime gates separate',
    'sha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'bytes': video.stat().st_size,
    'codec': v['codec_name'], 'width': w, 'height': h, 'fps': v['avg_frame_rate'],
    'duration': float(probe['format']['duration']), 'frames': count,
    'audioStreams': sum(s['codec_type'] == 'audio' for s in streams),
    'allFramesHaveTransparentAndOpaquePixels': all(lo == 0 and hi == 255 for lo, hi in alpha_ranges),
    'alphaThreshold': 8, 'unionBBoxInclusive': union, 'edgeTouchFrames': edge_frames,
    'premultipliedRgbMeanAbsoluteStep': {'max': max(steps), 'mean': sum(steps)/len(steps),
        'lastToFirst': float(np.abs(previous-first).mean())},
    'samples': sorted(sample_indices & set(range(count))),
    'peakRetainedFrames': 'current + previous + first; no full-frame sequence stored'
}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
