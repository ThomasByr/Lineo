import { Series, DataPoint } from "./types";
import html2canvas from "html2canvas";
import { FileResult } from "./platform";

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generates a random hex color string.
 */
export function getRandomColor(): string {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

/**
 * Converts a Base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function captureCanvas(
  container: HTMLElement,
  format: "png" | "jpg",
  autoCrop: boolean = true,
  scale: number = 2,
  transparent: boolean = false,
  quality: number = 1.0,
): Promise<Uint8Array> {
  const isDark = document.documentElement.classList.contains("dark");
  const backgroundColor = isDark ? "#1e1e1e" : "#ffffff";

  let canvas = await html2canvas(container, {
    backgroundColor: transparent ? null : backgroundColor,
    scale,
  });

  if (autoCrop) {
    canvas = trimCanvas(canvas, transparent ? null : backgroundColor);
  }

  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
  const base64Url = canvas.toDataURL(mimeType, quality);
  const base64 = base64Url.split(",")[1];
  return base64ToUint8Array(base64);
}

export function createSeries(name: string, data: DataPoint[], existingCount: number = 0): Series {
  const color = getRandomColor();

  return {
    id: crypto.randomUUID(),
    name: name || `Series ${existingCount + 1}`,
    data,
    visible: true,
    color,
    width: 2,
    showLine: false,
    lineStyle: "solid",
    pointSize: 5,
    pointStyle: "circle",
    regression: {
      type: "none",
      color: color, // Default regression color to the series color
      width: 2,
      style: "solid",
      mode: "auto",
    },
    regressionPoints: [],
  };
}

export function getFileName(file: FileResult | null): string {
  if (!file) return "No file selected";
  if (typeof file === "string") return file.split(/[/\\]/).pop() || file;
  return file.name;
}

export function parseDataPoints(text: string): DataPoint[] {
  const lines = text.trim().split("\n");
  const data: DataPoint[] = [];
  lines.forEach((line) => {
    const parts = line.trim().split(/[\s,]+/);
    if (parts.length >= 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y)) data.push({ x, y });
    }
  });
  return data;
}

function parseColumn(col: string): number {
  let sum = 0;
  for (let i = 0; i < col.length; i++) {
    sum *= 26;
    sum += col.charCodeAt(i) - "A".charCodeAt(0) + 1;
  }
  return sum - 1;
}

export function parseCellRange(range: string): { col: number; rowStart: number; rowEnd: number } | null {
  // Format: A1:A10 or A:A (whole column not supported yet, need explicit rows)
  // Regex for ColRow:ColRow
  const match = range.toUpperCase().match(/^([A-Z]+)([0-9]+):([A-Z]+)([0-9]+)$/);
  if (!match) return null;

  const col1 = parseColumn(match[1]);
  const row1 = parseInt(match[2]) - 1;
  const col2 = parseColumn(match[3]);
  const row2 = parseInt(match[4]) - 1;

  if (col1 !== col2) {
    // We only support single column ranges for now
    return null;
  }

  return {
    col: col1,
    rowStart: Math.min(row1, row2),
    rowEnd: Math.max(row1, row2),
  };
}

function trimCanvas(canvas: HTMLCanvasElement, backgroundColor: string | null): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let bgR = 255,
    bgG = 255,
    bgB = 255;
  
  if (backgroundColor && backgroundColor.startsWith("#")) {
    const hex = backgroundColor.substring(1);
    if (hex.length === 3) {
      bgR = parseInt(hex[0] + hex[0], 16);
      bgG = parseInt(hex[1] + hex[1], 16);
      bgB = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      bgR = parseInt(hex.substring(0, 2), 16);
      bgG = parseInt(hex.substring(2, 4), 16);
      bgB = parseInt(hex.substring(4, 6), 16);
    }
  }

  const isBg = (i: number) => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (backgroundColor === null) {
      return a === 0;
    }
    return a === 0 || (r === bgR && g === bgG && b === bgB);
  };

  let top = 0,
    bottom = height,
    left = 0,
    right = width;

  for (let y = 0; y < height; y++) {
    let rowHasContent = false;
    for (let x = 0; x < width; x++) {
      if (!isBg((y * width + x) * 4)) {
        rowHasContent = true;
        break;
      }
    }
    if (rowHasContent) {
      top = y;
      break;
    }
  }

  for (let y = height - 1; y >= top; y--) {
    let rowHasContent = false;
    for (let x = 0; x < width; x++) {
      if (!isBg((y * width + x) * 4)) {
        rowHasContent = true;
        break;
      }
    }
    if (rowHasContent) {
      bottom = y + 1;
      break;
    }
  }

  for (let x = 0; x < width; x++) {
    let colHasContent = false;
    for (let y = top; y < bottom; y++) {
      if (!isBg((y * width + x) * 4)) {
        colHasContent = true;
        break;
      }
    }
    if (colHasContent) {
      left = x;
      break;
    }
  }

  for (let x = width - 1; x >= left; x--) {
    let colHasContent = false;
    for (let y = top; y < bottom; y++) {
      if (!isBg((y * width + x) * 4)) {
        colHasContent = true;
        break;
      }
    }
    if (colHasContent) {
      right = x + 1;
      break;
    }
  }

  const padding = 20;

  top = Math.max(0, top - padding);
  left = Math.max(0, left - padding);
  bottom = Math.min(height, bottom + padding);
  right = Math.min(width, right + padding);

  const trimmedWidth = right - left;
  const trimmedHeight = bottom - top;

  if (trimmedWidth <= 0 || trimmedHeight <= 0) return canvas;

  const trimmedCanvas = document.createElement("canvas");
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  const trimmedCtx = trimmedCanvas.getContext("2d");
  if (!trimmedCtx) return canvas;

  if (backgroundColor) {
    trimmedCtx.fillStyle = backgroundColor;
    trimmedCtx.fillRect(0, 0, trimmedWidth, trimmedHeight);
  }

  trimmedCtx.drawImage(canvas, left, top, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
  return trimmedCanvas;
}
