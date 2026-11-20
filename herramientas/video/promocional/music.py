"""Base musical original (sintetizada): pop electrónico suave a 104 BPM en La mayor, para ir bajo la voz."""
import numpy as np, soundfile as sf, json
SR = 44100
tl = json.load(open('timeline.json'))
DUR = tl['total'] + 0.3
BPM = 104; beat = 60 / BPM
N = int(DUR * SR); out = np.zeros((N, 2))
t_all = np.arange(N) / SR
def note(m): return 440 * 2 ** ((m - 69) / 12)
def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    seg = sig[: j - i] * gain
    out[i:j, 0] += seg * (1 - pan) ** 0.5 if pan > 0 else seg
    out[i:j, 1] += seg * (1 + pan) ** 0.5 if pan < 0 else seg
def env(n, a, d, s, r, sustain):
    A, D, R = int(a * SR), int(d * SR), int(r * SR); S = max(0, n - A - D - R)
    return np.concatenate([np.linspace(0, 1, A, False), np.linspace(1, s, D, False), np.full(S, s), np.linspace(s, 0, R)])[:n]
def lp(x, cutoff):  # filtro paso bajo de un polo
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y
rng = np.random.default_rng(7)
# Progresión I–V–vi–IV (A, E, F#m, D), 2 tiempos... un compás de 4 tiempos por acorde
chords = [[57, 61, 64, 69], [52, 56, 59, 64], [54, 57, 61, 66], [50, 54, 57, 62]]
bar = 4 * beat
nbars = int(DUR / bar) + 1
# Pad (sierras desafinadas, filtradas)
for b in range(nbars):
    ch = chords[b % 4]; n = int(bar * SR * 1.05); tt = np.arange(n) / SR; sig = np.zeros(n)
    for m in ch:
        for det in (-0.08, 0.08):
            f = note(m) * 2 ** (det / 12); sig += 2 * ((tt * f) % 1) - 1
    sig = lp(sig / 8, 900) * env(n, 0.35, 0.3, 0.8, 0.5, 1)
    add(sig, b * bar, gain=0.16)
# Bajo
for b in range(nbars):
    root = chords[b % 4][0] - 12
    for k in range(4):
        n = int(beat * SR * 0.9); tt = np.arange(n) / SR; f = note(root)
        sig = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)
        add(sig * env(n, 0.005, 0.15, 0.6, 0.12, 1), b * bar + k * beat, gain=0.22)
# Arpegio pluck en corcheas (desde el compás 2)
for b in range(1, nbars):
    ch = chords[b % 4]; seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12]
    for k, m in enumerate(seq):
        n = int(beat / 2 * SR); tt = np.arange(n) / SR; f = note(m)
        sig = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sign(np.sin(2 * np.pi * f * tt)) * 0.3) * np.exp(-tt * 9)
        add(sig, b * bar + k * beat / 2, pan=0.35 if k % 2 else -0.35, gain=0.09)
# Batería: bombo en cada tiempo (desde compás 2), palmas en 2 y 4, hi-hat en contratiempos
kick_n = int(0.35 * SR); kt = np.arange(kick_n) / SR
kick = np.sin(2 * np.pi * (45 * kt + 90 * (1 - np.exp(-kt * 30)) / 30)) * np.exp(-kt * 8)
hat_n = int(0.06 * SR); hat = rng.standard_normal(hat_n); hat = (hat - lp(hat, 6000)) * np.exp(-np.arange(hat_n) / SR * 70)
clap_n = int(0.18 * SR); clap = rng.standard_normal(clap_n); clap = (clap - lp(clap, 1200)) * np.exp(-np.arange(clap_n) / SR * 22)
kicks = []
for b in range(1, nbars):
    for k in range(4):
        at = b * bar + k * beat; add(kick, at, gain=0.42); kicks.append(at)
        if k in (1, 3): add(clap, at, gain=0.10)
        add(hat, at + beat / 2, pan=0.2, gain=0.07)
# Golpe final y silencio para el cierre
end = tl['tl']['s7']['start'] + 0.3
crash_n = int(2.5 * SR); crash = rng.standard_normal(crash_n); crash = (crash - lp(crash, 3000)) * np.exp(-np.arange(crash_n) / SR * 2.2)
add(crash, end, gain=0.06)
# Bombeo (sidechain) suave
duck = np.ones(N)
for at in kicks:
    i = int(at * SR); j = min(N, i + int(0.22 * SR))
    if i < N: duck[i:j] = np.minimum(duck[i:j], 0.55 + 0.45 * np.linspace(0, 1, j - i))
out *= duck[:, None]
# Entrada y salida
fade_in = np.clip(t_all / 1.2, 0, 1); fade_out = np.clip((DUR - t_all) / 2.2, 0, 1)
out *= (fade_in * fade_out)[:, None]
out /= np.abs(out).max() * 1.12
sf.write('music.wav', out, SR)
print('música', round(DUR, 1), 's')
