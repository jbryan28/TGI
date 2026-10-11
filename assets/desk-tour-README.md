# TGI Operating Desk membership walkthrough

42-second silent animated explainer, matching the black-and-gold membership page.

The release and pull-request workflows generate the media from the tracked renderer before running the browser checks. Production deploys the exact assets retained from the successful release checks. The GIF, MP4 and WebM files are generated build output; they do not need a separate binary upload to the source repository.

- MP4: H.264, 1920 × 1080, 24 fps, fast-start, no audio track.
- WebM: VP9, 1280 × 720, browser alternative.
- GIF: the complete 42 seconds, 960 × 540, 12 fps, infinite loop.
- Poster: the opening Daily Zones scene with its illustrative chart fully drawn.
- WebVTT: English captions for the generated video, matching the current slide order.
- The borderless GIF starts when it enters view and stops when hidden. Clicking, tapping, or using the keyboard button on the GIF toggles playback without a visible control row. Reduced-motion and JavaScript-disabled visitors see the still poster by default.
- The membership page displays only the GIF; there are no download links, caption, video panel or transcript beneath it. The generated MP4 and WebM remain release assets.

Slide order: 01 Daily Zones & Scenarios; 02 Current Desk; 03 News & Releases; 04 One member desk; 05 Scenarios & Outlooks; 06 Rules & Historical Work; 07 Join the Desk. The chart animation keeps its full seven seconds and the tour stays 42 seconds long.

Content reflects the 43-instrument navigation verified October 10, 2026: 33 forex pairs, four indices, four commodities, and two cryptocurrencies. All charts and UI examples are illustrative. No live quotes, current trade levels, performance results, branded-app availability or daily publication of every instrument are represented.

On Linux, generate all assets with `bash scripts/build-desk-video.sh`. This installs the pinned Python dependencies and generates the MP4, poster, WebM and GIF. To render manually, use `python3 scripts/render-desk-tour.py` (Pillow, numpy, ffmpeg and the script's Linux fonts), then encode the WebM alternative with:

```sh
ffmpeg -y -i assets/tgi-operating-desk-tour.mp4 -an -vf scale=1280:720 -c:v libvpx-vp9 -b:v 0 -crf 30 -deadline realtime -cpu-used 5 assets/tgi-operating-desk-tour.webm
```

Update the source, captions and asset filenames together if coverage, pricing or membership scope changes. The walkthrough is public marketing material; keep current member scenarios private.
