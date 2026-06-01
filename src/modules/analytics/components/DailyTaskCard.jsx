import AnalyticsActionButton from "./AnalyticsActionButton";

const LAUNCH_STATUSES = ["В работе", "Не в работе", "Готово", "Отложено"];
const LAUNCH_PRIORITIES = ["Срочно", "Высокий", "Средний", "Низкий"];

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function getLaunchStatusTone(status) {
  if (status === "Готово") return "done";
  if (status === "Отложено") return "paused";
  if (status === "Не в работе") return "idle";
  return "active";
}

function getLaunchPriorityTone(priority) {
  if (priority === "Срочно") return "urgent";
  if (priority === "Высокий") return "high";
  if (priority === "Низкий") return "low";
  return "medium";
}

function getAudioPlaybackMimeType(mimeType = "") {
  if (mimeType.includes("mp4")) return "audio/mp4";
  if (mimeType.includes("webm")) return "audio/webm";
  return mimeType || "audio/webm";
}

function normalizeAudioDataUrl(dataUrl = "", mimeType = "") {
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const marker = ";base64,";
  const markerIndex = dataUrl.indexOf(marker);
  if (markerIndex === -1) return dataUrl;
  return `data:${getAudioPlaybackMimeType(mimeType)}${dataUrl.slice(markerIndex)}`;
}

function formatDailyMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function parseDailyDeadline(value) {
  if (!value) return null;
  const normalized = String(value).trim();
  const ruMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ruMatch) {
    const date = new Date(Number(ruMatch[3]), Number(ruMatch[2]) - 1, Number(ruMatch[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function getStartOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDailyDeadlineMeta(deadline) {
  const date = parseDailyDeadline(deadline);
  if (!date) return { label: "Без даты", tone: "idle" };
  const today = getStartOfDay();
  const deadlineDay = getStartOfDay(date);
  const diffDays = Math.ceil((deadlineDay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: `Просрочено ${Math.abs(diffDays)} дн.`, tone: "danger" };
  if (diffDays === 0) return { label: "Сегодня дедлайн", tone: "urgent" };
  if (diffDays === 1) return { label: "Остался 1 день", tone: "accent" };
  return { label: `Осталось ${diffDays} дн.`, tone: diffDays <= 3 ? "accent" : "safe" };
}

export default function DailyTaskCard({
  task,
  index,
  isCompleted = false,
  responsibleDrafts,
  responsibleSavedTaskId,
  subtaskDrafts,
  subtaskChatDrafts,
  chatDrafts,
  messageEditDrafts,
  chatAuthor,
  recordingTaskId,
  recordingError,
  patchTask,
  archiveTask,
  restoreTask,
  deleteArchivedTask,
  commitResponsible,
  setResponsibleSavedTaskId,
  setResponsibleDrafts,
  updateSubtask,
  removeSubtask,
  setSubtaskDrafts,
  setSubtaskChatDrafts,
  addSubtask,
  addSubtaskMessage,
  removeSubtaskMessage,
  setChatAuthor,
  setMessageEditDrafts,
  saveEditedMessage,
  cancelEditMessage,
  startEditMessage,
  removeMessage,
  setChatDrafts,
  addMessage,
  stopVoiceRecording,
  startVoiceRecording,
}) {
    const subtasks = normalizeArray(task.subtasks);
    const completedSubtasks = subtasks.filter((subtask) => subtask.done).length;
    const deadlineMeta = getDailyDeadlineMeta(task.deadline);
    const hasResponsibleDraft = Object.prototype.hasOwnProperty.call(responsibleDrafts, task.id);
    const responsibleValue = hasResponsibleDraft ? responsibleDrafts[task.id] : task.responsible;
    const isResponsibleChanged = hasResponsibleDraft && responsibleValue.trim() !== task.responsible;
    const isResponsibleSaved = responsibleSavedTaskId === task.id && !isResponsibleChanged;

    return (
      <article key={task.id} className={`analytics-surface analytics-daily-card${isCompleted ? " analytics-daily-card-done" : ""}`}>
        <div className="analytics-daily-card-head">
          <div>
            <span className="analytics-daily-number">{isCompleted ? "Выполнено" : `Задача ${index + 1}`}</span>
            <textarea className="analytics-daily-title" rows="2" value={task.title} onChange={(event) => patchTask(task.id, { title: event.target.value })} />
          </div>
          <div className="analytics-daily-card-actions">
            <span className={`analytics-daily-deadline analytics-daily-deadline-${deadlineMeta.tone}`}>{deadlineMeta.label}</span>
            <button type="button" className="analytics-daily-remove" onClick={() => (isCompleted ? restoreTask(task.id) : archiveTask(task.id))}>
              {isCompleted ? "Вернуть" : "Готово"}
            </button>
            {isCompleted ? (
              <button type="button" className="analytics-daily-delete" onClick={() => deleteArchivedTask(task.id)}>
                Удалить
              </button>
            ) : null}
          </div>
        </div>

        <div className="analytics-daily-subtasks">
          <div className="analytics-daily-subtasks-head">
            <span>Подзадачи</span>
            <small>{completedSubtasks}/{subtasks.length}</small>
          </div>
          <div className="analytics-daily-subtasks-list">
            {subtasks.map((subtask) => {
              const subtaskMessages = normalizeArray(subtask.messages);
              const audioMessagesCount = subtaskMessages.filter((message) => message.type === "audio").length;
              const subtaskStatus = subtask.status || (subtask.done ? "Готово" : "В работе");
              const subtaskPriority = subtask.priority || "Средний";
              const subtaskDraftKey = `${task.id}:${subtask.id}`;

              return (
                <div key={subtask.id} className={`analytics-daily-subtask${subtask.done ? " is-done" : ""}`}>
                  <div className="analytics-daily-subtask-main">
                    <input
                      type="checkbox"
                      checked={Boolean(subtask.done)}
                      onChange={(event) => updateSubtask(task.id, subtask.id, { done: event.target.checked })}
                      aria-label="Отметить подзадачу"
                    />
                    <textarea
                      className="analytics-daily-subtask-title"
                      rows="2"
                      value={subtask.title}
                      onChange={(event) => updateSubtask(task.id, subtask.id, { title: event.target.value })}
                      placeholder="Название подзадачи"
                    />
                    <div className="analytics-daily-subtask-badges">
                      <span className={`analytics-daily-subtask-badge analytics-daily-subtask-priority-${getLaunchPriorityTone(subtaskPriority)}`}>{subtaskPriority}</span>
                      <span className={`analytics-daily-subtask-badge analytics-daily-subtask-status-${getLaunchStatusTone(subtaskStatus)}`}>{subtaskStatus}</span>
                    </div>
                    <button type="button" className="analytics-daily-subtask-delete" onClick={() => removeSubtask(task.id, subtask.id)} aria-label="Удалить подзадачу">×</button>
                  </div>

                  <div className="analytics-daily-subtask-overview">
                    <span><strong>Ответственный:</strong> {subtask.responsible || "не назначен"}</span>
                    <span><strong>Дедлайн:</strong> {subtask.deadline || "без даты"}</span>
                    <span><strong>Чат:</strong> {subtaskMessages.length} сообщений{audioMessagesCount ? `, ${audioMessagesCount} голос.` : ""}</span>
                  </div>

                  <details className="analytics-daily-subtask-editor">
                    <summary>Параметры подзадачи</summary>
                    <div className="analytics-daily-subtask-meta">
                      <label>
                        <span>Ответственный</span>
                        <input
                          className="analytics-launch-input"
                          value={subtask.responsible || ""}
                          onChange={(event) => updateSubtask(task.id, subtask.id, { responsible: event.target.value })}
                          placeholder="Имя или роль"
                        />
                      </label>
                      <label>
                        <span>Приоритет</span>
                        <select
                          className={`analytics-launch-priority-select analytics-launch-priority-${getLaunchPriorityTone(subtaskPriority)}`}
                          value={subtaskPriority}
                          onChange={(event) => updateSubtask(task.id, subtask.id, { priority: event.target.value })}
                        >
                          {LAUNCH_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Статус</span>
                        <select
                          className={`analytics-launch-status-select analytics-launch-status-${getLaunchStatusTone(subtaskStatus)}`}
                          value={subtaskStatus}
                          onChange={(event) => updateSubtask(task.id, subtask.id, { status: event.target.value })}
                        >
                          {LAUNCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Дедлайн</span>
                        <input
                          className="analytics-launch-input"
                          value={subtask.deadline || ""}
                          onChange={(event) => updateSubtask(task.id, subtask.id, { deadline: event.target.value })}
                          placeholder="01.06"
                        />
                      </label>
                    </div>
                  </details>

                  <details className="analytics-daily-subtask-chat" defaultOpen={subtaskMessages.length > 0}>
                    <summary className="analytics-daily-subtask-chat-head">
                      <span>Чат по подзадаче</span>
                      <small>{subtaskMessages.length}</small>
                    </summary>
                    <div className="analytics-daily-subtask-messages">
                      {subtaskMessages.map((message) => (
                        <div key={message.id} className="analytics-daily-subtask-message">
                          <div>
                            <strong>{message.author || "Команда"}</strong>
                            <span>{formatDailyMessageTime(message.createdAt)}</span>
                          </div>
                          {message.type === "audio" && message.audioDataUrl ? (
                            <div className="analytics-daily-audio-message">
                              <audio
                                controls
                                preload="auto"
                                src={normalizeAudioDataUrl(message.audioDataUrl, message.audioMimeType)}
                                onCanPlay={(event) => {
                                  event.currentTarget.dataset.ready = "true";
                                }}
                              />
                              <small>{message.text || "Голосовое сообщение"}</small>
                            </div>
                          ) : (
                            <p>{message.text}</p>
                          )}
                          <button type="button" onClick={() => removeSubtaskMessage(task.id, subtask.id, message.id)}>Удалить</button>
                        </div>
                      ))}
                      {!subtaskMessages.length ? <div className="analytics-daily-chat-empty">Пока нет переписки по этой подзадаче.</div> : null}
                    </div>
                    <div className="analytics-daily-subtask-chat-form">
                      <input
                        className="analytics-launch-input"
                        value={subtaskChatDrafts[subtaskDraftKey] || ""}
                        onChange={(event) => setSubtaskChatDrafts((current) => ({ ...current, [subtaskDraftKey]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") addSubtaskMessage(task.id, subtask.id);
                        }}
                        placeholder="Сообщение по подзадаче"
                      />
                      <AnalyticsActionButton
                        variant="primary"
                        onClick={() => addSubtaskMessage(task.id, subtask.id)}
                        disabled={!(subtaskChatDrafts[subtaskDraftKey] || "").trim()}
                      >
                        Отправить
                      </AnalyticsActionButton>
                    </div>
                    <div className="analytics-daily-voice-row analytics-daily-subtask-voice-row">
                      {recordingTaskId === subtaskDraftKey ? (
                        <button type="button" className="analytics-daily-voice analytics-daily-voice-recording" onClick={stopVoiceRecording}>
                          Остановить запись
                        </button>
                      ) : (
                        <button type="button" className="analytics-daily-voice" onClick={() => startVoiceRecording(task.id, subtask.id)} disabled={Boolean(recordingTaskId)}>
                          Записать голосовое
                        </button>
                      )}
                      {recordingTaskId === subtaskDraftKey ? <span>Идёт запись...</span> : null}
                    </div>
                  </details>
                </div>
              );
            })}
            {!subtasks.length ? <div className="analytics-daily-chat-empty">Разбей большую задачу на конкретные шаги.</div> : null}
          </div>
          <div className="analytics-daily-subtask-add">
            <textarea
              className="analytics-launch-input"
              rows="2"
              value={subtaskDrafts[task.id] || ""}
              onChange={(event) => setSubtaskDrafts((current) => ({ ...current, [task.id]: event.target.value }))}
              placeholder="Например: настроить парсер, добавить сотрудника, написать письма"
            />
            <AnalyticsActionButton variant="primary" onClick={() => addSubtask(task.id)} disabled={!(subtaskDrafts[task.id] || "").trim()}>Добавить</AnalyticsActionButton>
          </div>
        </div>

        <div className="analytics-daily-details">
          <label>
            <span>Доп. описание</span>
            <textarea className="analytics-launch-input" rows="3" value={task.description} onChange={(event) => patchTask(task.id, { description: event.target.value })} />
          </label>
          <label>
            <span>Доп. материалы / ссылки</span>
            <textarea className="analytics-launch-input" rows="3" value={task.materials} onChange={(event) => patchTask(task.id, { materials: event.target.value })} />
          </label>
        </div>

        <div className="analytics-daily-chat">
          <div className="analytics-daily-chat-head">
            <div className="analytics-daily-chat-title">Чат по задаче</div>
            <label className="analytics-daily-chat-author">
              <span>Пишет</span>
              <input className="analytics-launch-input" value={chatAuthor} onChange={(event) => setChatAuthor(event.target.value)} placeholder="Имя" />
            </label>
          </div>
          <div className="analytics-daily-chat-list">
            {normalizeArray(task.messages).map((message) => (
              <div key={message.id} className="analytics-daily-message">
                <div className="analytics-daily-message-head">
                  <strong>{message.author || "Команда"}</strong>
                  <span>
                    {formatDailyMessageTime(message.createdAt)}
                    {message.editedAt ? " · изменено" : ""}
                  </span>
                </div>
                {Object.prototype.hasOwnProperty.call(messageEditDrafts, `${task.id}:${message.id}`) ? (
                  <div className="analytics-daily-message-edit">
                    <textarea
                      className="analytics-launch-input"
                      rows="3"
                      value={messageEditDrafts[`${task.id}:${message.id}`]}
                      onChange={(event) => setMessageEditDrafts((current) => ({ ...current, [`${task.id}:${message.id}`]: event.target.value }))}
                    />
                    <div className="analytics-daily-message-actions">
                      <button type="button" className="analytics-daily-message-action analytics-daily-message-action-save" onClick={() => saveEditedMessage(task.id, message.id)} disabled={!(messageEditDrafts[`${task.id}:${message.id}`] || "").trim()}>
                        Сохранить
                      </button>
                      <button type="button" className="analytics-daily-message-action" onClick={() => cancelEditMessage(task.id, message.id)}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.type === "audio" && message.audioDataUrl ? (
                      <div className="analytics-daily-audio-message">
                        <audio
                          controls
                          preload="auto"
                          src={normalizeAudioDataUrl(message.audioDataUrl, message.audioMimeType)}
                          onCanPlay={(event) => {
                            event.currentTarget.dataset.ready = "true";
                          }}
                        />
                        <small>{message.text || "Голосовое сообщение"}</small>
                      </div>
                    ) : (
                      <p>{message.text}</p>
                    )}
                    <div className="analytics-daily-message-actions">
                      {message.type === "audio" ? null : (
                        <button type="button" className="analytics-daily-message-action" onClick={() => startEditMessage(task.id, message)}>Редактировать</button>
                      )}
                      <button type="button" className="analytics-daily-message-action analytics-daily-message-action-danger" onClick={() => removeMessage(task.id, message.id)}>Удалить</button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {!normalizeArray(task.messages).length ? <div className="analytics-daily-chat-empty">История переписки пока пустая.</div> : null}
          </div>
          <div className="analytics-daily-chat-form">
            <input
              className="analytics-launch-input"
              value={chatDrafts[task.id] || ""}
              onChange={(event) => setChatDrafts((current) => ({ ...current, [task.id]: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === "Enter") addMessage(task.id);
              }}
              placeholder="Написать сообщение по этой задаче"
            />
            <AnalyticsActionButton variant="primary" onClick={() => addMessage(task.id)} disabled={!(chatDrafts[task.id] || "").trim()}>Отправить</AnalyticsActionButton>
          </div>
          <div className="analytics-daily-voice-row">
            {recordingTaskId === task.id ? (
              <button type="button" className="analytics-daily-voice analytics-daily-voice-recording" onClick={stopVoiceRecording}>
                Остановить запись
              </button>
            ) : (
              <button type="button" className="analytics-daily-voice" onClick={() => startVoiceRecording(task.id)} disabled={Boolean(recordingTaskId)}>
                Записать голосовое
              </button>
            )}
            {recordingTaskId === task.id ? <span>Идёт запись...</span> : null}
          </div>
          {recordingError ? <div className="analytics-daily-voice-error">{recordingError}</div> : null}
        </div>
      </article>
    );
}
