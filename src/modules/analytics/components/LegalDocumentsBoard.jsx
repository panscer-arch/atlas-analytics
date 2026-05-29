import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";
import { loadServerContent, saveServerContent } from "../services/contentStore";

export const LEGAL_DOCUMENTS_STORAGE_KEY = "atlas.analytics.legalDocuments.v1";

const DOCUMENT_STATUSES = ["Нужно сделать", "Черновик", "На проверке", "Готово", "Не нужно сейчас"];

const LEGACY_PROTOCOL_RULES_CONTENT =
  "Описать Atlas как protocol/interface, Smart Cycle, оказание помощи, расчётную дельту, запрос помощи, необратимость on-chain действий, зависимость исполнения от правил протокола и доступной ликвидности.";

const LEGACY_RISK_DISCLOSURE_CONTENT =
  "Нет гарантии возврата, нет гарантии дельты, liquidity risk, smart contract risk, network/gas/RPC risk, user error, seed phrase, phishing, regulatory uncertainty, участие добровольное и на собственный риск.";

const PROTOCOL_RULES_CONTENT = `Версия: 0.1 / рабочий черновик
Документ: Правила Smart Cycle Atlas System
Язык: RU

1. Назначение документа

Настоящий документ описывает базовые правила работы Smart Cycle в Atlas System. Smart Cycle — это цифровой цикл помощи, который участник создаёт через подключение своего Web3-кошелька и взаимодействие со смарт-контрактом Atlas.

Документ нужен для того, чтобы участник до совершения действий понимал:
- что он делает в интерфейсе Atlas;
- какие параметры выбирает;
- как фиксируется его действие в блокчейне;
- когда появляется возможность запросить помощь;
- от чего зависит исполнение запроса;
- какие риски участник принимает на себя.

Atlas System не является банком, депозитной платформой, инвестиционным фондом, брокером, управляющей компанией или сервисом гарантированного дохода. Atlas System описывается как Web3-интерфейс и smart-contract механика цифровой взаимопомощи, где действия участников выполняются по правилам смарт-контракта.

2. Основные термины

Участник — лицо, которое самостоятельно подключает Web3-кошелёк к интерфейсу Atlas и подтверждает действия в своём кошельке.

Кошелёк — внешний Web3-кошелёк участника, например MetaMask. Atlas не хранит seed phrase, private key и не управляет кошельком участника.

Smart Cycle — выбранный участником цикл помощи с установленным сроком, суммой и расчётной дельтой.

Оказать помощь — действие участника, при котором он создаёт Smart Cycle и отправляет средства по правилам смарт-контракта.

Сумма цикла — сумма, которую участник указывает при создании Smart Cycle.

Срок цикла — период, после которого у участника может появиться возможность отправить запрос помощи.

Расчётная дельта — дополнительная расчётная часть к сумме цикла, которая применяется по правилам выбранного Smart Cycle. Расчётная дельта не является гарантированной прибылью, процентом по депозиту или обязательством компании.

Запросить помощь — действие после завершения срока цикла, при котором участник отправляет запрос в смарт-контракт на получение доступной помощи по правилам протокола.

Доступная ликвидность — объём средств в смарт-контракте, который может быть использован для исполнения запросов участников в конкретный момент.

3. Добровольное участие

Участие в Atlas является добровольным. Участник сам принимает решение о подключении кошелька, выборе Smart Cycle, сумме, сроке и подтверждении транзакции.

Перед созданием Smart Cycle участник обязан самостоятельно оценить механику, риски, комиссии сети, возможную нехватку ликвидности, технические ошибки, регуляторную неопределённость и иные обстоятельства.

Если участник не понимает правила Smart Cycle или не готов принять риски Web3-взаимодействия, он не должен создавать Smart Cycle.

4. Создание Smart Cycle

Для создания Smart Cycle участник:
1. Открывает официальный интерфейс Atlas.
2. Подключает свой Web3-кошелёк.
3. Выбирает доступный срок цикла.
4. Указывает сумму цикла в пределах правил интерфейса и смарт-контракта.
5. Проверяет параметры действия.
6. Подтверждает транзакцию в своём кошельке.

После подтверждения транзакции действие фиксируется в блокчейне. Atlas не может отменить, изменить или вернуть транзакцию вручную, если такая возможность не предусмотрена смарт-контрактом.

5. Сроки и расчётная дельта

Smart Cycle может иметь разные сроки и разные параметры расчётной дельты. Конкретные сроки, минимальные и максимальные суммы, комиссии, лимиты и дельта отображаются в интерфейсе Atlas и/или в смарт-контракте.

Расчётная дельта используется только как параметр правил Smart Cycle. Она не означает гарантированный доход, инвестиционную прибыль, фиксированную выплату, процент по вкладу или обязательство третьей стороны.

Возможность получить сумму цикла и расчётную дельту зависит от правил смарт-контракта, очередности запросов, состояния системы, активности участников и доступной ликвидности.

6. Завершение срока цикла

По истечении выбранного срока Smart Cycle может перейти в состояние, при котором участнику становится доступно действие «Запросить помощь».

Завершение срока цикла само по себе не означает автоматическое получение средств. Участник должен самостоятельно отправить соответствующее действие через интерфейс и подтвердить транзакцию в кошельке, если такое действие доступно.

7. Запрос помощи

После завершения срока цикла участник может отправить запрос помощи по правилам смарт-контракта.

Исполнение запроса зависит от:
- доступной ликвидности в смарт-контракте;
- правил очередности и статусов;
- корректности действия участника;
- состояния сети и комиссий;
- ограничений, заложенных в коде смарт-контракта;
- иных технических параметров протокола.

Если доступной ликвидности недостаточно, запрос может быть не исполнен сразу, исполнен частично, поставлен в ожидание или обработан по иной логике, предусмотренной смарт-контрактом.

8. Нет гарантий

Atlas не гарантирует:
- возврат суммы цикла;
- получение расчётной дельты;
- срок исполнения запроса помощи;
- постоянную доступность ликвидности;
- отсутствие технических ошибок;
- неизменность внешних условий;
- определённый финансовый результат.

Любые материалы Atlas, презентации, вебинары, FAQ, интерфейсные подсказки и партнёрские объяснения должны пониматься вместе с настоящими правилами и предупреждением о рисках.

Запрещено описывать Smart Cycle как депозит, инвестицию, вклад, пассивный доход, гарантированную доходность, заработок без риска или обязательство компании выплатить участнику фиксированную сумму.

9. Роль интерфейса Atlas

Интерфейс Atlas помогает участнику взаимодействовать со смарт-контрактом, отображать параметры Smart Cycle, статусы, доступные действия и справочную информацию.

Интерфейс не является кошельком участника, не хранит средства участника, не хранит private key или seed phrase, не подписывает транзакции за участника и не может гарантировать результат действий в блокчейне.

Перед подтверждением любой транзакции участник обязан проверить действие в своём кошельке.

10. Необратимость on-chain действий

Действия, подтверждённые участником в кошельке и записанные в блокчейн, могут быть необратимыми.

Участник несёт ответственность за:
- выбор правильного сайта и сети;
- проверку адреса смарт-контракта;
- корректность суммы;
- наличие средств на gas/комиссии;
- безопасность своего устройства;
- сохранность seed phrase и private key;
- отсутствие фишинга и поддельных ссылок.

Atlas никогда не просит seed phrase или private key. Если кто-либо просит эти данные от имени Atlas, это следует считать попыткой мошенничества.

11. Партнёрские и обучающие материалы

Партнёрские ссылки, вебинары, презентации и обучающие материалы могут использоваться для объяснения работы Atlas. Они не должны заменять настоящие правила и предупреждение о рисках.

Партнёры и спикеры обязаны использовать корректные формулировки:
- «оказать помощь» вместо «инвестировать»;
- «создать Smart Cycle» вместо «открыть депозит»;
- «расчётная дельта» вместо «гарантированная прибыль»;
- «запросить помощь при наличии условий и ликвидности» вместо «получить гарантированную выплату».

12. Изменения правил

Некоторые параметры Atlas могут зависеть от версии смарт-контракта, интерфейса, сети, DAO-решений или иных опубликованных правил проекта.

Если отдельные параметры отображаются в интерфейсе и отличаются от справочного текста, участник обязан проверять актуальные параметры перед подтверждением транзакции. Приоритет имеют правила смарт-контракта и актуальные опубликованные условия интерфейса.

13. Принятие правил

Подключая кошелёк, создавая Smart Cycle или отправляя запрос помощи, участник подтверждает, что он ознакомился с настоящими правилами, понимает добровольный характер участия, принимает Web3-риски и самостоятельно несёт ответственность за свои действия.`;

const RISK_DISCLOSURE_CONTENT = `Версия: 0.1 / рабочий черновик
Документ: Предупреждение о рисках Atlas System
Язык: RU

1. Назначение документа

Настоящее предупреждение о рисках описывает основные риски, связанные с использованием Atlas System, подключением Web3-кошелька, созданием Smart Cycle и взаимодействием со смарт-контрактом.

Этот документ не является индивидуальной консультацией, финансовой рекомендацией, инвестиционным советом, юридическим заключением или гарантией результата. Участник обязан самостоятельно оценить, подходит ли ему участие в Atlas, и при необходимости получить независимую консультацию.

Если участник не понимает хотя бы один из описанных рисков, он не должен подключать кошелёк, создавать Smart Cycle или подтверждать транзакции.

2. Общий характер участия

Atlas System не является банком, депозитной платформой, инвестиционным фондом, брокером, управляющей компанией, платёжной организацией или сервисом гарантированного дохода.

Участие в Atlas является добровольным. Участник самостоятельно принимает решение о подключении кошелька, выборе Smart Cycle, сумме, сроке и подтверждении транзакции. Все действия совершаются участником на собственный риск.

3. Нет гарантии возврата

Atlas не гарантирует возврат суммы цикла, получение расчётной дельты, срок исполнения запроса помощи или какой-либо финансовый результат.

Расчётная дельта является параметром механики Smart Cycle и не должна восприниматься как гарантированная прибыль, процент по депозиту, инвестиционный доход, фиксированное обязательство или обещанная выплата.

Участник должен исходить из того, что он может не получить ожидаемый результат, может получить результат позже ожидаемого срока или может столкнуться с невозможностью исполнения запроса при недостатке ликвидности или иных условиях протокола.

4. Риск ликвидности

Исполнение запросов помощи зависит от доступной ликвидности в смарт-контракте и правил протокола.

Если ликвидности недостаточно, запрос участника может:
- не быть исполнен сразу;
- ожидать появления доступной ликвидности;
- быть исполнен частично, если такая логика предусмотрена;
- быть обработан по правилам очередности или иным правилам смарт-контракта;
- не привести к ожидаемому участником результату.

Доступная ликвидность может меняться из-за активности участников, входящих и исходящих потоков, сетевых условий, технических факторов и иных обстоятельств.

5. Риск смарт-контракта

Atlas использует smart-contract механику. Смарт-контракты могут содержать ошибки, уязвимости, ограничения логики, несовместимости, непредвиденное поведение или зависеть от внешней инфраструктуры.

Даже если код проверяется командой или сторонними специалистами, это не исключает всех возможных ошибок. Аудит, тестирование или публичная проверяемость кода не являются гарантией безопасности и не устраняют все риски.

Взаимодействие со смарт-контрактом может быть необратимым. Если участник подтвердил транзакцию в кошельке, отменить её вручную может быть невозможно.

6. Риск сети, gas и RPC

Web3-взаимодействие зависит от блокчейн-сети, комиссий, RPC-провайдеров, кошелька, браузера и устройства участника.

Возможны:
- высокая или нестабильная комиссия сети;
- задержки подтверждения транзакций;
- ошибки RPC;
- временная недоступность сети;
- сбои отображения статусов в интерфейсе;
- расхождение между отображением интерфейса и состоянием блокчейна;
- неуспешные транзакции с потерей gas-комиссии.

Участник самостоятельно несёт расходы на комиссии сети и обязан проверять детали транзакции перед подтверждением.

7. Риск ошибки пользователя

Участник несёт ответственность за свои действия и настройки.

К ошибкам пользователя относятся, в том числе:
- подключение к поддельному сайту;
- выбор неправильной сети;
- отправка средств не на тот адрес;
- подтверждение непонятной транзакции;
- неправильная сумма;
- использование заражённого устройства;
- потеря доступа к кошельку;
- раскрытие seed phrase или private key;
- переход по фишинговой ссылке;
- доверие к неофициальной поддержке или неофициальным каналам.

Atlas не может восстановить seed phrase, private key или доступ к кошельку участника.

8. Риск фишинга и поддельной поддержки

Вокруг Web3-проектов могут появляться поддельные сайты, каналы, аккаунты поддержки, боты, формы и ссылки.

Atlas никогда не просит:
- seed phrase;
- private key;
- удалённый доступ к устройству;
- перевести средства на личный кошелёк менеджера;
- подписать транзакцию без понятного назначения.

Перед любым действием участник должен проверять официальный домен, официальные ссылки, адрес смарт-контракта и источник информации.

9. Риск партнёрских и обучающих материалов

Информация от партнёров, лидеров, спикеров, блогеров, чатов или сторонних участников может быть неполной, устаревшей или некорректной.

Запрещено воспринимать чьи-либо объяснения как гарантию результата. Если партнёр обещает гарантированный доход, отсутствие риска, фиксированную прибыль, окупаемость или обязательную выплату, такая формулировка не является официальной позицией Atlas.

Официальные правила Smart Cycle, предупреждение о рисках, условия использования интерфейса и актуальные параметры смарт-контракта имеют приоритет перед устными объяснениями.

10. Риск регуляторной неопределённости

Web3, криптоактивы, смарт-контракты, referral-механики и цифровые системы взаимопомощи могут по-разному регулироваться в разных странах.

Правила могут меняться. В отдельных юрисдикциях использование подобных систем может быть ограничено, требовать самостоятельной налоговой оценки или иметь правовые последствия для участника.

Участник самостоятельно отвечает за соблюдение законов своей страны, налоговые последствия и возможность участия.

11. Риск изменения интерфейса и параметров

Интерфейс Atlas, справочные материалы, отображение статусов, доступные функции, параметры циклов, комиссии, лимиты и язык описаний могут обновляться.

Некоторые изменения могут быть связаны с техническими обновлениями, безопасностью, DAO-решениями, версией смарт-контракта, сетевыми условиями или продуктовым развитием.

Перед подтверждением действия участник обязан проверять актуальные параметры в интерфейсе, кошельке и опубликованных правилах.

12. Риск доступности сервиса

Интерфейс Atlas, сайт, API, аналитика, FAQ, support, вебинары или другие вспомогательные сервисы могут быть временно недоступны из-за технических работ, перегрузки, ошибок, блокировок, атак, проблем хостинга, проблем сети или иных причин.

Недоступность интерфейса не всегда означает недоступность смарт-контракта, но может усложнить взаимодействие с ним.

13. Налоговые и личные последствия

Любые действия с криптоактивами могут иметь налоговые, учётные или иные личные последствия в стране участника.

Atlas не рассчитывает налоги участника, не подаёт отчётность за участника и не предоставляет индивидуальные налоговые рекомендации.

14. Принятие риска

Подключая кошелёк, создавая Smart Cycle, отправляя запрос помощи или используя интерфейс Atlas, участник подтверждает, что:
- он прочитал и понял настоящее предупреждение о рисках;
- он понимает отсутствие гарантий;
- он действует добровольно;
- он принимает риск потери средств, задержки, технической ошибки и отсутствия ожидаемого результата;
- он несёт самостоятельную ответственность за свои решения, кошелёк, устройство, сеть и соблюдение законов своей страны.

Если участник не согласен с указанными рисками, он не должен использовать Atlas System.`;

const defaultLegalDocuments = [
  {
    id: "protocol-rules",
    title: "Правила Smart Cycle",
    shortTitle: "Protocol Rules",
    status: "Черновик",
    priority: "Критично",
    purpose: "Главный документ с правилами работы смарт-контракта: что делает участник, какие есть циклы, когда можно запросить помощь и что происходит при нехватке ликвидности.",
    content: PROTOCOL_RULES_CONTENT,
    notes: "Первый рабочий черновик. Перед публикацией сверить с финальными параметрами смарт-контракта, сетью, contract address, комиссиями и Risk Disclosure.",
  },
  {
    id: "risk-disclosure",
    title: "Предупреждение о рисках",
    shortTitle: "Risk Disclosure",
    status: "Черновик",
    priority: "Критично",
    purpose: "Отдельный публичный документ, который заранее раскрывает риски участия в Web3-протоколе.",
    content: RISK_DISCLOSURE_CONTENT,
    notes: "Показывать до участия и ссылаться из интерфейса, FAQ, партнёрки, вебинаров, White Paper и правил Smart Cycle.",
  },
  {
    id: "interface-terms",
    title: "Условия использования интерфейса",
    shortTitle: "Interface Terms",
    status: "Нужно сделать",
    priority: "Высокий",
    purpose: "Правила использования сайта и личного кабинета как интерфейса к смарт-контракту.",
    content:
      "Интерфейс предоставляется as is, не хранит средства, не управляет кошельком, не может отменять транзакции. Пользователь сам подключает MetaMask и подписывает действия. Запретить exploit, fraud, атаки, обход ограничений и подмену интерфейса.",
    notes: "Отделить interface от protocol: сайт помогает взаимодействовать с кодом, но не является банком или управляющей компанией.",
  },
  {
    id: "privacy-notice",
    title: "Политика конфиденциальности",
    shortTitle: "Privacy Notice",
    status: "Нужно сделать",
    priority: "Высокий",
    purpose: "Минимальная privacy-страница для Web3-интерфейса, даже если вход только через MetaMask.",
    content:
      "Мы не запрашиваем паспорт, seed phrase и private key. При подключении кошелька виден public wallet address. Blockchain-транзакции публичны. Hosting, RPC, analytics или support могут обрабатывать технические данные: IP, device/browser, referral link, обращения пользователя.",
    notes: "Если cookies/analytics не используются, так и написать: intentional data minimization.",
  },
  {
    id: "partner-rules",
    title: "Правила партнёрской программы",
    shortTitle: "Partner Rules",
    status: "Нужно сделать",
    priority: "Критично",
    purpose: "Документ для партнёров и лидеров, чтобы продвижение смарт-контракта не превращалось в обещания дохода.",
    content:
      "Кто участвует, как появляется ref-link, от чего считаются начисления, что такое статус и компрессия. Запретить обещания: гарантия, без риска, инвестиция, депозит, пассивный доход, окупаемость. Партнёр обязан объяснять риски и правила протокола.",
    notes: "Самая рискованная зона проекта. Нужен отдельный фильтр публичных формулировок.",
  },
  {
    id: "security-links",
    title: "Безопасность и официальные ссылки",
    shortTitle: "Security & Official Links",
    status: "Нужно сделать",
    priority: "Высокий",
    purpose: "Короткая страница против фишинга и поддельной поддержки.",
    content:
      "Официальный сайт, contract address, BscScan, audit status, official socials, support channel, bug/security contact. Atlas никогда не просит seed phrase; поддержка не просит private key и не просит подписывать непонятные транзакции.",
    notes: "Опубликовать сразу после появления финальных contract addresses.",
  },
  {
    id: "white-paper",
    title: "White Paper",
    shortTitle: "White Paper",
    status: "Черновик",
    priority: "Средний",
    purpose: "Большой смысловой документ проекта: архитектура, Smart Cycle, партнёрка, DAO, риски, roadmap и терминология.",
    content:
      "Взять за основу локальный whitepaper v0.6, PDF Atlas_System_final и безопасную терминологию. Отделить текущий запуск от будущей экосистемы.",
    notes: "Не должен заменять Protocol Rules и Risk Disclosure.",
  },
  {
    id: "litepaper",
    title: "Litepaper",
    shortTitle: "Litepaper",
    status: "Нужно сделать",
    priority: "Средний",
    purpose: "Короткое объяснение Atlas для новичков, партнёров, сайта и презентаций.",
    content:
      "5-10 страниц: что такое Atlas, как работает Smart Cycle, как подключиться через MetaMask, какие риски, где читать полные правила.",
    notes: "Делать после утверждения Protocol Rules, чтобы не разъехались термины.",
  },
  {
    id: "governance-framework",
    title: "Правила DAO",
    shortTitle: "Governance Framework",
    status: "Не нужно сейчас",
    priority: "Средний",
    purpose: "Нужны, когда DAO-голосования станут реальной частью управления.",
    content:
      "Кто голосует, как считается vote weight, proposal lifecycle, quorum, сроки голосования, что DAO может менять и что не может менять в уже активных циклах.",
    notes: "Пока можно держать как draft, если DAO только в roadmap.",
  },
  {
    id: "fee-policy",
    title: "Политика комиссии платформы",
    shortTitle: "Platform Fee Policy",
    status: "Нужно сделать",
    priority: "Средний",
    purpose: "Объяснить platform fee прозрачно: с чего удерживается комиссия, куда идёт, как проверяется.",
    content:
      "Процент комиссии, база удержания, что не облагается комиссией, on-chain проверяемость, возможность изменения комиссии, связь с DAO или неизменяемыми правилами контракта.",
    notes: "Важно, чтобы fee не выглядела как скрытая ручная касса.",
  },
  {
    id: "communication-guidelines",
    title: "Правила коммуникации",
    shortTitle: "Communication Guidelines",
    status: "Нужно сделать",
    priority: "Высокий",
    purpose: "Внутренний документ для команды, партнёров, админов и AI-агента: как говорить об Atlas безопасно.",
    content:
      "Разрешённые формулировки: оказать помощь, создать Smart Cycle, расчётная дельта, запросить помощь, при наличии ликвидности. Запрещённые: гарантированный доход, депозит, инвестиция, без риска, пассивный заработок, окупаемость.",
    notes: "Можно сделать как чек-лист для проверки всех лендингов и роликов.",
  },
];

function normalizeDocument(document, index = 0) {
  const isLegacyProtocolRules =
    document.id === "protocol-rules" && (!document.content || document.content === LEGACY_PROTOCOL_RULES_CONTENT);
  const isLegacyRiskDisclosure =
    document.id === "risk-disclosure" && (!document.content || document.content === LEGACY_RISK_DISCLOSURE_CONTENT);

  return {
    id: document.id || `legal-doc-${Date.now()}-${index}`,
    title: document.title || "Новый документ",
    shortTitle: document.shortTitle || "",
    status: isLegacyProtocolRules || isLegacyRiskDisclosure ? "Черновик" : document.status || "Нужно сделать",
    priority: document.priority || "Средний",
    purpose: document.purpose || "",
    content: isLegacyProtocolRules ? PROTOCOL_RULES_CONTENT : isLegacyRiskDisclosure ? RISK_DISCLOSURE_CONTENT : document.content || "",
    notes: isLegacyProtocolRules
      ? "Первый рабочий черновик. Перед публикацией сверить с финальными параметрами смарт-контракта, сетью, contract address, комиссиями и Risk Disclosure."
      : isLegacyRiskDisclosure
        ? "Показывать до участия и ссылаться из интерфейса, FAQ, партнёрки, вебинаров, White Paper и правил Smart Cycle."
        : document.notes || "",
  };
}

function readStoredDocuments() {
  if (typeof window === "undefined") return defaultLegalDocuments;

  try {
    const saved = window.localStorage.getItem(LEGAL_DOCUMENTS_STORAGE_KEY);
    return saved ? JSON.parse(saved).map(normalizeDocument) : defaultLegalDocuments;
  } catch {
    return defaultLegalDocuments;
  }
}

function persistDocuments(documents) {
  try {
    window.localStorage.setItem(LEGAL_DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
    saveServerContent(LEGAL_DOCUMENTS_STORAGE_KEY, documents);
  } catch {
    // Документы останутся в состоянии страницы, даже если storage временно недоступен.
  }
}

function LegalDocumentsBoard() {
  const [documents, setDocuments] = useState(readStoredDocuments);
  const [activeDocumentId, setActiveDocumentId] = useState(() => {
    if (typeof window === "undefined") return defaultLegalDocuments[0].id;
    const url = new URL(window.location.href);
    return url.searchParams.get("doc") || defaultLegalDocuments[0].id;
  });

  useEffect(() => {
    let isMounted = true;

    loadServerContent(LEGAL_DOCUMENTS_STORAGE_KEY).then((savedDocuments) => {
      if (isMounted && Array.isArray(savedDocuments)) setDocuments(savedDocuments.map(normalizeDocument));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeDocument = documents.find((document) => document.id === activeDocumentId) || documents[0];
  const stats = useMemo(() => {
    const critical = documents.filter((document) => document.priority === "Критично").length;
    const ready = documents.filter((document) => document.status === "Готово").length;
    const review = documents.filter((document) => document.status === "На проверке").length;
    return [
      ["Документов", documents.length],
      ["Критично", critical],
      ["На проверке", review],
      ["Готово", ready],
    ];
  }, [documents]);

  useEffect(() => {
    if (!activeDocument || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("board", "legalDocs");
    url.searchParams.set("doc", activeDocument.id);
    window.history.replaceState({}, "", url.toString());
  }, [activeDocument]);

  function updateDocuments(updater) {
    setDocuments((current) => {
      const next = updater(current);
      persistDocuments(next);
      return next;
    });
  }

  function updateDocument(documentId, patch) {
    updateDocuments((current) => current.map((document) => (document.id === documentId ? { ...document, ...patch } : document)));
  }

  function addDocument() {
    const document = normalizeDocument({
      id: `legal-doc-${Date.now()}`,
      title: "Новый документ",
      shortTitle: "Draft",
      status: "Черновик",
      priority: "Средний",
      purpose: "Зачем нужен этот документ.",
      content: "Что должно быть внутри документа.",
      notes: "",
    });
    updateDocuments((current) => [...current, document]);
    setActiveDocumentId(document.id);
  }

  function removeDocument(documentId) {
    updateDocuments((current) => {
      const next = current.filter((document) => document.id !== documentId);
      if (activeDocument?.id === documentId) setActiveDocumentId(next[0]?.id || "");
      return next.length ? next : defaultLegalDocuments;
    });
  }

  if (!activeDocument) return null;

  return (
    <section className="analytics-surface analytics-agent-template analytics-agent-dataset mt-4">
      <div className="analytics-data-table-head">
        <div>
          <span className="analytics-kicker">International Web3 docs</span>
          <h2 className="analytics-agent-template-title">Документы для Atlas</h2>
          <p className="analytics-page-subtitle mb-0">
            Рабочий список международных документов для smart-contract проекта: слева документ, справа описание, состав и статус.
          </p>
        </div>
        <AnalyticsActionButton variant="primary" size="sm" onClick={addDocument}>
          + документ
        </AnalyticsActionButton>
      </div>

      <div className="analytics-agent-dataset-stats">
        {stats.map(([label, value]) => (
          <div key={label} className="analytics-agent-dataset-stat">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-program-editor analytics-legal-docs-editor">
        <aside className="analytics-program-sidebar analytics-legal-docs-sidebar">
          <span className="analytics-kicker">Список документов</span>
          {documents.map((document, index) => (
            <button
              key={document.id}
              type="button"
              className={`analytics-legal-doc-tab${activeDocument.id === document.id ? " analytics-legal-doc-tab-active" : ""}`}
              onClick={() => setActiveDocumentId(document.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{document.title}</strong>
              <small>{document.shortTitle || document.priority}</small>
            </button>
          ))}
        </aside>

        <div className="analytics-program-main">
          <div className="analytics-legal-doc-head">
            <div>
              <span className="analytics-kicker">{activeDocument.shortTitle || "Document"}</span>
              <h3>{activeDocument.title}</h3>
              <p>{activeDocument.purpose || "Описание документа пока не заполнено."}</p>
            </div>
            <div className="analytics-legal-doc-status">
              <span>{activeDocument.priority}</span>
              <strong>{activeDocument.status}</strong>
            </div>
          </div>

          <div className="analytics-program-grid">
            <label>
              Название
              <input className="analytics-agent-template-input" value={activeDocument.title} onChange={(event) => updateDocument(activeDocument.id, { title: event.target.value })} />
            </label>
            <label>
              Короткое имя
              <input className="analytics-agent-template-input" value={activeDocument.shortTitle} onChange={(event) => updateDocument(activeDocument.id, { shortTitle: event.target.value })} />
            </label>
          </div>

          <div className="analytics-dataset-meta-row">
            <label>
              Статус
              <select className="analytics-agent-template-input" value={activeDocument.status} onChange={(event) => updateDocument(activeDocument.id, { status: event.target.value })}>
                {DOCUMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Приоритет
              <select className="analytics-agent-template-input" value={activeDocument.priority} onChange={(event) => updateDocument(activeDocument.id, { priority: event.target.value })}>
                {["Критично", "Высокий", "Средний", "Низкий"].map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label>
              ID
              <input className="analytics-agent-template-input" value={activeDocument.id} readOnly />
            </label>
          </div>

          <label className="analytics-program-field">
            Описание документа
            <textarea className="analytics-agent-template-input" rows="4" value={activeDocument.purpose} onChange={(event) => updateDocument(activeDocument.id, { purpose: event.target.value })} />
          </label>

          <label className="analytics-program-field">
            Что должно быть внутри
            <textarea className="analytics-agent-template-input analytics-legal-doc-body" rows="8" value={activeDocument.content} onChange={(event) => updateDocument(activeDocument.id, { content: event.target.value })} />
          </label>

          <label className="analytics-program-field">
            Заметки / решения
            <textarea className="analytics-agent-template-input" rows="4" value={activeDocument.notes} onChange={(event) => updateDocument(activeDocument.id, { notes: event.target.value })} />
          </label>

          <div className="analytics-program-danger">
            <AnalyticsActionButton variant="danger" size="sm" onClick={() => removeDocument(activeDocument.id)}>
              Удалить документ
            </AnalyticsActionButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LegalDocumentsBoard;
