(() => {
  const documentRoot = document.querySelector("#document");
  const tocNav = document.querySelector(".toc-nav");
  const navTrigger = document.querySelector(".toc-trigger");
  const tocDrawer = document.querySelector(".toc-drawer");
  const tocClose = document.querySelector(".toc-close");
  const tocBackdrop = document.querySelector(".toc-backdrop");
  const siteMenuTrigger = document.querySelector(".site-menu-trigger");
  const mobileSiteMenu = document.querySelector(".mobile-site-menu");
  const searchDialog = document.querySelector(".search-dialog");
  const searchInput = document.querySelector("#document-search");
  const searchResults = document.querySelector(".search-results");
  const copyStatus = document.querySelector(".copy-status");

  const pageIds = {
    2: "verification-summary",
    3: "contracts",
    4: "liquidity",
    5: "ownership",
    6: "lp-permissions",
    7: "architecture",
    8: "data-freshness",
    9: "address-index",
    10: "document-governance"
  };

  const headingIds = new Map([
    ["Основные независимые проверки", "independent-checks"],
    ["2.1 Контракты для участников", "contracts-participant"],
    ["2.2 Сервисные контракты", "contracts-service"],
    ["Граница учитываемых данных", "liquidity-boundary"],
    ["4.2 SAFE Atlas", "safe-atlas"],
    ["4.3 Treasury и отдельный управляющий адрес", "treasury"],
    ["6.1 Поток Smart Cycle", "smart-cycle-flow"],
    ["6.2 Поток партнерских вознаграждений", "partner-flow"],
    ["6.3 Упрощенная архитектура", "architecture-map"],
    ["7. Чек-лист независимой проверки", "due-diligence"],
    ["10. Правила обновления реестра", "update-rules"],
    ["Версии и изменения", "versions"],
    ["11. Важное пояснение", "important-notice"]
  ]);

  const sectionVisuals = {
    4: {
      name: "liquidity",
      src: "assets/registry-liquidity.jpg",
      alt: "Иллюстрация общей инфраструктуры ликвидности Atlas"
    },
    7: {
      name: "flows",
      src: "assets/registry-flows.jpg",
      alt: "Иллюстрация движения средств между компонентами Atlas"
    },
    8: {
      name: "verification",
      src: "assets/registry-verification.jpg",
      alt: "Иллюстрация независимой проверки технических данных Atlas"
    }
  };

  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  const addExternalBehavior = (root) => {
    root.querySelectorAll('a[href^="http"]').forEach((link) => {
      link.target = "_blank";
      link.rel = "noreferrer";
      link.setAttribute("aria-label", `${normalize(link.textContent)} — открыть в новой вкладке`);
    });
  };

  const buildHero = (page) => {
    const hero = document.createElement("section");
    hero.className = "document-hero";
    hero.id = "scope";

    const title = page.querySelector("h1")?.cloneNode(true);
    const lead = page.querySelector(".lead")?.cloneNode(true);
    const notice = page.querySelector(".note")?.cloneNode(true);

    const kicker = document.createElement("div");
    kicker.className = "hero-kicker";
    kicker.textContent = page.querySelector(".eyebrow")?.textContent || "BNB SMART CHAIN";

    hero.append(kicker);
    if (title) hero.append(title);
    if (lead) hero.append(lead);
    if (notice) {
      notice.className = "hero-notice";
      hero.append(notice);
    }

    const visual = document.createElement("img");
    visual.className = "hero-visual";
    visual.src = "assets/registry-contracts.jpg";
    visual.alt = "Архитектура реестра смарт-контрактов Atlas";
    visual.decoding = "async";
    visual.fetchPriority = "high";
    visual.width = 1600;
    visual.height = 914;
    hero.append(visual);

    return hero;
  };

  const createSectionVisual = ({ name, src, alt }) => {
    const figure = document.createElement("figure");
    figure.className = "section-visual";
    figure.dataset.visual = name;

    const image = document.createElement("img");
    image.src = src;
    image.alt = alt;
    image.loading = "lazy";
    image.decoding = "async";
    image.width = 1600;
    image.height = 914;

    figure.append(image);
    return figure;
  };

  const assignHeadingIds = (root) => {
    root.querySelectorAll("h1, h2, h3, .section-band").forEach((heading) => {
      const label = normalize(heading.textContent);
      const id = headingIds.get(label);
      if (id) heading.id = id;
    });
  };

  const wrapTables = (root) => {
    root.querySelectorAll("table").forEach((table) => {
      if (table.parentElement?.classList.contains("table-shell")) return;
      const labels = [...table.querySelectorAll("thead th")].map((cell) => normalize(cell.textContent));
      table.querySelectorAll("thead th").forEach((cell) => cell.setAttribute("scope", "col"));
      table.querySelectorAll("tbody tr").forEach((row) => {
        [...row.children].forEach((cell, index) => {
          cell.dataset.label = labels[index] || "Значение";
        });
      });
      const shell = document.createElement("div");
      shell.className = "table-shell";
      shell.setAttribute("role", "region");
      shell.setAttribute("aria-label", "Техническая таблица — прокручивается по горизонтали");
      shell.tabIndex = 0;
      table.parentNode.insertBefore(shell, table);
      shell.append(table);
    });
  };

  const addCopyControls = (root) => {
    root.querySelectorAll("td.mono, .card > .mono").forEach((cell) => {
      if (cell.querySelector(".copy-button")) return;
      const value = normalize(cell.textContent);
      if (!value) return;

      const row = document.createElement("div");
      row.className = "address-row";

      const address = document.createElement("bdi");
      address.className = "mono";
      address.dir = "ltr";
      address.translate = false;
      address.textContent = value;

      const button = document.createElement("button");
      button.className = "copy-button";
      button.type = "button";
      button.title = "Копировать";
      button.setAttribute("aria-label", `Копировать ${value}`);
      button.textContent = "⧉";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const helper = document.createElement("textarea");
          helper.value = value;
          document.body.append(helper);
          helper.select();
          document.execCommand("copy");
          helper.remove();
        }
        button.dataset.copied = "true";
        button.textContent = "✓";
        copyStatus.textContent = "Скопировано";
        copyStatus.classList.add("visible");
        window.setTimeout(() => {
          button.dataset.copied = "false";
          button.textContent = "⧉";
          copyStatus.classList.remove("visible");
        }, 1600);
      });

      row.append(address, button);
      cell.textContent = "";
      cell.classList.add("address-cell");
      cell.append(row);
    });
  };

  const enhanceProcessFlows = (root) => {
    root.querySelectorAll(".card").forEach((card) => {
      const title = normalize(card.querySelector("h3")?.textContent || "");
      if (title.startsWith("6.1 ") || title.startsWith("6.2 ")) {
        card.classList.add("process-flow");
      }
    });
  };

  const enhanceStatuses = (root) => {
    const states = new Map([
      ["Текущий", "current"],
      ["Legacy", "legacy"],
      ["Оператор одобрен", "approved"],
      ["Операторского доступа нет", "none"],
      ["SAFE 2-of-3", "control"]
    ]);

    root.querySelectorAll("td").forEach((cell) => {
      const value = normalize(cell.textContent);
      const state = states.get(value);
      if (!state) return;
      const tag = document.createElement("span");
      tag.className = "status-tag";
      tag.dataset.state = state;
      tag.textContent = value;
      cell.replaceChildren(tag);
    });
  };

  const createArchitectureMap = () => {
    const map = document.createElement("div");
    map.className = "architecture-map";
    map.setAttribute("aria-label", "Упрощенная архитектура Atlas");
    map.innerHTML = `
      <div class="arch-node arch-participants has-arrow">Участники<small>создание циклов и Claim</small></div>
      <div class="arch-stack arch-flows has-arrow">
        <div class="arch-node external">Lockup Flow</div>
        <div class="arch-node external">Daily Flow V2</div>
        <div class="arch-node external">Daily Flow V1</div>
      </div>
      <div class="arch-node external arch-liquidity has-arrow">PancakeSwap V3 LP-NFT<small>#6928212 · USDT / USDC</small></div>
      <div class="arch-node control arch-safe">SAFE Atlas<small>владелец · 2-of-3</small></div>
      <div class="arch-node arch-service has-arrow">Сервисный слой<small>off-chain расчет</small></div>
      <div class="arch-node arch-transport has-arrow">Transport</div>
      <div class="arch-node arch-distribute has-arrow">Distribute</div>
      <div class="arch-node arch-recipient">Получатель вознаграждения</div>
      <div class="arch-node fee arch-treasury">Treasury<small>комиссии Flow и Distribute</small></div>`;
    return map;
  };

  const enhanceArchitecture = (root) => {
    const source = root.querySelector(".architecture");
    if (!source) return;

    const wrap = document.createElement("div");
    wrap.className = "architecture-wrap";
    source.parentNode.insertBefore(wrap, source);
    wrap.append(createArchitectureMap());

    const details = document.createElement("details");
    details.className = "architecture-source";
    const summary = document.createElement("summary");
    summary.textContent = "Исходная текстовая схема";
    details.append(summary, source);
    wrap.append(details);
  };

  const buildSections = (sourceDocument) => {
    const sourcePages = [...sourceDocument.querySelectorAll("body > .source-page")];
    if (sourcePages.length < 10) throw new Error("Source registry is incomplete.");

    documentRoot.replaceChildren(buildHero(sourcePages[0]));

    sourcePages.slice(1).forEach((page) => {
      const section = document.createElement("section");
      section.className = "document-section";
      section.id = pageIds[Number(page.dataset.page)] || `section-${page.dataset.page}`;
      section.dataset.label = page.dataset.label;

      [...page.children].forEach((node) => section.append(node.cloneNode(true)));

      section.querySelectorAll("h1").forEach((heading) => {
        const replacement = document.createElement("h2");
        replacement.className = "section-title";
        replacement.innerHTML = heading.innerHTML;
        [...heading.attributes].forEach((attribute) => replacement.setAttribute(attribute.name, attribute.value));
        heading.replaceWith(replacement);
      });

      const visual = sectionVisuals[Number(page.dataset.page)];
      if (visual) {
        section.querySelector(".section-title")?.insertAdjacentElement("afterend", createSectionVisual(visual));
      }

      assignHeadingIds(section);
      wrapTables(section);
      addCopyControls(section);
      enhanceStatuses(section);
      enhanceProcessFlows(section);
      enhanceArchitecture(section);
      addExternalBehavior(section);
      documentRoot.append(section);
    });

    addExternalBehavior(documentRoot);
  };

  const buildNavigation = () => {
    const destinations = [
      ["scope", "Область документа"],
      ["verification-summary", "Краткое резюме проверки"],
      ["independent-checks", "Основные независимые проверки"],
      ["contracts", "Реестр контрактов Atlas"],
      ["liquidity", "Инфраструктура ликвидности"],
      ["ownership", "Владение и управление"],
      ["lp-permissions", "LP-NFT и разрешения"],
      ["smart-cycle-flow", "Поток Smart Cycle"],
      ["partner-flow", "Партнерские вознаграждения"],
      ["architecture-map", "Упрощенная архитектура"],
      ["due-diligence", "Чек-лист проверки"],
      ["data-freshness", "Постоянные и динамические значения"],
      ["address-index", "Полный индекс адресов"],
      ["update-rules", "Правила обновления"],
      ["versions", "Версии и изменения"],
      ["important-notice", "Важное пояснение"]
    ];

    tocNav.replaceChildren(...destinations
      .filter(([id]) => document.getElementById(id))
      .map(([id, label]) => {
        const link = document.createElement("a");
        link.href = `#${id}`;
        link.textContent = label;
        link.addEventListener("click", closeNavigation);
        return link;
      }));
  };

  const closeNavigation = () => {
    document.body.classList.remove("nav-open");
    navTrigger.setAttribute("aria-expanded", "false");
    tocDrawer.setAttribute("aria-hidden", "true");
    tocBackdrop.hidden = true;
  };

  const openNavigation = () => {
    document.body.classList.add("nav-open");
    navTrigger.setAttribute("aria-expanded", "true");
    tocDrawer.setAttribute("aria-hidden", "false");
    tocBackdrop.hidden = false;
    tocClose.focus();
  };

  const installScrollState = () => {
    const links = [...tocNav.querySelectorAll("a")];
    const targets = links.map((link) => document.querySelector(link.hash)).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      links.forEach((link) => {
        if (link.hash === `#${visible.target.id}`) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }, { rootMargin: "-20% 0px -68% 0px", threshold: [0, .2, .5] });

    targets.forEach((target) => observer.observe(target));

    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
      document.querySelector(".reading-progress i").style.width = `${progress}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  };

  const createSearchIndex = () => {
    return [...documentRoot.querySelectorAll("h1, h2, h3, p, li, td")]
      .map((node, index) => {
        if (!node.id) node.id = `text-${index + 1}`;
        const section = node.closest(".document-section, .document-hero");
        return {
          id: node.id,
          label: normalize(node.textContent),
          section: section?.dataset.label || "Область документа"
        };
      })
      .filter((item) => item.label.length > 2);
  };

  const installSearch = () => {
    const index = createSearchIndex();

    const renderResults = (query) => {
      const term = normalize(query).toLocaleLowerCase("ru");
      if (!term) {
        searchResults.innerHTML = '<p class="search-empty">Введите название, адрес, ID или функцию.</p>';
        return;
      }

      const exact = [];
      const partial = [];
      index.forEach((item) => {
        const haystack = item.label.toLocaleLowerCase("ru");
        if (haystack === term) exact.push(item);
        else if (haystack.includes(term)) partial.push(item);
      });

      const matches = [...exact, ...partial].slice(0, 16);
      if (!matches.length) {
        searchResults.innerHTML = '<p class="search-empty">Совпадений не найдено.</p>';
        return;
      }

      searchResults.replaceChildren(...matches.map((item) => {
        const link = document.createElement("a");
        link.className = "search-result";
        link.href = `#${item.id}`;
        link.innerHTML = `<b>${item.section}</b><span>${item.label}</span>`;
        link.addEventListener("click", () => searchDialog.close());
        return link;
      }));
    };

    const openSearch = () => {
      if (!searchDialog.open) searchDialog.showModal();
      window.setTimeout(() => searchInput.focus(), 0);
      renderResults(searchInput.value);
    };

    document.querySelector(".search-trigger").addEventListener("click", openSearch);
    document.querySelector(".search-close").addEventListener("click", () => searchDialog.close());
    document.querySelectorAll(".search-hint button").forEach((button) => {
      button.addEventListener("click", () => {
        searchInput.value = button.textContent;
        renderResults(button.textContent);
        searchInput.focus();
      });
    });
    searchInput.addEventListener("input", () => renderResults(searchInput.value));

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
        event.preventDefault();
        openSearch();
      }
    });
  };

  const installControls = () => {
    navTrigger.addEventListener("click", () => {
      if (document.body.classList.contains("nav-open")) closeNavigation();
      else openNavigation();
    });
    tocClose.addEventListener("click", closeNavigation);
    tocBackdrop.addEventListener("click", closeNavigation);
    siteMenuTrigger.addEventListener("click", () => {
      const isOpen = siteMenuTrigger.getAttribute("aria-expanded") === "true";
      siteMenuTrigger.setAttribute("aria-expanded", String(!isOpen));
      mobileSiteMenu.hidden = isOpen;
    });
  };

  const revealHashTarget = () => {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (!target) return;
    target.closest("details")?.setAttribute("open", "");
    window.setTimeout(() => target.scrollIntoView({ block: "start" }), 80);
  };

  const init = async () => {
    try {
      const response = await fetch("content-ru.html", { cache: "no-store" });
      if (!response.ok) throw new Error(`Source request failed: ${response.status}`);
      const sourceHtml = await response.text();
      const sourceDocument = new DOMParser().parseFromString(sourceHtml, "text/html");
      buildSections(sourceDocument);
      buildNavigation();
      installControls();
      installScrollState();
      installSearch();
      revealHashTarget();
      document.body.classList.add("ready");
    } catch (error) {
      documentRoot.innerHTML = `
        <section class="document-section">
          <h1>Не удалось открыть реестр</h1>
          <p>Документ необходимо открывать через веб-сервер, чтобы загрузить защищенный исходный текст.</p>
          <p class="mono">${String(error.message || error)}</p>
        </section>`;
      console.error(error);
    }
  };

  init();
})();
