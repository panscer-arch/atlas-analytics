const VARIANTS = new Set(["primary", "secondary", "success", "warning", "danger"]);
const SIZES = new Set(["default", "sm", "icon"]);

function getToken(tokens, value, fallback) {
  return tokens.has(value) ? value : fallback;
}

function AnalyticsActionButton({
  children,
  disabled = false,
  onClick,
  type = "button",
  variant = "secondary",
  size = "default",
  title,
  ariaLabel,
  "aria-label": ariaLabelProp,
}) {
  const variantToken = getToken(VARIANTS, variant, "secondary");
  const sizeToken = getToken(SIZES, size, "default");
  const buttonAriaLabel = ariaLabel || ariaLabelProp;

  return (
    <button
      type={type}
      className={`analytics-action-button analytics-action-button-${variantToken} analytics-action-button-${sizeToken}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={buttonAriaLabel}
    >
      {children}
    </button>
  );
}

export default AnalyticsActionButton;
