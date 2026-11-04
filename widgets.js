// Rotating quotes and the pixel-art dogs. Their text comes from content.json.
(function () {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    node.append(...kids);
    return node;
  }
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  /* ---------- Quotes ---------- */
  function startQuotes(quotes) {
    const box = document.getElementById("quote-widget");
    if (!box || quotes.length < 2) return;
    const text = box.querySelector("blockquote");
    const author = box.querySelector("figcaption");
    let index = Math.floor(Math.random() * quotes.length);
    let timer = null;
    let paused = reducedMotion;
    let hovering = false;

    function show(step) {
      index = (index + step + quotes.length) % quotes.length;
      box.classList.add("fading");
      setTimeout(() => {
        text.textContent = quotes[index].text;
        author.textContent = quotes[index].author;
        box.classList.remove("fading");
      }, reducedMotion ? 0 : 250);
    }
    function schedule() {
      clearInterval(timer);
      if (!paused && !hovering) timer = setInterval(() => { if (!document.hidden) show(1); }, 9000);
    }
    const pause = el("button", { type: "button", className: "text-button", textContent: paused ? "Play" : "Pause" });
    const next = el("button", { type: "button", className: "text-button", textContent: "Next quote" });
    pause.addEventListener("click", () => {
      paused = !paused;
      pause.textContent = paused ? "Play" : "Pause";
      schedule();
    });
    next.addEventListener("click", () => show(1));
    box.append(el("div", { className: "quote-controls" }, pause, next));
    box.addEventListener("mouseenter", () => { hovering = true; schedule(); });
    box.addEventListener("mouseleave", () => { hovering = false; schedule(); });
    box.addEventListener("focusin", () => { hovering = true; schedule(); });
    box.addEventListener("focusout", () => { hovering = false; schedule(); });
    show(1);
    schedule();
  }

  /* ---------- Dogs ---------- */
  const SCALE = 3;
  const INK = "#17120f";
  const WHITE = "#fbf8f2";
  const TONGUE = "#e8758a";
  const PINK = "#e5b3a4";

  function drawAlfi(r, s) {
    const T = "#d9a86f", D = "#b88750", C = "#f3e9d7";
    // tail
    if (s.wag) { r(T, 23, 21, 4, 2); r(T, 26, 19, 2, 2); r(T, 27, 17, 2, 2); }
    else { r(T, 23, 21, 4, 2); r(T, 27, 21, 2, 2); r(T, 28, 19, 2, 2); }
    // round body and legs
    r(T, 7, 14, 16, 1); r(T, 5, 15, 20, 8); r(D, 21, 17, 4, 5); r(C, 10, 15, 8, 8);
    r(T, 5, 22, 5, 3); r(T, 18, 22, 6, 3); r(C, 5, 24, 5, 1); r(C, 19, 24, 5, 1);
    r(C, 10, 22, 3, 3); r(C, 15, 22, 3, 3); r(D, 13, 22, 2, 3);
    // ears: one out to the side, one up
    r(T, 1, 1, 3, 2); r(T, 2, 3, 6, 2); r(T, 4, 5, 4, 3); r(PINK, 3, 3, 3, 2); r(PINK, 5, 5, 2, 1);
    r(T, 21, 0, 3, 2); r(T, 20, 2, 5, 3); r(T, 20, 5, 3, 2); r(PINK, 21, 2, 2, 3);
    // head
    r(T, 8, 3, 13, 1); r(T, 7, 4, 15, 10); r(T, 8, 14, 13, 2);
    r(C, 9, 7, 4, 3); r(C, 16, 7, 4, 3); r(C, 11, 10, 7, 6); r(C, 13, 6, 3, 4);
    // eyes
    if (s.happy) { r(INK, 9, 9, 1, 1); r(INK, 10, 8, 2, 1); r(INK, 12, 9, 1, 1); r(INK, 16, 9, 1, 1); r(INK, 17, 8, 2, 1); r(INK, 19, 9, 1, 1); }
    else if (s.blink) { r(INK, 10, 9, 3, 1); r(INK, 16, 9, 3, 1); }
    else { r(INK, 10, 8, 3, 3); r(INK, 16, 8, 3, 3); r(WHITE, 10, 8, 1, 1); r(WHITE, 16, 8, 1, 1); }
    // nose, mouth, little tongue
    r("#5b3d36", 13, 11, 3, 2);
    if (s.chew) { r(D, 13, 14, 3, 2); }
    else { r(D, 12, 14, 5, 1); r(TONGUE, 15, 15, 2, 2); }
  }

  function drawSigi(r, s) {
    const K = "#1b1b1f", G = "#39393f", H = "#7f8c9a", W = WHITE;
    // raised tail with a white tip
    const x = s.wag ? 1 : 0;
    r(K, 22 + x, 15, 3, 7); r(K, 23 + x * 2, 10, 3, 6); r(W, 24 + x * 2, 7, 2, 3);
    // body
    r(K, 9, 20, 16, 8); r(G, 18, 21, 5, 2);
    // back leg
    r(K, 21, 28, 3, 3); r(W, 21, 31, 3, 5);
    // white chest and front legs
    r(W, 8, 19, 11, 10); r(W, 9, 29, 3, 7); r(W, 15, 29, 3, 7);
    // harness
    r(H, 8, 21, 11, 2); r(H, 12, 23, 3, 4); r(K, 13, 24, 1, 2); r("#5d4a8a", 9, 19, 9, 1);
    // tall ears
    r(K, 7, 2, 2, 2); r(K, 7, 4, 4, 5); r(K, 18, 2, 2, 2); r(K, 16, 4, 4, 5); r(PINK, 8, 5, 1, 3); r(PINK, 18, 5, 1, 3);
    // head with white blaze
    r(K, 8, 8, 11, 1); r(K, 7, 9, 13, 7); r(K, 8, 16, 11, 2);
    r(W, 13, 8, 2, 6); r(W, 10, 13, 8, 5); r(W, 12, 11, 4, 2);
    // eyes
    const eye = "#7a5230";
    if (s.happy) { r(W, 9, 11, 1, 1); r(W, 10, 10, 2, 1); r(W, 16, 10, 2, 1); r(W, 18, 11, 1, 1); }
    else if (s.blink) { r(G, 9, 11, 3, 1); r(G, 16, 11, 3, 1); }
    else { r(eye, 9, 10, 3, 2); r(eye, 16, 10, 3, 2); r(WHITE, 9, 10, 1, 1); r(WHITE, 16, 10, 1, 1); }
    // nose and mouth
    r(K, 13, 13, 2, 2);
    if (s.chew) { r(G, 12, 16, 4, 1); }
    else { r(G, 11, 16, 6, 1); r(TONGUE, 13, 17, 2, 1); }
  }

  const DOGS = [
    { name: "Sigi", width: 28, height: 36, draw: drawSigi },
    { name: "Alfi", width: 30, height: 26, draw: drawAlfi },
  ];

  const PET_LINES = ["{name} leans in for more.", "{name}'s tail is going wild.", "Best. Pets. Ever, says {name}."];
  const TREAT_LINES = ["{name} says thank you, very politely.", "Gone in one bite. {name} checks for another.", "{name} approves of this website."];
  const FALLBACK_FACTS = ["Alfi is the chihuahua. Sigi is the black and white one."];
  const TREATS_TO_UNLOCK = 3;

  // Small localStorage helper that keeps working in private browsing.
  const memory = {};
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (error) {
      if (value === undefined) return memory[key];
      memory[key] = value;
    }
    return value;
  }

  function drawBone(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#c9a26b";
    [[0, 0, 2, 2], [0, 3, 2, 2], [8, 0, 2, 2], [8, 3, 2, 2]].forEach((b) => ctx.fillRect(...b));
    ctx.fillStyle = "#f3e9d7";
    [[1, 1, 8, 3], [0, 1, 2, 1], [0, 3, 2, 1], [8, 1, 2, 1], [8, 3, 2, 1]].forEach((b) => ctx.fillRect(...b));
  }

  function startDogs(factsFromSite) {
    const facts = factsFromSite.length ? factsFromSite : FALLBACK_FACTS;
    const pack = el("div", { className: "dog-row" });
    const showButton = el("button", { type: "button", className: "dog-pill", textContent: "Bring back Sigi and Alfi", hidden: true });
    const hideButton = el("button", { type: "button", className: "dog-pill dog-hide", textContent: "Hide dogs" });
    const message = el("p", { className: "dog-message" });
    const petButton = el("button", { type: "button", textContent: "Pet" });
    const treatButton = el("button", { type: "button", textContent: "Give a treat" });
    const factButton = el("button", { type: "button", textContent: "Another fact" });
    const gameButton = el("button", { type: "button", className: "dog-game", textContent: "Play Treat Catch", hidden: true });
    const closeButton = el("button", { type: "button", textContent: "Close" });
    const bubble = el("div", { className: "dog-bubble", hidden: true, role: "status" },
      message, el("div", { className: "dog-actions" }, petButton, treatButton, factButton, gameButton, closeButton));
    const root = el("aside", { className: "dogs", ariaLabel: "Sigi and Alfi, the virtual dogs" }, bubble, hideButton, pack, showButton);
    let current = null;

    const pets = DOGS.map((dog) => {
      const canvas = el("canvas", { width: dog.width, height: dog.height });
      canvas.style.width = `${dog.width * SCALE}px`;
      canvas.style.height = `${dog.height * SCALE}px`;
      const button = el("button", { type: "button", className: "dog", ariaLabel: `${dog.name}. Click for a random fact, pets and treats.`, title: dog.name }, canvas);
      const state = { wag: false, blink: false, happy: false, chew: false };
      const ctx = canvas.getContext("2d");
      const paint = () => {
        ctx.clearRect(0, 0, dog.width, dog.height);
        dog.draw((color, x, y, w, h) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }, state);
      };
      const pet = { dog, button, state, paint, excitedUntil: 0 };
      button.addEventListener("click", () => { select(pet); say(pick(facts)); });
      pack.append(button);
      paint();
      return pet;
    });

    function select(pet) { current = pet; bubble.hidden = false; }
    function say(text) { message.textContent = text.replace(/\{name\}/g, current.dog.name); }

    function excite(pet, key, ms) {
      pet.state[key] = true;
      pet.excitedUntil = Date.now() + ms;
      pet.paint();
      pet.button.classList.add("hop");
      setTimeout(() => { pet.state[key] = false; pet.button.classList.remove("hop"); pet.paint(); }, ms);
    }

    function floatUp(pet, node) {
      const rect = pet.button.getBoundingClientRect();
      const box = root.getBoundingClientRect();
      node.style.left = `${rect.left - box.left + rect.width / 2 - 8}px`;
      node.style.bottom = `${box.bottom - rect.top - 6}px`;
      root.append(node);
      setTimeout(() => node.remove(), 1300);
    }

    petButton.addEventListener("click", () => {
      excite(current, "happy", 1600);
      for (let i = 0; i < 3; i += 1) {
        const heart = el("span", { className: "dog-heart", textContent: "♥", ariaHidden: "true" });
        heart.style.animationDelay = `${i * 140}ms`;
        heart.style.marginLeft = `${(i - 1) * 14}px`;
        floatUp(current, heart);
      }
      say(pick(PET_LINES));
    });
    treatButton.addEventListener("click", () => {
      const bone = el("canvas", { width: 10, height: 5, className: "dog-bone", ariaHidden: "true" });
      drawBone(bone);
      floatUp(current, bone);
      const pet = current;
      setTimeout(() => excite(pet, "chew", 1100), reducedMotion ? 0 : 600);
      say(pick(TREAT_LINES));
      // Three treats unlock the hidden game, and it stays unlocked.
      const count = Number(store("dog-treats")) + 1;
      store("dog-treats", count);
      if (count === TREATS_TO_UNLOCK) say("All those treats woke something up… you found the secret game!");
      refreshGameButton();
    });
    gameButton.addEventListener("click", () => {
      bubble.hidden = true;
      const launch = () => window.TreatCatch.open(DOGS);
      if (window.TreatCatch) { launch(); return; }
      const script = el("script", { src: "/game.js" });
      script.onload = launch;
      document.head.append(script);
    });
    function refreshGameButton() { gameButton.hidden = Number(store("dog-treats")) < TREATS_TO_UNLOCK; }
    refreshGameButton();
    factButton.addEventListener("click", () => say(pick(facts)));
    closeButton.addEventListener("click", () => { bubble.hidden = true; });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") bubble.hidden = true; });

    function setHidden(hidden) {
      pack.hidden = hidden;
      hideButton.hidden = hidden;
      showButton.hidden = !hidden;
      if (hidden) bubble.hidden = true;
      document.body.classList.toggle("dogs-away", hidden);
      store("dogs-hidden", hidden ? "1" : "");
    }
    hideButton.addEventListener("click", () => setHidden(true));
    showButton.addEventListener("click", () => setHidden(false));

    document.body.append(root);
    document.body.classList.add("has-dogs");
    setHidden(store("dogs-hidden") === "1");

    if (reducedMotion) return;
    let tick = 0;
    setInterval(() => {
      if (document.hidden || pack.hidden) return;
      tick += 1;
      pets.forEach((pet, index) => {
        const excited = Date.now() < pet.excitedUntil;
        // Each dog wags in short bursts, faster when excited.
        const wagging = excited || Math.floor((tick + index * 7) / 12) % 2 === 0;
        pet.state.wag = wagging ? !pet.state.wag : false;
        pet.state.blink = !excited && Math.random() < 0.04;
        pet.paint();
      });
    }, 280);
  }

  fetch("/content.json").then((response) => response.json()).catch(() => ({})).then((site) => {
    startQuotes((site.quotes || []).filter((q) => q.text));
    startDogs((site.dogFacts || []).map((f) => f.text).filter(Boolean));
  });
})();
