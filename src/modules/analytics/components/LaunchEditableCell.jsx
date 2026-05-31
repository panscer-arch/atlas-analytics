export default function LaunchEditableCell({
  activeBoard,
  task,
  field,
  editingCell,
  setEditingCell,
  updateTask,
  variant = "default",
  multiline = false,
  rows = 4,
  selectOptions,
}) {
  const cellKey = `${activeBoard}:${task.id}:${field}`;
  const isEditing = editingCell === cellKey;
  const value = task[field] || "";
  const label = value || "Нажми, чтобы заполнить";
  const inputClasses = `analytics-launch-table-input analytics-launch-table-input-${variant}`;

  if (isEditing) {
    const commonProps = {
      className: inputClasses,
      value,
      autoFocus: true,
      onChange: (event) => updateTask(task.id, { [field]: event.target.value }),
      onBlur: () => setEditingCell(null),
    };

    if (selectOptions) {
      return (
        <select
          className={inputClasses}
          value={value}
          autoFocus
          onChange={(event) => updateTask(task.id, { [field]: event.target.value })}
          onBlur={() => setEditingCell(null)}
        >
          {selectOptions.map((option) => (
            <option key={option || "empty"} value={option}>
              {option || "Не назначен"}
            </option>
          ))}
        </select>
      );
    }

    if (multiline) {
      return <textarea {...commonProps} rows={rows} />;
    }

    return (
      <input
        {...commonProps}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.currentTarget.blur();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`analytics-launch-read-cell analytics-launch-read-cell-${variant}${value ? "" : " analytics-launch-read-cell-empty"}`}
      onClick={() => setEditingCell(cellKey)}
    >
      {label}
    </button>
  );
}
