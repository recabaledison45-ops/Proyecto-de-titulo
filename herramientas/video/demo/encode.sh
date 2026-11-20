#!/bin/bash
# Codifica cada escena (los cuadros llevan su marca de tiempo real; el video va al doble de velocidad) y las une.
set -e
cd /tmp/claude-0/demo
ENC="-c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -video_track_timescale 15360"
rm -f out/*.mp4 out/list.txt
python3 - <<'PY'
import json
meta=json.load(open('scenes/meta.json'))
for name, ts in meta.items():
    with open(f'scenes/{name}/list.txt','w') as f:
        for i,t in enumerate(ts):
            d=(ts[i+1]-t) if i+1<len(ts) else 0.6
            f.write(f"file '{i:05d}.jpg'\nduration {d:.5f}\n")
        f.write(f"file '{len(ts)-1:05d}.jpg'\n")
    dur=(ts[-1]-ts[0]+0.6)/2
    open(f'scenes/{name}/dur.txt','w').write(f'{dur:.3f}')
PY
still() { # still <png> <segundos> <salida>
  ffmpeg -v error -y -framerate 30 -i "$1" -vf "format=yuv420p,loop=-1:1,trim=duration=$2,fade=t=in:st=0:d=0.5,fade=t=out:st=$(echo "$2-0.5" | bc):d=0.5" $ENC "out/tmp-$3" && mv "out/tmp-$3" "out/$3"
}
still frames/card-intro.png 4.0 00-intro.mp4
for s in $(ls scenes | grep '^s'); do
  D=$(cat scenes/$s/dur.txt); FO=$(echo "$D-0.35" | bc)
  ffmpeg -v error -y -f concat -safe 0 -i scenes/$s/list.txt -vf "setpts=PTS/2,fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=$FO:d=0.35" $ENC "out/tmp-$s.mp4" && mv "out/tmp-$s.mp4" "out/$s.mp4"
  echo "$s $D s"
done
still frames/card-outro.png 6.0 zz-outro.mp4
for f in $(ls out/*.mp4 | sort); do echo "file '$PWD/$f'" >> out/list.txt; done
ffmpeg -v error -y -f concat -safe 0 -i out/list.txt -c copy -movflags +faststart out/tmp-final.mp4 && mv out/tmp-final.mp4 /tmp/claude-0/demo/W-Experiencias-demo.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,r_frame_rate,codec_name -of default=nw=1 /tmp/claude-0/demo/W-Experiencias-demo.mp4
