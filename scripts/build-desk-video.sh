#!/usr/bin/env bash
set -euo pipefail

# Generate the public, illustrative tour before testing and deployment.
if ! command -v ffmpeg >/dev/null || [[ ! -f /usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf ]]; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq ffmpeg fonts-urw-base35
fi

tgi_video_env="${RUNNER_TEMP:-/tmp}/tgi-desk-video-build"
python3 -m venv "$tgi_video_env"
"$tgi_video_env/bin/python" -m pip install --quiet --disable-pip-version-check -r scripts/desk-video-requirements.txt
"$tgi_video_env/bin/python" scripts/render-desk-tour.py
ffmpeg -y -v error -i assets/tgi-operating-desk-tour.mp4 -an -vf scale=1280:720 -c:v libvpx-vp9 -b:v 0 -crf 30 -deadline realtime -cpu-used 5 assets/tgi-operating-desk-tour.webm
ffmpeg -y -v error -i assets/tgi-operating-desk-tour.mp4 \
  -filter_complex '[0:v]fps=12,scale=960:-1:flags=lanczos,fade=t=out:st=41.4:d=0.6:color=0x080a0a,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle' \
  -gifflags +transdiff -loop 0 assets/tgi-operating-desk-tour.gif
"$tgi_video_env/bin/python" - <<'PY'
from PIL import Image
with Image.open('assets/tgi-operating-desk-tour.gif') as tour:
    duration = 0
    for frame in range(tour.n_frames):
        tour.seek(frame)
        duration += tour.info.get('duration', 0)
    if tour.size != (960, 540) or duration != 42000 or tour.info.get('loop') != 0:
        raise RuntimeError('GIF must contain the full 42-second walkthrough and loop indefinitely')
    print(f'Verified full GIF: {tour.n_frames} frames, {duration / 1000:g} seconds')
PY
