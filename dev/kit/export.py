import asyncio, base64, io, sys, pathlib, subprocess, shutil, tempfile
from PIL import Image
from playwright.async_api import async_playwright
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'x-kit'  # writes into intern/x-kit
OUT.mkdir(exist_ok=True)
def save(data_url, name, scale):
    im = Image.open(io.BytesIO(base64.b64decode(data_url.split(',', 1)[1]))).convert('RGB')
    im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
    im.save(OUT / name, optimize=True); return im.size
async def main(what):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto((HERE / 'kit.html').as_uri()); await pg.wait_for_timeout(200)
        if 'images' in what:
            print('pfp', save(await pg.evaluate('KIT.pfp()'), 'pfp.png', 32))
            print('banner', save(await pg.evaluate('KIT.banner()'), 'banner.png', 4))
            print('og', save(await pg.evaluate('KIT.og()'), 'og-image.png', 3))
            names = ['00-hired-unpaid-intern', '01-intern', '02-junior-analyst', '03-analyst', '04-associate', '05-vp', '06-managing-director', '07-ceo']
            (OUT / 'cards').mkdir(exist_ok=True)
            for L, n in enumerate(names): save(await pg.evaluate(f'KIT.card({L})'), f'cards/{n}.png', 4)
            save(await pg.evaluate("KIT.card(2, 'pip')"), 'cards/pip-notice.png', 4)
            save(await pg.evaluate("KIT.card(0, 'demoted')"), 'cards/demoted.png', 4)
            print('cards ok')
        if 'trailer' in what:
            fr = pathlib.Path(tempfile.mkdtemp()); shutil.rmtree(fr, ignore_errors=True); fr.mkdir()
            n = (await pg.evaluate('KIT.trailerStart()'))['frames']
            for i in range(n):
                d = await pg.evaluate('KIT.trailerFrame()')
                (fr / f'f{i:04d}.png').write_bytes(base64.b64decode(d.split(',', 1)[1]))
            print('frames', n)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '30', '-i', str(fr / 'f%04d.png'), '-vf', 'scale=1920:1080:flags=neighbor,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-movflags', '+faststart', str(OUT / 'trailer.mp4')], check=True)
            shutil.rmtree(fr, ignore_errors=True)
        print(errs or 'no errors'); await b.close()
asyncio.run(main(sys.argv[1:]))
