const STEPS = [
  ["01", "Выберите фокус", "Одна страна, один тип лидера и одна соцсеть на рабочую сессию."],
  ["02", "Соберите кандидатов", "Найдите 20–30 профилей по запросам на английском и местном языке."],
  ["03", "Проверьте вручную", "Оставьте 5–8 живых профилей со свежим контентом и реальной аудиторией."],
  ["04", "Оцените", "Поставьте баллы за релевантность, влияние, географию, доступ к сообществу и контактность."],
  ["05", "Занесите в CRM", "Сохраните ссылку, страну, язык, тип лидера, контакт, оценку и следующий шаг."],
  ["06", "Свяжитесь", "Отправьте 3–5 персональных сообщений и назначьте дату следующего касания."],
];

const LEADERS = [
  ["MLM-лидеры", "Действующие дистрибьюторы и руководители команд."],
  ["Тренеры и коучи", "Обучают продажам, рекрутингу и построению структуры."],
  ["Организаторы", "Проводят direct-selling, Web3 и бизнес-мероприятия."],
  ["Лидеры high-risk Web3", "Работают с dApp и финансовыми сообществами; умеют объяснять риск."],
  ["Администраторы сообществ", "Ведут локальные Telegram, Facebook, Discord или WhatsApp-группы."],
  ["Коннекторы", "Бывшие лидеры, агентства и консультанты с доступом к нескольким командам."],
];

const PLATFORMS = [
  ["YouTube", ["network marketing leader [country]", "MLM training [language]", "high risk crypto community [country]"], "Последние 10 роликов, медиана просмотров, комментарии и контакты в описании."],
  ["Instagram", ["#networkmarketing[country]", "#mlmcoach + city", "#web3community + country"], "Reels за 30 дней, качество комментариев, сторис, география и ссылка в профиле."],
  ["X", ["\"network marketing\" lang:en", "\"community builder\" web3", "BNB Chain meetup [country]"], "Обсуждения за 30 дней, собственные посты, круг контактов и признаки накрутки."],
  ["Facebook", ["network marketing leaders [country]", "direct selling professionals [city]", "web3 community [country]"], "Активность группы, правила, частота постов, качество диалога и доступность администратора."],
  ["LinkedIn", ["network marketing leader", "direct selling trainer", "web3 community manager"], "Текущая роль, страна, опыт, публикации за 90 дней, общие контакты и способ связи."],
];

const SCORE = [
  ["Релевантность", "0–25", "MLM, direct selling, Web3, кошельки или community building"],
  ["Живое влияние", "0–25", "Стабильные просмотры, содержательные реакции и диалог"],
  ["География", "0–15", "Работает в нужной стране и говорит на языке аудитории"],
  ["Доступ к сообществу", "0–15", "Ведёт команду, группу, канал или мероприятия"],
  ["Контактность", "0–10", "Есть рабочий email, форма, DM или общий контакт"],
  ["Репутационный контекст", "0–10", "Метки и жалобы проверены по фактам; сама метка не означает отказ"],
];

export default function ListingsInstructions() {
  return <section className="instructions-page">
    <header className="instructions-hero">
      <div><span className="eyebrow">РАБОЧИЙ SOP · MLM + WEB3</span><h2>Как находить и проверять лидеров</h2><p>Короткая инструкция сотруднику: от поискового запроса до записи в общей CRM.</p></div>
      <div className="session-norm"><strong>Норма одной сессии</strong><div><span><b>20–30</b> найдено</span><span><b>5–8</b> проверено</span><span><b>3–5</b> контактов</span></div></div>
    </header>

    <div className="instruction-steps">{STEPS.map(([number, title, text]) => <article key={number}><b>{number}</b><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>

    <section className="instruction-card"><header><span className="eyebrow">КОГО ИСКАТЬ</span><h2>Шесть приоритетных групп</h2><p>Начинайте с людей, у которых уже есть доверие аудитории и доступ к сообществу.</p></header><div className="leader-grid">{LEADERS.map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="instruction-card"><header><span className="eyebrow">ГДЕ ИСКАТЬ</span><h2>Запросы по соцсетям</h2><p>Подставьте страну, город и язык. Каждый профиль проверяйте вручную.</p></header><div className="platform-list">{PLATFORMS.map(([name, queries, check]) => <details key={name as string}><summary><strong>{name}</strong><span>Запросы и проверка</span></summary><div className="query-chips">{(queries as string[]).map((query) => <code key={query}>{query}</code>)}</div><p><b>Проверить:</b> {check}</p></details>)}</div></section>

    <div className="instruction-columns">
      <section className="instruction-card"><header><span className="eyebrow">ОЦЕНКА 0–100</span><h2>Кого брать в работу</h2></header><div className="score-list">{SCORE.map(([label, points, text]) => <div key={label}><strong>{label}</strong><b>{points}</b><p>{text}</p></div>)}</div><div className="score-bands"><span><b>75–100</b> приоритет</span><span><b>55–74</b> резерв</span><span><b>0–54</b> не тратить время</span></div></section>
      <section className="instruction-card"><header><span className="eyebrow">ПЕРВЫЙ КОНТАКТ</span><h2>Коротко и персонально</h2></header><blockquote>Здравствуйте, [имя]. Увидел вашу работу с [конкретная тема/сообщество]. Мы развиваем Atlas System и ищем локальных партнёров, которые умеют работать с сообществами. Могу прислать короткое описание и обсудить, есть ли здесь взаимный интерес?</blockquote><ul><li>Назовите реальную причину обращения именно к этому человеку.</li><li>Сразу обозначьте высокорисковую модель, зависимость результата от притока средств и возможность полной потери.</li><li>Не рассылайте один текст массово и не скрывайте связь с Atlas.</li><li>Перед ссылкой получите согласие посмотреть материал.</li></ul></section>
    </div>

    <section className="context-note"><div><span className="eyebrow">ВНЕШНИЕ МЕТКИ</span><h2>Не исключать автоматически</h2></div><p>Пометка «scam/Ponzi», негативный обзор или конфликт с прежним проектом — повод для углублённой проверки, а не автоматический отказ. Зафиксируйте источник, позицию лидера и подтверждённые действия. Стоп-факторы: доказанный обман, поддельная аудитория, присвоение средств, выдача гарантий или сознательное сокрытие риска.</p></section>

    <section className="crm-checklist"><div><span className="eyebrow">ПЕРЕД СОХРАНЕНИЕМ</span><h2>Минимум данных в CRM</h2></div><div>{["Имя и ссылка", "Страна и язык", "Тип лидера", "Размер и качество аудитории", "Контакт", "Оценка 0–100", "Следующий шаг и дата"].map((item) => <span key={item}>✓ {item}</span>)}</div></section>
  </section>;
}
