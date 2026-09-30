"""Export an inspected adopted renderer's existing transparent output to VP9.

Usage: python3 export-approved-rgba.py SOURCE_DIR ADOPTED_MP4 OUTPUT_WEBM REPORT
This does not edit source artwork, rig, motion, or renderer. Frames are streamed.
Supported renderers: inspected adopted sources listed by hash below.
"""
import hashlib
import importlib.util
import json
import pathlib
import subprocess
import sys
import numpy as np
from PIL import Image

source, adopted, output, report = map(pathlib.Path, sys.argv[1:])
inspected_renderers = {
    'nocle-motion-v1': '966340935931cdccb703960ead313575439ae39a467ad7c9a19934f0067330ae',
    'noclaid-motion-v1': '6b6c79a56d143177f653e0adf8592318283a0f32edd75eecf84d897660ee58d0',
    'noxvelg-motion-v1': '32d4611473a9613a0b2b88af75abd585c58a44e02d2116cfa4f1866b17232252',
    'luxseed-motion-v1': 'db49efac28c0ece5b7cb88203ca166ec3c821866dea107f66d09f4997b904c69',
    'luxiard-motion-v1': '7f2ed299a578a4192312e892018c6f38d61b32d06dbe8cda669d52453581ea68',
    'lux_galdion-motion-v1': 'bf11447335d89a74cedb7501da479904ba9b989f2fe5b4ac236438bbb8a9274a',
    'seralphia-motion-v1': '7362ecc1ff6b006147da7b7469ffc9e1074a86718e738123ff2f08938d232995',
    'sylphin-motion-v1': 'e14ac0021ec73e30f6b352dc2c0ffd5a89f924832db83489a9088f1a472a3fb6',
    'zephyray-motion-v1': 'e14ac0021ec73e30f6b352dc2c0ffd5a89f924832db83489a9088f1a472a3fb6',
    'tempestray-motion-v1': 'e14ac0021ec73e30f6b352dc2c0ffd5a89f924832db83489a9088f1a472a3fb6',
    'grassbeat-motion-v1': '0a19cff63de2e57df0018edf6ef4bc5acf582ab1797af56a3211f1eabaf0a7fb',
    'thornbeat-motion-v1': '0a19cff63de2e57df0018edf6ef4bc5acf582ab1797af56a3211f1eabaf0a7fb',
    'grandbeat-motion-v4': 'b158e0b99d10a8b507b022989a60f2ce61fefb6812f74be8cc6372085dc666ff',
    'rikasheef-motion-v1': '0ecd0db017c60229ea98c0af19297dd6f7a8ac5794d5005e059bf3c2d3fba4bc',
    'freigal-motion-v2': '28b7ebeb7f4270ca4a92bfecdff1ed63e8311127b49ddf19a323a945478eba9b',
    'freiwolf-motion-v2': '0a8e1143edd6fe4632059a7c8704bf653117626c3a2e3c879795343b3974d4db',
    'aquaron-motion-v3': 'e6bb2d3ca486749b343fc7852ad378e5e411fee12e2a53c48830989c98b31d0b',
    'high-aquaron-motion-v3': 'e6bb2d3ca486749b343fc7852ad378e5e411fee12e2a53c48830989c98b31d0b',
}
assert hashlib.sha256((source / 'render.py').read_bytes()).hexdigest() == inspected_renderers[source.name], 'Uninspected renderer'
rig = json.loads((source / 'rig.json').read_text())
spec = importlib.util.spec_from_file_location('approved_motion', source / 'render.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
if hasattr(module, 'Hover'):
    motion = json.loads((source / 'motion.json').read_text())
    renderer = module.Hover(rig, motion)
    render = lambda t, transparent: renderer.render(t, 960, transparent=transparent)
elif hasattr(module, 'Ray'):
    renderer = module.Ray()
    render = lambda t, transparent: renderer.render(t, 960, transparent=transparent)
elif hasattr(module, 'Beetle') or hasattr(module, 'Grandbeat'):
    renderer = (module.Beetle if hasattr(module, 'Beetle') else module.Grandbeat)()
    render = lambda t, transparent: renderer.render(t, 960, transparent=transparent)
else:
    assert hasattr(module, 'WaterDragon')
    renderer = module.WaterDragon()
    render = lambda t, transparent: renderer.render(t, transparent=transparent)
assert rig.get('cycle', motion['cycle'] if 'motion' in locals() else 4) == 4
output.parent.mkdir(parents=True, exist_ok=True)
encoded = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo',
    '-pix_fmt', 'rgba', '-s', '960x960', '-r', '30', '-i', '-', '-an',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '18', '-b:v', '0',
    '-threads', '2', '-row-mt', '1', '-auto-alt-ref', '0', str(output)], stdin=subprocess.PIPE)
reference = subprocess.Popen(['ffmpeg', '-v', 'error', '-threads', '1', '-i', str(adopted),
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
first = None
errors, foreground_errors, bg_errors = [], [], []
for i in range(240):
    frame = render(i / 30, True)
    assert frame.mode == 'RGBA' and frame.size == (960, 960)
    rgba = np.asarray(frame)
    if first is None:
        first = rgba.copy()
        frame.save(output.with_suffix('.png'))
    composed = np.asarray(Image.alpha_composite(
        Image.new('RGBA', frame.size, tuple(rig['background']) + (255,)), frame).convert('RGB'))
    data = reference.stdout.read(960 * 960 * 3)
    assert len(data) == 960 * 960 * 3, 'Adopted MP4 truncated'
    decoded = np.frombuffer(data, np.uint8).reshape(960, 960, 3)
    delta = np.abs(composed.astype(np.int16) - decoded.astype(np.int16))
    errors.append(float(delta.mean()))
    foreground_errors.append(float(delta[rgba[:, :, 3] > 200].mean()))
    if i in (0, 30, 60, 120, 180, 239):
        original_rgb = np.asarray(render(i / 30, False))
        bg_errors.append(int(np.abs(composed.astype(np.int16) - original_rgb.astype(np.int16)).max()))
    encoded.stdin.write(frame.tobytes())
    if i % 30 == 0:
        print(f'{source.name}: {i}/240', flush=True)
assert reference.stdout.read(1) == b'', 'Adopted MP4 has extra frames'
assert reference.wait() == 0
encoded.stdin.close()
assert encoded.wait() == 0
endpoint = np.asarray(render(8, True))
assert np.array_equal(first, endpoint), 'Source renderer loop changed'
assert max(bg_errors) <= 2, 'Transparent path differs from approved opaque renderer'
assert max(errors) < 5 and max(foreground_errors) < 12, 'Renderer differs from adopted MP4'
inputs = {}
for p in sorted(source.iterdir()):
    if p.is_file() and p.suffix in ('.py', '.json', '.png'):
        inputs[p.name] = hashlib.sha256(p.read_bytes()).hexdigest()
result = dict(sourceDirectory=source.name, sourceInputHashes=inputs,
    rendererUnmodified=True, artworkUnmodified=True, motionUnmodified=True,
    rgbaOutputUsed=True, outputIsDerivative=True, originalMp4Sha256=hashlib.sha256(adopted.read_bytes()).hexdigest(),
    outputSha256=hashlib.sha256(output.read_bytes()).hexdigest(), outputBytes=output.stat().st_size,
    frames=240, width=960, height=960, fps=30, duration=8, originalRendererLoopExact=True,
    recomposeVsOpaqueMaxChannelDifference=max(bg_errors),
    adoptedMp4MeanAbsoluteRgbDifference=float(np.mean(errors)),
    adoptedMp4MaxFrameMeanRgbDifference=max(errors),
    adoptedMp4MaxForegroundMeanRgbDifference=max(foreground_errors),
    encoding='VP9 yuva420p CRF18; lossy RGB, explicit alpha',
    scope='Source renderer/background equivalence and comparison with lossy adopted MP4; visual/device acceptance separate',
    peakRetainedFrames='first + current + current reference; no sequence cache')
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'sourceInputHashes'}), flush=True)
