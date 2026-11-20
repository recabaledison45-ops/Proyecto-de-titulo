import subprocess
OUT='/mnt/user-data/outputs'
A='/mnt/user-data/attachments/1c9f5299-ac2a-550b-82cd-20cce10745c1'
def run(cmd):
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode: print('FALLO',r.returncode,r.stderr[-400:],flush=True)
    return r.returncode
d3=190.12-5.0-0.1; speed=0.75
cuts=[(0,4.5,'p'),(4.5,14.2,'p'),(14.2,18.5,'p'),(18.5,23.2,'p'),(23.2,27.5,'h'),(27.5,36.5,'h'),(36.5,45.0,'h'),(45.0,55.0,'h'),(55.0,64.0,'o'),(64.0,66.7,'')]
pago=0.36*d3-24.35/speed; panel=0.55*d3-36.3/speed; outro=(d3-66.7/speed)-pago-panel
hold={'p':pago/4,'h':panel/4,'o':outro,'':0}
rc=0; lst=[]
for i,(a,b,kind) in enumerate(cuts):
    h=hold[kind]; pad=f",tpad=stop_mode=clone:stop_duration={h:.3f}" if h>0 else ''
    # una pieza por vez: así no se acumulan cuadros en memoria
    rc|=run(['ffmpeg','-v','error','-y','-ss',str(a),'-to',str(b),'-i',f'{OUT}/Parte-3-integrante-3.mp4','-an','-vf',f"setpts=PTS/{speed},fps=30{pad}",'-c:v','libx264','-crf','16','-preset','veryfast','-pix_fmt','yuv420p','-r','30','-video_track_timescale','15360',f'd3_{i}.mp4'])
    lst.append(f"file '/tmp/claude-0/edit/d3_{i}.mp4'")
open('d3.txt','w').write('\n'.join(lst)+'\n')
rc|=run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','d3.txt','-c','copy','demo3.mp4'])
print('demo3 listo rc',rc,flush=True)
dur=round(d3,2); fo=dur-0.4
fg=f"""[0:v]fps=30,scale=1520:856:flags=lanczos,format=rgba[demo];
[demo][3:v]alphamerge[demor];
[1:v]trim=start=5.0:duration={dur},setpts=PTS-STARTPTS,fps=30,crop=420:560:20:20,scale=285:380:flags=lanczos,format=rgba[face];
[face][4:v]alphamerge[facer];
[2:v][demor]overlay=40:112[t1];
[t1][facer]overlay=1595:360:shortest=1,fade=t=in:st=0:d=0.35,fade=t=out:st={fo:.2f}:d=0.4,format=yuv420p[v];
[1:a]atrim=start=5.0:duration={dur},asetpts=PTS-STARTPTS,highpass=f=80,afftdn=nr=10:nf=-45,loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.15,afade=t=out:st={fo-0.1:.2f}:d=0.5,aresample=48000[a]"""
open('p3.fg','w').write(fg)
rc|=run(['ffmpeg','-v','error','-y','-i','demo3.mp4','-i',f'{A}/24447cf0-1000079167.mp4','-loop','1','-framerate','30','-i','bg.png','-loop','1','-framerate','30','-i','mask_demo.png','-loop','1','-framerate','30','-i','mask_face.png','-filter_complex_script','p3.fg','-map','[v]','-map','[a]','-t',str(dur),'-c:v','libx264','-crf','20','-preset','veryfast','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','160k','-ar','48000','-ac','2','tmp-p3.mp4'])
print('p3 rc',rc,flush=True)
if rc==0:
    subprocess.run(['mv','tmp-p3.mp4','p3.mp4'])
    open('list.txt','w').write(f"file '{OUT}/Parte-1-con-rostro-y-audio.mp4'\nfile '/tmp/claude-0/edit/p2.mp4'\nfile '/tmp/claude-0/edit/p3.mp4'\n")
    rc=run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i','list.txt','-c','copy','-movflags','+faststart','tmp-equipo.mp4'])
    if rc==0: subprocess.run(['mv','tmp-equipo.mp4',f'{OUT}/W-Experiencias-presentacion-equipo.mp4'])
    print('final rc',rc,flush=True)
