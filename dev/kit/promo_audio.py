"""Chiptune soundtrack for the $INTERN promo, synthesized from scratch (no samples, no licences).

Follows kit/promo.json: 120 BPM, elevator muzak in the mailroom, a chiptune drop on the first promotion,
an elevator chime on every arrival (tuned to the chord), a coin at the wallet, a breakdown on the roof
and a final C major hit with the site's promotion jingle on the end card.

python kit/promo_audio.py out.wav
"""
import json, pathlib, sys
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
KIT = pathlib.Path(__file__).resolve().parent
CFG = json.loads((KIT / 'promo.json').read_text())
TOTAL = CFG['total'] / 1000
BEAT = 60 / CFG['bpm']; BAR = BEAT * 4; S16 = BEAT / 4
N = int(TOTAL * SR) + SR  # one second of headroom for tails, trimmed at the end
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(2026)


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(round(at * SR)); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt(0.5 * (1 - pan)); R[i:j] += s * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.005, d=0.1, s=0.7, r=0.05, hold=None):
    """ADSR over n samples; release starts at `hold` seconds (default: n - release)."""
    e = np.ones(n); t = tt(n)
    hold = (n / SR - r) if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-6), e)
    dm = (t >= a) & (t < a + d); e[dm] = 1 - (1 - s) * (t[dm] - a) / d
    e[(t >= a + d)] = s
    rm = t >= hold; e[rm] = s * np.clip(1 - (t[rm] - hold) / r, 0, 1)
    return e


def dec(n, tau, a=0.002):
    t = tt(n); return np.minimum(1, t / a) * np.exp(-t / tau)


def phase_of(f, n, vib=0.0, vib_rate=5.5, vib_delay=0.12):
    t = tt(n)
    if vib:
        depth = np.clip((t - vib_delay) / 0.15, 0, 1) * vib
        f = f * 2 ** (depth * np.sin(2 * np.pi * vib_rate * t) / 12)
    else:
        f = np.full(n, f)
    return np.cumsum(f / SR) % 1.0, f / SR


def blep(t, dt):
    out = np.zeros_like(t)
    m = t < dt; x = t[m] / dt[m]; out[m] = x + x - x * x - 1
    m = t > 1 - dt; x = (t[m] - 1) / dt[m]; out[m] = x * x + x + x + 1
    return out


def pulse(f, dur, duty=0.5, vib=0.0):
    n = int(dur * SR); ph, dt = phase_of(f, n, vib)
    y = np.where(ph < duty, 1.0, -1.0)
    return y + blep(ph, dt) - blep((ph + 1 - duty) % 1.0, dt)


def tri(f, dur, vib=0.0):
    n = int(dur * SR); ph, _ = phase_of(f, n, vib)
    return 2 * np.abs(2 * ph - 1) - 1


def sine(f, dur, vib=0.0):
    n = int(dur * SR); ph, _ = phase_of(f, n, vib)
    return np.sin(2 * np.pi * ph)


def filt(x, kind, fc, order=2):
    sos = butter(order, fc, btype=kind, fs=SR, output='sos'); return sosfilt(sos, x)


def noise(dur): return rng.uniform(-1, 1, int(dur * SR))


# ---------------------------------------------------------------- instruments
def epiano(m, at, dur, g=0.11, pan=0.0):
    f = hz(m); n = int((dur + 0.6) * SR)
    x = sine(f, n / SR) + 0.28 * sine(2 * f, n / SR) + 0.06 * sine(3 * f, n / SR)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.2 * tt(n))
    add(x * dec(n, 0.55, 0.006) * trem, at, g, pan)


def vibes(m, at, dur, g=0.13, pan=-0.2):
    f = hz(m); n = int((dur + 0.8) * SR)
    x = sine(f, n / SR) + 0.18 * sine(4 * f, n / SR) * np.exp(-tt(n) / 0.08)
    trem = 1 + 0.35 * np.sin(2 * np.pi * 5.2 * tt(n))
    add(x * dec(n, 0.7, 0.004) * trem, at, g, pan)


def tbass(m, at, dur, g=0.30):
    n = int(dur * SR); add(tri(hz(m), dur) * env(n, 0.004, 0.08, 0.8, 0.04), at, g)


def cbass(m, at, dur, g=0.15):
    n = int(dur * SR); x = filt(pulse(hz(m), dur, 0.5), 'low', 1400)
    add(x * env(n, 0.003, 0.06, 0.75, 0.03), at, g)


def lead(m, at, dur, g=0.11, pan=-0.12, duty=0.25):
    n = int(dur * SR); x = filt(pulse(hz(m), dur, duty, vib=0.18), 'low', 7000)
    e = env(n, 0.004, 0.09, 0.75, 0.05)
    add(x * e, at, g, pan)
    for k, (dl, gg, pp) in enumerate([(0.375, 0.32, 0.45), (0.75, 0.14, -0.45)]):  # dotted-eighth echo
        add(filt(x * e, 'low', 3500), at + dl, g * gg, pp)


def arp(m, at, g=0.055, pan=0.38):
    d = S16 * 0.9; n = int(d * SR)
    add(filt(pulse(hz(m), d, 0.125), 'low', 6000) * env(n, 0.002, 0.05, 0.4, 0.02), at, g, pan)


def kick(at, g=0.62):
    n = int(0.32 * SR); t = tt(n)
    f = 45 + 110 * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    cl = int(0.004 * SR); x[:cl] += filt(noise(0.004), 'high', 2000) * 0.22 * np.linspace(0.3, 0, cl)
    add(x, at, g)


def snare(at, g=0.42, tone=190):
    n = int(0.2 * SR); t = tt(n)
    x = filt(noise(0.2), 'band', [900, 7000]) * np.exp(-t / 0.07) + 0.6 * np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.05)
    add(x, at, g, 0.05)


def hat(at, g=0.10, open_=False):
    d = 0.22 if open_ else 0.05; n = int(d * SR); t = tt(n)
    add(filt(noise(d), 'high', 7000) * np.exp(-t / (0.07 if open_ else 0.014)), at, g, 0.22)


def crash(at, g=0.20):
    n = int(1.8 * SR); t = tt(n)
    add(filt(noise(1.8), 'high', 4500) * np.exp(-t / 0.55), at, g, -0.1)
    add(filt(noise(1.8), 'high', 4500) * np.exp(-t / 0.55), at + 0.012, g * 0.8, 0.3)


def bell(m, at, g=0.16, pan=0.0, tau=0.9):
    f = hz(m); n = int(2.2 * SR); t = tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t / 0.25) + 0.15 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.08)
    add(x * dec(n, tau, 0.002), at, g, pan)


def chime(hi, lo, at, g=0.16):  # the elevator: two tones, like the site's ding()
    bell(hi, at, g, -0.1); bell(lo, at + 0.14, g, 0.1, tau=1.3)


def coin(at, g=0.12):
    a = pulse(hz(83), 0.07, 0.5); b = pulse(hz(88), 0.42, 0.5)
    add(filt(a, 'low', 6000) * env(len(a), 0.001, 0.02, 0.9, 0.01), at, g, 0.15)
    add(filt(b, 'low', 6000) * dec(len(b), 0.14), at + 0.07, g, 0.15)


def sparkle(at, notes, g=0.035):
    for k in range(7):
        m = int(rng.choice(notes)) + 24; d = 0.06
        add(sine(hz(m), d) * dec(int(d * SR), 0.02), at + 0.05 + k * 0.055 + rng.uniform(0, 0.02), g, float(rng.uniform(-0.6, 0.6)))


def whoosh(at, dur, g=0.09):
    n = int(dur * SR); t = tt(n); x = noise(dur)
    lo = filt(x, 'band', [300, 1200]); hi = filt(x, 'band', [1200, 5000])
    k = t / dur
    add((lo * (1 - k) + hi * k) * np.sin(np.pi * np.clip(k, 0, 1)) ** 1.5, at, g)


def riser(at, dur, g=0.10):
    n = int(dur * SR); t = tt(n); k = t / dur
    f = hz(48) * 2 ** (24 * k ** 1.6 / 12)
    ph = np.cumsum(f / SR) % 1
    sq = np.where(ph < 0.5, 1.0, -1.0)
    add(filt(sq, 'low', 3000) * k ** 2 * 0.6 + filt(noise(dur), 'high', 2500) * k ** 2.2, at, g)


def pad(ms, at, dur, g=0.05, pan=0.0):
    for i, m in enumerate(ms):
        n = int(dur * SR)
        x = 0.6 * tri(hz(m), dur, vib=0.06) + 0.4 * filt(pulse(hz(m) * 1.003, dur, 0.5), 'low', 1800)
        add(x * env(n, 0.25, 0.3, 0.8, 0.6), at, g, pan + (i - len(ms) / 2) * 0.15)


# ---------------------------------------------------------------- song
def b(bar, step=0): return bar * BAR + step * S16  # bar + 16th step -> seconds


# A: elevator muzak in the mailroom (bars 0-3): Cmaj7 Am7 Dm7 G7
MUZ = [([48, 64, 67, 71, 76], 48), ([45, 60, 64, 67, 72], 45), ([50, 65, 69, 72, 77], 50), ([43, 59, 62, 65, 71], 43)]
for bar, (ch, root) in enumerate(MUZ):
    for step, length in [(0, 5), (6, 3), (10, 5)]:
        if bar == 3 and step > 6: continue
        for k, m in enumerate(ch[1:]): epiano(m, b(bar, step) + k * 0.006, length * S16, 0.075, (k - 2) * 0.12)
    tbass(root, b(bar, 0), 5 * S16, 0.2); tbass(root + 7, b(bar, 6), 3 * S16, 0.16)
    if bar < 3: tbass(root, b(bar, 10), 5 * S16, 0.18)
    for s in range(0, 16, 2):
        if bar == 3 and s >= 10: break
        hat(b(bar, s), 0.035 if s % 4 else 0.05)
for m, beat, d in [(79, 0, 1.5), (76, 1.5, 0.5), (74, 2, 1), (76, 3, 1), (72, 4, 2), (69, 6, 1), (72, 7, 1), (74, 8, 1.5), (77, 9.5, 0.5), (81, 10, 1), (79, 11, 1), (77, 12, 1.5)]:
    vibes(m, beat * BEAT, d * BEAT, 0.12)

# the thought bubble pops: a little dream gliss
d0 = CFG['dream'][0] / 1000
for k, m in enumerate([84, 88, 91, 96]): bell(m, d0 + 0.28 + k * 0.07, 0.04, 0.3, tau=0.35)

# the elevator leaves the basement: riser + snare roll into the drop
k0 = CFG['keys'][1][0] / 1000  # 6.8 s, doors shut
riser(k0, 8.0 - k0, 0.11)
for i in range(8): snare(7.0 + i * S16, 0.10 + 0.02 * i, 200 + 6 * i)
for i in range(8): snare(7.5 + i * S16 / 2, 0.22 + 0.025 * i, 240 + 8 * i)

# B: chiptune from the first promotion (bars 4-12)
CH = {'C': [60, 64, 67], 'G': [55, 59, 62], 'Am': [57, 60, 64], 'F': [53, 57, 60]}
PROG = {4: 'C', 5: 'G', 6: 'Am', 7: 'F', 8: 'C', 9: 'G', 10: 'Am', 11: 'F', 12: 'G'}
MEL = {'C': [76, '-', 79, '-', 84, '-', 83, 79], 'G': [86, '-', 83, '-', 79, '-', 81, 83],
       'Am': [84, '-', '-', 88, 86, '-', 84, 83], 'F': [81, '-', 84, '-', 86, '-', 84, 81]}
MEL_CEO = {11: [81, 84, 89, '-', 88, '-', 84, '-'], 12: [86, '-', 83, '-', 91, '-', '-', '-']}
for bar, name in PROG.items():
    ch = CH[name]; root = ch[0] - 12
    ceo = bar >= 11
    # drums
    kicks = [0, 4, 8, 12] if ceo else ([0, 8, 10] if bar % 2 else [0, 8])
    for s in kicks: kick(b(bar, s))
    for s in (4, 12): snare(b(bar, s), 0.42)
    for s in range(0, 16, 1 if bar >= 8 else 2):
        hat(b(bar, s), (0.085 if s % 4 == 2 else 0.05) if bar >= 8 else 0.08, open_=(s == 14 and not ceo))
    # bass: eighths, octave bounce
    for s in range(0, 16, 2): cbass(root - 12 if s % 4 == 0 else root, b(bar, s), 2 * S16 * 0.92, 0.15)
    # arpeggio
    tones = ch + [ch[0] + 12]
    for s in range(16): arp(tones[s % 4] + 12, b(bar, s), 0.065 if not ceo else 0.075)
    # lead
    mel = MEL_CEO.get(bar, MEL[name])
    i = 0
    while i < 8:
        m = mel[i]
        if m in ('-', None): i += 1; continue
        j = i + 1
        while j < 8 and mel[j] == '-': j += 1
        lead(m, b(bar, 2 * i), (j - i) * 2 * S16 * 0.95, 0.16 if ceo else 0.14)
        i = j
    if ceo: pad([ch[0], ch[1], ch[2], ch[0] + 12], b(bar), BAR, 0.035)
# fill into the CEO floor
for i, s in enumerate(range(12, 16)): snare(b(10, s), 0.3 + 0.05 * i, 220 + 20 * i)
for i in range(4): snare(b(10, 14) + i * S16 / 2, 0.25, 300)
# crashes on the big beats
for at in (8.0, 14.0, 22.0): crash(at, 0.22 if at != 22.0 else 0.27)

# arrivals: elevator chime tuned to the chord, plus confetti sparkle
TUNE = {'C': (88, 84), 'G': (83, 79), 'Am': (84, 81), 'F': (81, 77)}
for ms, Lf, _ in CFG['arrivals']:
    at = ms / 1000; bar = int(round(at / BAR)); name = PROG.get(bar, 'C')
    hi, lo = TUNE[name]; chime(hi, lo, at + 0.02, 0.15 if Lf not in (1, 7) else 0.19)
    sparkle(at, CH[name] + [c + 12 for c in CH[name]])
# rides between floors
K = CFG['keys']
for (ta, ca), (tb, cb) in zip(K, K[1:]):
    if cb != ca and ta > 7000: whoosh(ta / 1000, (tb - ta) / 1000, 0.08)
# the wallet
coin(CFG['wallet'] / 1000, 0.13)

# roof (bar 13): breakdown, a question in three notes
pad([57, 60, 64, 71], b(13), BAR + 0.4, 0.05)
kick(b(13, 0), 0.6); kick(b(13, 8), 0.45)
for k, m in enumerate([76, 79, 83]): lead(m, b(13, 4 + 4 * k), S16 * 3, 0.10, 0.0, duty=0.125)
riser(b(13, 8), BEAT * 2, 0.06)

# end card (bars 14-15): C major, the site's chime and jingle
E = CFG['end'] / 1000
kick(E, 0.7); crash(E, 0.28)
for m in (36, 48): tbass(m, E, 2.6, 0.22)
pad([60, 64, 67, 72, 76], E, 3.2, 0.05)
lead(84, E, 1.6, 0.11, 0.0)
chime(88, 84, E + 0.05, 0.2)
for k, m in enumerate([72, 76, 79, 84]):  # jingle(true) from the site: C E G C
    x = pulse(hz(m), 0.2, 0.5); add(filt(x, 'low', 5000) * dec(len(x), 0.08), E + 1.0 + k * 0.09, 0.09, 0.1)
bell(96, E + 1.42, 0.05, 0.2, tau=0.8)

# master
mix = np.stack([L, R])[:, : int(TOTAL * SR)]
mix = np.stack([filt(ch, 'high', 28) for ch in mix])
fade = np.ones(mix.shape[1]); fl = int(0.9 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.5
fi = int(0.02 * SR); fade[:fi] = np.linspace(0, 1, fi)
mix *= fade
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix /= max(1e-9, np.abs(mix).max()) / 0.89

out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else KIT / 'out' / 'promo_raw.wav')
import wave
pcm = (mix.T * 32767).astype('<i2')
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('audio', out, f'{mix.shape[1] / SR:.2f}s')
