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

  const links = [
    { id: "home", title: "Home", path: "index.html", description: "Startpunt voor de Non-Food Hub" },
    { id: "leveranciers", title: "Leveranciers", path: "pages/leveranciers.html", description: "Partners, merken en productgroepen" },
    { id: "brochures", title: "Brochures & Catalogi", path: "pages/brochures-catalogi.html", description: "Collecties en catalogusoverzicht" },
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

    const dropdowns = navGroups.map((group) => {
      const items = group.items.map((id) => {
        const link = linkById(id);
        return `
          <li>
            <a href="${href(link.path)}" class="${currentPage === link.id ? "is-active" : ""}">
              ${link.title}
              <span>${link.description}</span>
            </a>
          </li>
        `;
      }).join("");

      return `
        <li class="dropdown">
          <button class="dropdown-toggle" type="button" aria-haspopup="true">${group.title}</button>
          <ul class="dropdown-menu">${items}</ul>
        </li>
      `;
    }).join("");

    const mobileLinks = links.map((link) => `
      <a href="${href(link.path)}" class="${currentPage === link.id ? "is-active" : ""}">
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
              <li><a class="nav-link ${currentPage === "home" ? "is-active" : ""}" href="${href("index.html")}">Home</a></li>
              ${dropdowns}
            </ul>
          </nav>
          <div class="header-actions">
            <button class="icon-button search-trigger" type="button" aria-label="Zoeken">
              <span class="icon-search" aria-hidden="true"></span>
            </button>
            <a class="btn btn-primary" href="${href("pages/contact.html")}">Advies aanvragen</a>
            <button class="nav-toggle" type="button" aria-label="Menu openen" aria-expanded="false">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>
      <nav class="mobile-panel" aria-label="Mobiele navigatie">${mobileLinks}</nav>
      <div class="search-overlay" role="dialog" aria-modal="true" aria-label="Zoeken">
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
              <li><a href="${href("pages/inspiratie.html")}">Kennisbank</a></li>
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
          <div class="container">Fase 1 statische website. Content wordt gecontroleerd via centrale publieke projecties.</div>
        </div>
      </footer>
    `;
  }

  function setupNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const isOpen = body.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    document.querySelectorAll(".mobile-panel a").forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("nav-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
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

    function openSearch() {
      body.classList.add("search-open");
      renderResults("");
      window.setTimeout(() => input.focus(), 30);
    }

    function closeSearch() {
      body.classList.remove("search-open");
      input.value = "";
    }

    openButtons.forEach((button) => button.addEventListener("click", openSearch));
    closeButton.addEventListener("click", closeSearch);
    input.addEventListener("input", () => renderResults(input.value));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        body.classList.remove("nav-open");
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

        bar.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");

        cards.forEach((card) => {
          const categories = card.dataset.categories.toLowerCase();
          const visible = filter === "all" || categories.includes(filter);
          card.classList.toggle("is-hidden", !visible);
        });
      });
    });
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
    return `${href("pages/leveranciers.html")}#${escapeHtml(supplier.slug)}`;
  }

  function renderPublicArticleCard(article) {
    return `
      <a class="article-card fade-in" href="#${escapeHtml(article.slug)}">
        <img src="${escapeHtml(publicArticleImage(article))}" alt="${escapeHtml(article.title)}">
        <div class="article-card-body">
          <div class="card-meta">
            <span class="tag">${escapeHtml(article.category || "Inspiratie")}</span>
            ${publicArticleSupplierMeta(article)}
          </div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
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
        <p class="kicker">${escapeHtml(article.category || "Inspiratie")}${article.updatedAt ? ` - Bijgewerkt ${escapeHtml(article.updatedAt)}` : ""}</p>
        <h2>${escapeHtml(article.title)}</h2>
        <p class="lead">${escapeHtml(article.summary)}</p>
        ${paragraphs}
        ${renderArticleSupplierLinks(article)}
      </article>
    `;
  }

  function renderArticleSupplierLinks(article) {
    const suppliers = articleSuppliers(article);
    if (!suppliers.length) return "";

    return `
      <div class="contact-card supplier-detail-section">
        <p class="kicker">Leveranciers</p>
        <h3>Gerelateerde leveranciers</h3>
        <div class="section-actions">
          ${suppliers.map((supplier) => `<a class="btn btn-secondary" href="${supplierPageLink(supplier)}">${escapeHtml(supplier.name)}</a>`).join("")}
        </div>
      </div>
    `;
  }

  async function setupPublicArticles() {
    if (currentPage !== "inspiratie") return;

    const grid = document.querySelector("[data-public-article-grid]");
    const bodyMount = document.querySelector("[data-public-article-body]");
    if (!grid || !bodyMount) return;

    try {
      const response = await fetch(href("data/public/articles.json"), { cache: "no-store" });
      if (!response.ok) throw new Error("Publieke kennisbankdata kon niet worden geladen.");

      const data = await response.json();
      const articles = Array.isArray(data.items) ? data.items : [];

      if (!articles.length) {
        grid.innerHTML = `
          <article class="contact-card fade-in">
            <h3>Geen artikelen beschikbaar</h3>
            <p>Er zijn nog geen gepubliceerde kennisbankartikelen beschikbaar.</p>
          </article>
        `;
        bodyMount.innerHTML = "";
        setupAnimations();
        return;
      }

      grid.innerHTML = articles.map(renderPublicArticleCard).join("");
      bodyMount.innerHTML = articles.map(renderPublicArticleBody).join("");
      setupAnimations();
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

  function renderPublicSupplierTags(supplier) {
    const categories = supplierCategories(supplier);
    const tags = [supplier.type, ...categories].filter(Boolean).slice(0, 4);
    return tags.map((tag, index) => `<span class="tag${index === 0 ? " blue" : ""}">${escapeHtml(tag)}</span>`).join("");
  }

  function renderPublicSupplierCard(supplier) {
    return `
      <a class="supplier-card fade-in" href="#${escapeHtml(supplier.slug)}">
        <img src="${escapeHtml(publicSupplierImage(supplier))}" alt="${escapeHtml(supplier.name)}">
        <div class="supplier-card-body">
          <div class="card-meta">${renderPublicSupplierTags(supplier)}</div>
          <h3>${escapeHtml(supplier.name)}</h3>
          <p>${escapeHtml(supplier.summary)}</p>
          <span class="card-link">Bekijk leverancier</span>
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

  function publicBrochureSupplierMeta(brochure, suppliersById) {
    const supplier = suppliersById?.get(brochure.supplierId);
    return supplier ? `<a class="tag sky" href="${supplierPageLink(supplier)}">Van ${escapeHtml(supplier.name)}</a>` : "";
  }

  function renderPublicBrochureCard(brochure, suppliersById = new Map(), options = {}) {
    const downloadAction = brochure.downloadUrl
      ? `<a class="card-link" href="${escapeHtml(href(brochure.downloadUrl))}" download>Download brochure</a>`
      : `<p class="file-name">Download nog niet beschikbaar</p>`;
    const cardLink = options.linkToBrochurePage ? `${href("pages/brochures-catalogi.html")}#${escapeHtml(brochure.slug)}` : `#${escapeHtml(brochure.slug)}`;
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

  function renderSupplierRelatedArticleCard(article) {
    return `
      <a class="article-card fade-in" href="${href("pages/inspiratie.html")}#${escapeHtml(article.slug)}">
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
          <p>Voor deze leverancier zijn nog geen publieke kennisbankartikelen gekoppeld.</p>
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
          <p>Voor deze leverancier zijn nog geen publieke brochures gekoppeld.</p>
        </div>
      `;
    }

    return `<div class="grid grid-3">${brochures.map((brochure) => renderPublicBrochureCard(brochure, suppliersById, { linkToBrochurePage: true })).join("")}</div>`;
  }

  function renderPublicSupplierDetail(supplier) {
    const description = supplier.description ? `<p>${escapeHtml(supplier.description)}</p>` : "";
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
        <div class="split">
          <div>
            ${logo}
            <p class="kicker">${supplierCategories(supplier).map(escapeHtml).join(" / ") || "Leverancier"}</p>
            <h2>${escapeHtml(supplier.name)}</h2>
            <p class="lead">${escapeHtml(supplier.summary)}</p>
            ${description}
            <div class="section-actions">
              <a class="btn btn-primary" href="#${escapeHtml(supplier.slug)}-brochures">Bekijk brochures</a>
              <a class="btn btn-secondary" href="#${escapeHtml(supplier.slug)}-artikelen">Meer inspiratie</a>
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
    if (!grid || !detailMount) return;

    try {
      const response = await fetch(href("data/public/suppliers.json"), { cache: "no-store" });
      if (!response.ok) throw new Error("Publieke leveranciersdata kon niet worden geladen.");

      const data = await response.json();
      const suppliers = Array.isArray(data.items) ? data.items : [];

      if (!suppliers.length) {
        grid.innerHTML = `
          <article class="contact-card fade-in">
            <h3>Geen leveranciers beschikbaar</h3>
            <p>Er zijn nog geen gepubliceerde leveranciers beschikbaar.</p>
          </article>
        `;
        detailMount.innerHTML = "";
        setupAnimations();
        return;
      }

      grid.innerHTML = suppliers.map(renderPublicSupplierCard).join("");
      detailMount.innerHTML = suppliers.map(renderPublicSupplierDetail).join("");
      setupAnimations();
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
    if (!grid) return;

    try {
      const [brochureResponse, supplierResponse] = await Promise.all([
        fetch(href("data/public/brochures.json"), { cache: "no-store" }),
        fetch(href("data/public/suppliers.json"), { cache: "no-store" })
      ]);
      if (!brochureResponse.ok) throw new Error("Publieke brochuredata kon niet worden geladen.");
      if (!supplierResponse.ok) throw new Error("Publieke leveranciersdata kon niet worden geladen.");

      const brochureData = await brochureResponse.json();
      const supplierData = await supplierResponse.json();
      const brochures = Array.isArray(brochureData.items) ? brochureData.items : [];
      const suppliers = Array.isArray(supplierData.items) ? supplierData.items : [];
      const suppliersById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

      if (!brochures.length) {
        grid.innerHTML = `
          <article class="contact-card fade-in">
            <h3>Geen brochures beschikbaar</h3>
            <p>Er zijn nog geen gepubliceerde brochures beschikbaar.</p>
          </article>
        `;
        setupAnimations();
        return;
      }

      grid.innerHTML = brochures.map((brochure) => renderPublicBrochureCard(brochure, suppliersById)).join("");
      setupAnimations();
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
})();
