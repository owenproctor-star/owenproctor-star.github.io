// Admin page: edits content.json and publishes the generated pages to GitHub.
(function () {
  const REPO = "owenproctor-star/owenproctor-star.github.io";
  const BRANCH = "main";
  const API = "https://api.github.com";
  const TOKEN_KEY = "site-admin-token";
  const MAX_UPLOAD = 10 * 1024 * 1024;

  const ITEM_FIELDS = [
    { key: "title", label: "Title" },
    { key: "org", label: "Organization" },
    { key: "dates", label: "Dates" },
    { key: "details", label: "Details", type: "textarea" },
    { key: "url", label: "Link", hint: "Optional. Starts with https://" },
  ];

  const PANELS = [
    { title: "Homepage", fields: [
      { key: "headline", label: "Headline", hint: "What you do and who it's for." },
      { key: "subheadline", label: "Supporting sentence", type: "textarea" },
      { key: "ctaLabel", label: "Main button text", hint: "For example: Book a Call" },
      { key: "ctaUrl", label: "Main button link", hint: "Optional, such as a booking page. Leave blank to use your Contact page." },
    ] },
    { title: "Services", fields: [
      { key: "services", type: "list", itemName: "Service", titleKey: "title", fields: [
        { key: "title", label: "Service name", hint: "Also sets the page address, so changing it changes the link." },
        { key: "summary", label: "Short description", hint: "Shown on the service cards." },
        { key: "details", label: "Full description", hint: "Shown on the service's own page. Leave a blank line between paragraphs.", type: "textarea" },
      ] },
    ] },
    { title: "About", fields: [
      { key: "name", label: "Your name" },
      { key: "credentials", label: "Credentials", hint: "For example: PharmD, BCPS" },
      { key: "title", label: "Professional title" },
      { key: "location", label: "Location", hint: "State or area, shown beside your title." },
      { key: "photo", label: "Photo", type: "upload", accept: "image/jpeg,image/png,image/webp" },
      { key: "about", label: "Who am I", hint: "Stays hidden on the site until you write something. Leave a blank line between paragraphs.", type: "textarea" },
      { key: "mission", label: "Mission", type: "textarea" },
      { key: "resume", label: "Résumé PDF", type: "upload", accept: "application/pdf" },
    ] },
    { title: "Credentials and background", fields: [
      { key: "sections", type: "list", itemName: "Section", titleKey: "heading", fields: [
        { key: "heading", label: "Section heading" },
        { key: "items", type: "list", itemName: "Entry", titleKey: "title", fields: ITEM_FIELDS },
      ] },
    ] },
    { title: "Rotating quotes", fields: [
      { key: "quotes", type: "list", itemName: "Quote", titleKey: "author", fields: [
        { key: "text", label: "Quote", type: "textarea" },
        { key: "author", label: "Who said it, and where" },
      ] },
    ] },
    { title: "Sigi and Alfi's random facts", fields: [
      { key: "dogFacts", type: "list", itemName: "Fact", titleKey: "text", fields: [
        { key: "text", label: "Fact", type: "textarea" },
      ] },
    ] },
    { title: "Contact", fields: [
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Business address", hint: "Public, and adds a map. Don't use a home address.", type: "textarea" },
      { key: "hours", label: "Hours", type: "textarea" },
      { key: "linkedin", label: "LinkedIn link" },
      { key: "formEndpoint", label: "Contact form address", hint: "From a form service such as Formspree. Leave blank and the form opens the visitor's email app." },
      { key: "links", type: "list", itemName: "Extra link", titleKey: "label", fields: [
        { key: "label", label: "Label" },
        { key: "url", label: "Link" },
      ] },
    ] },
  ];

  const $ = (id) => document.getElementById(id);
  let token = localStorage.getItem(TOKEN_KEY) || "";
  let data = null;
  let dirty = false;

  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    node.append(...kids.filter((k) => k !== null && k !== undefined));
    return node;
  }

  function setStatus(message, isError) {
    $("status").textContent = message;
    $("status").style.color = isError ? "#ffc9c9" : "";
  }

  function markDirty() {
    dirty = true;
    setStatus("Unpublished changes.");
  }

  async function api(path, options) {
    const response = await fetch(`${API}/repos/${REPO}${path}`, Object.assign({}, options, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
    }));
    if (response.status === 204) return null;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.message || `GitHub returned an error (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  const toBase64 = (bytes) => {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  };
  const fromBase64Utf8 = (text) => new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

  async function uploadFile(file) {
    if (file.size > MAX_UPLOAD) throw new Error("That file is over 10 MB. Please use a smaller one.");
    const clean = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-.]+/, "") || "file";
    const path = `uploads/${clean}`;
    let sha;
    try {
      sha = (await api(`/contents/${path}?ref=${BRANCH}`)).sha;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    const content = toBase64(new Uint8Array(await file.arrayBuffer()));
    await api(`/contents/${path}`, { method: "PUT", body: JSON.stringify({ message: `Upload ${clean}`, content, branch: BRANCH, sha }) });
    return `/${path}`;
  }

  function textField(target, field) {
    const id = `f${Math.random().toString(36).slice(2)}`;
    const control = field.type === "textarea"
      ? el("textarea", { id, value: target[field.key] || "" })
      : el("input", { id, type: "text", value: target[field.key] || "" });
    control.addEventListener("input", () => { target[field.key] = control.value; markDirty(); });
    return [control, el("label", { htmlFor: id }, field.label, field.hint ? el("span", { className: "hint" }, field.hint) : null)];
  }

  function renderField(target, field) {
    if (field.type === "list") return renderList(target, field);
    const [control, label] = textField(target, field);
    const box = el("div", null, label, control);
    if (field.type === "upload") {
      const picker = el("input", { type: "file", accept: field.accept, ariaLabel: `Upload ${field.label}` });
      picker.addEventListener("change", async () => {
        if (!picker.files[0]) return;
        setStatus("Uploading…");
        try {
          control.value = target[field.key] = await uploadFile(picker.files[0]);
          markDirty();
          setStatus("Uploaded. Click Publish to put it on the site.");
        } catch (error) {
          setStatus(error.message, true);
        }
      });
      box.append(picker);
    }
    return box;
  }

  function renderList(target, field) {
    target[field.key] = target[field.key] || [];
    const list = target[field.key];
    const box = el("div");

    function redraw() {
      box.replaceChildren(...list.map((entry, index) => {
        const up = el("button", { type: "button", textContent: "Move up", disabled: index === 0 });
        const down = el("button", { type: "button", textContent: "Move down", disabled: index === list.length - 1 });
        const remove = el("button", { type: "button", textContent: "Remove" });
        const swap = (other) => { [list[index], list[other]] = [list[other], list[index]]; markDirty(); redraw(); };
        up.addEventListener("click", () => swap(index - 1));
        down.addEventListener("click", () => swap(index + 1));
        remove.addEventListener("click", () => { list.splice(index, 1); markDirty(); redraw(); });
        return el("div", { className: "row" },
          el("div", { className: "row-tools" }, el("h3", null, `${field.itemName}: ${entry[field.titleKey] || "new"}`), up, down, remove),
          ...field.fields.map((sub) => renderField(entry, sub)));
      }), addButton);
    }

    const addButton = el("button", { type: "button", className: "add", textContent: `Add ${field.itemName.toLowerCase()}` });
    addButton.addEventListener("click", () => {
      const entry = {};
      field.fields.forEach((sub) => { entry[sub.key] = sub.type === "list" ? [] : ""; });
      list.push(entry);
      markDirty();
      redraw();
    });
    redraw();
    return box;
  }

  function renderApp() {
    $("app").replaceChildren(...PANELS.map((panel) =>
      el("section", { className: "panel" }, el("h2", null, panel.title), ...panel.fields.map((field) => renderField(data, field)))));
    $("signin").hidden = true;
    $("app").hidden = false;
    $("publish").hidden = false;
    $("signout").hidden = false;
  }

  function showSignIn(message) {
    $("app").hidden = true;
    $("publish").hidden = true;
    $("signout").hidden = true;
    $("signin").hidden = false;
    $("signin-error").textContent = message || "";
    const params = new URLSearchParams({
      name: "Website admin", description: "Publishes owenproctor.com from its admin page",
      target_name: REPO.split("/")[0], expires_in: "365", contents: "write",
    });
    $("token-link").href = `https://github.com/settings/personal-access-tokens/new?${params}`;
  }

  async function load() {
    setStatus("Loading…");
    try {
      const repo = await api("");
      if (repo.permissions && !repo.permissions.push) throw Object.assign(new Error("That token can't edit this repository."), { status: 403 });
      const file = await api(`/contents/content.json?ref=${BRANCH}`);
      data = JSON.parse(fromBase64Utf8(file.content));
      renderApp();
      dirty = false;
      setStatus("");
    } catch (error) {
      setStatus("");
      if (error.status === 401 || error.status === 403 || error.status === 404) {
        localStorage.removeItem(TOKEN_KEY);
        token = "";
        showSignIn(error.status === 401 ? "GitHub didn't accept that token. It may have expired, so please create a new one." : `That token can't reach this site's repository. ${error.message}`);
      } else {
        showSignIn(`Couldn't load the site: ${error.message}`);
      }
    }
  }

  function problems() {
    const issues = [];
    if (!(data.name || "").trim()) issues.push("Your name can't be blank.");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) issues.push("The email address doesn't look right.");
    if ((data.services || []).some((s) => !(s.title || "").trim())) issues.push("Every service needs a name.");
    return issues;
  }

  async function publish() {
    const issues = problems();
    if (issues.length) { setStatus(issues.join(" "), true); return; }
    const button = $("publish");
    button.disabled = true;
    setStatus("Publishing…");
    try {
      const files = window.buildSite(data);
      files["content.json"] = `${JSON.stringify(data, null, 2)}\n`;

      const ref = await api(`/git/ref/heads/${BRANCH}`);
      const parent = ref.object.sha;
      const commit = await api(`/git/commits/${parent}`);
      const current = await api(`/git/trees/${commit.tree.sha}?recursive=1`);

      // Remove pages for deleted services, and the old single-page content file.
      const stale = current.tree.filter((entry) => entry.type === "blob"
        && (/^service-.*\.html$/.test(entry.path) || entry.path === "services.html" || entry.path === "content.js")
        && !(entry.path in files));

      const tree = await api("/git/trees", { method: "POST", body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree: [
          ...Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", content })),
          ...stale.map((entry) => ({ path: entry.path, mode: "100644", type: "blob", sha: null })),
        ],
      }) });
      const created = await api("/git/commits", { method: "POST", body: JSON.stringify({ message: "Update site from admin", tree: tree.sha, parents: [parent] }) });
      await api(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: created.sha }) });
      dirty = false;
      setStatus("Published. Your changes should be live in a minute or two.");
    } catch (error) {
      setStatus(`Not published: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  }

  $("signin-form").addEventListener("submit", (event) => {
    event.preventDefault();
    token = $("token").value.trim();
    $("token").value = "";
    localStorage.setItem(TOKEN_KEY, token);
    load();
  });
  $("publish").addEventListener("click", publish);
  $("signout").addEventListener("click", () => {
    if (dirty && !confirm("You have unpublished changes. Sign out anyway?")) return;
    localStorage.removeItem(TOKEN_KEY);
    token = "";
    dirty = false;
    setStatus("");
    showSignIn();
  });
  window.addEventListener("beforeunload", (event) => { if (dirty) event.preventDefault(); });

  if (token) load(); else showSignIn();
})();
