// Emberfall sounds: small original blips synthesized with WebAudio.
// No audio files, no network — every tone is built at play time.
let audio = null;
let muted = false;

export function isMuted() { return muted; }
export function setMuted(value) { muted = value; }

function ctx() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
  if (muted) return;
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  pick() { tone(660, 0.08, 'triangle', 0.08); },
  reveal() { tone(392, 0.12, 'triangle', 0.1); tone(523, 0.14, 'triangle', 0.1, 0.07); },
  winRound() { tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.09); tone(784, 0.2, 'sine', 0.12, 0.18); },
  loseRound() { tone(330, 0.16, 'sawtooth', 0.05); tone(247, 0.22, 'sawtooth', 0.05, 0.1); },
  tie() { tone(440, 0.12, 'sine', 0.08); tone(440, 0.12, 'sine', 0.08, 0.14); },
  meditate() { tone(288, 0.4, 'sine', 0.07); tone(432, 0.4, 'sine', 0.05, 0.15); },
  victory() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, i * 0.13)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.09, i * 0.16)); },
};
