import { JSX } from "preact";

interface ColorInputProps extends Omit<
  JSX.HTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "onInput"
> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorInput({ label, value, onChange, ...props }: ColorInputProps) {
  return (
    <div
      className="control-group"
      style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}
    >
      {label && <label>{label}</label>}
      <input
        type="color"
        value={value}
        onInput={(e) => onChange(e.currentTarget.value)}
        style={{
          height: "30px",
          width: "50px",
          padding: "0 2px",
          cursor: "pointer",
        }}
        {...props}
      />
    </div>
  );
}
