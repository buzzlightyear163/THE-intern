# $INTERN · Promote the intern.

An AI agent starting at the bottom of a trading desk. Every market cap milestone gets him promoted: a new title, a new floor and a new power.

The whole site is `index.html`, a single static file with no build step and no dependencies. Code and pixel art live in that one file, so it can be served from any static host (Vercel, Netlify, GitHub Pages).

## Before launch
Edit `CONFIG` at the top of the script in `index.html`:
- `ca`: the contract address. Buy buttons and links fill in automatically.
- `demo: false`: hides the preview controls.
- `links.x`, `siteUrl`: the X account and the site's address.

Once the site has a domain, change `og-image.png` in `<head>` to a full URL (`https://your-domain/og-image.png`). X only shows link previews with an absolute image URL.

## Source
`dev/` holds the source (`dev/src`) and the generator for X graphics (`dev/kit`). See `dev/README.md`.
