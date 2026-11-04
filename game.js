// Treat Catch: the hidden mini-game. Loaded only when a visitor unlocks it.
(function () {
  const W = 240, H = 160, GROUND = 148;
  const SCORE_KEY = "treat-catch-scores";
  const CALM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
  const LETTERS = {
    O: ["XXX", "X.X", "X.X", "X.X", "XXX"],
    F: ["XXX", "X..", "XX.", "X..", "X.."],
    U: ["X.X", "X.X", "X.X", "X.X", "XXX"],
    C: ["XXX", "X..", "X..", "X..", "XXX"],
    H: ["X.X", "X.X", "XXX", "X.X", "X.X"],
    "!": ["X", "X", "X", ".", "X"],
  };

  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    node.append(...kids);
    return node;
  }
  const loadScores = () => {
    try { return JSON.parse(localStorage.getItem(SCORE_KEY)) || []; } catch (error) { return []; }
  };
  const saveScores = (scores) => {
    try { localStorage.setItem(SCORE_KEY, JSON.stringify(scores)); } catch (error) { /* private mode */ }
  };

  // Colorado backdrop: sky, peaks with snow, and a small Denver skyline.
  function paintBackdrop() {
    const canvas = el("canvas", { width: W, height: H });
    const c = canvas.getContext("2d");
    const r = (color, x, y, w, h) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
    ["#c7dcea", "#bcd5e7", "#aecde3", "#a2c5df"].forEach((color, i) => r(color, 0, i * 24, W, 24));
    r("#f5f2ea", 30, 18, 22, 3); r("#f5f2ea", 36, 15, 12, 3); r("#f5f2ea", 170, 28, 26, 3); r("#f5f2ea", 178, 25, 12, 3);
    const peak = (cx, top, spread, color, snow) => {
      for (let y = top; y < 124; y += 1) {
        const half = Math.round((y - top) * spread);
        r(y < top + 12 ? snow : color, cx - half, y, half * 2, 1);
      }
    };
    peak(52, 56, 1.25, "#5f7388", "#f4f6f8");
    peak(128, 44, 1.2, "#566a80", "#f4f6f8");
    peak(206, 60, 1.3, "#62778c", "#f4f6f8");
    [[86, 112, 7, 22], [95, 104, 8, 30], [105, 116, 6, 18], [113, 100, 7, 34], [122, 110, 8, 24], [132, 118, 6, 16]].forEach(([x, y, w, h]) => {
      r("#2f3b49", x, y, w, h);
      for (let wy = y + 3; wy < y + h - 2; wy += 4) r("#e7d58f", x + 2, wy, 1, 1);
    });
    r("#b49a64", 0, 124, W, 12);
    r("#8e7747", 0, 136, W, 12);
    r("#5e5033", 0, GROUND, W, H - GROUND);
    return canvas;
  }

  function open(dogs) {
    const backdrop = paintBackdrop();
    const canvas = el("canvas", { className: "game-canvas", width: W, height: H, ariaLabel: "Treat Catch game" });
    const c = canvas.getContext("2d");
    const scoreLabel = el("span", { textContent: "Score 0" });
    const livesLabel = el("span", { textContent: "♥♥♥" });
    const message = el("p", { className: "game-message", textContent: "Catch the treats. Don't drop them, and steer clear of chocolate! Move with the arrow keys, your mouse, or your finger." });
    const list = el("ol", { className: "game-scores" });
    const scoresBox = el("div", { hidden: true }, el("h3", { textContent: "Your high scores" }), list);
    const buttons = el("div", { className: "game-buttons" });
    const closeButton = el("button", { type: "button", className: "text-button", textContent: "Close" });
    const dialog = el("dialog", { className: "game" },
      el("div", { className: "game-head" }, el("h2", { textContent: "Treat Catch" }), closeButton),
      el("div", { className: "game-hud" }, scoreLabel, livesLabel),
      canvas, message, buttons, scoresBox);

    const keys = {};
    let frame = 0, running = false, last = 0;
    let dog = dogs[0], x = W / 2, score = 0, lives = 3, drops = [], spawnIn = 0, elapsed = 0, target = null, hurtUntil = 0, chewUntil = 0, shakeUntil = 0, flashUntil = 0, effects = [];

    const sprite = (pose, time) => {
      const shake = !CALM && time < shakeUntil ? Math.round(Math.sin(time / 22) * 3) : 0;
      const left = Math.round(x - dog.width / 2) + shake, top = GROUND - dog.height;
      dog.draw((color, rx, ry, w, h) => { c.fillStyle = color; c.fillRect(left + rx, top + ry, w, h); }, pose);
    };
    function drawDrop(drop) {
      const px = Math.round(drop.x), py = Math.round(drop.y);
      if (drop.kind === "treat") {
        c.fillStyle = "#c9a26b"; c.fillRect(px - 5, py - 2, 2, 2); c.fillRect(px - 5, py + 1, 2, 2); c.fillRect(px + 3, py - 2, 2, 2); c.fillRect(px + 3, py + 1, 2, 2);
        c.fillStyle = "#f3e9d7"; c.fillRect(px - 4, py - 1, 8, 3);
      } else {
        c.fillStyle = "#4a2a18"; c.fillRect(px - 4, py - 5, 8, 10);
        c.fillStyle = "#6b4026"; [-3, 1].forEach((ox) => [-4, -1, 2].forEach((oy) => c.fillRect(px + ox, py + oy, 2, 2)));
      }
    }
    function drawPattern(pattern, left, top, color, size) {
      c.fillStyle = color;
      pattern.forEach((row, py) => [...row].forEach((cell, px) => {
        if (cell === "X") c.fillRect(left + px * size, top + py * size, size, size);
      }));
    }
    function drawHeart(effect) {
      const progress = effect.age / effect.life;
      // Hearts rise, then flicker out in true retro style.
      if (progress > 0.7 && Math.floor(effect.age * 20) % 2) return;
      drawPattern(HEART, Math.round(effect.x + Math.sin(progress * 6) * 3), Math.round(effect.y - progress * 32), "#d9304f", 1);
    }
    function drawOuch(effect, time) {
      const top = GROUND - dog.height;
      const width = effect.word.length * 8 + 6;
      const left = Math.max(2, Math.min(W - width - 2, Math.round(x - width / 2)));
      const boxTop = Math.max(2, top - 19);
      c.fillStyle = "#1c1f23"; c.fillRect(left - 1, boxTop - 1, width + 2, 16);
      c.fillStyle = "#fffdf7"; c.fillRect(left, boxTop, width, 14);
      c.fillStyle = "#fffdf7"; c.fillRect(Math.round(x) - 2, boxTop + 14, 4, 2);
      c.fillStyle = "#1c1f23"; c.fillRect(Math.round(x) - 1, boxTop + 16, 2, 1);
      [...effect.word].forEach((letter, i) => drawPattern(LETTERS[letter], left + 3 + i * 8, boxTop + 2, "#c8344f", 2));
      // Stars circling the dog's head.
      for (let i = 0; i < 3; i += 1) {
        const angle = time / 120 + (i * Math.PI * 2) / 3;
        const sx = Math.round(x + Math.cos(angle) * (dog.width / 2 + 2));
        const sy = Math.round(top + 7 + Math.sin(angle) * 4);
        c.fillStyle = "#f2c230"; c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3);
      }
    }
    function render(time) {
      c.drawImage(backdrop, 0, 0);
      drops.forEach(drawDrop);
      sprite({ wag: Math.floor(time / 180) % 2 === 0, blink: time < hurtUntil, happy: time < chewUntil, chew: time < chewUntil }, time);
      effects.forEach((effect) => { if (effect.age >= 0) (effect.kind === "heart" ? drawHeart : drawOuch)(effect, time); });
      if (!CALM && time < flashUntil) { c.fillStyle = "rgba(200, 40, 60, .28)"; c.fillRect(0, 0, W, H); }
    }

    function updateHud() {
      scoreLabel.textContent = `Score ${score}`;
      livesLabel.textContent = "♥".repeat(lives) + "♡".repeat(3 - lives);
    }
    function showScores(highlight) {
      const scores = loadScores();
      list.replaceChildren(...scores.map((s) => el("li", { textContent: `${s.score} ${s.score === 1 ? "treat" : "treats"} with ${s.dog}`, className: s === highlight ? "new" : "" })));
      scoresBox.hidden = !scores.length;
    }
    function offerDogs(label) {
      buttons.replaceChildren(...dogs.map((d) => {
        const b = el("button", { type: "button", className: "button button-small", textContent: `${label} ${d.name}` });
        b.addEventListener("click", () => start(d));
        return b;
      }));
    }
    function gameOver() {
      running = false;
      const treats = (count) => `${count} ${count === 1 ? "treat" : "treats"}`;
      const scores = loadScores();
      const entry = { score, dog: dog.name };
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      const best = scores.slice(0, 5);
      saveScores(best);
      showScores(best.find((s) => s.score === entry.score && s.dog === entry.dog));
      message.textContent = best[0].score === score && score > 0 ? `New best: ${treats(score)}! ${dog.name} is very pleased.` : `Game over. ${dog.name} caught ${treats(score)}.`;
      offerDogs("Play again with");
    }
    function start(chosen) {
      dog = chosen; x = W / 2; score = 0; lives = 3; drops = []; spawnIn = 0; elapsed = 0; target = null; hurtUntil = 0; chewUntil = 0; shakeUntil = 0; flashUntil = 0; effects = [];
      updateHud();
      buttons.replaceChildren();
      scoresBox.hidden = true;
      message.textContent = "Catch the treats. Avoid the chocolate!";
      running = true;
      last = performance.now();
      canvas.focus();
      clearTimeout(frame);
      frame = nextFrame();
    }
    function loseLife(time) {
      lives -= 1;
      hurtUntil = Math.max(hurtUntil, time + 400);
      updateHud();
      if (lives <= 0) gameOver();
    }
    function celebrate(time) {
      chewUntil = time + 450;
      const top = GROUND - dog.height;
      [-9, 1, 10].forEach((offset, i) => effects.push({ kind: "heart", x: x - 3 + offset, y: top + 2, age: -i * 0.09, life: 0.8 }));
    }
    function ouch(time) {
      hurtUntil = time + 800;
      shakeUntil = time + 450;
      flashUntil = time + 160;
      effects = effects.filter((effect) => effect.kind !== "ouch");
      effects.push({ kind: "ouch", word: Math.random() < 0.5 ? "OOF!" : "OUCH!", age: 0, life: 0.9 });
    }
    function step(dt, time) {
      elapsed += dt;
      effects = effects.filter((effect) => { effect.age += dt; return effect.age < effect.life; });
      const fall = 42 + elapsed * 2.4;
      const move = 170 * dt;
      if (keys.ArrowLeft || keys.a) { x -= move; target = null; }
      if (keys.ArrowRight || keys.d) { x += move; target = null; }
      if (target !== null) x += Math.max(-move * 1.4, Math.min(move * 1.4, target - x));
      x = Math.max(dog.width / 2, Math.min(W - dog.width / 2, x));

      spawnIn -= dt;
      if (spawnIn <= 0) {
        drops.push({ x: 10 + Math.random() * (W - 20), y: -6, kind: Math.random() < Math.min(0.38, 0.18 + elapsed / 300) ? "chocolate" : "treat" });
        spawnIn = Math.max(0.38, 1.05 - elapsed / 70);
      }
      const catchTop = GROUND - dog.height + 2;
      const halfWidth = dog.width / 2 - 1;
      drops = drops.filter((drop) => {
        drop.y += fall * dt;
        if (running && drop.y >= catchTop && drop.y <= GROUND && Math.abs(drop.x - x) <= halfWidth) {
          if (drop.kind === "treat") { score += 1; celebrate(time); updateHud(); }
          else { ouch(time); loseLife(time); }
          return false;
        }
        if (drop.y > GROUND) {
          if (drop.kind === "treat" && running) loseLife(time);
          return false;
        }
        return true;
      });
    }
    const nextFrame = () => setTimeout(() => loop(performance.now()), 16);
    function loop(time) {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (running) step(dt, time);
      else effects = effects.filter((effect) => { effect.age += dt; return effect.age < effect.life; });
      render(time);
      if (running || effects.length || time < flashUntil) frame = nextFrame();
    }

    const onKey = (event) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) {
        keys[event.key] = event.type === "keydown";
        if (running) event.preventDefault();
      }
    };
    const onPointer = (event) => {
      const box = canvas.getBoundingClientRect();
      target = ((event.clientX - box.left) / box.width) * W;
    };
    dialog.addEventListener("keydown", onKey);
    dialog.addEventListener("keyup", onKey);
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerdown", onPointer);
    canvas.tabIndex = 0;
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => { running = false; clearTimeout(frame); dialog.remove(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && running) last = performance.now(); });

    document.body.append(dialog);
    dialog.showModal();
    render(0);
    showScores();
    offerDogs("Play as");
  }

  window.TreatCatch = { open };
})();
