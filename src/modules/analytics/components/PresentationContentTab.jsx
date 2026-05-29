import { useState } from "react";

const presentationSlides = [
  {
    id: "slide-01",
    number: "01",
    title: "Atlas System",
    status: "Согласовано",
    description:
      "Первый слайд открывает презентацию простым объяснением для новичка: Atlas System — это цифровая система взаимопомощи, где люди добровольно объединяют средства, а правила распределения заранее записаны в smart-contract.",
    slideText: [
      "Atlas System",
      "Цифровая система взаимопомощи",
      "Люди добровольно объединяют средства, а правила распределения заранее записаны в smart-contract.",
    ],
    image: "/generated/atlas-presentation-slide-01.png",
  },
  {
    id: "slide-02",
    number: "02",
    title: "Как это работает",
    status: "Черновик",
    description:
      "Второй слайд объясняет механику без перегруза: участник использует цифровой кошелёк, smart-contract хранит заранее заданные правила, а ключевые действия фиксируются в блокчейне.",
    slideText: [
      "Как это работает",
      "Кошелёк → smart-contract → прозрачное распределение",
      "Участник подключает цифровой кошелёк. Smart-contract хранит правила и автоматически выполняет распределение по логике системы.",
    ],
    image: "/generated/atlas-presentation-slide-02.png",
  },
  {
    id: "slide-03",
    number: "03",
    title: "Почему это прозрачно",
    status: "Черновик",
    description:
      "Третий слайд закрывает главный вопрос доверия: правила записаны заранее, ключевые операции фиксируются on-chain, а участник может проверять статус, историю действий и условия smart-contract.",
    slideText: [
      "Почему это прозрачно",
      "Правила записаны заранее, действия видны в блокчейне",
      "Ключевые операции фиксируются on-chain. Участник видит статус цикла, историю действий и условия smart-contract.",
    ],
    image: "/generated/atlas-presentation-slide-03.png",
  },
  {
    id: "slide-04",
    number: "04",
    title: "Smart Cycle",
    status: "Черновик",
    description:
      "Четвёртый слайд вводит базовый продукт Atlas System простым языком: Smart Cycle — это цикл участия, где человек выбирает формат, оказывает добровольную помощь и отслеживает этапы работы в системе.",
    slideText: [
      "Smart Cycle",
      "Базовый цикл участия в Atlas System",
      "Участник выбирает формат цикла, оказывает добровольную помощь и видит этапы работы в системе.",
    ],
    image: "/generated/atlas-presentation-slide-04.png",
  },
  {
    id: "slide-05",
    number: "05",
    title: "Форматы участия",
    status: "План",
    description:
      "Слайд объясняет, что в системе есть разные форматы циклов: короткие тестовые варианты, lockup-циклы и daily-форматы. Без перегруза цифрами, чтобы новичок сначала понял принцип выбора.",
    slideText: [
      "Форматы участия",
      "Каждый выбирает цикл под свой уровень готовности",
      "В Atlas System есть разные форматы участия: от короткого теста до более длительных циклов. Пользователь сам выбирает подходящий вариант и действует по правилам системы.",
    ],
  },
  {
    id: "slide-06",
    number: "06",
    title: "Lockup Flow",
    status: "План",
    description:
      "Слайд простыми словами объясняет lockup: средства отправляются в цикл на заранее понятный срок, после чего участник может запросить возврат помощи и добавочную помощь при наличии ликвидности.",
    slideText: [
      "Lockup Flow",
      "Цикл с заранее понятным сроком",
      "Участник выбирает формат, отправляет добровольную помощь в smart-contract и ждёт завершения lockup-периода. После этого можно запросить возврат помощи по правилам системы.",
    ],
  },
  {
    id: "slide-07",
    number: "07",
    title: "Daily Flow",
    status: "План",
    description:
      "Слайд объясняет daily-механику: более длинный цикл, где добавочная помощь начисляется по дневной логике, а ключевые условия заранее видны участнику.",
    slideText: [
      "Daily Flow",
      "Длинный цикл с дневной логикой",
      "Daily Flow рассчитан на более длительное участие. Условия цикла, срок, базовая логика и возможная добавочная помощь заранее описаны в правилах smart-contract.",
    ],
  },
  {
    id: "slide-08",
    number: "08",
    title: "Финансовые возможности",
    status: "План",
    description:
      "Обязательный слайд с таблицей доходности. Его нужно сделать аккуратно: как пример расчёта по выбранному формату, без агрессивного обещания гарантированной прибыли.",
    slideText: [
      "Финансовые возможности",
      "Пример расчёта по выбранному циклу",
      "Потенциальный результат зависит от выбранного формата, срока цикла и ликвидности smart-contract. Таблица показывает ориентировочный сценарий, а не гарантированный доход.",
    ],
  },
  {
    id: "slide-09",
    number: "09",
    title: "Предупреждение о рисках",
    status: "План",
    description:
      "Слайд нужен для честной коммуникации: участие добровольное, доходность не гарантируется, возврат помощи зависит от правил системы и доступной ликвидности.",
    slideText: [
      "Предупреждение о рисках",
      "Участие добровольное, результат не гарантирован",
      "Средства направляются в smart-contract добровольно. Возврат помощи и добавочной помощи возможен только по правилам системы и при наличии достаточной ликвидности.",
    ],
  },
  {
    id: "slide-10",
    number: "10",
    title: "Как начать",
    status: "План",
    description:
      "Пошаговый слайд для новичка: установить кошелёк, пополнить USDT BEP-20, подключить кошелёк, выбрать цикл, отправить помощь, затем отслеживать статус.",
    slideText: [
      "Как начать",
      "Пять простых шагов для первого участия",
      "Установите Web3-кошелёк, пополните его USDT в сети BEP-20, подключите к Atlas System, выберите цикл и отправьте добровольную помощь через smart-contract.",
    ],
  },
  {
    id: "slide-11",
    number: "11",
    title: "Партнёрская программа",
    status: "План",
    description:
      "Обязательный слайд по партнёрке. Нужно объяснить не как MLM-давление, а как систему статусов, командного роста и бонусов по заранее заданным правилам.",
    slideText: [
      "Партнёрская программа",
      "Рост команды, статусы и бонусная логика",
      "Партнёрская программа помогает участникам развивать структуру, получать статусы и бонусы по правилам системы. Условия зависят от личного и командного объёма.",
    ],
  },
  {
    id: "slide-12",
    number: "12",
    title: "Экосистема Atlas",
    status: "План",
    description:
      "Слайд показывает, что Atlas System — не один продукт навсегда, а развивающаяся экосистема: knowledge hub, invite&earn, academy, P2P exchange, wallet, governance и другие направления.",
    slideText: [
      "Экосистема Atlas",
      "Мы строим не один продукт, а систему",
      "Atlas System развивается как экосистема: финансовые циклы, база знаний, обучение, партнёрские инструменты, P2P-направление, кошелёк и DAO-механики.",
    ],
  },
  {
    id: "slide-13",
    number: "13",
    title: "Архитектура и управление",
    status: "План",
    description:
      "Слайд объясняет управление проектом: техническая команда, безопасность, инфраструктура, открытые правила, развитие DAO-процедур и постепенная прозрачность команды.",
    slideText: [
      "Архитектура и управление",
      "Технологии, безопасность и DAO-логика",
      "Система развивается технической командой в области Web3. Основная логика закрепляется в smart-contract, а управление постепенно переводится в прозрачные DAO-процедуры.",
    ],
  },
  {
    id: "slide-14",
    number: "14",
    title: "Для кого Atlas System",
    status: "План",
    description:
      "Слайд собирает аудитории: новичок, Web3-пользователь, партнёр, лидер команды, человек, которому важны прозрачность и понятные правила.",
    slideText: [
      "Для кого Atlas System",
      "Для людей, которые хотят понятных правил",
      "Atlas System подходит тем, кто хочет разобраться в Web3-формате взаимопомощи, участвовать добровольно, видеть правила заранее и развивать команду без закрытых схем.",
    ],
  },
  {
    id: "slide-15",
    number: "15",
    title: "Главная идея",
    status: "План",
    description:
      "Финальный смысловой слайд: Atlas System — переход от закрытых обещаний к прозрачной цифровой системе, где правила видны заранее, а действия фиксируются в блокчейне.",
    slideText: [
      "Главная идея",
      "От закрытых обещаний — к прозрачной цифровой системе",
      "Atlas System объединяет добровольное участие, smart-contract, on-chain прозрачность и экосистемный подход, чтобы сделать механику понятной для обычного пользователя.",
    ],
  },
  {
    id: "slide-16",
    number: "16",
    title: "Присоединяйтесь",
    status: "План",
    description:
      "Финальный CTA-слайд с доменом, QR-кодом или ссылкой. Тон спокойный: изучить материалы, проверить правила, подключиться осознанно.",
    slideText: [
      "Присоединяйтесь к Atlas System",
      "Изучите правила и принимайте решение осознанно",
      "Перейдите на atlas-system.io, изучите материалы, проверьте условия циклов и подключайтесь только после того, как механика стала понятной.",
    ],
  },
];

function getSlidesCountLabel(count) {
  if (count % 10 === 1 && count % 100 !== 11) return `${count} слайд`;
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} слайда`;
  return `${count} слайдов`;
}

function PresentationContentTab() {
  const [activeSlideId, setActiveSlideId] = useState(presentationSlides[0]?.id);
  const activeSlide = presentationSlides.find((slide) => slide.id === activeSlideId) || presentationSlides[0];

  return (
    <section className="analytics-surface analytics-content-presentation">
      <div className="analytics-content-presentation-head">
        <div>
          <p className="analytics-kicker">Презентация Atlas System</p>
          <h2 className="analytics-restored-section-title">Согласованные слайды</h2>
          <p className="analytics-restored-section-copy">
            Здесь собираем финальный текст и изображение каждого слайда по мере согласования.
          </p>
        </div>
        <span className="analytics-content-presentation-count">{getSlidesCountLabel(presentationSlides.length)}</span>
      </div>

      <div className="analytics-content-presentation-layout">
        <aside className="analytics-content-presentation-nav" aria-label="Слайды презентации">
          {presentationSlides.map((slide) => (
            <button
              key={slide.id}
              type="button"
              className={`analytics-content-slide-tab${activeSlide.id === slide.id ? " analytics-content-slide-tab-active" : ""}`}
              onClick={() => setActiveSlideId(slide.id)}
            >
              <span>{slide.number}</span>
              <strong>{slide.title}</strong>
              <small>{slide.status}</small>
            </button>
          ))}
        </aside>

        <article className="analytics-content-presentation-detail">
          <div className="analytics-content-presentation-title-row">
            <span>{activeSlide.number}</span>
            <div>
              <h3>{activeSlide.title}</h3>
              <p>{activeSlide.description}</p>
            </div>
          </div>

          <div className="analytics-content-slide-copy">
            <h4>Текст на слайде</h4>
            {activeSlide.slideText.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="analytics-content-slide-preview">
            {activeSlide.image ? (
              <img src={activeSlide.image} alt={`Слайд ${activeSlide.number}: ${activeSlide.title}`} />
            ) : (
              <div className="analytics-content-slide-empty">
                <span>{activeSlide.number}</span>
                <strong>Визуал пока не создан</strong>
                <p>Здесь появится финальная картинка после согласования текста и дизайна слайда.</p>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export default PresentationContentTab;
