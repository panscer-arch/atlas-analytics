import { useEffect, useMemo, useState } from "react";
import AnalyticsActionButton from "./AnalyticsActionButton";

const DIARY_STORAGE_KEY = "atlas.analytics.lifeDiary.v1";

const MEALS = ["Завтрак", "Перекус", "Обед", "Полдник", "Ужин", "Поздний ужин"];
const ACTIVITY_TYPES = ["Тренажерный зал", "Прогулка", "Горы", "Теннис", "Пробежка", "Растяжка", "Плавание", "Другое"];

const PRODUCT_DB = {
  "гречка вареная": { calories: 110, protein: 3.6, fat: 1.1, carbs: 21.3 },
  "рис вареный": { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  "овсянка": { calories: 88, protein: 3, fat: 1.7, carbs: 15 },
  "куриная грудка": { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  "индейка": { calories: 135, protein: 29, fat: 1, carbs: 0 },
  "говядина": { calories: 250, protein: 26, fat: 15, carbs: 0 },
  "яйцо": { calories: 157, protein: 12.7, fat: 10.9, carbs: 0.7 },
  "творог 5%": { calories: 121, protein: 17, fat: 5, carbs: 1.8 },
  "йогурт греческий": { calories: 90, protein: 9, fat: 3.5, carbs: 4 },
  "банан": { calories: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  "яблоко": { calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  "овощной салат": { calories: 35, protein: 1.2, fat: 0.3, carbs: 7 },
  "оливковое масло": { calories: 884, protein: 0, fat: 100, carbs: 0 },
  "хлеб цельнозерновой": { calories: 247, protein: 13, fat: 4.2, carbs: 41 },
  "макароны вареные": { calories: 155, protein: 5.8, fat: 0.9, carbs: 30.9 },
  "лосось": { calories: 208, protein: 20, fat: 13, carbs: 0 },
  "картофель вареный": { calories: 87, protein: 1.9, fat: 0.1, carbs: 20.1 },
  "сыр": { calories: 350, protein: 25, fat: 27, carbs: 2 },
  "молоко 2.5%": { calories: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
  "протеин": { calories: 380, protein: 75, fat: 6, carbs: 8 },
};

function getTodayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createMealItem(overrides = {}) {
  return {
    id: `meal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: "",
    grams: "",
    manualCalories: "",
    ...overrides,
  };
}

function createDiaryEntry(overrides = {}) {
  return {
    id: `diary-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: getTodayInputDate(),
    marathonDay: "",
    sleepStart: "",
    fellAsleep: "",
    wakeUp: "",
    sleepQuality: "",
    weight: "",
    meals: Object.fromEntries(MEALS.map((meal) => [meal, [createMealItem()]])),
    waterLiters: "",
    activities: [],
    activityNote: "",
    trainingMinutes: "",
    walkMinutes: "",
    workHours: "",
    meetings: "",
    energy: "",
    mood: "",
    socialMinutes: "",
    selfObservation: "",
    daySummary: "",
    mainLesson: "",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function normalizeEntry(entry) {
  const normalizedMeals = Object.fromEntries(MEALS.map((meal) => {
    const items = Array.isArray(entry?.meals?.[meal]) ? entry.meals[meal] : [];
    return [meal, items.length ? items.map((item) => ({ ...createMealItem(), ...item })) : [createMealItem()]];
  }));

  return {
    ...createDiaryEntry(),
    ...entry,
    meals: normalizedMeals,
    activities: Array.isArray(entry?.activities) ? entry.activities : [],
  };
}

function readStoredEntries() {
  if (typeof window === "undefined") return [createDiaryEntry()];

  try {
    const saved = JSON.parse(window.localStorage.getItem(DIARY_STORAGE_KEY) || "[]");
    return Array.isArray(saved) && saved.length ? saved.map(normalizeEntry) : [createDiaryEntry()];
  } catch {
    return [createDiaryEntry()];
  }
}

function getProductMacro(title) {
  const normalized = String(title || "").trim().toLowerCase();
  if (!normalized) return null;
  return PRODUCT_DB[normalized] || null;
}

function getItemNutrition(item) {
  const grams = Number(item.grams) || 0;
  const manualCalories = Number(item.manualCalories) || 0;
  const product = getProductMacro(item.title);

  if (!product || !grams) {
    return { calories: manualCalories, protein: 0, fat: 0, carbs: 0, found: Boolean(product) };
  }

  return {
    calories: (product.calories * grams) / 100,
    protein: (product.protein * grams) / 100,
    fat: (product.fat * grams) / 100,
    carbs: (product.carbs * grams) / 100,
    found: true,
  };
}

function getEntryTotals(entry) {
  return MEALS.reduce((accumulator, meal) => {
    const mealTotals = entry.meals[meal].reduce((mealAccumulator, item) => {
      const nutrition = getItemNutrition(item);
      return {
        calories: mealAccumulator.calories + nutrition.calories,
        protein: mealAccumulator.protein + nutrition.protein,
        fat: mealAccumulator.fat + nutrition.fat,
        carbs: mealAccumulator.carbs + nutrition.carbs,
      };
    }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

    accumulator.meals[meal] = mealTotals;
    accumulator.calories += mealTotals.calories;
    accumulator.protein += mealTotals.protein;
    accumulator.fat += mealTotals.fat;
    accumulator.carbs += mealTotals.carbs;
    return accumulator;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0, meals: {} });
}

function calculateSleepHours(entry) {
  const start = entry.fellAsleep || entry.sleepStart;
  if (!start || !entry.wakeUp) return "";
  const [startHour, startMinute] = start.split(":").map(Number);
  const [wakeHour, wakeMinute] = entry.wakeUp.split(":").map(Number);
  if (![startHour, startMinute, wakeHour, wakeMinute].every(Number.isFinite)) return "";
  const startTotal = startHour * 60 + startMinute;
  let wakeTotal = wakeHour * 60 + wakeMinute;
  if (wakeTotal <= startTotal) wakeTotal += 24 * 60;
  return ((wakeTotal - startTotal) / 60).toFixed(1);
}

function formatNumber(value, digits = 0) {
  const number = Number(value) || 0;
  return number.toLocaleString("ru-RU", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function LifeDiaryBoard() {
  const [entries, setEntries] = useState(readStoredEntries);
  const [activeEntryId, setActiveEntryId] = useState(() => readStoredEntries()[0]?.id || "");
  const activeEntry = entries.find((entry) => entry.id === activeEntryId) || entries[0];
  const totals = useMemo(() => getEntryTotals(activeEntry), [activeEntry]);
  const sleepHours = calculateSleepHours(activeEntry);
  const recentEntries = useMemo(() => [...entries].sort((left, right) => String(right.date).localeCompare(String(left.date))).slice(0, 7), [entries]);

  useEffect(() => {
    window.localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  function updateEntry(patch) {
    setEntries((current) => current.map((entry) => (
      entry.id === activeEntry.id ? { ...entry, ...patch, updatedAt: new Date().toISOString() } : entry
    )));
  }

  function updateMealItem(meal, itemId, patch) {
    updateEntry({
      meals: {
        ...activeEntry.meals,
        [meal]: activeEntry.meals[meal].map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
      },
    });
  }

  function addMealItem(meal) {
    updateEntry({
      meals: {
        ...activeEntry.meals,
        [meal]: [...activeEntry.meals[meal], createMealItem()],
      },
    });
  }

  function deleteMealItem(meal, itemId) {
    const nextItems = activeEntry.meals[meal].filter((item) => item.id !== itemId);
    updateEntry({
      meals: {
        ...activeEntry.meals,
        [meal]: nextItems.length ? nextItems : [createMealItem()],
      },
    });
  }

  function toggleActivity(activity) {
    const set = new Set(activeEntry.activities);
    if (set.has(activity)) set.delete(activity);
    else set.add(activity);
    updateEntry({ activities: Array.from(set) });
  }

  function addEntry() {
    const next = createDiaryEntry({
      date: getTodayInputDate(),
      marathonDay: entries.length + 1,
    });
    setEntries((current) => [next, ...current]);
    setActiveEntryId(next.id);
  }

  return (
    <section className="analytics-life-diary">
      <div className="analytics-life-diary-hero">
        <div>
          <span className="analytics-life-diary-kicker">Личная система</span>
          <h2>Дневник марафона</h2>
          <p>Сон, вес, питание, вода, активность, труд, встречи, соцсети и главный вывод дня в одной вкладке.</p>
        </div>
        <div className="analytics-life-diary-actions">
          <select value={activeEntry.id} onChange={(event) => setActiveEntryId(event.target.value)}>
            {recentEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.date || "Без даты"} · день {entry.marathonDay || "—"}</option>
            ))}
          </select>
          <AnalyticsActionButton variant="primary" onClick={addEntry}>Новый день</AnalyticsActionButton>
        </div>
      </div>

      <div className="analytics-life-diary-kpis">
        <div><span>Сон</span><strong>{sleepHours || "—"} ч</strong></div>
        <div><span>Вес</span><strong>{activeEntry.weight || "—"} кг</strong></div>
        <div><span>Калории</span><strong>{formatNumber(totals.calories)} ккал</strong></div>
        <div><span>Вода</span><strong>{activeEntry.waterLiters || "—"} л</strong></div>
        <div><span>Труд</span><strong>{activeEntry.workHours || "—"} ч</strong></div>
      </div>

      <div className="analytics-life-diary-grid">
        <section className="analytics-life-diary-card analytics-life-diary-card-wide">
          <h3>День</h3>
          <div className="analytics-life-diary-form-grid">
            <label>Дата<input type="date" value={activeEntry.date} onChange={(event) => updateEntry({ date: event.target.value })} /></label>
            <label>День марафона<input type="number" min="1" value={activeEntry.marathonDay} onChange={(event) => updateEntry({ marathonDay: event.target.value })} /></label>
            <label>Лег<input type="time" value={activeEntry.sleepStart} onChange={(event) => updateEntry({ sleepStart: event.target.value })} /></label>
            <label>Уснул<input type="time" value={activeEntry.fellAsleep} onChange={(event) => updateEntry({ fellAsleep: event.target.value })} /></label>
            <label>Проснулся<input type="time" value={activeEntry.wakeUp} onChange={(event) => updateEntry({ wakeUp: event.target.value })} /></label>
            <label>Качество сна<input type="number" min="1" max="10" value={activeEntry.sleepQuality} onChange={(event) => updateEntry({ sleepQuality: event.target.value })} /></label>
            <label>Вес, кг<input type="number" step="0.1" value={activeEntry.weight} onChange={(event) => updateEntry({ weight: event.target.value })} /></label>
            <label>Вода, л<input type="number" step="0.1" value={activeEntry.waterLiters} onChange={(event) => updateEntry({ waterLiters: event.target.value })} /></label>
          </div>
        </section>

        <section className="analytics-life-diary-card analytics-life-diary-card-wide">
          <div className="analytics-life-diary-card-head">
            <h3>Питание</h3>
            <span>{formatNumber(totals.calories)} ккал · Б {formatNumber(totals.protein)} / Ж {formatNumber(totals.fat)} / У {formatNumber(totals.carbs)}</span>
          </div>
          <div className="analytics-life-diary-meals">
            {MEALS.map((meal) => (
              <div className="analytics-life-diary-meal" key={meal}>
                <div className="analytics-life-diary-meal-title">
                  <strong>{meal}</strong>
                  <span>{formatNumber(totals.meals[meal]?.calories)} ккал</span>
                </div>
                {activeEntry.meals[meal].map((item) => {
                  const nutrition = getItemNutrition(item);
                  return (
                    <div className="analytics-life-diary-food-row" key={item.id}>
                      <input list="life-diary-products" placeholder="Продукт" value={item.title} onChange={(event) => updateMealItem(meal, item.id, { title: event.target.value })} />
                      <input type="number" min="0" placeholder="г" value={item.grams} onChange={(event) => updateMealItem(meal, item.id, { grams: event.target.value })} />
                      <input type="number" min="0" placeholder="ккал вручную" value={item.manualCalories} onChange={(event) => updateMealItem(meal, item.id, { manualCalories: event.target.value })} />
                      <span>{nutrition.found || item.manualCalories ? `${formatNumber(nutrition.calories)} ккал` : "нет в базе"}</span>
                      <button type="button" onClick={() => deleteMealItem(meal, item.id)}>×</button>
                    </div>
                  );
                })}
                <button type="button" className="analytics-life-diary-add-food" onClick={() => addMealItem(meal)}>+ продукт</button>
              </div>
            ))}
          </div>
          <datalist id="life-diary-products">
            {Object.keys(PRODUCT_DB).map((product) => <option key={product} value={product} />)}
          </datalist>
        </section>

        <section className="analytics-life-diary-card">
          <h3>Активность</h3>
          <div className="analytics-life-diary-activity-list">
            {ACTIVITY_TYPES.map((activity) => (
              <label key={activity}>
                <input type="checkbox" checked={activeEntry.activities.includes(activity)} onChange={() => toggleActivity(activity)} />
                <span>{activity}</span>
              </label>
            ))}
          </div>
          <div className="analytics-life-diary-form-grid analytics-life-diary-form-grid-small">
            <label>Тренировка, мин<input type="number" min="0" value={activeEntry.trainingMinutes} onChange={(event) => updateEntry({ trainingMinutes: event.target.value })} /></label>
            <label>Прогулка, мин<input type="number" min="0" value={activeEntry.walkMinutes} onChange={(event) => updateEntry({ walkMinutes: event.target.value })} /></label>
            <label>Труд, ч<input type="number" min="0" step="0.5" value={activeEntry.workHours} onChange={(event) => updateEntry({ workHours: event.target.value })} /></label>
          </div>
          <textarea rows="3" placeholder="Какая активность была: зал, прогулка, горы, теннис, пробежка..." value={activeEntry.activityNote} onChange={(event) => updateEntry({ activityNote: event.target.value })} />
        </section>

        <section className="analytics-life-diary-card">
          <h3>Самонаблюдение</h3>
          <div className="analytics-life-diary-form-grid analytics-life-diary-form-grid-small">
            <label>Энергия 1-10<input type="number" min="1" max="10" value={activeEntry.energy} onChange={(event) => updateEntry({ energy: event.target.value })} /></label>
            <label>Настроение 1-10<input type="number" min="1" max="10" value={activeEntry.mood} onChange={(event) => updateEntry({ mood: event.target.value })} /></label>
            <label>Соцсети/новости, мин<input type="number" min="0" value={activeEntry.socialMinutes} onChange={(event) => updateEntry({ socialMinutes: event.target.value })} /></label>
          </div>
          <textarea rows="5" placeholder="Состояние: летал/туман, тяги, фокус, раздражение, что сбивало..." value={activeEntry.selfObservation} onChange={(event) => updateEntry({ selfObservation: event.target.value })} />
        </section>

        <section className="analytics-life-diary-card analytics-life-diary-card-wide">
          <h3>Встречи и итог дня</h3>
          <div className="analytics-life-diary-summary-grid">
            <label>Встречи<textarea rows="4" value={activeEntry.meetings} onChange={(event) => updateEntry({ meetings: event.target.value })} /></label>
            <label>Итог дня<textarea rows="4" value={activeEntry.daySummary} onChange={(event) => updateEntry({ daySummary: event.target.value })} /></label>
            <label>Главный вывод<textarea rows="4" value={activeEntry.mainLesson} onChange={(event) => updateEntry({ mainLesson: event.target.value })} /></label>
          </div>
        </section>
      </div>
    </section>
  );
}

export default LifeDiaryBoard;
