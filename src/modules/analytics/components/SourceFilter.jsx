function SourceFilter({ value, options, onChange }) {
  return (
    <div>
      <label className="analytics-filter-label" htmlFor="sourceFilter">
        Продукт
      </label>
      <select id="sourceFilter" className="analytics-filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SourceFilter;
