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
