// ── Constants ────────────────────────────────────────────────────────────────
const ITEM_H  = 72;   // px — must match --item-h in CSS
const VISIBLE = 5;    // items visible in window — must match --visible in CSS
const CENTER  = 2;    // index of center slot (0-based), i.e. floor(VISIBLE/2)
const REPEATS = 20;   // how many times to repeat options in the drum

// ── Auth guard ───────────────────────────────────────────────────────────────
let currentUser = null;

(async () => {
  const res = await fetch('/api/me');
  if (!res.ok) { window.location.href = '/login.html'; return; }
  const data = await res.json();
  currentUser = data.username;
  document.getElementById('username-display').textContent = currentUser;
  init();
})();

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

// ── Results strip ─────────────────────────────────────────────────────────────
const resultsStrip = document.getElementById('results-strip');

// Map of wheelId → chip element, so we update in-place on re-spin
const chipMap = {};

function showResult(wheelId, emoji, name, text) {
  if (chipMap[wheelId]) {
    // Replace existing chip with a fresh one (re-triggers animation)
    chipMap[wheelId].remove();
  }

  const chip = document.createElement('div');
  chip.className = 'result-chip';
  chip.innerHTML = `
    <span class="chip-emoji">${emoji}</span>
    <span class="chip-label">${name}</span>
    <span class="chip-value">${text}</span>
  `;
  chipMap[wheelId] = chip;
  resultsStrip.appendChild(chip);
}

// ── Reel class ───────────────────────────────────────────────────────────────
class Reel {
  constructor(data) {
    this.id       = data.id;
    this.name     = data.name;
    this.emoji    = data.emoji;
    this.options  = [...data.options];
    this.spinning = false;
    this._baseIndex = 0;

    this._buildEl();
    this._rebuildDrum();
  }

  // ── DOM construction ──────────────────────────────────────────────────────

  _buildEl() {
    const col = document.createElement('div');
    col.className = 'reel-col';
    col.innerHTML = `
      <div class="reel-label">${this.emoji} ${this.name}</div>
      <div class="reel-window">
        <div class="reel-inner"></div>
      </div>
      <div class="reel-footer">
        <button class="btn-spin-reel">Spin</button>
        <button class="btn-edit-toggle">✏️ Edit options</button>
      </div>
    `;
    this.col     = col;
    this.inner   = col.querySelector('.reel-inner');
    this.spinBtn = col.querySelector('.btn-spin-reel');

    this.spinBtn.addEventListener('click', () => this.spin());
    col.querySelector('.btn-edit-toggle').addEventListener('click', () => {
      this.editCard.classList.toggle('open');
    });

    // Edit panel card
    const card = document.createElement('div');
    card.className = 'edit-panel-card';
    card.innerHTML = `
      <div class="edit-panel-card-header">${this.emoji} ${this.name} options</div>
      <div class="edit-panel-body">
        <ul class="options-list"></ul>
        <div class="add-option-row">
          <input type="text" placeholder="Add an option…" maxlength="80">
          <button class="btn-add">Add</button>
        </div>
      </div>
    `;
    this.editCard    = card;
    this.optionsList = card.querySelector('.options-list');
    this.addInput    = card.querySelector('input');
    this.addBtn      = card.querySelector('.btn-add');

    this.addBtn.addEventListener('click', () => this._addOption());
    this.addInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addOption();
    });

    this._renderOptionsList();
  }

  // ── Drum ──────────────────────────────────────────────────────────────────

  _rebuildDrum(keepCenterText = null) {
    const n = this.options.length;

    if (n === 0) {
      this.inner.innerHTML = '<div class="reel-empty">Add some options first</div>';
      this.spinBtn.disabled = true;
      return;
    }

    this.spinBtn.disabled = false;

    const items = [];
    for (let r = 0; r < REPEATS; r++) {
      for (let i = 0; i < n; i++) items.push(this.options[i].text);
    }

    this.inner.innerHTML = items
      .map(text => `<div class="reel-item">${text}</div>`)
      .join('');

    const midRepeat = Math.floor(REPEATS / 2);
    let startOption = 0;
    if (keepCenterText) {
      const idx = this.options.findIndex(o => o.text === keepCenterText);
      if (idx !== -1) startOption = idx;
    }

    this._baseIndex = midRepeat * n + startOption;
    this.inner.style.transition = 'none';
    this.inner.style.transform  = `translateY(${this._translateFor(this._baseIndex)}px)`;
  }

  _translateFor(absIndex) {
    return CENTER * ITEM_H - absIndex * ITEM_H;
  }

  // ── Spin ──────────────────────────────────────────────────────────────────

  spin(onDone) {
    if (this.spinning || this.options.length < 2) return;
    this.spinning = true;
    this.spinBtn.disabled = true;

    const n = this.options.length;
    const winner        = Math.floor(Math.random() * n);
    const currentMod    = this._baseIndex % n;
    const stepsToWinner = ((winner - currentMod) + n) % n || n;
    const fullLoops     = (5 + Math.floor(Math.random() * 4)) * n;
    const newIndex      = this._baseIndex + fullLoops + stepsToWinner;

    this.inner.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    this.inner.style.transform  = `translateY(${this._translateFor(newIndex)}px)`;

    this.inner.addEventListener('transitionend', () => {
      this._baseIndex       = newIndex;
      this.spinning         = false;
      this.spinBtn.disabled = false;

      showResult(this.id, this.emoji, this.name, this.options[winner].text);
      if (onDone) onDone();

      // Snap back to mid-drum silently
      const midRepeat = Math.floor(REPEATS / 2);
      const safeIndex = midRepeat * n + (newIndex % n);
      this._baseIndex = safeIndex;
      this.inner.style.transition = 'none';
      this.inner.style.transform  = `translateY(${this._translateFor(safeIndex)}px)`;
    }, { once: true });
  }

  // ── Options list ──────────────────────────────────────────────────────────

  _renderOptionsList() {
    this.optionsList.innerHTML = '';
    this.options.forEach(opt => {
      const li = document.createElement('li');
      li.dataset.id = opt.id;
      li.innerHTML = `<span>${opt.text}</span><button class="btn btn-danger" title="Remove">✕</button>`;
      li.querySelector('button').addEventListener('click', () => this._deleteOption(opt.id, opt.text));
      this.optionsList.appendChild(li);
    });
  }

  async _addOption() {
    const text = this.addInput.value.trim();
    if (!text) return;
    this.addBtn.disabled = true;

    const res = await fetch(`/api/wheels/${this.id}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      const opt = await res.json();
      this.options.push(opt);
      this.addInput.value = '';
      this._rebuildDrum(this._centeredText());
      this._renderOptionsList();
    }

    this.addBtn.disabled = false;
    this.addInput.focus();
  }

  async _deleteOption(optId, optText) {
    if (this.options.length <= 2) {
      alert('Need at least 2 options to spin!');
      return;
    }
    const res = await fetch(`/api/options/${optId}`, { method: 'DELETE' });
    if (res.ok) {
      this.options = this.options.filter(o => o.id !== optId);
      const keep = optText !== this._centeredText() ? this._centeredText() : null;
      this._rebuildDrum(keep);
      this._renderOptionsList();
    }
  }

  _centeredText() {
    const n = this.options.length;
    if (!n) return null;
    return this.options[this._baseIndex % n]?.text ?? null;
  }
}

// ── Spin All ──────────────────────────────────────────────────────────────────
let reels = [];

document.getElementById('spin-all-btn').addEventListener('click', () => {
  if (reels.some(r => r.spinning)) return;

  reels.forEach((reel, i) => {
    if (reel.options.length < 2) return;

    setTimeout(() => {
      reel.spinning = true;
      reel.spinBtn.disabled = true;

      const n            = reel.options.length;
      const winner       = Math.floor(Math.random() * n);
      const currentMod   = reel._baseIndex % n;
      const stepsToWin   = ((winner - currentMod) + n) % n || n;
      const fullLoops    = (5 + Math.floor(Math.random() * 4)) * n;
      const newIndex     = reel._baseIndex + fullLoops + stepsToWin;

      reel.inner.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      reel.inner.style.transform  = `translateY(${reel._translateFor(newIndex)}px)`;

      reel.inner.addEventListener('transitionend', () => {
        reel._baseIndex       = newIndex;
        reel.spinning         = false;
        reel.spinBtn.disabled = false;

        showResult(reel.id, reel.emoji, reel.name, reel.options[winner].text);

        const midRepeat = Math.floor(REPEATS / 2);
        const safeIndex = midRepeat * n + (newIndex % n);
        reel._baseIndex = safeIndex;
        reel.inner.style.transition = 'none';
        reel.inner.style.transform  = `translateY(${reel._translateFor(safeIndex)}px)`;
      }, { once: true });
    }, i * 180);
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const res = await fetch('/api/wheels');
  if (!res.ok) return;

  const wheels     = await res.json();
  const reelsRow   = document.getElementById('reels-row');
  const editPanels = document.getElementById('edit-panels-row');

  wheels.forEach(data => {
    const reel = new Reel(data);
    reelsRow.appendChild(reel.col);
    editPanels.appendChild(reel.editCard);
    reels.push(reel);
  });
}
