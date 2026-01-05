import { invoke } from "@tauri-apps/api/core";
import { open as tauriOpen, save as tauriSave } from "@tauri-apps/plugin-dialog";
import { readTextFile as tauriReadTextFile } from "@tauri-apps/plugin-fs";
import { writeImage as tauriWriteImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image as TauriImage } from "@tauri-apps/api/image";
import { DataPoint } from "./types";

// Check if running in Tauri environment
export const isTauri = () => '__TAURI_INTERNALS__' in window;

export type FileResult = string | File;

export async function openFile(filters: { name: string; extensions: string[] }[]): Promise<FileResult | null> {
    if (isTauri()) {
        const selected = await tauriOpen({
            multiple: false,
            filters
        });
        return selected as string | null;
    } else {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = filters.flatMap(f => f.extensions.map(e => '.' + e)).join(',');
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                resolve(file || null);
            };
            input.click();
        });
    }
}

export async function readText(file: FileResult): Promise<string> {
    if (isTauri() && typeof file === 'string') {
        return await tauriReadTextFile(file);
    } else if (file instanceof File) {
        return await file.text();
    }
    throw new Error('Invalid file type for platform');
}

export async function readExcel(
    file: FileResult, 
    sheetName: string | null, 
    xCol: number, 
    xRowStart: number, 
    xRowEnd: number, 
    yCol: number, 
    yRowStart: number, 
    yRowEnd: number
): Promise<DataPoint[]> {
    if (isTauri() && typeof file === 'string') {
        return await invoke<DataPoint[]>('read_excel', {
            path: file,
            sheetName,
            xCol,
            xRowStart,
            xRowEnd,
            yCol,
            yRowStart,
            yRowEnd
        });
    } else {
        throw new Error("Excel import is currently only available in the desktop application.");
    }
}

export async function saveImage(blob: Blob, defaultName: string): Promise<void> {
    if (isTauri()) {
        const path = await tauriSave({
            defaultPath: defaultName,
            filters: [{
                name: 'Image',
                extensions: ['png', 'jpg']
            }]
        });

        if (path) {
            const arrayBuffer = await blob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            // Convert to array for Rust
            await invoke('save_image', { path, data: Array.from(uint8Array) });
        }
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export async function copyImageToClipboard(blob: Blob): Promise<void> {
    if (isTauri()) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const image = await TauriImage.fromBytes(uint8Array);
        await tauriWriteImage(image);
    } else {
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
    }
}
