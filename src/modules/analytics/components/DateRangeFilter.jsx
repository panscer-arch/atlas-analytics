function DateRangeFilter({ value, options, onChange }) {
  return (
    <div>
      <label className="analytics-filter-label" htmlFor="dateRange">
        Период
      </label>
      <select id="dateRange" className="analytics-filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DateRangeFilter;
