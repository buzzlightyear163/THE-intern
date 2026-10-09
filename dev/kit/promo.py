"""Renders the $INTERN promo for X: pixel frames (kit.js) + chiptune soundtrack (promo_audio.py), muxed to MP4.

python kit/promo.py            -> kit/out/promo.mp4
python kit/promo.py frames     -> only the frames
python kit/promo.py audio mux  -> only rebuild the soundtrack and mux
"""
import asyncio, base64, json, pathlib, shutil, subprocess, sys
from playwright.async_api import async_playwright

KIT = pathlib.Path(__file__).resolve().parent
OUT = KIT / 'out'
CFG = json.loads((KIT / 'promo.json').read_text())


async def frames():
    fr = OUT / 'promo_frames'
    shutil.rmtree(fr, ignore_errors=True); fr.mkdir(parents=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((KIT / 'kit.html').as_uri()); await pg.wait_for_timeout(200)
        n = (await pg.evaluate('(c) => KIT.promoStart(c)', CFG))['frames']
        for i in range(n):
            d = await pg.evaluate('KIT.promoFrame()')
            (fr / f'f{i:04d}.png').write_bytes(base64.b64decode(d.split(',', 1)[1]))
        print('frames', n, errs or 'no errors'); await b.close()


def video():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', str(OUT / 'promo_frames' / 'f%04d.png'),
                    '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
                    '-crf', '17', '-preset', 'slow', '-g', '60', str(OUT / 'promo_video.mp4')], check=True)


def audio():
    subprocess.run([sys.executable, str(KIT / 'promo_audio.py'), str(OUT / 'promo_raw.wav')], check=True)
    # X plays everything around -14 LUFS; keep true peak under -1.5 dB
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'promo_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9',
                    '-ar', '48000', str(OUT / 'promo_audio.wav')], check=True)


def mux():
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'promo_video.mp4'), '-i', str(OUT / 'promo_audio.wav'),
                    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
                    '-shortest', '-movflags', '+faststart', str(OUT / 'promo.mp4')], check=True)
    print('wrote', OUT / 'promo.mp4')


async def preview(times):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((KIT / 'kit.html').as_uri()); await pg.wait_for_timeout(200)
        await pg.evaluate('(c) => KIT.promoStart(c)', CFG)
        want = {int(t / 1000 * 30): t for t in times}
        for i in range(max(want) + 1):
            d = await pg.evaluate('KIT.promoFrame()')
            if i in want: (OUT / f'prev_{want[i]}.png').write_bytes(base64.b64decode(d.split(',', 1)[1]))
        print(errs or 'no errors'); await b.close()


if sys.argv[1:2] == ['preview']:
    asyncio.run(preview([int(x) for x in sys.argv[2:]])); sys.exit()
steps = sys.argv[1:] or ['frames', 'video', 'audio', 'mux']
if 'frames' in steps: asyncio.run(frames())
if 'video' in steps or 'frames' in steps: video()
if 'audio' in steps: audio()
if 'mux' in steps: mux()
