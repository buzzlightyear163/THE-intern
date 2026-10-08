# INTERN · källkod

Hela sajten är `../index.html`. Kod och pixelgrafik ligger i den filen och den behöver inga andra filer.
För vardagliga ändringar räcker det att redigera `CONFIG` högst upp i skriptet i `index.html`:
CA (när den är ifylld styr den riktiga market cap sajten), länkar, intern-loggen, titlar och trösklar.
Hur live-befordringarna fungerar står i `../README.md` under "Live promotions".

Vill du ändra grafiken, rummen eller sidans struktur gör du det här i `dev/`:

- `src/engine.js`: bitmapfont, praktikanten och hans poser, himlen och tornet i heron
- `src/rooms.js`: de nio våningarna och hissåkningen
- `src/site.js`, `site.css`, `site.html`: själva sidan (`CONFIG` finns i `site.js`)

Kör sedan `python dev/build.py`. Det bygger om `../index.html`.
Obs: bygget skriver över `index.html`. Har du ändrat `CONFIG` direkt i `index.html` måste du föra över ändringen till `src/site.js` först.

## X-kit

Rendera om profilbild, banner, OG-bild, korten och trailern (till exempel om du byter titlar eller trösklar):

```
pip install playwright pillow
python -m playwright install chromium
python dev/kit/export.py images trailer
```

Trailern kräver att `ffmpeg` är installerat. Allt hamnar i `x-kit/`.
