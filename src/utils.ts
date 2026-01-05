import { Series, DataPoint } from "./types";
import html2canvas from 'html2canvas';

export async function captureCanvas(container: HTMLElement, format: 'png' | 'jpg'): Promise<Uint8Array> {
    const isDark = document.documentElement.classList.contains('dark');
    const backgroundColor = isDark ? '#1e1e1e' : '#ffffff';

    const canvas = await html2canvas(container, {
        backgroundColor,
        scale: 2
    });

    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const base64Url = canvas.toDataURL(mimeType, 1.0);
    const base64 = base64Url.split(',')[1];
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function createSeries(name: string, data: DataPoint[], existingCount: number = 0): Series {
    return {
        id: crypto.randomUUID(),
        name: name || `Series ${existingCount + 1}`,
        data,
        visible: true,
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
        width: 2,
        showLine: false,
        lineStyle: 'solid',
        pointSize: 5,
        pointStyle: 'circle',
        regression: {
            type: 'none',
            color: '#ff0000',
            width: 2,
            style: 'solid',
            mode: 'auto'
        },
        regressionPoints: []
    };
}

export function parseColumn(col: string): number {
    let sum = 0;
    for (let i = 0; i < col.length; i++) {
        sum *= 26;
        sum += (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return sum - 1;
}

export function parseCellRange(range: string): { col: number, rowStart: number, rowEnd: number } | null {
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
        rowEnd: Math.max(row1, row2)
    };
}
