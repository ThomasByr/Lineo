import { JSX } from "preact";
import { POINT_STYLES } from "../../styles";

export function PointSymbol({ type, color, size }: { type: string; color: string; size: number }) {
  const style: JSX.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    display: "block",
    boxSizing: "border-box",
  };

  const borderColor = "var(--point-border-color)";
  const border = `1px solid ${borderColor}`;
  const def = POINT_STYLES[type];

  // For line and dash, render as horizontal lines
  if (type === "line" || type === "dash") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path d="M4 12H20" stroke={color} strokeWidth="3" />
      </svg>
    );
  }

  // For circle, use div with border-radius
  if (type === "circle") {
    return <div style={{ ...style, background: color, borderRadius: "50%", border }} />;
  }

  // For rect, use div without border-radius
  if (type === "rect") {
    return <div style={{ ...style, background: color, border }} />;
  }

  // For rectRounded, use div with small border-radius
  if (type === "rectRounded") {
    return <div style={{ ...style, background: color, borderRadius: "20%", border }} />;
  }

  // For rectRot, use div with rotation
  if (type === "rectRot") {
    return <div style={{ ...style, background: color, transform: "rotate(45deg)", border }} />;
  }

  // For cross and crossRot, use SVG with stroke
  if (type === "cross" || type === "crossRot") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path d={def?.svgPath || ""} stroke={color} strokeWidth="3" />
      </svg>
    );
  }

  // For all other types with SVG paths, use fill and stroke
  if (def) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path d={def.svgPath} fill={color} stroke={borderColor} strokeWidth="1" />
      </svg>
    );
  }

  // Fallback
  return <div style={{ ...style, background: color, borderRadius: "50%", border }} />;
}
