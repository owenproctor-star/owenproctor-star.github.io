// Turns content.json into the site's pages. The admin page runs this on Publish.
(function () {
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Only allow web, email, phone and on-site links.
  const url = (value) => {
    const v = String(value || "").trim();
    return /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(v) ? esc(v) : "#";
  };

  const paragraphs = (text) => String(text || "").trim().split(/\n\s*\n/).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n");

  const firstParagraph = (text) => String(text || "").trim().split(/\n\s*\n/)[0] || "";

  const slugify = (text) => String(text || "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "service";

  // Gives each service a unique page address based on its title.
  function withSlugs(services) {
    const used = {};
    return (services || []).filter((s) => s.title && s.title.trim()).map((s) => {
      const base = slugify(s.title);
      used[base] = (used[base] || 0) + 1;
      return Object.assign({}, s, { slug: used[base] > 1 ? `${base}-${used[base]}` : base });
    });
  }

  const roleLine = (s) => [s.title, s.location].filter(Boolean).join(" · ");
  const ctaHref = (s) => (s.ctaUrl && s.ctaUrl.trim() ? url(s.ctaUrl) : "/contact");
  const ctaLabel = (s) => esc(s.ctaLabel || "Get in touch");
  const ctaButton = (s) => `<a class="button" href="${ctaHref(s)}">${ctaLabel(s)}</a>`;

  const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%231c1f23'/%3E%3Ctext x='16' y='22' font-family='Arial,sans-serif' font-size='14' font-weight='700' text-anchor='middle' fill='%23efece6'%3EOP%3C/text%3E%3C/svg%3E";

  function page(s, services, { path, title, description, active, body, jsonLd, script }) {
    const base = String(s.siteUrl || "").replace(/\/+$/, "");
    const canonical = base + path;
    const nav = [
      services.length && ["/services", "Services", "services"],
      ["/about", "About", "about"],
      ["/contact", "Contact", "contact"],
    ].filter(Boolean).map(([href, label, key]) =>
      `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a>`).join("");
    const footerLinks = [
      s.email && `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`,
      s.linkedin && `<a href="${url(s.linkedin)}">LinkedIn</a>`,
      ...(s.links || []).filter((l) => l.label && l.url).map((l) => `<a href="${url(l.url)}">${esc(l.label)}</a>`),
    ].filter(Boolean).join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#efece6">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${s.photo ? `<meta property="og:image" content="${esc(s.photo.startsWith("/") ? base + s.photo : s.photo)}">\n` : ""}<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="/style.css">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n` : ""}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="/"${path === "/" ? ' aria-current="page"' : ""}>Home</a>
    <nav aria-label="Main">${nav}<a class="button button-small" href="${ctaHref(s)}">${ctaLabel(s)}</a></nav>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-row">
    <span>© ${esc(s.name)}</span>
    ${footerLinks}
    <span class="credit">Background: <a href="https://commons.wikimedia.org/wiki/File:Denver_Colorado_Skyline_at_Rocky_Mountain_Arsenal_(53658444917).jpg">Denver skyline</a> by Tony Webster, <a href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, resized</span>
  </div>
</footer>
${script ? `<script>${script}</script>\n` : ""}<script src="/widgets.js" defer></script>
</body>
</html>
`;
  }

  const ctaBand = (s) => `<section class="band">
  <h2>Let's talk</h2>
  ${ctaButton(s)}
</section>`;

  function home(s, services) {
    const cards = services.length ? `<section>
  <h2 class="label">Services</h2>
  <div class="cards">
${services.map((v) => `    <a class="card" href="/service-${v.slug}">
      <h3>${esc(v.title)}</h3>
      ${v.summary ? `<p>${esc(v.summary)}</p>` : ""}
    </a>`).join("\n")}
  </div>
</section>` : "";
    const firstQuote = (s.quotes || []).find((q) => q.text);
    const quote = firstQuote ? `<figure class="quote" id="quote-widget">
  <blockquote>${esc(firstQuote.text)}</blockquote>
  <figcaption>${esc(firstQuote.author)}</figcaption>
</figure>` : "";
    const aboutTeaser = s.about && s.about.trim() ? `<section>
  <h2 class="label">Who Am I</h2>
  ${paragraphs(firstParagraph(s.about))}
  <p><a href="/about">More about ${esc(s.name)}</a></p>
</section>` : "";
    return `<section class="hero">
  ${s.photo ? `<img class="photo" src="${url(s.photo)}" alt="${esc(s.name)}">` : ""}
  <p class="eyebrow">${esc(s.name)}${s.credentials ? `, ${esc(s.credentials)}` : ""}</p>
  <h1>${esc(s.headline || roleLine(s) || s.name)}</h1>
  ${s.subheadline ? `<p class="lead">${esc(s.subheadline)}</p>` : ""}
  <p class="actions">${ctaButton(s)}</p>
</section>
${quote}
${cards}
${aboutTeaser}`;
  }

  function servicesPage(services) {
    return `<h1>Services</h1>
<div class="cards">
${services.map((v) => `  <a class="card" href="/service-${v.slug}">
    <h2>${esc(v.title)}</h2>
    ${v.summary ? `<p>${esc(v.summary)}</p>` : ""}
  </a>`).join("\n")}
</div>`;
  }

  function servicePage(s, v) {
    return `<article class="prose">
  <p class="eyebrow"><a href="/services">Services</a></p>
  <h1>${esc(v.title)}</h1>
  ${v.summary ? `<p class="lead">${esc(v.summary)}</p>` : ""}
  ${paragraphs(v.details)}
</article>
${ctaBand(s)}`;
  }

  function item(entry) {
    const title = entry.url && entry.title ? `<a href="${url(entry.url)}">${esc(entry.title)}</a>` : esc(entry.title);
    return `<li>
      <div class="item-head">${title ? `<div class="item-title">${title}</div>` : ""}${entry.dates ? `<div class="muted">${esc(entry.dates)}</div>` : ""}</div>
      ${entry.org ? `<div class="muted">${esc(entry.org)}</div>` : ""}
      ${entry.details ? `<p>${esc(entry.details)}</p>` : ""}
    </li>`;
  }

  function aboutPage(s) {
    const sections = (s.sections || []).filter((x) => x.heading && (x.items || []).length).map((x) => `<section class="split">
  <h2 class="label">${esc(x.heading)}</h2>
  <ul class="items">
    ${x.items.map(item).join("\n    ")}
  </ul>
</section>`).join("\n");
    return `<div class="prose">
  ${s.photo ? `<img class="photo" src="${url(s.photo)}" alt="${esc(s.name)}">` : ""}
  <h1>About ${esc(s.name)}${s.credentials ? `<span class="credentials">${esc(s.credentials)}</span>` : ""}</h1>
  ${roleLine(s) ? `<p class="lead">${esc(roleLine(s))}</p>` : ""}
</div>
${s.about && s.about.trim() ? `<section class="split">
  <h2 class="label">Who Am I</h2>
  <div>${paragraphs(s.about)}</div>
</section>` : ""}
${s.mission && s.mission.trim() ? `<section class="split">
  <h2 class="label">Mission</h2>
  <div>${paragraphs(s.mission)}</div>
</section>` : ""}
${sections}
${s.resume ? `<p class="actions"><a href="${url(s.resume)}">Download résumé</a></p>` : ""}`;
  }

  function contactPage(s) {
    const endpoint = s.formEndpoint && s.formEndpoint.trim();
    const details = [
      s.email && `<dt>Email</dt><dd><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></dd>`,
      s.phone && `<dt>Phone</dt><dd><a href="tel:${esc(s.phone.replace(/[^\d+]/g, ""))}">${esc(s.phone)}</a></dd>`,
      s.address && `<dt>Location</dt><dd>${esc(s.address).replace(/\n/g, "<br>")}</dd>`,
      s.hours && `<dt>Hours</dt><dd>${esc(s.hours).replace(/\n/g, "<br>")}</dd>`,
      s.linkedin && `<dt>LinkedIn</dt><dd><a href="${url(s.linkedin)}">View profile</a></dd>`,
      ...(s.links || []).filter((l) => l.label && l.url).map((l) => `<dt>${esc(l.label)}</dt><dd><a href="${url(l.url)}">Open link</a></dd>`),
    ].filter(Boolean).join("\n      ");
    const map = s.address && s.address.trim() ? `<iframe class="map" title="Map of ${esc(s.address.replace(/\n/g, ", "))}" loading="lazy" referrerpolicy="no-referrer" src="https://www.google.com/maps?q=${encodeURIComponent(s.address.replace(/\n/g, ", "))}&amp;output=embed"></iframe>` : "";
    return `<h1>Contact</h1>
<div class="contact-grid">
  <form id="contact-form" class="form"${endpoint ? ` action="${url(endpoint)}" method="POST"` : ` data-email="${esc(s.email)}"`}>
    <label>Your name<input name="name" autocomplete="name" required></label>
    <label>Your email<input name="email" type="email" autocomplete="email" required></label>
    <label>Message<textarea name="message" rows="6" required></textarea></label>
    <input class="trap" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="note">Please don't include medical details or other health information.${endpoint ? "" : " Sending opens your email app with this message filled in."}</p>
    <button class="button" type="submit">Send message</button>
  </form>
  <div>
    <dl class="details">
      ${details}
    </dl>
    ${map}
  </div>
</div>`;
  }

  // Without a form service, the form hands the message to the visitor's email app.
  const MAILTO_SCRIPT = `document.getElementById("contact-form").addEventListener("submit",function(e){var f=e.target;if(!f.dataset.email)return;e.preventDefault();var b=f.elements.message.value+"\\n\\n"+f.elements.name.value+"\\n"+f.elements.email.value;location.href="mailto:"+f.dataset.email+"?subject="+encodeURIComponent("Website message from "+f.elements.name.value)+"&body="+encodeURIComponent(b);});`;

  // Returns { "file-name": "file contents" } for every generated file.
  function buildSite(s) {
    const services = withSlugs(s.services);
    const base = String(s.siteUrl || "").replace(/\/+$/, "");
    const suffix = roleLine(s) ? `${s.name} | ${roleLine(s).replace(" · ", ", ")}` : s.name;
    const defaultDescription = s.subheadline || [s.name, s.title].filter(Boolean).join(", ") + (s.location ? ` in ${s.location}.` : ".");
    const sameAs = [s.linkedin, ...(s.links || []).map((l) => l.url)].filter((v) => /^https?:/i.test(v || ""));
    const files = {};
    const paths = ["/"];

    files["index.html"] = page(s, services, {
      path: "/", title: suffix, description: defaultDescription, body: home(s, services),
      jsonLd: { "@context": "https://schema.org", "@type": "Person", name: s.name, jobTitle: s.title, url: base + "/", email: s.email ? `mailto:${s.email}` : undefined, sameAs },
    });
    files["about.html"] = page(s, services, {
      path: "/about", active: "about", title: `About | ${s.name}`,
      description: firstParagraph(s.about).slice(0, 160) || defaultDescription, body: aboutPage(s),
    });
    files["contact.html"] = page(s, services, {
      path: "/contact", active: "contact", title: `Contact | ${s.name}`,
      description: `Contact ${s.name}.`, body: contactPage(s), script: s.formEndpoint && s.formEndpoint.trim() ? "" : MAILTO_SCRIPT,
    });
    paths.push("/about", "/contact");

    if (services.length) {
      files["services.html"] = page(s, services, {
        path: "/services", active: "services", title: `Services | ${s.name}`,
        description: `Services offered by ${s.name}: ${services.map((v) => v.title).join(", ")}.`.slice(0, 160), body: servicesPage(services),
      });
      paths.push("/services");
      services.forEach((v) => {
        const path = `/service-${v.slug}`;
        files[`service-${v.slug}.html`] = page(s, services, {
          path, active: "services", title: `${v.title} | ${s.name}`,
          description: (v.summary || firstParagraph(v.details) || `${v.title} from ${s.name}.`).slice(0, 160), body: servicePage(s, v),
        });
        paths.push(path);
      });
    }

    files["sitemap.xml"] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${esc(base + p)}</loc></url>`).join("\n")}
</urlset>
`;
    files["robots.txt"] = `User-agent: *\nDisallow: /admin\nSitemap: ${base}/sitemap.xml\n`;
    return files;
  }

  window.buildSite = buildSite;
})();
