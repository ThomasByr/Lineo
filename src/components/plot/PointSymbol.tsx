import { JSX } from "preact";

export function PointSymbol({ type, color, size }: { type: string; color: string; size: number }) {
  const style: JSX.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    display: "block",
    boxSizing: "border-box",
  };

  const borderColor = "var(--point-border-color)";
  const border = `1px solid ${borderColor}`;

  switch (type) {
    case "circle":
      return <div style={{ ...style, background: color, borderRadius: "50%", border }} />;
    case "rect":
      return <div style={{ ...style, background: color, border }} />;
    case "rectRounded":
      return <div style={{ ...style, background: color, borderRadius: "20%", border }} />;
    case "rectRot":
      return <div style={{ ...style, background: color, transform: "rotate(45deg)", border }} />;
    case "triangle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M12 2L22 22H2z" fill={color} stroke={borderColor} strokeWidth="1" />
        </svg>
      );
    case "star":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path
            d="M12 2L15 9H22L16 13L18 20L12 16L6 20L8 13L2 9H9L12 2Z"
            fill={color}
            stroke={borderColor}
            strokeWidth="1"
          />
        </svg>
      );
    case "cross":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M4 12H20M12 4V20" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "crossRot":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M5 5L19 19M19 5L5 19" stroke={color} strokeWidth="3" />
        </svg>
      );
    case "dash":
    case "line":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M4 12H20" stroke={color} strokeWidth="3" />
        </svg>
      );
    default:
      return <div style={{ ...style, background: color, borderRadius: "50%", border }} />;
  }
}
