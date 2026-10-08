#!/usr/bin/env python3
"""Builds ../index.html (the whole site in one file) from src/."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
css = (src / 'site.css').read_text(encoding='utf-8')
html = (src / 'site.html').read_text(encoding='utf-8')
js = '\n'.join((src / f).read_text(encoding='utf-8') for f in ('engine.js', 'rooms.js', 'site.js'))
fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Pixelify+Sans:wght@500;600;700&family=Silkscreen:wght@400;700&display=swap">\n')
body = f'<style>\n{css}</style>\n\n{html}\n<script>\n{js}\n</script>\n'


fav = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 14' shape-rendering='crispEdges'%3E"
       "%3Crect x='2' y='6' width='8' height='8' fill='%23000'/%3E%3Crect x='3' y='7' width='6' height='1' fill='%23f2c14e'/%3E"
       "%3Crect x='3' y='8' width='6' height='5' fill='%23f4ead5'/%3E%3Crect x='4' y='9' width='4' height='2' fill='%23f3c6a2'/%3E"
       "%3Crect x='4' y='12' width='4' height='1' fill='%235c6680'/%3E%3Crect x='5' y='4' width='2' height='2' fill='%23f2c14e'/%3E"
       "%3Crect x='0' y='0' width='1' height='1' fill='%233f6fd1'/%3E%3Crect x='11' y='0' width='1' height='1' fill='%233f6fd1'/%3E"
       "%3Crect x='1' y='1' width='1' height='1' fill='%233f6fd1'/%3E%3Crect x='10' y='1' width='1' height='1' fill='%233f6fd1'/%3E"
       "%3Crect x='2' y='2' width='1' height='1' fill='%233f6fd1'/%3E%3Crect x='9' y='2' width='1' height='1' fill='%233f6fd1'/%3E"
       "%3Crect x='3' y='3' width='1' height='1' fill='%233f6fd1'/%3E%3Crect x='8' y='3' width='1' height='1' fill='%233f6fd1'/%3E"
       "%3Crect x='4' y='4' width='1' height='1' fill='%233f6fd1'/%3E%3Crect x='7' y='4' width='1' height='1' fill='%233f6fd1'/%3E%3C/svg%3E")
head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>$INTERN · Promote the intern.</title>
<meta name="description" content="An AI agent starting at the bottom of a trading desk. Every market cap milestone gets him promoted: a new title, a new floor and a new power.">
<meta name="theme-color" content="#070b18">
<meta property="og:type" content="website">
<meta property="og:title" content="$INTERN · Promote the intern.">
<meta property="og:description" content="An AI agent climbing a trading desk, one market cap milestone at a time.">
<!-- X and Telegram need a full URL here: replace with https://YOUR-DOMAIN/og-image.png once the site is live -->
<meta property="og:image" content="og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="og-image.png">
<link rel="icon" href="{fav}">
{fonts}</head>
<body>
'''
(root.parent / 'index.html').write_text(head + body + '</body>\n</html>\n', encoding='utf-8')
print('built', len(body), 'bytes')
