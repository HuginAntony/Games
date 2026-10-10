"""Original WisQuiz audio sketches; Python standard library, no third-party assets.

Run: python docs/future/sound-lab/generate_samples.py
These are auditions, not final mastered game assets.
"""
import math
from pathlib import Path
import struct
import wave

RATE = 44100
ROOT = Path(__file__).resolve().parent


def make(name, duration, notes):
    samples = [0.0] * int(duration * RATE)
    for start, frequency, length, gain, material in notes:
        for i in range(min(int(length * RATE), len(samples) - int(start * RATE))):
            t = i / RATE
            envelope = min(1, t / 0.006) * math.exp(-t * (7 if material == 'glass' else 35))
            envelope *= min(1, (length - t) / 0.025)
            if material == 'wood':
                tone = math.sin(2 * math.pi * frequency * t) + 0.3 * math.sin(2 * math.pi * frequency * 2.71 * t)
            else:
                tone = math.sin(2 * math.pi * frequency * t) + 0.22 * math.sin(2 * math.pi * frequency * 2 * t) + 0.1 * math.sin(2 * math.pi * frequency * 4 * t)
            samples[int(start * RATE) + i] += tone * envelope * gain
    # A consistent peak ceiling preserves the intended relative cue levels.
    peak = max(abs(s) for s in samples) or 1
    scale = min(1, 0.65 / peak)
    with wave.open(str(ROOT / f'{name}.wav'), 'wb') as output:
        output.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        output.writeframes(b''.join(struct.pack('<h', int(s * scale * 32767)) for s in samples))


if __name__ == '__main__':
    make('signature', 1.6, [(i * .19, f, .85, .19, 'glass') for i, f in enumerate([392, 493.88, 587.33, 783.99])])
    make('answer-lock', .45, [(0, 220, .15, .24, 'wood'), (.075, 330, .2, .18, 'wood')])
    make('discovery', 1.1, [(0, 587.33, .8, .15, 'glass'), (.12, 880, .8, .11, 'glass')])
    make('correct', 1.25, [(0, 493.88, .8, .18, 'glass'), (.12, 587.33, .8, .19, 'glass'), (.26, 783.99, .9, .2, 'glass')])
    make('try-again', .95, [(0, 392, .65, .13, 'glass'), (.15, 329.63, .65, .13, 'glass')])
    make('finale', 1.9, [(0, 98, 1.3, .13, 'glass')] + [(i * .21, f, 1.1, .19, 'glass') for i, f in enumerate([392, 493.88, 587.33, 783.99])])
    print('Created six original WAV auditions.')
