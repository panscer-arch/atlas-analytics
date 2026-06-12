import {
  findFirstCoverValue,
  getWhitePaperCoverLines,
} from "../utils/whitePaperUtils";

export function WhitePaperCoverPreview({ block }) {
  const lines = getWhitePaperCoverLines(block.text);
  const title = lines[0] || "Atlas System White Paper";
  const subtitle = lines[1] || "Web3-протокол взаимной поддержки с DAO-inspired механиками";
  const version = findFirstCoverValue(lines, ["Версия", "Version"]) || "0.1";
  const status = findFirstCoverValue(lines, ["Статус", "Status"]) || "рабочая версия для вычитки";
  const date = findFirstCoverValue(lines, ["Дата", "Date"]) || "июнь 2026";
  const network = findFirstCoverValue(lines, ["Основная сеть", "Primary Network"]) || "BNB Smart Chain";
  const website = findFirstCoverValue(lines, ["Официальный сайт", "Official Website"]) || "https://atlas-system.io";
  const telegram = findFirstCoverValue(lines, ["Официальный Telegram-канал", "Official Telegram Channel"]) || "@atlas_system_official";
  const community = findFirstCoverValue(lines, ["Официальное Telegram-сообщество", "Official Telegram Community"]) || "@atlas_system_global_community";
  const xLink = findFirstCoverValue(lines, ["Официальный X", "Official X"]) || "https://x.com/AtlasSystemWeb3";
  const registry = findFirstCoverValue(lines, ["Реестр смарт-контрактов", "Contract Registry"]) || "будет подтвержден перед публичным релизом";
  const repository = findFirstCoverValue(lines, ["Технический репозиторий", "Technical Repository"]) || "будет подтвержден перед публичным релизом";
  const docs = findFirstCoverValue(lines, ["Центр документации", "Documentation Hub"]) || "будет подтвержден перед публичным релизом";

  return (
    <section className="analytics-whitepaper-cover-preview" aria-label="Предпросмотр обложки White Paper">
      <div className="analytics-whitepaper-cover-grid" aria-hidden="true" />
      <div className="analytics-whitepaper-cover-mark" aria-hidden="true" />
      <div className="analytics-whitepaper-cover-orbit" aria-hidden="true">
        <img src="/generated/atlas-network-reference.png" alt="" />
      </div>

      <div className="analytics-whitepaper-cover-header">
        <img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" />
        <div>
          <span>White Paper</span>
          <strong>{status}</strong>
        </div>
      </div>

      <div className="analytics-whitepaper-cover-body">
        <div className="analytics-whitepaper-cover-copy">
          <span className="analytics-whitepaper-cover-kicker">Atlas System</span>
          <h3>{title}</h3>
          <p>{subtitle}</p>
          <div className="analytics-whitepaper-cover-tags">
            <span>Smart Cycle</span>
            <span>Партнерский слой</span>
            <span>Раскрытие рисков</span>
            <span>DAO-inspired механики</span>
          </div>
        </div>

        <div className="analytics-whitepaper-cover-card">
          <dl>
            <div>
              <dt>Версия</dt>
              <dd>{version}</dd>
            </div>
            <div>
              <dt>Дата</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Сеть</dt>
              <dd>{network}</dd>
            </div>
            <div>
              <dt>Реестр</dt>
              <dd>{registry}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="analytics-whitepaper-cover-footer">
        <div>
          <span>Официальный сайт</span>
          <strong>{website}</strong>
        </div>
        <div>
          <span>Telegram</span>
          <strong>{telegram}</strong>
        </div>
        <div>
          <span>Community</span>
          <strong>{community}</strong>
        </div>
        <div>
          <span>X</span>
          <strong>{xLink}</strong>
        </div>
        <div>
          <span>Документация</span>
          <strong>{docs}</strong>
        </div>
        <div>
          <span>Репозиторий</span>
          <strong>{repository}</strong>
        </div>
      </div>
    </section>
  );
}

export function WhitePaperLegalPreview({ block }) {
  const lines = getWhitePaperCoverLines(block.text);
  const title = lines[0] || "Юридическое уведомление и как читать документ";
  const paragraphs = String(block.text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .slice(1);
  const lead = paragraphs[0] || "Этот White Paper подготовлен для информационной, технической и редакционной вычитки.";
  const coreItems = [
    "Не является токенсейлом, ICO, проспектом или документом с гарантированной доходностью.",
    "Не является финансовой, инвестиционной, юридической, налоговой или регуляторной рекомендацией.",
    "Любые on-chain действия проверяются и подтверждаются участником через собственный кошелек.",
    "Официальный сайт, реестр контрактов и последняя опубликованная версия остаются источником истины.",
  ];

  return (
    <section className="analytics-whitepaper-page-preview analytics-whitepaper-legal-preview" aria-label="Предпросмотр Legal Notice">
      <div className="analytics-whitepaper-page-watermark" aria-hidden="true">02</div>
      <div className="analytics-whitepaper-page-header">
        <img src="/generated/atlas-logo-new-transparent.png" alt="Atlas System" />
        <span>Atlas System White Paper</span>
      </div>

      <div className="analytics-whitepaper-page-title">
        <span>Юридическая рамка</span>
        <h3>{title}</h3>
        <p>{lead}</p>
      </div>

      <div className="analytics-whitepaper-legal-grid">
        {coreItems.map((item, index) => (
          <div key={item} className="analytics-whitepaper-legal-card">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-whitepaper-reader-guide">
        <div>
          <span>Как читать</span>
          <strong>Техническое и информационное раскрытие</strong>
        </div>
        <div>
          <span>Как не читать</span>
          <strong>Инвестиционное обещание, токенсейл или гарантию</strong>
        </div>
        <div>
          <span>Проверить перед действием</span>
          <strong>Сеть, адрес контракта, параметры транзакции и текущую версию</strong>
        </div>
      </div>
    </section>
  );
}
