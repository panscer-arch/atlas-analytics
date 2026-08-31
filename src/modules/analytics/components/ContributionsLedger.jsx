import { useMemo, useState } from "react";
import {
  createContribution,
  formatDate,
  getEditableMoneyValue,
  readEditableMoneyValue,
} from "../utils/expensesUtils";
import "../styles/contributions.css";

function formatAmount(value) {
  return Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export default function ContributionsLedger({ contributions, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => createContribution());
  const [editingId, setEditingId] = useState("");

  const orderedContributions = useMemo(
    () => [...contributions].sort((left, right) => right.asOfDate.localeCompare(left.asOfDate)),
    [contributions],
  );
  const totalAmount = contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const canSave = draft.participant.trim() && Number(draft.amount) >= 0 && draft.amount !== "" && draft.asOfDate;

  function resetForm() {
    setDraft(createContribution());
    setEditingId("");
  }

  function saveDraft(event) {
    event.preventDefault();
    if (!canSave) return;
    onSave({
      ...draft,
      participant: draft.participant.trim(),
      updatedAt: new Date().toISOString(),
    }, editingId);
    resetForm();
  }

  function editContribution(item) {
    setDraft(createContribution(item));
    setEditingId(item.id);
    window.requestAnimationFrame(() => document.querySelector("#contribution-participant")?.focus());
  }

  return (
    <section className="analytics-contributions-registry analytics-surface">
      <header className="analytics-contributions-head">
        <div>
          <span className="analytics-kicker">Внутренний учёт Atlas</span>
          <h3>Кто сколько вложил</h3>
          <p>Суммы обновляются вручную по мере пополнения.</p>
        </div>
        <div className="analytics-contributions-total">
          <span>Общая сумма</span>
          <strong>{formatAmount(totalAmount)}</strong>
        </div>
      </header>

      <form className="analytics-contributions-form" onSubmit={saveDraft}>
        <label>
          <span>Участник</span>
          <input
            id="contribution-participant"
            value={draft.participant}
            onChange={(event) => setDraft((current) => ({ ...current, participant: event.target.value }))}
            placeholder="Имя"
          />
        </label>
        <label>
          <span>Сумма</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={getEditableMoneyValue(draft.amount)}
            onChange={(event) => setDraft((current) => ({
              ...current,
              amount: readEditableMoneyValue(event.target.value),
            }))}
            placeholder="0"
          />
        </label>
        <label>
          <span>Актуально на</span>
          <input
            type="date"
            value={draft.asOfDate}
            onChange={(event) => setDraft((current) => ({ ...current, asOfDate: event.target.value }))}
          />
        </label>
        <div className="analytics-contributions-form-actions">
          {editingId ? (
            <button type="button" className="analytics-expenses-secondary" onClick={resetForm}>Отмена</button>
          ) : null}
          <button type="submit" className="analytics-expenses-add" disabled={!canSave}>
            {editingId ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </form>

      <div className="analytics-table-responsive">
        <table className="analytics-table analytics-contributions-table">
          <thead>
            <tr>
              <th>Участник</th>
              <th>Сумма</th>
              <th>Актуально на</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {orderedContributions.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.participant}</strong></td>
                <td><strong>{formatAmount(item.amount)}</strong></td>
                <td>{formatDate(item.asOfDate)}</td>
                <td>
                  <div className="analytics-expenses-actions">
                    <button type="button" onClick={() => editContribution(item)}>Изменить</button>
                    <button type="button" onClick={() => onDelete(item.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
            {!orderedContributions.length ? (
              <tr><td colSpan="4" className="analytics-expenses-empty">Записей пока нет.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
