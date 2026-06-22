// Shared style definitions for point and line styles
// Used by both preview components and chart rendering

export interface PointStyleDefinition {
  label: string;
  svgPath: string; // SVG path data for the shape
}

export interface LineStyleDefinition {
  label: string;
  // For CSS gradient previews: repeating-linear-gradient pattern
  // Use {color} placeholder for the color
  cssPattern: string | null;
  // For Chart.js borderDash patterns
  chartJsPattern: number[] | [];
}

// Point style definitions
export const POINT_STYLES: Record<string, PointStyleDefinition> = {
  circle: {
    label: "Circle",
    svgPath: "M12,12 m-8,0 a8,8 0,1,1,16,0 a8,8 0,1,1,-16,0",
  },
  rect: {
    label: "Square",
    svgPath: "M4,4 L20,4 L20,20 L4,20 Z",
  },
  rectRounded: {
    label: "Rounded Square",
    svgPath: "M4,8 a4,4 0,0,1,4,-4 h8 a4,4 0,0,1,4,4 v8 a4,4 0,0,1,-4,4 h-8 a4,4 0,0,1,-4,-4 Z",
  },
  rectRot: {
    label: "Diamond",
    svgPath: "M12,4 L20,12 L12,20 L4,12 Z",
  },
  triangle: {
    label: "Triangle",
    svgPath: "M12,2 L22,22 L2,22 Z",
  },
  cross: {
    label: "Cross",
    svgPath: "M4,12 L20,12 M12,4 L12,20",
  },
  crossRot: {
    label: "X (Rotated)",
    svgPath: "M5,5 L19,19 M19,5 L5,19",
  },
  line: {
    label: "Long Dash",
    svgPath: "M4,12 L20,12",
  },
  dash: {
    label: "Dash",
    svgPath: "M4,12 L20,12",
  },
  star: {
    label: "Star",
    svgPath: "M12,2 L15,9 H22 L16,13 L18,20 L12,16 L6,20 L8,13 L2,9 H9 Z",
  },
};

// Line style definitions
export const LINE_STYLES: Record<string, LineStyleDefinition> = {
  solid: {
    label: "Solid",
    cssPattern: null,
    chartJsPattern: [],
  },
  dashed: {
    label: "Dashed",
    cssPattern:
      "repeating-linear-gradient(to right, {color} 0px, {color} 6px, transparent 6px, transparent 12px)",
    chartJsPattern: [5, 5],
  },
  dotted: {
    label: "Dotted",
    cssPattern:
      "repeating-linear-gradient(to right, {color} 0px, {color} 2px, transparent 2px, transparent 4px)",
    chartJsPattern: [2, 2],
  },
  dashdot: {
    label: "Dash-Dot",
    cssPattern:
      "repeating-linear-gradient(to right, {color} 0px, {color} 8px, transparent 8px, transparent 12px, {color} 12px, {color} 14px, transparent 14px, transparent 18px)",
    chartJsPattern: [8, 4, 2, 4],
  },
  longdash: {
    label: "Long Dash",
    cssPattern:
      "repeating-linear-gradient(to right, {color} 0px, {color} 10px, transparent 10px, transparent 20px)",
    chartJsPattern: [10, 5],
  },
};

// Get Chart.js borderDash pattern for a line style
export function getLineBorderDash(style: string): number[] {
  return LINE_STYLES[style]?.chartJsPattern || [];
}

// Create SVG data URL for custom point styles (used by Chart.js)
export function createPointStyleImage(
  color: string,
  type: string = "star",
  size: number = 16,
): HTMLImageElement {
  const def = POINT_STYLES[type];
  if (!def) return null as any;

  // For line and dash types, use a simple horizontal line SVG
  if (type === "line" || type === "dash") {
    const strokeWidth = 3;
    const y = 12;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4,${y} L20,${y}" stroke="${color}" stroke-width="${strokeWidth}"/>
      </svg>
    `;
    const img = new Image();
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    return img;
  }

  // For other types, use the SVG path with fill
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="${def.svgPath}" fill="${color}" stroke="white" stroke-width="1"/>
    </svg>
  `;
  const img = new Image();
  img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return img;
}

// Cache for images to avoid duplicates
const imageCache: Map<string, HTMLImageElement> = new Map();

export function getCachedPointStyleImage(color: string, type: string = "star"): HTMLImageElement {
  const key = `${type}-${color}`;
  if (!imageCache.has(key)) {
    imageCache.set(key, createPointStyleImage(color, type));
  }
  return imageCache.get(key)!;
}
