// Emberfall bootstrap: input, the reveal flow, and the ?shot= hooks the maker
// uses to capture the game's own states (title, table, win, loss) for screenshots.
import { newGame, startDuel, playRound, meditate, canAffordAny } from './engine.js';
import { chooseRivalCard, rivalMeditate } from './ai.js';
import { render, showOverlay, hideOverlay } from './render.js';
import { sfx, isMuted, setMuted } from './sound.js';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) ? seedParam : (Date.now() % 100000);

let state = newGame(seed);
let soundOn = true;

const ui = {
  get muted() { return !soundOn; },
  onPick(i) {
    if (state.phase !== 'playing') return;
    const card = state.player.hand[i];
    if (!card || card.cost > state.player.ember) return;
    state.selected = state.selected === i ? null : i;
    sfx.pick();
    render(state, ui);
  },
};

function draw() { render(state, ui); }

function reveal() {
  if (state.phase !== 'playing' || state.selected === null) return;
  const playerIndex = state.selected;
  const rivalIndex = chooseRivalCard(state);
  if (rivalIndex === -1) {
    // Zephyr cannot afford a spirit: he meditates and the round is skipped.
    rivalMeditate(state);
    state.player.ember = Math.min(10, state.player.ember + 1);
    state.selected = null;
    state.lastPlayed = { player: null, rival: null };
    state.lastResult = { outcome: 'meditate', damage: 0, youPower: 0, foePower: 0, notes: [] };
    state.log = 'Zephyr cannot afford a spirit and meditates — your card waits. +1 ember for you.';
    sfx.meditate();
    draw();
    return;
  }
  sfx.reveal();
  const result = playRound(state, playerIndex, rivalIndex);
  if (!result) return;
  if (result.outcome === 'win') sfx.winRound();
  else if (result.outcome === 'lose') sfx.loseRound();
  else if (result.outcome === 'tie') sfx.tie();
  draw();
  if (state.phase === 'won') {
    sfx.victory();
    showOverlay('won', state);
  } else if (state.phase === 'lost') {
    sfx.defeat();
    showOverlay('lost', state);
  }
}

function doMeditate() {
  if (state.phase !== 'playing') return;
  meditate(state);
  sfx.meditate();
  draw();
}

function freshDuel(nextSeed) {
  state = newGame(nextSeed ?? (Date.now() % 100000));
  startDuel(state);
  hideOverlay();
  draw();
}

function beginFromTitle() {
  startDuel(state);
  hideOverlay();
  sfx.reveal();
  draw();
}

// --- Screenshot hooks: drive the real engine to a genuine state. ---
// ?shot=title  — the title screen over a fresh table.
// ?shot=play   — three scripted rounds played, mid-duel table with a reveal shown.
// ?shot=win    — scripted play until the player wins, win screen shown.
// ?shot=loss   — scripted play until the player loses, loss screen shown.
function autoPick(state, preferStrong) {
  const affordable = state.player.hand
    .map((card, i) => ({ card, i }))
    .filter(({ card }) => card.cost <= state.player.ember);
  if (affordable.length === 0) return -1;
  affordable.sort((a, b) => (preferStrong ? b.card.power - a.card.power : a.card.power - b.card.power));
  return affordable[0].i;
}

function scriptedDuel(targetPhase, startSeed) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const trial = newGame(startSeed + attempt);
    startDuel(trial);
    let guard = 0;
    while (trial.phase === 'playing' && guard < 80) {
      guard += 1;
      const preferStrong = targetPhase === 'won';
      const mine = autoPick(trial, preferStrong);
      if (mine === -1) { meditate(trial); continue; }
      const foe = chooseRivalCard(trial);
      if (foe === -1) { rivalMeditate(trial); continue; }
      playRound(trial, mine, foe);
    }
    if (trial.phase === targetPhase) return trial;
  }
  return null;
}

function applyShot() {
  const shot = params.get('shot');
  if (!shot) return false;
  if (shot === 'title') {
    showOverlay('title', state);
    draw();
    return true;
  }
  if (shot === 'play') {
    startDuel(state);
    hideOverlay();
    const picks = [2, 0, 1];
    for (const pref of picks) {
      if (state.phase !== 'playing') break;
      let mine = state.player.hand[pref] && state.player.hand[pref].cost <= state.player.ember
        ? pref : autoPick(state, true);
      if (mine === -1) { meditate(state); continue; }
      const foe = chooseRivalCard(state);
      if (foe === -1) { rivalMeditate(state); continue; }
      playRound(state, mine, foe);
    }
    draw();
    return true;
  }
  if (shot === 'win' || shot === 'loss') {
    const target = shot === 'win' ? 'won' : 'lost';
    const trial = scriptedDuel(target, seed);
    if (trial) {
      state = trial;
      draw();
      showOverlay(target, state);
      return true;
    }
    // Fallback: show the table mid-duel rather than a wrong end screen.
    startDuel(state);
    draw();
    return true;
  }
  return false;
}

// --- Wiring ---
document.getElementById('reveal-btn').addEventListener('click', reveal);
document.getElementById('meditate-btn').addEventListener('click', doMeditate);
document.getElementById('restart-btn').addEventListener('click', () => freshDuel());
document.getElementById('sound-btn').addEventListener('click', () => {
  soundOn = !soundOn;
  setMuted(!soundOn);
  draw();
});
document.getElementById('overlay-btn').addEventListener('click', () => {
  if (state.phase === 'title') beginFromTitle();
  else freshDuel();
});
document.addEventListener('keydown', (event) => {
  if (event.key >= '1' && event.key <= '5') {
    ui.onPick(Number(event.key) - 1);
  } else if (event.key === 'Enter') {
    if (state.phase === 'title') beginFromTitle();
    else if (state.phase === 'won' || state.phase === 'lost') freshDuel();
    else reveal();
  } else if (event.key === 'm' || event.key === 'M') {
    soundOn = !soundOn;
    setMuted(!soundOn);
    draw();
  } else if (event.key === 'r' || event.key === 'R') {
    freshDuel();
  }
});

// Debug handle for automated playtests (not part of the game UI).
window.__emberfall = { get state() { return state; }, reveal, meditate: doMeditate, freshDuel };

const shotTaken = applyShot();
if (!shotTaken) {
  if (state.phase === 'title') showOverlay('title', state);
  draw();
}
