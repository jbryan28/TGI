# TGI Operating Desk membership walkthrough

42-second silent animated explainer, matching the black-and-gold membership page.

The release and pull-request workflows generate the video from the tracked renderer before running the browser checks. Production deploys the exact video assets retained from the successful release checks. The large MP4 and WebM files are generated build output; they do not need a separate binary upload to the source repository.

- MP4: H.264, 1920 × 1080, 24 fps, fast-start, no audio track.
- WebM: VP9, 1280 × 720, browser alternative.
- Poster: a frame from the tour using the existing illustrative portal diagram.
- WebVTT: optional English captions; the page also provides a text walkthrough.
- No autoplay or preload of the full video; playback starts on request.

Content reflects the 43-instrument navigation verified October 10, 2026: 33 forex pairs, four indices, four commodities, and two cryptocurrencies. All charts and UI examples are illustrative. No live quotes, current trade levels, performance results, branded-app availability or daily publication of every instrument are represented.

On Linux, generate all assets with `bash scripts/build-desk-video.sh`. This installs the pinned Python dependencies and generates the MP4, poster, and WebM. To render manually, use `python3 scripts/render-desk-tour.py` (Pillow, numpy, ffmpeg and the script's Linux fonts), then encode the WebM alternative with:

```sh
ffmpeg -y -i assets/tgi-operating-desk-tour.mp4 -an -vf scale=1280:720 -c:v libvpx-vp9 -b:v 0 -crf 30 -deadline realtime -cpu-used 5 assets/tgi-operating-desk-tour.webm
```

Update the source, captions, transcript and asset filenames together if coverage, pricing or membership scope changes. The walkthrough is public marketing material; keep current member scenarios private.
