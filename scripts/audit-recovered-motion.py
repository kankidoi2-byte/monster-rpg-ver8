"""Compare a recovered alpha export to its adopted full-body MP4, without encoding.

Usage: VIDEO MP4 REPORT [SOURCE_DIR]
Optional source verification is limited to six frames and the loop endpoint.
"""
import hashlib, importlib.util, json, pathlib, subprocess, sys
import numpy as np
from PIL import Image

video, adopted, report = map(pathlib.Path, sys.argv[1:4])
source = pathlib.Path(sys.argv[4]) if len(sys.argv) > 4 else None
probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(video)]))
s = next(s for s in probe['streams'] if s['codec_type']=='video')
w,h = s['width'],s['height']
def decode(path, alpha):
    args=['ffmpeg','-v','error','-threads','1']
    if alpha: args += ['-c:v','libvpx-vp9']
    return subprocess.Popen(args+['-i',str(path),'-f','rawvideo','-pix_fmt','rgba' if alpha else 'rgb24','-'],stdout=subprocess.PIPE)
a,b=decode(video,True),decode(adopted,False)
renderer=None
if source:
    sys.path.insert(0,str(source.resolve()))
    spec=importlib.util.spec_from_file_location('recovered_source',source/'render.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    if hasattr(module,'Hover'):
        obj=module.Hover(json.loads((source/'rig.json').read_text()),json.loads((source/'motion.json').read_text()))
        renderer=lambda t: obj.render(t,w,transparent=True)
    else:
        texture=Image.open(source/'texture.png')
        renderer=lambda t: module.render(t,texture,size=w,transparent=True)
errors=[];fgerrors=[];sample_alpha=[];sample_rgb=[];count=0;bg=None
while True:
    da=a.stdout.read(w*h*4);db=b.stdout.read(w*h*3)
    if not da: assert not db;break
    assert len(da)==w*h*4 and len(db)==w*h*3
    rgba=np.frombuffer(da,np.uint8).reshape(h,w,4)
    rgb=np.frombuffer(db,np.uint8).reshape(h,w,3)
    if bg is None: bg=np.median(rgb[:16,:16,:].reshape(-1,3),axis=0).astype(np.uint8)
    alpha=rgba[:,:,3:4].astype(np.float32)/255
    composed=np.rint(rgba[:,:,:3]*alpha+bg*(1-alpha))
    delta=np.abs(composed-rgb)
    errors.append(float(delta.mean()));fgerrors.append(float(delta[rgba[:,:,3]>200].mean()))
    if renderer and count in [0,30,60,120,180,239]:
        original=np.asarray(renderer(count/30))
        assert original.shape==rgba.shape
        sample_alpha.append(float(np.abs(original[:,:,3].astype(np.int16)-rgba[:,:,3]).mean()))
        premult_delta=np.abs(original[:,:,:3]*(original[:,:,3:4]/255)-rgba[:,:,:3]*alpha)
        sample_rgb.append(float(premult_delta.mean()))
    count+=1
assert a.wait()==0 and b.wait()==0 and count==240
result={'scope':'Recovered bytes vs adopted MP4, all 240 frames; optional six source samples; visual/device acceptance separate',
 'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(),'adoptedMp4Sha256':hashlib.sha256(adopted.read_bytes()).hexdigest(),
 'frames':count,'width':w,'height':h,'background':bg.tolist(),'meanRgbDifference':float(np.mean(errors)),
 'maxFrameMeanRgbDifference':max(errors),'maxForegroundMeanRgbDifference':max(fgerrors),
 'sourceSamples':len(sample_alpha),'sourceAlphaMeanDifferences':sample_alpha,'sourcePremultipliedRgbMeanDifferences':sample_rgb,
 'sourceRendererLoopExact':bool(np.array_equal(np.asarray(renderer(0)),np.asarray(renderer(8)))) if renderer else None,
 'sourceInputHashes':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in source.iterdir() if p.suffix in ['.py','.json','.png']} if source else {},
 'sourceRendererModified':False if renderer else None,'reencoded':False,
 'numericCorrespondence':max(errors)<5 and max(fgerrors)<12 and (not sample_alpha or max(sample_alpha)<1)}
report.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='sourceInputHashes'}))
