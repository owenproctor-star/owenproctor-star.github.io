// Treat Catch: the hidden mini-game. Loaded only when a visitor unlocks it.
(function () {
  const W = 240, H = 160, GROUND = 148;
  const SCORE_KEY = "treat-catch-scores";

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
    let dog = dogs[0], x = W / 2, score = 0, lives = 3, drops = [], spawnIn = 0, elapsed = 0, target = null, hurtUntil = 0, chewUntil = 0;

    const sprite = (pose) => {
      const left = Math.round(x - dog.width / 2), top = GROUND - dog.height;
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
    function render(time) {
      c.drawImage(backdrop, 0, 0);
      drops.forEach(drawDrop);
      sprite({ wag: Math.floor(time / 180) % 2 === 0, blink: time < hurtUntil, happy: false, chew: time < chewUntil });
    }

    function updateHud() {
      scoreLabel.textContent = `Score ${score}`;
      livesLabel.textContent = "♥".repeat(lives) + "♡".repeat(3 - lives);
    }
    function showScores(highlight) {
      const scores = loadScores();
      list.replaceChildren(...scores.map((s) => el("li", { textContent: `${s.score} treats with ${s.dog}`, className: s === highlight ? "new" : "" })));
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
      const scores = loadScores();
      const entry = { score, dog: dog.name };
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      const best = scores.slice(0, 5);
      saveScores(best);
      showScores(best.find((s) => s.score === entry.score && s.dog === entry.dog));
      message.textContent = best[0].score === score && score > 0 ? `New best: ${score} treats! ${dog.name} is very pleased.` : `Game over. ${dog.name} caught ${score} treats.`;
      offerDogs("Play again with");
    }
    function start(chosen) {
      dog = chosen; x = W / 2; score = 0; lives = 3; drops = []; spawnIn = 0; elapsed = 0; target = null; hurtUntil = 0; chewUntil = 0;
      updateHud();
      buttons.replaceChildren();
      scoresBox.hidden = true;
      message.textContent = "Catch the treats. Avoid the chocolate!";
      running = true;
      last = performance.now();
      canvas.focus();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    }
    function loseLife(time) {
      lives -= 1;
      hurtUntil = time + 400;
      updateHud();
      if (lives <= 0) gameOver();
    }
    function step(dt, time) {
      elapsed += dt;
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
          if (drop.kind === "treat") { score += 1; chewUntil = time + 200; updateHud(); }
          else loseLife(time);
          return false;
        }
        if (drop.y > GROUND) {
          if (drop.kind === "treat" && running) loseLife(time);
          return false;
        }
        return true;
      });
    }
    function loop(time) {
      const dt = Math.min(0.05, (time - last) / 1000);
      last = time;
      if (running) step(dt, time);
      render(time);
      if (running) frame = requestAnimationFrame(loop);
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
    dialog.addEventListener("close", () => { running = false; cancelAnimationFrame(frame); dialog.remove(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && running) last = performance.now(); });

    document.body.append(dialog);
    dialog.showModal();
    render(0);
    showScores();
    offerDogs("Play as");
  }

  window.TreatCatch = { open };
})();
