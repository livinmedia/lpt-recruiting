// RKRT.in UI Components - Input
// Reusable input components

import T from '../../lib/theme';

const baseInputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 8,
  background: T.d,
  border: `1px solid ${T.b}`,
  color: T.t,
  fontSize: 16,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

/**
 * Text input with label
 */
export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength,
  style = {},
}) {
  const hasValue = value && value.trim();
  
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 11,
            color: T.m,
            letterSpacing: 1.5,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {label.toUpperCase()}
          {required && " *"}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          ...baseInputStyle,
          border: `1px solid ${hasValue && required ? T.a + "40" : T.b}`,
          ...style,
        }}
      />
    </div>
  );
}

/**
 * Select dropdown with label
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
  required = false,
  style = {},
}) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 11,
            color: T.m,
            letterSpacing: 1.5,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {label.toUpperCase()}
          {required && " *"}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...baseInputStyle,
          cursor: "pointer",
          border: `1px solid ${value && required ? T.a + "40" : T.b}`,
          ...style,
        }}
      >
        <option value="" style={{ background: T.card }}>
          {placeholder}
        </option>
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lbl = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={val} value={val} style={{ background: T.card }}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/**
 * Textarea with label
 */
export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
  style = {},
}) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 11,
            color: T.m,
            letterSpacing: 1.5,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {label.toUpperCase()}
          {required && " *"}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          ...baseInputStyle,
          resize: "vertical",
          lineHeight: 1.5,
          ...style,
        }}
      />
    </div>
  );
}

/**
 * Search input with icon
 */
export function SearchInput({ value, onChange, placeholder = "Search...", width = 220 }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...baseInputStyle,
        width,
        background: T.card,
      }}
    />
  );
}

export default Input;
