function SegmentFilter({ value, options, onChange }) {
  return (
    <div>
      <label className="analytics-filter-label" htmlFor="segmentFilter">
        Сегмент
      </label>
      <select id="segmentFilter" className="form-select analytics-filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SegmentFilter;
