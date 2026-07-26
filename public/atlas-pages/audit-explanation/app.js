const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const progress = document.querySelector(".scroll-progress span");
const headerLinks = [...document.querySelectorAll('.document-nav a[href^="#"]')];
const findingLinks = [...document.querySelectorAll(".findings-index a")];
const findings = [...document.querySelectorAll(".finding")];

const closeMenu = () => {
  mobileNav?.classList.remove("is-open");
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.setAttribute("aria-label", "Открыть меню");
};

menuButton?.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Закрыть меню" : "Открыть меню");
});

mobileNav?.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  closeMenu();
});

document.addEventListener("click", (event) => {
  if (!mobileNav?.classList.contains("is-open")) return;
  if (mobileNav.contains(event.target) || menuButton?.contains(event.target)) return;
  closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !mobileNav?.classList.contains("is-open")) return;
  closeMenu();
  menuButton?.focus();
});

const updateProgress = () => {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  const value = available > 0 ? (window.scrollY / available) * 100 : 0;
  progress.style.width = `${Math.min(100, Math.max(0, value))}%`;
};

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const navObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    headerLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-25% 0px -60% 0px", threshold: [0.05, 0.2, 0.5] },
);

document.querySelectorAll(".document-section[id]").forEach((section) => navObserver.observe(section));

const findingObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    findingLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-18% 0px -72% 0px", threshold: 0.01 },
);

findings.forEach((finding) => findingObserver.observe(finding));

findings.forEach((finding) => {
  const toggle = finding.querySelector(".finding-toggle");
  toggle?.addEventListener("click", () => {
    const collapsed = finding.classList.toggle("is-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
  });
});

const liveRegion = document.querySelector("[data-live-region]");

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
};

document.querySelectorAll(".technical-cell code").forEach((code) => {
  const value = code.textContent.trim();
  if (value.length < 10) return;
  const button = document.createElement("button");
  button.className = "copy-button";
  button.type = "button";
  button.setAttribute("aria-label", "Скопировать адрес");
  button.addEventListener("click", async () => {
    await copyText(value);
    button.classList.add("is-copied");
    button.setAttribute("aria-label", "Скопировано");
    if (liveRegion) liveRegion.textContent = "Адрес скопирован";
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", "Скопировать адрес");
      if (liveRegion) liveRegion.textContent = "";
    }, 1300);
  });
  code.closest(".technical-cell").append(button);
});

const openFindingFromHash = () => {
  if (!window.location.hash) return;
  const finding = document.querySelector(window.location.hash);
  if (!finding?.classList.contains("finding")) return;
  finding.classList.remove("is-collapsed");
  finding.querySelector(".finding-toggle")?.setAttribute("aria-expanded", "true");
};

window.addEventListener("hashchange", openFindingFromHash);
openFindingFromHash();

let printState = [];
window.addEventListener("beforeprint", () => {
  printState = findings.map((finding) => finding.classList.contains("is-collapsed"));
  findings.forEach((finding) => finding.classList.remove("is-collapsed"));
});
window.addEventListener("afterprint", () => {
  findings.forEach((finding, index) => {
    finding.classList.toggle("is-collapsed", Boolean(printState[index]));
  });
});
