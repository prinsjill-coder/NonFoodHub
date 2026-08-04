(function () {
  const body = document.body;
  const base = body.dataset.base || ".";
  const currentPage = body.dataset.page || "home";

  const href = (path) => `${base}/${path}`.replace("//", "/");
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function hashSlug(value) {
    return encodeURIComponent(String(value || ""));
  }

  function selectedHashSlug() {
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return "";

    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  function itemBySlug(items, slug) {
    if (!slug) return null;
    return items.find((item) => item?.slug === slug) || items.find((item) => slug.startsWith(`${item?.slug}-`)) || null;
  }

  function toggleElement(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function scrollToHashTarget() {
    const slug = selectedHashSlug();
    if (!slug) return;
    window.requestAnimationFrame(() => {
      document.getElementById(slug)?.scrollIntoView({ block: "start" });
    });
  }

  function renderDetailBreadcrumb(items) {
    return `
      <nav class="detail-breadcrumb" aria-label="Breadcrumb">
        ${items
          .map((item, index) => {
            const isLast = index === items.length - 1;
            if (isLast || !item.href) return `<span aria-current="page">${escapeHtml(item.label)}</span>`;
            return `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a><span>/</span>`;
          })
          .join("")}
      </nav>
    `;
  }

  function renderDetailEmptyState(title, message, backHref, backLabel) {
    return `
      <article class="contact-card fade-in">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(message)}</p>
        <div class="section-actions detail-actions">
          <a class="btn btn-secondary" href="${escapeHtml(backHref)}">${escapeHtml(backLabel)}</a>
        </div>
      </article>
    `;
  }

  if (selectedHashSlug()) {
    body.classList.add("is-detail-route");
  }

  const links = [
    { id: "home", title: "Home", path: "index.html", description: "Startpunt voor de Non-Food Hub" },
    { id: "leveranciers", title: "Leveranciers", path: "pages/leveranciers.html", description: "Partners, merken en productgroepen" },
    { id: "brochures", title: "Brochures en catalogi", path: "pages/brochures-catalogi.html", description: "Collecties en catalogusoverzicht" },
    { id: "showroom", title: "Virtuele Showroom", path: "pages/virtuele-showroom.html", description: "Digitale rondleiding en showroomafspraken" },
    { id: "inspiratie", title: "Inspiratie", path: "pages/inspiratie.html", description: "Trends, kennisbank en praktische inspiratie" },
    { id: "nieuw", title: "Nieuw", path: "pages/nieuw.html", description: "Nieuw binnen Non-Food" },
    { id: "aanbiedingen", title: "Aanbiedingen", path: "pages/aanbiedingen.html", description: "Actuele non-food deals" },
    { id: "personalisatie", title: "Logo's & Personalisatie", path: "pages/logos-personalisatie.html", description: "Glaswerk, servies en kleding met eigen logo" },
    { id: "bibliotheek", title: "Bibliotheek", path: "pages/bibliotheek.html", description: "Servies leasen zonder grote investering" },
    { id: "terras", title: "Terras & Outdoor", path: "pages/terras-outdoor.html", description: "Outdoor dining, comfort en presentatie" },
    { id: "droogijs", title: "Droogijs Shop", path: "pages/droogijs.html", description: "Droogijs bestellen of informatie aanvragen" },
    { id: "contact", title: "Contact", path: "pages/contact.html", description: "Non-food advies, showroom en support" }
  ];

  const navGroups = [
    {
      title: "Ontdek",
      items: ["leveranciers", "brochures", "showroom", "inspiratie"]
    },
    {
      title: "Actueel",
      items: ["nieuw", "aanbiedingen", "terras", "droogijs"]
    },
    {
      title: "Services",
      items: ["personalisatie", "bibliotheek", "contact"]
    }
  ];

  function linkById(id) {
    return links.find((link) => link.id === id);
  }

  function renderHeader() {
    const mount = document.querySelector("[data-site-header]");
    if (!mount) return;

    const activeClass = (id) => (currentPage === id ? "is-active" : "");
    const currentAttribute = (id) => (currentPage === id ? ' aria-current="page"' : "");

    const dropdowns = navGroups.map((group) => {
      const items = group.items.map((id) => {
        const link = linkById(id);
        return `
          <li>
            <a href="${href(link.path)}" class="${activeClass(link.id)}"${currentAttribute(link.id)}>
              ${link.title}
              <span>${link.description}</span>
            </a>
          </li>
        `;
      }).join("");

      return `
        <li class="dropdown">
          <button class="dropdown-toggle" type="button" aria-haspopup="true" aria-expanded="false">${group.title}</button>
          <ul class="dropdown-menu">${items}</ul>
        </li>
      `;
    }).join("");

    const mobileLinks = links.map((link) => `
      <a href="${href(link.path)}" class="${activeClass(link.id)}"${currentAttribute(link.id)}>
        ${link.title}
        <small>${link.description}</small>
      </a>
    `).join("");

    mount.outerHTML = `
      <header class="site-header">
        <div class="container header-inner">
          <a class="brand" href="${href("index.html")}" aria-label="Non-Food Hub home">
            <span class="brand-mark">B</span>
            <span class="brand-text">
              <span class="brand-title">Non-Food Hub</span>
              <span class="brand-subtitle">Inspiratieomgeving</span>
            </span>
          </a>
          <nav class="desktop-nav" aria-label="Hoofdnavigatie">
            <ul class="nav-list">
              <li><a class="nav-link ${activeClass("home")}" href="${href("index.html")}"${currentAttribute("home")}>Home</a></li>
              ${dropdowns}
            </ul>
          </nav>
          <div class="header-actions">
            <button class="icon-button search-trigger" type="button" aria-label="Zoeken" aria-controls="site-search-overlay" aria-expanded="false">
              <span class="icon-search" aria-hidden="true"></span>
            </button>
            <a class="btn btn-primary" href="${href("pages/contact.html")}">Advies aanvragen</a>
            <button class="nav-toggle" type="button" aria-label="Menu openen" aria-controls="mobile-navigation" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>
      <nav class="mobile-panel" id="mobile-navigation" aria-label="Mobiele navigatie" aria-hidden="true">${mobileLinks}</nav>
      <div class="search-overlay" id="site-search-overlay" role="dialog" aria-modal="true" aria-label="Zoeken">
        <div class="search-dialog">
          <div class="search-head">
            <input type="search" id="site-search" aria-label="Zoeken binnen de Non-Food Hub" placeholder="Zoek op brochures, terras, showroom of personalisatie" autocomplete="off">
            <button class="search-close" type="button" aria-label="Zoeken sluiten">×</button>
          </div>
          <div class="search-results" id="search-results"></div>
        </div>
      </div>
    `;
  }

  function renderFooter() {
    const mount = document.querySelector("[data-site-footer]");
    if (!mount) return;

    mount.outerHTML = `
      <footer class="site-footer">
        <div class="container footer-inner">
          <div>
            <h3>Non-Food Hub</h3>
            <p>Een centrale inspiratieomgeving voor servies, glaswerk, buffetpresentatie, showroomadvies en non-food concepten.</p>
          </div>
          <div>
            <h4>Ontdek</h4>
            <ul class="footer-links">
              <li><a href="${href("pages/leveranciers.html")}">Leveranciers</a></li>
              <li><a href="${href("pages/brochures-catalogi.html")}">Brochures</a></li>
              <li><a href="${href("pages/virtuele-showroom.html")}">Showroom</a></li>
            </ul>
          </div>
          <div>
            <h4>Inspiratie</h4>
            <ul class="footer-links">
              <li><a href="${href("pages/inspiratie.html")}">Inspiratie</a></li>
              <li><a href="${href("pages/terras-outdoor.html")}">Terras & Outdoor</a></li>
              <li><a href="${href("pages/bibliotheek.html")}">Bibliotheek</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul class="footer-links">
              <li><a href="tel:+31135812712">013-5812712</a></li>
              <li><a href="mailto:nonfood@bidfood.nl">nonfood@bidfood.nl</a></li>
              <li><a href="https://wa.me/31135812712" target="_blank" rel="noreferrer">WhatsApp</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="container">Non-Food Hub brengt inspiratie, leveranciers en collecties samen voor professionele horeca.</div>
        </div>
      </footer>
    `;
  }

  function setupNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const panel = document.querySelector("#mobile-navigation");

    function setNavigationOpen(isOpen) {
      body.classList.toggle("nav-open", isOpen);
      if (toggle) {
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.setAttribute("aria-label", isOpen ? "Menu sluiten" : "Menu openen");
      }
      if (panel) panel.setAttribute("aria-hidden", String(!isOpen));
    }

    if (toggle) {
      toggle.addEventListener("click", () => {
        setNavigationOpen(!body.classList.contains("nav-open"));
      });
    }

    document.querySelectorAll(".mobile-panel a").forEach((link) => {
      link.addEventListener("click", () => {
        setNavigationOpen(false);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setNavigationOpen(false);
    });

    document.querySelectorAll(".dropdown").forEach((dropdown) => {
      const button = dropdown.querySelector(".dropdown-toggle");
      if (!button) return;
      const setExpanded = (expanded) => button.setAttribute("aria-expanded", String(expanded));

      dropdown.addEventListener("mouseenter", () => setExpanded(true));
      dropdown.addEventListener("mouseleave", () => setExpanded(false));
      dropdown.addEventListener("focusin", () => setExpanded(true));
      dropdown.addEventListener("focusout", (event) => {
        if (!event.relatedTarget || !dropdown.contains(event.relatedTarget)) setExpanded(false);
      });
    });
  }

  function setupSearch() {
    const openButtons = document.querySelectorAll(".search-trigger");
    const closeButton = document.querySelector(".search-close");
    const input = document.querySelector("#site-search");
    const results = document.querySelector("#search-results");
    if (!input || !results) return;

    function renderResults(query) {
      const normalized = query.trim().toLowerCase();
      const matched = links.filter((link) => {
        const haystack = `${link.title} ${link.description}`.toLowerCase();
        return !normalized || haystack.includes(normalized);
      }).slice(0, 8);

      results.innerHTML = matched.map((link) => `
        <a class="search-result" href="${href(link.path)}">
          <strong>${link.title}</strong>
          <span>${link.description}</span>
        </a>
      `).join("");
    }

    function setSearchExpanded(expanded) {
      openButtons.forEach((button) => button.setAttribute("aria-expanded", String(expanded)));
    }

    function openSearch() {
      body.classList.add("search-open");
      setSearchExpanded(true);
      renderResults("");
      window.setTimeout(() => input.focus(), 30);
    }

    function closeSearch() {
      body.classList.remove("search-open");
      setSearchExpanded(false);
      input.value = "";
    }

    openButtons.forEach((button) => button.addEventListener("click", openSearch));
    closeButton.addEventListener("click", closeSearch);
    input.addEventListener("input", () => renderResults(input.value));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    });
  }

  function setupFilters() {
    const filterBars = document.querySelectorAll("[data-filter-bar]");
    filterBars.forEach((bar) => {
      const scope = document.querySelector(bar.dataset.filterBar);
      if (!scope) return;

      bar.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;
        const filter = button.dataset.filter.toLowerCase();
        const cards = Array.from(scope.querySelectorAll("[data-categories]"));

        bar.querySelectorAll("[data-filter]").forEach((item) => {
          item.classList.remove("is-active");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-active");
        button.setAttribute("aria-pressed", "true");

        cards.forEach((card) => {
          const categories = card.dataset.categories.toLowerCase();
          const visible = filter === "all" || categories.includes(filter);
          card.classList.toggle("is-hidden", !visible);
        });
      });

      bar.querySelectorAll("[data-filter]").forEach((button) => {
        button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
      });
    });
  }

  function publicItems(data) {
    return Array.isArray(data?.items) ? data.items : [];
  }

  function featuredItems(items, limit = 3) {
    return Array.isArray(items) ? items.slice(0, limit) : [];
  }

  function renderHomepageEmptyState(title, message) {
    return `
      <article class="contact-card fade-in">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
      </article>
    `;
  }

  function formatCount(count, singular, plural) {
    const total = Number(count || 0);
    return `${total} ${total === 1 ? singular : plural} beschikbaar`;
  }

  function updateHomepageCount(type, count, singular, plural) {
    const target = document.querySelector(`[data-home-count="${type}"]`);
    if (!target) return;
    target.textContent = formatCount(count, singular, plural);
  }

  async function fetchPublicItems(path, label) {
    const response = await fetch(href(path), { cache: "no-store" });
    if (!response.ok) throw new Error(`${label} kon niet worden geladen.`);

    const data = await response.json();
    return publicItems(data);
  }

  function publicArticleImage(article) {
    return article.heroImage ? href(article.heroImage) : href("assets/images/inspiration.png");
  }

  function articleSuppliers(article) {
    return Array.isArray(article.suppliers) ? article.suppliers.filter((supplier) => supplier?.name) : [];
  }

  function publicArticleSupplierMeta(article) {
    const supplier = articleSuppliers(article)[0];
    return supplier ? `<span class="tag sky">Door ${escapeHtml(supplier.name)}</span>` : "";
  }

  function supplierPageLink(supplier) {
    return `${href("pages/leveranciers.html")}#${hashSlug(supplier.slug)}`;
  }

  function articlePageLink(article) {
    return `${href("pages/inspiratie.html")}#${hashSlug(article.slug)}`;
  }

  function renderPublicArticleCard(article, options = {}) {
    const cardLink = options.linkToArticlePage ? articlePageLink(article) : `#${hashSlug(article.slug)}`;
    const action = options.actionLabel ? `<span class="card-link">${escapeHtml(options.actionLabel)}</span>` : "";

    return `
      <a class="article-card fade-in" href="${cardLink}">
        <img src="${escapeHtml(publicArticleImage(article))}" alt="${escapeHtml(article.title)}">
        <div class="article-card-body">
          <div class="card-meta">
            <span class="tag">${escapeHtml(article.category || "Inspiratie")}</span>
            ${publicArticleSupplierMeta(article)}
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
          ${action}
        </div>
      </a>
    `;
  }

  function renderPublicArticleBody(article) {
    const paragraphs = String(article.body || "")
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("");

    return `
      <article id="${escapeHtml(article.slug)}" class="fade-in">
        ${renderDetailBreadcrumb([
          { label: "Home", href: href("index.html") },
          { label: "Inspiratie", href: href("pages/inspiratie.html") },
          { label: article.title }
        ])}
        <p class="kicker">${escapeHtml(article.category || "Inspiratie")}${article.updatedAt ? ` - Bijgewerkt ${escapeHtml(article.updatedAt)}` : ""}</p>
        <h2>${escapeHtml(article.title)}</h2>
        <p class="lead">${escapeHtml(article.summary)}</p>
        ${paragraphs}
        <div class="section-actions detail-actions">
          <a class="btn btn-secondary" href="${href("pages/inspiratie.html")}">Terug naar inspiratie</a>
        </div>
        ${renderArticleSupplierLinks(article)}
      </article>
    `;
  }

  function updateDocumentTitle(title) {
    if (!title) return;
    document.title = `${title} | Non-Food Hub`;
  }

  function renderArticleSupplierLinks(article) {
    const suppliers = articleSuppliers(article);
    if (!suppliers.length) return "";

    return `
      <div class="contact-card supplier-detail-section">
        <p class="kicker">Leveranciers</p>
        <h3>Van inspiratie naar leverancier</h3>
        <p>Bekijk welke leverancier aansluit bij dit onderwerp en ga daarna door naar gekoppelde collecties.</p>
        <div class="section-actions">
          ${suppliers.map((supplier) => `<a class="btn btn-primary" href="${supplierPageLink(supplier)}">Bekijk ${escapeHtml(supplier.name)}</a>`).join("")}
          <a class="btn btn-secondary" href="${href("pages/brochures-catalogi.html")}">Bekijk brochures</a>
        </div>
      </div>
    `;
  }

  async function setupPublicArticles() {
    if (currentPage !== "inspiratie") return;

    const grid = document.querySelector("[data-public-article-grid]");
    const bodyMount = document.querySelector("[data-public-article-body]");
    const overviewSection = document.querySelector("[data-public-article-overview]");
    const detailSection = document.querySelector("[data-public-article-detail-section]");
    if (!grid || !bodyMount) return;

    try {
      const response = await fetch(href("data/public/articles.json"), { cache: "no-store" });
      if (!response.ok) throw new Error("Kennisbankdata kon niet worden geladen.");

      const data = await response.json();
      const articles = Array.isArray(data.items) ? data.items : [];

      function renderArticleState() {
        const selectedSlug = selectedHashSlug();
        const selectedArticle = itemBySlug(articles, selectedSlug);

        if (!articles.length) {
          toggleElement(overviewSection, false);
          toggleElement(detailSection, true);
          grid.innerHTML = `
            <article class="contact-card fade-in">
              <h3>Geen artikelen beschikbaar</h3>
              <p>Er zijn nog geen kennisbankartikelen beschikbaar.</p>
            </article>
          `;
          bodyMount.innerHTML = "";
          setupAnimations();
          return;
        }

        if (selectedSlug) {
          body.classList.add("is-detail-route");
          toggleElement(overviewSection, true);
          toggleElement(detailSection, false);
          bodyMount.innerHTML = selectedArticle
            ? renderPublicArticleBody(selectedArticle)
            : renderDetailEmptyState(
                "Artikel niet gevonden",
                "Dit kennisbankartikel is niet beschikbaar.",
                href("pages/inspiratie.html"),
                "Terug naar inspiratie"
              );
          updateDocumentTitle(selectedArticle?.title || "Artikel niet gevonden");
          setupAnimations();
          scrollToHashTarget();
          return;
        }

        body.classList.remove("is-detail-route");
        updateDocumentTitle("Inspiratie");
        toggleElement(overviewSection, false);
        toggleElement(detailSection, true);
        grid.innerHTML = articles.map(renderPublicArticleCard).join("");
        bodyMount.innerHTML = "";
        setupAnimations();
      }

      renderArticleState();
      window.addEventListener("hashchange", renderArticleState);
    } catch (error) {
      grid.innerHTML = `
        <article class="contact-card fade-in">
          <h3>Kennisbank niet geladen</h3>
          <p>De kennisbankartikelen konden niet worden geladen. Probeer de pagina later opnieuw.</p>
        </article>
      `;
      bodyMount.innerHTML = "";
      setupAnimations();
      console.error(error);
    }
  }

  function publicSupplierImage(supplier) {
    return supplier.image || supplier.logo ? href(supplier.image || supplier.logo) : href("assets/images/assortment.png");
  }

  function supplierCategories(supplier) {
    return Array.isArray(supplier.categories) ? supplier.categories.filter(Boolean) : [];
  }

  function formatTagLabel(value) {
    const label = String(value || "").trim();
    return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : "";
  }

  function renderPublicSupplierTags(supplier) {
    const categories = supplierCategories(supplier);
    const tags = [supplier.type, ...categories].filter(Boolean).slice(0, 4);
    return tags.map((tag, index) => `<span class="tag${index === 0 ? " blue" : ""}">${escapeHtml(formatTagLabel(tag))}</span>`).join("");
  }

  function renderPublicSupplierCard(supplier, options = {}) {
    const cardLink = options.linkToSupplierPage ? supplierPageLink(supplier) : `#${escapeHtml(supplier.slug)}`;
    const summary = options.useDescription ? supplier.description || supplier.summary : supplier.summary;
    const actionLabel = options.actionLabel || "Bekijk leverancier";

    return `
      <a class="supplier-card fade-in" href="${cardLink}">
        <img src="${escapeHtml(publicSupplierImage(supplier))}" alt="${escapeHtml(supplier.name)}">
        <div class="supplier-card-body">
          <div class="card-meta">${renderPublicSupplierTags(supplier)}</div>
          <h3>${escapeHtml(supplier.name)}</h3>
          <p>${escapeHtml(summary)}</p>
          <span class="card-link">${escapeHtml(actionLabel)}</span>
        </div>
      </a>
    `;
  }

  function relatedArticles(supplier) {
    return Array.isArray(supplier.relatedArticles) ? supplier.relatedArticles : [];
  }

  function publicBrochureImage(brochure) {
    return brochure.thumbnail ? href(brochure.thumbnail) : href("assets/images/brochures.png");
  }

  function brochureCategory(brochure) {
    return String(brochure.category || "Brochure");
  }

  function brochureFilterValue(brochure) {
    return brochureCategory(brochure).toLowerCase();
  }

  function brochurePageLink(brochure) {
    return `${href("pages/brochures-catalogi.html")}#${hashSlug(brochure.slug)}`;
  }

  function publicBrochureSupplierMeta(brochure, suppliersById) {
    const supplier = suppliersById?.get(brochure.supplierId);
    return supplier ? `<a class="tag sky" href="${supplierPageLink(supplier)}">Van ${escapeHtml(supplier.name)}</a>` : "";
  }

  function renderPublicBrochureCard(brochure, suppliersById = new Map(), options = {}) {
    const downloadAction = brochure.downloadUrl
      ? `<a class="card-link" href="${escapeHtml(href(brochure.downloadUrl))}" download>Download brochure</a>`
      : `<p class="file-name">PDF nog niet beschikbaar</p>`;
    const cardLink = options.linkToBrochurePage ? brochurePageLink(brochure) : `#${hashSlug(brochure.slug)}`;
    const openAction = `<a class="card-link" href="${cardLink}">Bekijk brochure</a>`;

    return `
      <article class="resource-card fade-in" id="${escapeHtml(brochure.slug)}" data-categories="${escapeHtml(brochureFilterValue(brochure))}">
        <a href="${cardLink}">
          <img src="${escapeHtml(publicBrochureImage(brochure))}" alt="${escapeHtml(brochure.title)}">
        </a>
        <div class="resource-card-body">
          <div class="card-meta">
            <span class="tag">${escapeHtml(brochureCategory(brochure))}</span>
            ${publicBrochureSupplierMeta(brochure, suppliersById)}
          </div>
          <h3>${escapeHtml(brochure.title)}</h3>
          <p>${escapeHtml(brochure.summary)}</p>
          ${openAction}
          ${downloadAction}
        </div>
      </article>
    `;
  }

  function renderPublicBrochureDetail(brochure, suppliersById = new Map()) {
    const supplier = suppliersById.get(brochure.supplierId);
    const supplierAction = supplier
      ? `<a class="btn btn-primary" href="${supplierPageLink(supplier)}">Bekijk ${escapeHtml(supplier.name)}</a>`
      : "";
    const downloadStatus = brochure.downloadUrl
      ? `<a class="btn btn-primary" href="${escapeHtml(href(brochure.downloadUrl))}" download>Download brochure</a>`
      : `<p class="detail-status">PDF nog niet beschikbaar. Vraag advies aan het non-food team wanneer je deze collectie wilt bespreken.</p>`;

    return `
      <article id="${escapeHtml(brochure.slug)}" class="fade-in">
        ${renderDetailBreadcrumb([
          { label: "Home", href: href("index.html") },
          { label: "Brochures", href: href("pages/brochures-catalogi.html") },
          { label: brochure.title }
        ])}
        <div class="split">
          <div>
            <p class="kicker">${escapeHtml(brochureCategory(brochure))}${brochure.updatedAt ? ` - Bijgewerkt ${escapeHtml(brochure.updatedAt)}` : ""}</p>
            <h2>${escapeHtml(brochure.title)}</h2>
            <p class="lead">${escapeHtml(brochure.summary)}</p>
            ${downloadStatus}
            <div class="section-actions detail-actions">
              ${supplierAction}
              <a class="btn btn-secondary" href="${href("pages/brochures-catalogi.html")}">Terug naar brochures</a>
            </div>
          </div>
          <div class="split-media">
            <img src="${escapeHtml(publicBrochureImage(brochure))}" alt="${escapeHtml(brochure.title)}">
          </div>
        </div>
      </article>
    `;
  }

  function renderSupplierRelatedArticleCard(article) {
    return `
      <a class="article-card fade-in" href="${href("pages/inspiratie.html")}#${hashSlug(article.slug)}">
        <img src="${escapeHtml(publicArticleImage(article))}" alt="${escapeHtml(article.title)}">
        <div class="article-card-body">
          <div class="card-meta"><span class="tag">${escapeHtml(article.category || "Inspiratie")}</span></div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
          <span class="card-link">Lees artikel</span>
        </div>
      </a>
    `;
  }

  function renderSupplierRelatedArticles(supplier) {
    const articles = relatedArticles(supplier);

    if (!articles.length) {
      return `
        <div class="contact-card fade-in">
          <h3>Geen gekoppelde kennisbankartikelen</h3>
          <p>Voor deze leverancier zijn nog geen kennisbankartikelen gekoppeld.</p>
        </div>
      `;
    }

    return `<div class="grid grid-3">${articles.map(renderSupplierRelatedArticleCard).join("")}</div>`;
  }

  function relatedBrochures(supplier) {
    return Array.isArray(supplier.relatedBrochures) ? supplier.relatedBrochures : [];
  }

  function renderSupplierRelatedBrochures(supplier) {
    const brochures = relatedBrochures(supplier);
    const suppliersById = new Map([[supplier.id, supplier]]);

    if (!brochures.length) {
      return `
        <div class="contact-card fade-in">
          <h3>Geen gekoppelde brochures</h3>
          <p>Voor deze leverancier zijn nog geen brochures gekoppeld.</p>
        </div>
      `;
    }

    return `<div class="grid grid-3">${brochures.map((brochure) => renderPublicBrochureCard(brochure, suppliersById, { linkToBrochurePage: true })).join("")}</div>`;
  }

  function renderPublicSupplierDetail(supplier) {
    const description = supplier.description ? `<p>${escapeHtml(supplier.description)}</p>` : "";
    const brochures = relatedBrochures(supplier);
    const primaryBrochureAction = brochures.length
      ? `<a class="btn btn-primary" href="${brochurePageLink(brochures[0])}">Bekijk brochure</a>`
      : `<a class="btn btn-primary" href="#${hashSlug(`${supplier.slug}-brochures`)}">Bekijk brochures</a>`;
    const logo = supplier.logo
      ? `
        <div class="supplier-detail-logo">
          <img src="${escapeHtml(href(supplier.logo))}" alt="Logo ${escapeHtml(supplier.name)}">
        </div>
      `
      : "";
    const website = supplier.website
      ? `<a class="btn btn-secondary" href="${escapeHtml(supplier.website)}" target="_blank" rel="noreferrer">Website openen</a>`
      : "";

    return `
      <article id="${escapeHtml(supplier.slug)}" class="fade-in">
        ${renderDetailBreadcrumb([
          { label: "Home", href: href("index.html") },
          { label: "Leveranciers", href: href("pages/leveranciers.html") },
          { label: supplier.name }
        ])}
        <div class="split">
          <div>
            ${logo}
            <p class="kicker">${supplierCategories(supplier).map(escapeHtml).join(" / ") || "Leverancier"}</p>
            <h2>${escapeHtml(supplier.name)}</h2>
            <p class="lead">${escapeHtml(supplier.summary)}</p>
            ${description}
            <div class="section-actions">
              ${primaryBrochureAction}
              <a class="btn btn-secondary" href="#${hashSlug(`${supplier.slug}-artikelen`)}">Meer inspiratie</a>
              <a class="btn btn-secondary" href="${href("pages/leveranciers.html")}">Terug naar leveranciers</a>
              ${website}
            </div>
          </div>
          <div class="split-media">
            <img src="${escapeHtml(publicSupplierImage(supplier))}" alt="${escapeHtml(supplier.name)}">
          </div>
        </div>
        <div class="section-heading supplier-detail-section" id="${escapeHtml(supplier.slug)}-brochures">
          <p class="kicker">Brochures</p>
          <h3>Gerelateerde brochures</h3>
        </div>
        ${renderSupplierRelatedBrochures(supplier)}
        <div class="section-heading supplier-detail-section" id="${escapeHtml(supplier.slug)}-artikelen">
          <p class="kicker">Kennisbank</p>
          <h3>Gerelateerde artikelen</h3>
        </div>
        ${renderSupplierRelatedArticles(supplier)}
      </article>
    `;
  }

  async function setupPublicSuppliers() {
    if (currentPage !== "leveranciers") return;

    const grid = document.querySelector("[data-public-supplier-grid]");
    const detailMount = document.querySelector("[data-public-supplier-detail]");
    const overviewSection = document.querySelector("[data-public-supplier-overview]");
    const detailSection = document.querySelector("[data-public-supplier-detail-section]");
    const extraSection = document.querySelector("[data-public-supplier-extra]");
    if (!grid || !detailMount) return;

    try {
      const response = await fetch(href("data/public/suppliers.json"), { cache: "no-store" });
      if (!response.ok) throw new Error("Leveranciersdata kon niet worden geladen.");

      const data = await response.json();
      const suppliers = Array.isArray(data.items) ? data.items : [];

      function renderSupplierState() {
        const selectedSlug = selectedHashSlug();
        const selectedSupplier = itemBySlug(suppliers, selectedSlug);

        if (!suppliers.length) {
          toggleElement(overviewSection, false);
          toggleElement(detailSection, true);
          grid.innerHTML = `
            <article class="contact-card fade-in">
              <h3>Geen leveranciers beschikbaar</h3>
              <p>Er zijn nog geen leveranciers beschikbaar.</p>
            </article>
          `;
          detailMount.innerHTML = "";
          setupAnimations();
          return;
        }

        if (selectedSlug) {
          body.classList.add("is-detail-route");
          toggleElement(overviewSection, true);
          toggleElement(detailSection, false);
          toggleElement(extraSection, true);
          detailMount.innerHTML = selectedSupplier
            ? renderPublicSupplierDetail(selectedSupplier)
            : renderDetailEmptyState(
                "Leverancier niet gevonden",
                "Deze leverancier is niet beschikbaar.",
                href("pages/leveranciers.html"),
                "Terug naar leveranciers"
              );
          updateDocumentTitle(selectedSupplier?.name || "Leverancier niet gevonden");
          setupAnimations();
          scrollToHashTarget();
          return;
        }

        body.classList.remove("is-detail-route");
        updateDocumentTitle("Leveranciers");
        toggleElement(overviewSection, false);
        toggleElement(detailSection, true);
        toggleElement(extraSection, false);
        grid.innerHTML = suppliers.map(renderPublicSupplierCard).join("");
        detailMount.innerHTML = "";
        setupAnimations();
      }

      renderSupplierState();
      window.addEventListener("hashchange", renderSupplierState);
    } catch (error) {
      grid.innerHTML = `
        <article class="contact-card fade-in">
          <h3>Leveranciers niet geladen</h3>
          <p>De leveranciers konden niet worden geladen. Probeer de pagina later opnieuw.</p>
        </article>
      `;
      detailMount.innerHTML = "";
      setupAnimations();
      console.error(error);
    }
  }

  async function setupPublicBrochures() {
    if (currentPage !== "brochures") return;

    const grid = document.querySelector("[data-public-brochure-grid]");
    const detailMount = document.querySelector("[data-public-brochure-detail]");
    const introSection = document.querySelector("[data-public-brochure-intro]");
    const overviewSection = document.querySelector("[data-public-brochure-overview]");
    const detailSection = document.querySelector("[data-public-brochure-detail-section]");
    if (!grid) return;

    try {
      const [brochureResponse, supplierResponse] = await Promise.all([
        fetch(href("data/public/brochures.json"), { cache: "no-store" }),
        fetch(href("data/public/suppliers.json"), { cache: "no-store" })
      ]);
      if (!brochureResponse.ok) throw new Error("Brochuredata kon niet worden geladen.");
      if (!supplierResponse.ok) throw new Error("Leveranciersdata kon niet worden geladen.");

      const brochureData = await brochureResponse.json();
      const supplierData = await supplierResponse.json();
      const brochures = Array.isArray(brochureData.items) ? brochureData.items : [];
      const suppliers = Array.isArray(supplierData.items) ? supplierData.items : [];
      const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

      function renderBrochureState() {
        const selectedSlug = selectedHashSlug();
        const selectedBrochure = itemBySlug(brochures, selectedSlug);

        if (!brochures.length) {
          toggleElement(overviewSection, false);
          toggleElement(detailSection, true);
          grid.innerHTML = `
            <article class="contact-card fade-in">
              <h3>Geen brochures beschikbaar</h3>
              <p>Er zijn nog geen brochures beschikbaar.</p>
            </article>
          `;
          if (detailMount) detailMount.innerHTML = "";
          setupAnimations();
          return;
        }

        if (selectedSlug) {
          body.classList.add("is-detail-route");
          toggleElement(introSection, true);
          toggleElement(overviewSection, true);
          toggleElement(detailSection, false);
          if (detailMount) {
            detailMount.innerHTML = selectedBrochure
              ? renderPublicBrochureDetail(selectedBrochure, suppliersById)
              : renderDetailEmptyState(
                  "Brochure niet gevonden",
                  "Deze brochure is niet beschikbaar.",
                  href("pages/brochures-catalogi.html"),
                  "Terug naar brochures"
                );
          }
          updateDocumentTitle(selectedBrochure?.title || "Brochure niet gevonden");
          setupAnimations();
          scrollToHashTarget();
          return;
        }

        body.classList.remove("is-detail-route");
        updateDocumentTitle("Brochures en catalogi");
        toggleElement(introSection, false);
        toggleElement(overviewSection, false);
        toggleElement(detailSection, true);
        grid.innerHTML = brochures.map((brochure) => renderPublicBrochureCard(brochure, suppliersById)).join("");
        if (detailMount) detailMount.innerHTML = "";
        setupAnimations();
      }

      renderBrochureState();
      window.addEventListener("hashchange", renderBrochureState);
    } catch (error) {
      grid.innerHTML = `
        <article class="contact-card fade-in">
          <h3>Brochures niet geladen</h3>
          <p>De brochures konden niet worden geladen. Probeer de pagina later opnieuw.</p>
        </article>
      `;
      setupAnimations();
      console.error(error);
    }
  }

  async function setupHomepageDiscovery() {
    if (currentPage !== "home") return;

    const articleGrid = document.querySelector("[data-home-article-grid]");
    const supplierGrid = document.querySelector("[data-home-supplier-grid]");
    const brochureGrid = document.querySelector("[data-home-brochure-grid]");
    if (!articleGrid && !supplierGrid && !brochureGrid) return;

    function renderGrid(mount, items, renderer, emptyTitle, emptyMessage) {
      if (!mount) return;
      const selected = featuredItems(items);
      mount.innerHTML = selected.length ? selected.map(renderer).join("") : renderHomepageEmptyState(emptyTitle, emptyMessage);
    }

    try {
      const [articles, suppliers, brochures] = await Promise.all([
        fetchPublicItems("data/public/articles.json", "Inspiratie"),
        fetchPublicItems("data/public/suppliers.json", "Leveranciers"),
        fetchPublicItems("data/public/brochures.json", "Brochures")
      ]);
      const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
      updateHomepageCount("articles", articles.length, "artikel", "artikelen");
      updateHomepageCount("suppliers", suppliers.length, "leverancier", "leveranciers");
      updateHomepageCount("brochures", brochures.length, "brochure", "brochures");

      renderGrid(
        articleGrid,
        articles,
        (article) => renderPublicArticleCard(article, { linkToArticlePage: true, actionLabel: "Lees artikel" }),
        "Geen inspiratie beschikbaar",
        "Er zijn nog geen kennisbankartikelen beschikbaar."
      );
      renderGrid(
        supplierGrid,
        suppliers,
        (supplier) => renderPublicSupplierCard(supplier, { linkToSupplierPage: true, useDescription: true }),
        "Geen leveranciers beschikbaar",
        "Er zijn nog geen leveranciers beschikbaar."
      );
      renderGrid(
        brochureGrid,
        brochures,
        (brochure) => renderPublicBrochureCard(brochure, suppliersById, { linkToBrochurePage: true }),
        "Geen brochures beschikbaar",
        "Er zijn nog geen brochures beschikbaar."
      );
      setupAnimations();
    } catch (error) {
      const errorState = renderHomepageEmptyState(
        "Content niet geladen",
        "De content kon niet worden geladen. Probeer de pagina later opnieuw."
      );
      [articleGrid, supplierGrid, brochureGrid].filter(Boolean).forEach((mount) => {
        mount.innerHTML = errorState;
      });
      setupAnimations();
      console.error(error);
    }
  }

  function setupAnimations() {
    const items = document.querySelectorAll(".fade-in");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
  }

  renderHeader();
  renderFooter();
  setupNavigation();
  setupSearch();
  setupFilters();
  setupAnimations();
  setupPublicArticles();
  setupPublicSuppliers();
  setupPublicBrochures();
  setupHomepageDiscovery();
})();
