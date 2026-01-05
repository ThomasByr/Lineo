// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use calamine::{Reader, open_workbook_auto, Data};

#[derive(serde::Serialize)]
struct DataPoint {
    x: f64,
    y: f64,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_image(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file_custom(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_excel(
    path: String,
    sheet_name: Option<String>,
    x_col: usize,
    x_row_start: usize,
    x_row_end: usize,
    y_col: usize,
    y_row_start: usize,
    y_row_end: usize,
) -> Result<Vec<DataPoint>, String> {
    let mut workbook = open_workbook_auto(&path).map_err(|e| e.to_string())?;
    
    let range_result = if let Some(name) = sheet_name {
        workbook.worksheet_range(&name)
    } else {
        workbook.worksheet_range_at(0).ok_or(calamine::Error::Msg("Sheet not found")).and_then(|r| r)
    };

    let sheet = range_result.map_err(|e| e.to_string())?;

    let mut data = Vec::new();
    
    let x_count = if x_row_end >= x_row_start { x_row_end - x_row_start + 1 } else { 0 };
    let y_count = if y_row_end >= y_row_start { y_row_end - y_row_start + 1 } else { 0 };
    let count = std::cmp::min(x_count, y_count);

    for i in 0..count {
        let r_x = x_row_start + i;
        let r_y = y_row_start + i;
        
        let x_val = sheet.get_value((r_x as u32, x_col as u32)).and_then(|c| match c {
             Data::Float(f) => Some(*f),
             Data::Int(i) => Some(*i as f64),
             Data::String(s) => s.parse::<f64>().ok(),
             _ => None,
        });
        
        let y_val = sheet.get_value((r_y as u32, y_col as u32)).and_then(|c| match c {
             Data::Float(f) => Some(*f),
             Data::Int(i) => Some(*i as f64),
             Data::String(s) => s.parse::<f64>().ok(),
             _ => None,
        });

        if let (Some(x), Some(y)) = (x_val, y_val) {
            data.push(DataPoint { x, y });
        }
    }

    Ok(data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![greet, save_image, read_excel, save_text_file, read_text_file_custom])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
