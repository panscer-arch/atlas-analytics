import "./AtlasPagesBoard.css";

const ATLAS_PAGES = [
  {
    id: "contract-registry",
    title: "Официальный реестр смарт-контрактов и инфраструктуры",
    description:
      "Интерактивная страница с адресами контрактов, структурой управления, инфраструктурой ликвидности и ссылками для независимой on-chain проверки.",
    href: "/atlas-pages/contract-registry/index.html",
    preview: "/atlas-pages/contract-registry/assets/registry-contracts.jpg",
    format: "HTML",
    language: "RU",
  },
];

function AtlasPagesBoard() {
  return (
    <section className="atlas-pages-board">
      <header className="atlas-pages-header">
        <div>
          <span className="atlas-pages-kicker">Content / публичные материалы</span>
          <h2>Страницы Atlas</h2>
          <p>
            Готовые интерактивные страницы Atlas, опубликованные на домене SuperSUS. Здесь можно открыть материал,
            проверить адаптивную версию и передать прямую ссылку команде.
          </p>
        </div>
        <strong>{ATLAS_PAGES.length} страница</strong>
      </header>

      <div className="atlas-pages-grid">
        {ATLAS_PAGES.map((page) => (
          <article className="atlas-pages-card" key={page.id}>
            <div className="atlas-pages-preview">
              <img src={page.preview} alt="" loading="eager" decoding="async" fetchPriority="high" />
            </div>

            <div className="atlas-pages-card-content">
              <div className="atlas-pages-badges" aria-label="Параметры страницы">
                <span>{page.format}</span>
                <span>{page.language}</span>
                <span>Адаптивная</span>
              </div>

              <h3>{page.title}</h3>
              <p>{page.description}</p>

              <div className="atlas-pages-card-footer">
                <span>Публичный материал</span>
                <a href={page.href} target="_blank" rel="noreferrer">
                  Открыть страницу <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AtlasPagesBoard;
