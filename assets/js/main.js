(function () {
  const body = document.body;
  const base = body.dataset.base || ".";
  const currentPage = body.dataset.page || "home";

  const isAbsoluteHref = (path) => {
    const rawPath = String(path ?? "");
    return Boolean(rawPath.match(/^(?:https?:|mailto:|tel:)/i)) || rawPath.startsWith("#");
  };
  const href = (path) => (isAbsoluteHref(path) ? String(path) : `${base}/${path}`.replace("//", "/"));
  const assortmentUrl = "https://www.bidfood.nl/webshop/assortiment/non-food/_/N-fcinf4Z1rc100h/categoryId-115";
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

  if (selectedHashSlug() && !selectedHashSlug().startsWith("categorie-")) {
    body.classList.add("is-detail-route");
  }

  const links = [
    { id: "home", title: "Home", path: "index.html", description: "Startpunt voor de Non-Food Hub" },
    { id: "leveranciers", title: "Leveranciers", path: "pages/leveranciers.html", description: "Partners, merken en productgroepen" },
    { id: "brochures", title: "Brochures en catalogi", path: "pages/brochures-catalogi.html", description: "Collecties en catalogusoverzicht" },
    { id: "assortiment", title: "Assortiment", path: assortmentUrl, description: "Direct beschikbaar non-foodassortiment" },
    { id: "showroom", title: "Virtuele Showroom", path: "pages/virtuele-showroom.html", description: "Digitale rondleiding en showroomafspraken" },
    { id: "inspiratie", title: "Inspiratie", path: "pages/inspiratie.html", description: "Trends, kennisbank en praktische inspiratie" },
    { id: "nieuw", title: "Uitgelicht", path: "pages/nieuw.html", description: "Nieuwe onderwerpen binnen Non-Food" },
    { id: "aanbiedingen", title: "Aanbiedingen", path: "pages/aanbiedingen.html", description: "Actuele non-food deals" },
    { id: "personalisatie", title: "Logo's & Personalisatie", path: "pages/logos-personalisatie.html", description: "Glaswerk, servies en kleding met eigen logo" },
    { id: "bibliotheek", title: "Bibliotheek", path: "pages/bibliotheek.html", description: "Servies leasen zonder grote investering" },
    { id: "terras", title: "Terras & Outdoor", path: "pages/terras-outdoor.html", description: "Outdoor dining, comfort en presentatie" },
    { id: "droogijs", title: "Droogijs Shop", path: "pages/droogijs.html", description: "Droogijs bestellen of informatie aanvragen" },
    { id: "contact", title: "Contact", path: "pages/contact.html", description: "Non-food advies, showroom en support" }
  ];

  const primaryNavigation = [
    { id: "brochures", label: "Collecties", path: "pages/brochures-catalogi.html", description: "Collecties en catalogi" },
    { id: "inspiratie", label: "Inspiratie", path: "pages/inspiratie.html", description: "Trends en praktische inspiratie" },
    { id: "personalisatie", label: "Services", path: "pages/logos-personalisatie.html", description: "Aanvullende diensten" },
    { id: "assortiment", label: "Assortiment", path: assortmentUrl, description: "Direct online bestellen" },
    { id: "nieuw", label: "Uitgelicht", path: "pages/nieuw.html", description: "Nieuwe onderwerpen" },
    { id: "contact", label: "Advies", path: "pages/contact.html", description: "Persoonlijk advies en contact" }
  ];

  function linkById(id) {
    return links.find((link) => link.id === id);
  }

  function renderHeader() {
    const mount = document.querySelector("[data-site-header]");
    if (!mount) return;

    const activeClass = (id) => (currentPage === id ? "is-active" : "");
    const currentAttribute = (id) => (currentPage === id ? ' aria-current="page"' : "");

    const navLinks = primaryNavigation.map((link) => `
      <li>
        <a class="nav-link ${activeClass(link.id)}" href="${href(link.path)}"${currentAttribute(link.id)}${isAbsoluteHref(link.path) ? ' target="_blank" rel="noreferrer"' : ""}>${link.label}</a>
      </li>
    `).join("");

    const mobileLinks = primaryNavigation.map((link) => `
      <a href="${href(link.path)}" class="${activeClass(link.id)}"${currentAttribute(link.id)}${isAbsoluteHref(link.path) ? ' target="_blank" rel="noreferrer"' : ""}>
        ${link.label}
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
              ${navLinks}
            </ul>
          </nav>
          <div class="header-actions">
            <button class="icon-button search-trigger" type="button" aria-label="Zoeken" aria-controls="site-search-overlay" aria-expanded="false">
              <span class="icon-search" aria-hidden="true"></span>
            </button>
            <a class="btn btn-primary" href="${href("pages/contact.html")}">Neem contact op</a>
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
              <li><a href="${href("pages/brochures-catalogi.html")}">Collecties</a></li>
              <li><a href="${href("pages/inspiratie.html")}">Inspiratie</a></li>
              <li><a href="${href("pages/logos-personalisatie.html")}">Services</a></li>
              <li><a href="${href(assortmentUrl)}" target="_blank" rel="noreferrer">Assortiment</a></li>
              <li><a href="${href("pages/nieuw.html")}">Uitgelicht</a></li>
              <li><a href="${href("pages/contact.html")}">Advies</a></li>
              <li><a href="${href("index.html#waarom-nonfoodhub")}">Waarom NonFoodHub</a></li>
            </ul>
          </div>
          <div>
            <h4>Inspiratie</h4>
            <ul class="footer-links">
              <li><a href="${href("pages/virtuele-showroom.html")}">Virtuele showroom</a></li>
              <li><a href="${href("pages/inspiratie.html")}">Trends</a></li>
              <li><a href="${href("pages/inspiratie.html")}">Praktische tips</a></li>
              <li><a href="${href("pages/inspiratie.html")}">Trainingen</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul class="footer-links">
              <li><a href="${href("pages/contact.html")}">Non Food binnendienst</a></li>
              <li><a href="${href("pages/contact.html")}">Specialist</a></li>
              <li><a href="https://wa.me/31135812712" target="_blank" rel="noreferrer">WhatsApp</a></li>
              <li><a href="mailto:nonfood@bidfood.nl">E-mail</a></li>
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
    const overlay = document.querySelector("#site-search-overlay");
    const input = document.querySelector("#site-search");
    const results = document.querySelector("#search-results");
    if (!overlay || !input || !results) return;

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
    closeButton?.addEventListener("click", closeSearch);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeSearch();
    });
    results.addEventListener("click", (event) => {
      if (event.target.closest(".search-result")) closeSearch();
    });
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
        <img src="${escapeHtml(publicArticleImage(article))}" alt="${escapeHtml(article.title)}" loading="lazy" decoding="async">
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
        <img src="${escapeHtml(publicSupplierImage(supplier))}" alt="${escapeHtml(supplier.name)}" loading="lazy" decoding="async">
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

  function brochureCategories(brochure) {
    if (Array.isArray(brochure.categories) && brochure.categories.length) {
      return brochure.categories.filter(Boolean);
    }

    return ["Brochure"];
  }

  function brochureCategoryLabel(brochure) {
    return brochureCategories(brochure).join(", ");
  }

  function brochureFilterValue(brochure) {
    return brochureCategories(brochure).join(" ").toLowerCase();
  }

  function renderBrochureCategoryTags(brochure) {
    return brochureCategories(brochure)
      .map((category) => `<span class="tag">${escapeHtml(category)}</span>`)
      .join("");
  }

  function brochurePageLink(brochure) {
    return `${href("pages/brochures-catalogi.html")}#${hashSlug(brochure.slug)}`;
  }

  function publicBrochureSupplierMeta(brochure, suppliersById) {
    const supplier = suppliersById?.get(brochure.supplierId);
    return supplier ? `<a class="tag sky" href="${supplierPageLink(supplier)}">Van ${escapeHtml(supplier.name)}</a>` : "";
  }

  const COLLECTION_PRODUCT_CATEGORIES = [
    "Servies",
    "Kleding & textiel",
    "Keukengerei",
    "Glaswerk",
    "Bestek",
    "Bar & restaurantmateriaal",
    "Buffet & serveergerei",
    "Keukenapparatuur",
    "Keukeninrichting",
    "Kantoorartikelen",
    "BBQ's & Kamado's",
    "Overig"
  ];

  const COLLECTION_CATEGORY_ALIASES = [
    ["servies", "Servies"],
    ["tafelpresentatie", "Servies"],
    ["kleding", "Kleding & textiel"],
    ["textiel", "Kleding & textiel"],
    ["keukengerei", "Keukengerei"],
    ["glaswerk", "Glaswerk"],
    ["bestek", "Bestek"],
    ["bar", "Bar & restaurantmateriaal"],
    ["restaurantmateriaal", "Bar & restaurantmateriaal"],
    ["buffet", "Buffet & serveergerei"],
    ["serveergerei", "Buffet & serveergerei"],
    ["presentatie", "Buffet & serveergerei"],
    ["keukenapparatuur", "Keukenapparatuur"],
    ["keukeninrichting", "Keukeninrichting"],
    ["kantoorartikelen", "Kantoorartikelen"],
    ["bbq", "BBQ's & Kamado's"],
    ["kamado", "BBQ's & Kamado's"]
  ];

  function normalizePublicSearch(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function collectionCategoryToken(category) {
    return normalizePublicSearch(category).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function collectionCategoryFromHash(slug) {
    if (!slug?.startsWith("categorie-")) return "";
    const token = slug.replace(/^categorie-/, "");
    return COLLECTION_PRODUCT_CATEGORIES.find((category) => collectionCategoryToken(category) === token) || "";
  }

  function collectionCategoryLink(category) {
    return `${href("pages/brochures-catalogi.html")}#categorie-${collectionCategoryToken(category)}`;
  }

  function collectionProductCategories(values) {
    const haystack = normalizePublicSearch(values.filter(Boolean).join(" "));
    const matched = [];
    COLLECTION_CATEGORY_ALIASES.forEach(([needle, category]) => {
      if (haystack.includes(needle) && !matched.includes(category)) matched.push(category);
    });

    return matched.length ? matched : ["Overig"];
  }

  function collectionName(supplier) {
    const name = supplier?.name || "Non-Food";
    return `${name} Collection`;
  }

  function collectionIntro(collection) {
    const categories = collection.categories.slice(0, 3).join(", ").toLowerCase();
    const supplierSummary = collection.supplier?.description || collection.supplier?.summary || "";

    return [
      collection.summary || supplierSummary || `Een collectie voor professionele horeca met aandacht voor ${categories || "presentatie"}.`,
      `${collection.name} helpt je om sfeer, gebruiksgemak en productkeuze als een samenhangend geheel te bekijken.`,
      "Gebruik de brochures om het volledige aanbod te bekijken en neem contact op wanneer je advies, prijzen of beschikbaarheid wilt bespreken."
    ];
  }

  function collectionUsps(collection) {
    const haystack = normalizePublicSearch([
      collection.name,
      collection.summary,
      collection.supplier?.description,
      ...collection.categories
    ].join(" "));
    const usps = [];

    if (haystack.includes("professionele") || haystack.includes("hospitality") || haystack.includes("horeca")) {
      usps.push(["Professionele kwaliteit", "Geselecteerd voor dagelijks gebruik in horeca en hospitality."]);
    }
    if (haystack.includes("servies") || haystack.includes("tafelpresentatie")) {
      usps.push(["Tafelconcepten", "Geschikt om servies, bestek en presentatie visueel op elkaar af te stemmen."]);
    }
    if (haystack.includes("buffet")) {
      usps.push(["Buffetpresentatie", "Past bij presentaties waarin overzicht, routing en uitstraling samenkomen."]);
    }
    if (haystack.includes("bestek")) {
      usps.push(["Bestekselectie", "Relevant voor restaurants, hotels en catering die een herkenbare tafelsetting zoeken."]);
    }

    return usps.slice(0, 4);
  }

  function brochureYear(brochure) {
    const titleYear = String(brochure?.title || "").match(/\b(20\d{2})\b/);
    return titleYear ? titleYear[1] : "";
  }

  function collectionBrochureCountLabel(collection) {
    const count = collection.brochures.length;
    return `${count} ${count === 1 ? "brochure" : "brochures"} beschikbaar`;
  }

  function collectionMoodImage(collection) {
    return href("assets/images/supplier-bowls.jpeg");
  }

  function collectionSearchText(collection) {
    return normalizePublicSearch([
      collection.name,
      collection.brand,
      collection.summary,
      collection.supplier?.summary,
      collection.supplier?.description,
      ...collection.categories,
      ...collection.rawCategories,
      ...collection.brochures.map((brochure) => `${brochure.title} ${brochure.summary}`)
    ].join(" "));
  }

  function collectionMatchesToken(collection, token, group) {
    const haystack = collection.searchText;
    if (group === "availability") {
      if (token === "brochure") return collection.brochures.some((brochure) => brochure.downloadUrl);
      if (token === "bidfood-webshop") return true;
    }
    if (group === "material") {
      if (token === "porselein") return haystack.includes("servies") || haystack.includes("porselein");
      if (token === "glas") return haystack.includes("glas");
      if (token === "hout") return haystack.includes("hout");
      if (token === "melamine") return haystack.includes("melamine");
      if (token === "rvs") return haystack.includes("rvs") || haystack.includes("bestek") || haystack.includes("keukengerei");
      if (token === "kunststof") return haystack.includes("kunststof");
    }
    if (group === "theme") {
      if (token === "fine-dining") return haystack.includes("tafel") || haystack.includes("servies") || haystack.includes("bestek");
      if (token === "hotel") return haystack.includes("hotel") || haystack.includes("hospitality");
      if (token === "terras") return haystack.includes("terras") || haystack.includes("outdoor");
      if (token === "buffet") return haystack.includes("buffet");
      if (token === "bar") return haystack.includes("bar") || haystack.includes("glaswerk");
    }

    return false;
  }

  function buildPublicCollections(brochures, suppliersById) {
    const brochuresBySupplier = new Map();
    brochures.forEach((brochure) => {
      const current = brochuresBySupplier.get(brochure.supplierId) || [];
      current.push(brochure);
      brochuresBySupplier.set(brochure.supplierId, current);
    });

    return Array.from(brochuresBySupplier.entries())
      .map(([supplierId, supplierBrochures]) => {
        const supplier = suppliersById.get(supplierId);
        if (!supplier) return null;
        const rawCategories = [
          ...supplierCategories(supplier),
          ...supplierBrochures.flatMap(brochureCategories)
        ];
        const categories = collectionProductCategories(rawCategories);
        const name = collectionName(supplier);
        const summary = supplier.description || supplier.summary || supplierBrochures[0]?.summary || "";
        const collection = {
          id: supplier.id,
          slug: supplier.slug,
          name,
          brand: supplier.name,
          summary,
          supplier,
          logo: supplier.logo ? href(supplier.logo) : "",
          image: publicSupplierImage(supplier),
          brochures: supplierBrochures,
          categories,
          rawCategories
        };
        collection.searchText = collectionSearchText(collection);
        return collection;
      })
      .filter(Boolean)
      .sort((left, right) => left.name.localeCompare(right.name, "nl"));
  }

  function collectionBySlug(collections, brochures, slug) {
    if (!slug) return null;
    const direct = itemBySlug(collections, slug);
    if (direct) return direct;
    const brochure = brochures.find((item) => item.slug === slug);
    return brochure ? collections.find((collection) => collection.id === brochure.supplierId) : null;
  }

  function renderCollectionCategoryLinks(collection) {
    return collection.categories
      .map((category) => `<a class="tag" href="${collectionCategoryLink(category)}">${escapeHtml(category)}</a>`)
      .join("");
  }

  function renderCollectionCategoryTags(collection) {
    return collection.categories
      .map((category) => `<span class="tag">${escapeHtml(category)}</span>`)
      .join("");
  }

  function renderCollectionCard(collection) {
    return `
      <a class="collection-card fade-in" href="#${hashSlug(collection.slug)}">
        <span class="collection-card-media">
          <img src="${escapeHtml(collectionMoodImage(collection))}" alt="${escapeHtml(`${collection.name} in horecaomgeving`)}" loading="lazy" decoding="async">
        </span>
        <span class="collection-card-body">
          ${collection.logo ? `<span class="collection-logo"><img src="${escapeHtml(collection.logo)}" alt="Logo ${escapeHtml(collection.brand)}" loading="lazy" decoding="async"></span>` : ""}
          <strong>${escapeHtml(collection.name)}</strong>
          <span class="collection-card-summary">${escapeHtml(collection.summary)}</span>
          <span class="collection-card-tags">${renderCollectionCategoryTags(collection)}</span>
          <span class="collection-card-info"><span aria-hidden="true">📘</span> ${escapeHtml(collectionBrochureCountLabel(collection))}</span>
          <span class="collection-card-info"><span aria-hidden="true">🛒</span> Deels direct verkrijgbaar via de webshop van Bidfood.</span>
          <span class="card-link">Bekijk brochures</span>
        </span>
      </a>
    `;
  }

  function renderCollectionBrochureCard(brochure) {
    const year = brochureYear(brochure);
    const downloadAction = brochure.downloadUrl
      ? `<a class="btn btn-primary" href="${escapeHtml(href(brochure.downloadUrl))}" download>Download brochure</a>`
      : `<p class="detail-status">PDF nog niet beschikbaar. Neem contact op wanneer je deze brochure wilt bespreken.</p>`;

    return `
      <article class="collection-brochure-card fade-in">
        <img src="${escapeHtml(publicBrochureImage(brochure))}" alt="${escapeHtml(brochure.title)}" loading="lazy" decoding="async">
        <div>
          <div class="card-meta">
            ${year ? `<span class="tag">${escapeHtml(year)}</span>` : ""}
            ${renderBrochureCategoryTags(brochure)}
          </div>
          <h3>${escapeHtml(brochure.title)}</h3>
          <p>${escapeHtml(brochure.summary)}</p>
          <div class="section-actions">${downloadAction}</div>
        </div>
      </article>
    `;
  }

  function renderCollectionUsps(collection) {
    const usps = collectionUsps(collection);
    if (!usps.length) return "";

    return `
      <section class="collection-detail-block">
        <div class="collection-usp-grid">
          ${usps.map(([title, text]) => `
            <article class="collection-usp-card">
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(text)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderCollectionRelatedArticles(collection) {
    const articles = relatedArticles(collection.supplier);
    if (!articles.length) return "";

    return `
      <section class="collection-detail-block">
        <div class="section-heading">
          <p class="kicker">Gerelateerde inspiratie</p>
          <h2>Verder lezen over toepassing en presentatie</h2>
        </div>
        <div class="grid grid-3">${articles.map(renderSupplierRelatedArticleCard).join("")}</div>
      </section>
    `;
  }

  function renderCollectionDetail(collection) {
    const paragraphs = collectionIntro(collection).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");

    return `
      <article id="${escapeHtml(collection.slug)}" class="collection-detail fade-in">
        ${renderDetailBreadcrumb([
          { label: "Home", href: href("index.html") },
          { label: "Collecties", href: href("pages/brochures-catalogi.html") },
          { label: collection.name }
        ])}
        <div class="collection-detail-visual">
          <img src="${escapeHtml(collectionMoodImage(collection))}" alt="${escapeHtml(`${collection.name} voor professionele horeca`)}" loading="lazy" decoding="async">
        </div>

        <section class="collection-detail-block collection-intro-block">
          <div class="collection-intro-heading">
            <h2>${escapeHtml(collection.name)}</h2>
            ${collection.logo ? `<span class="collection-logo collection-logo-large"><img src="${escapeHtml(collection.logo)}" alt="Logo ${escapeHtml(collection.brand)}" loading="lazy" decoding="async"></span>` : ""}
            <div class="card-meta">${renderCollectionCategoryLinks(collection)}</div>
          </div>
          <div class="collection-intro-copy">
            ${paragraphs}
          </div>
        </section>

        ${renderCollectionUsps(collection)}

        <section class="collection-detail-block" id="${escapeHtml(collection.slug)}-brochures">
          <div class="section-heading">
            <p class="kicker">Brochures</p>
            <h2>Beschikbare brochures</h2>
          </div>
          <div class="collection-brochure-grid">
            ${collection.brochures.map(renderCollectionBrochureCard).join("")}
          </div>
        </section>

        <section class="collection-detail-block collection-webshop-block">
          <div class="section-heading">
            <h2>Ook direct verkrijgbaar via de webshop</h2>
            <div class="collection-webshop-intro">
              <p>Een deel van deze collectie is direct online te bestellen via de webshop van Bidfood.</p>
              <p>Voor het volledige aanbod bekijk je de brochures hierboven.</p>
            </div>
          </div>
          <div class="collection-route-grid is-single">
            <article class="collection-route-card collection-webshop-card">
              <div class="collection-webshop-copy">
                <h3>Direct verkrijgbaar via de webshop</h3>
                <p>Bekijk een selectie uit deze collectie die direct online beschikbaar is via de webshop van Bidfood.</p>
                <a class="btn btn-secondary" href="${escapeHtml(assortmentUrl)}" target="_blank" rel="noreferrer">Bekijk assortiment</a>
              </div>
              <div class="collection-webshop-media">
                <img src="${escapeHtml(collectionMoodImage(collection))}" alt="${escapeHtml(`${collection.name} in horecaomgeving`)}" loading="lazy" decoding="async">
              </div>
            </article>
          </div>
        </section>

        <section class="collection-detail-block collection-contact-panel">
          <div>
            <p class="kicker">Prijs aanvragen</p>
            <h2>Interesse in deze collectie?</h2>
            <p>Neem contact op voor advies, prijzen of beschikbaarheid. Een contactformulier volgt later.</p>
          </div>
          <div class="section-actions">
            <a class="btn btn-primary" href="https://wa.me/31135812712" target="_blank" rel="noreferrer">WhatsApp</a>
            <a class="btn btn-secondary" href="mailto:nonfood@bidfood.nl?subject=Interesse%20in%20${encodeURIComponent(collection.name)}">Mail</a>
            <a class="btn btn-secondary" href="tel:+31135812712">Telefoon</a>
          </div>
        </section>

        ${renderCollectionRelatedArticles(collection)}
      </article>
    `;
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
          <img src="${escapeHtml(publicBrochureImage(brochure))}" alt="${escapeHtml(brochure.title)}" loading="lazy" decoding="async">
        </a>
        <div class="resource-card-body">
          <div class="card-meta">
            ${renderBrochureCategoryTags(brochure)}
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
            <p class="kicker">${escapeHtml(brochureCategoryLabel(brochure))}${brochure.updatedAt ? ` - Bijgewerkt ${escapeHtml(brochure.updatedAt)}` : ""}</p>
            <h2>${escapeHtml(brochure.title)}</h2>
            <p class="lead">${escapeHtml(brochure.summary)}</p>
            ${downloadStatus}
            <div class="section-actions detail-actions">
              ${supplierAction}
              <a class="btn btn-secondary" href="${href("pages/brochures-catalogi.html")}">Terug naar brochures</a>
            </div>
          </div>
          <div class="split-media">
            <img src="${escapeHtml(publicBrochureImage(brochure))}" alt="${escapeHtml(brochure.title)}" loading="lazy" decoding="async">
          </div>
        </div>
      </article>
    `;
  }

  function renderSupplierRelatedArticleCard(article) {
    return `
      <a class="article-card fade-in" href="${href("pages/inspiratie.html")}#${hashSlug(article.slug)}">
        <img src="${escapeHtml(publicArticleImage(article))}" alt="${escapeHtml(article.title)}" loading="lazy" decoding="async">
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
          <img src="${escapeHtml(href(supplier.logo))}" alt="Logo ${escapeHtml(supplier.name)}" loading="lazy" decoding="async">
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
            <img src="${escapeHtml(publicSupplierImage(supplier))}" alt="${escapeHtml(supplier.name)}" loading="lazy" decoding="async">
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
    const categoryChips = document.querySelector("[data-collection-category-chips]");
    const searchShell = document.querySelector("[data-collection-search-shell]");
    const searchToggle = document.querySelector("[data-collection-search-toggle]");
    const searchInput = document.querySelector("[data-collection-search]");
    const refineInputs = Array.from(document.querySelectorAll("[data-collection-refine]"));
    const clearButton = document.querySelector("[data-collection-clear]");
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
      const collections = buildPublicCollections(brochures, suppliersById);
      const state = {
        category: "",
        search: "",
        material: new Set(),
        theme: new Set(),
        availability: new Set()
      };
      let collectionSearchOpen = false;

      function selectedRefines(group) {
        return Array.from(state[group] || []);
      }

      function setCollectionSearchOpen(isOpen) {
        collectionSearchOpen = Boolean(isOpen);
        searchShell?.classList.toggle("is-open", collectionSearchOpen);
        searchToggle?.setAttribute("aria-expanded", String(collectionSearchOpen));
        if (!searchInput) return;

        searchInput.tabIndex = collectionSearchOpen ? 0 : -1;
        searchInput.setAttribute("aria-hidden", String(!collectionSearchOpen));
        if (collectionSearchOpen) {
          window.setTimeout(() => searchInput.focus(), 20);
        } else {
          searchInput.blur();
        }
      }

      function hasActiveCollectionFilters() {
        return Boolean(
          state.category ||
          state.search ||
          state.material.size ||
          state.theme.size ||
          state.availability.size
        );
      }

      function matchesCollectionFilters(collection) {
        if (state.category && !collection.categories.includes(state.category)) return false;
        if (state.search && !collection.searchText.includes(normalizePublicSearch(state.search))) return false;

        return ["material", "theme", "availability"].every((group) => {
          const tokens = selectedRefines(group);
          return !tokens.length || tokens.some((token) => collectionMatchesToken(collection, token, group));
        });
      }

      function updateCollectionControls() {
        categoryChips?.querySelectorAll("[data-collection-category]").forEach((button) => {
          const isActive = button.dataset.collectionCategory === state.category;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });

        refineInputs.forEach((input) => {
          input.checked = state[input.dataset.collectionRefine]?.has(input.value) || false;
        });

        if (searchInput && searchInput.value !== state.search) searchInput.value = state.search;
        searchShell?.classList.toggle("is-active", Boolean(state.search));
        if (clearButton) clearButton.hidden = !hasActiveCollectionFilters();
      }

      function renderCollectionOverview() {
        const filteredCollections = collections.filter(matchesCollectionFilters);
        updateCollectionControls();
        grid.innerHTML = filteredCollections.length
          ? filteredCollections.map(renderCollectionCard).join("")
          : `
            <article class="contact-card collection-empty-state fade-in">
              <h3>Geen collecties gevonden</h3>
              <p>Pas je zoekterm of selectie aan om meer collecties te bekijken.</p>
              <button class="btn btn-secondary" type="button" data-collection-empty-clear>Wis selectie</button>
            </article>
          `;
        grid.querySelector("[data-collection-empty-clear]")?.addEventListener("click", clearCollectionFilters);
        setupAnimations();
      }

      function clearCollectionFilters() {
        state.category = "";
        state.search = "";
        state.material.clear();
        state.theme.clear();
        state.availability.clear();
        if (window.location.hash.startsWith("#categorie-")) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        renderCollectionOverview();
      }

      categoryChips?.addEventListener("click", (event) => {
        const button = event.target.closest("[data-collection-category]");
        if (!button) return;
        state.category = state.category === button.dataset.collectionCategory ? "" : button.dataset.collectionCategory;
        renderCollectionOverview();
      });

      searchInput?.addEventListener("input", () => {
        state.search = searchInput.value;
        renderCollectionOverview();
      });

      searchToggle?.addEventListener("click", () => {
        setCollectionSearchOpen(!collectionSearchOpen);
      });

      document.addEventListener("click", (event) => {
        if (!collectionSearchOpen || !searchShell || searchShell.contains(event.target)) return;
        setCollectionSearchOpen(false);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && collectionSearchOpen) {
          setCollectionSearchOpen(false);
        }
      });

      refineInputs.forEach((input) => {
        input.addEventListener("change", () => {
          const group = input.dataset.collectionRefine;
          if (!state[group]) return;
          if (input.checked) state[group].add(input.value);
          else state[group].delete(input.value);
          renderCollectionOverview();
        });
      });

      clearButton?.addEventListener("click", clearCollectionFilters);

      function renderBrochureState() {
        const selectedSlug = selectedHashSlug();
        const selectedCategory = collectionCategoryFromHash(selectedSlug);
        const selectedCollection = selectedCategory ? null : collectionBySlug(collections, brochures, selectedSlug);

        if (!collections.length) {
          toggleElement(overviewSection, false);
          toggleElement(detailSection, true);
          grid.innerHTML = `
            <article class="contact-card fade-in">
              <h3>Geen collecties beschikbaar</h3>
              <p>Er zijn nog geen collecties beschikbaar.</p>
            </article>
          `;
          if (detailMount) detailMount.innerHTML = "";
          setupAnimations();
          return;
        }

        if (selectedCategory) {
          body.classList.remove("is-detail-route");
          state.category = selectedCategory;
          updateDocumentTitle("Collecties");
          toggleElement(introSection, false);
          toggleElement(overviewSection, false);
          toggleElement(detailSection, true);
          if (detailMount) detailMount.innerHTML = "";
          renderCollectionOverview();
          window.requestAnimationFrame(() => grid.scrollIntoView({ block: "start" }));
          return;
        }

        if (selectedSlug) {
          body.classList.add("is-detail-route");
          toggleElement(introSection, true);
          toggleElement(overviewSection, true);
          toggleElement(detailSection, false);
          if (detailMount) {
            detailMount.innerHTML = selectedCollection
              ? renderCollectionDetail(selectedCollection)
              : renderDetailEmptyState(
                  "Collectie niet gevonden",
                  "Deze collectie is niet beschikbaar.",
                  href("pages/brochures-catalogi.html"),
                  "Terug naar collecties"
                );
          }
          updateDocumentTitle(selectedCollection?.name || "Collectie niet gevonden");
          setupAnimations();
          scrollToHashTarget();
          return;
        }

        body.classList.remove("is-detail-route");
        updateDocumentTitle("Collecties");
        toggleElement(introSection, false);
        toggleElement(overviewSection, false);
        toggleElement(detailSection, true);
        if (detailMount) detailMount.innerHTML = "";
        renderCollectionOverview();
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
