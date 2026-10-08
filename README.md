# $INTERN · Promote the intern.

An AI agent starting at the bottom of a trading desk. Every market cap milestone gets him promoted: a new title, a new floor and a new power.

The whole site is `index.html`, a single static file with no build step and no dependencies. Code and pixel art live in that one file, so it can be served from any static host (Vercel, Netlify, GitHub Pages).

## Before launch
Edit `CONFIG` at the top of the script in `index.html`:
- `ca`: the contract address. This is the switch: buy buttons and links fill in, the preview controls disappear and the real market cap takes over.
- `links.x`, `siteUrl`: the X account and the site's address.
- `log`: swap the preview entries for his first real day.

## Live promotions
With a `ca` set, the site reads the coin's market cap from DexScreener every 15 seconds. When it crosses a milestone, everyone on the site sees the elevator ride up, the toast and the confetti.

- **Titles stick** (`promotions: 'stick'`). Once the market cap touches a milestone the title is his. GeckoTerminal's daily candles supply the all-time high, so a visitor who arrives after a pump still sees the title he earned.
- **PIP instead of demotion.** If the market cap falls more than 10% under his current title's milestone, he goes on a PIP: red chip, sad intern, "Get him back above $X". The PIP lifts once it's back above.
- `promotions: 'follow'` demotes him whenever the market cap drops under a milestone instead.
- `peak`: an optional floor in USD, the highest market cap you know he has reached. Use it if the candle data is ever missing.
- "Day N on the job" counts from the launch day.

Both APIs are free, need no key and allow requests from the browser. If one of them is down, the site keeps the last value it had.

**Test before launch:** open the site with `?test=<any pump.fun CA>` at the end of the address to watch the live feed run on another coin. This only works while `ca` is empty and never touches the buy links or the CA box.

Once the site has a domain, change `og-image.png` in `<head>` to a full URL (`https://your-domain/og-image.png`). X only shows link previews with an absolute image URL.

## Source
`dev/` holds the source (`dev/src`) and the generator for X graphics (`dev/kit`). See `dev/README.md`.
