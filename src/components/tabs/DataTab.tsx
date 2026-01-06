import { useState } from "preact/hooks";
import { Series, DataPoint } from "../../types";
import Papa from "papaparse";
import { openFile, readText, readExcel, FileResult } from "../../platform";
import { parseCellRange } from "../../utils";
import { Toggle } from "../ui/Toggle";
import { CustomSelect } from "../ui/CustomSelect";
import { useNotification } from "../../contexts/NotificationContext";
import { isTauri } from "../../platform";

interface DataTabProps {
  series: Series[];
  setSeries: (series: Series[]) => void;
  updateSeries: (id: string, updates: Partial<Series>) => void;
  onAddSeries: (name: string, data: DataPoint[]) => void;
}

export function DataTab({ series, setSeries, updateSeries, onAddSeries }: DataTabProps) {
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<"csv" | "excel" | "manual">("manual");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState("");

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  // CSV State
  const [csvPath, setCsvPath] = useState<FileResult | null>(null);
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [csvXCol, setCsvXCol] = useState("x");
  const [csvYCol, setCsvYCol] = useState("y");

  // Excel State
  const [excelPath, setExcelPath] = useState<FileResult | null>(null);
  const [excelSheet, setExcelSheet] = useState("");
  const [excelXRange, setExcelXRange] = useState("A2:A11");
  const [excelYRange, setExcelYRange] = useState("B2:B11");

  // Manual State
  const [manualInput, setManualInput] = useState("");
  const [manualFormat, setManualFormat] = useState<"pairs" | "lists">("pairs");

  const getFileName = (file: FileResult | null) => {
    if (!file) return "No file selected";
    if (typeof file === "string") return file.split(/[/\\]/).pop() || file;
    return file.name;
  };

  const removeSeries = (id: string) => {
    setSeries(series.filter((s) => s.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditData("");
    }
  };

  const startEditing = (s: Series) => {
    setEditingId(s.id);
    const text = s.data.map((p) => `${p.x} ${p.y}`).join("\n");
    setEditData(text);
  };

  const saveEdit = () => {
    if (!editingId) return;

    const lines = editData.trim().split("\n");
    const data: DataPoint[] = [];
    lines.forEach((line) => {
      const parts = line.trim().split(/[\s,]+/);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) data.push({ x, y });
      }
    });

    updateSeries(editingId, { data });
    setEditingId(null);
    setEditData("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData("");
  };

  const startRenaming = (s: Series) => {
    setRenamingId(s.id);
    setRenameName(s.name);
  };

  const saveRename = () => {
    if (renamingId) {
      updateSeries(renamingId, { name: renameName });
      setRenamingId(null);
      setRenameName("");
    }
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameName("");
  };

  const selectCsvFile = async () => {
    const selected = await openFile([{ name: "CSV", extensions: ["csv"] }]);
    if (selected) {
      setCsvPath(selected);
    }
  };

  const loadCsv = async () => {
    if (!csvPath) return;

    try {
      const content = await readText(csvPath);
      Papa.parse(content, {
        header: csvHasHeader,
        dynamicTyping: true,
        complete: (results) => {
          const data: DataPoint[] = [];
          results.data.forEach((row: any) => {
            let x, y;
            if (csvHasHeader) {
              x = row[csvXCol];
              y = row[csvYCol];
            } else {
              // If no header, user should input indices (0-based)
              // But let's assume they input 1-based indices or we handle it
              // For simplicity, let's say if no header, cols are 0, 1, 2...
              // User input "1" means index 0.
              const xIdx = parseInt(csvXCol) - 1;
              const yIdx = parseInt(csvYCol) - 1;
              if (Array.isArray(row)) {
                x = row[xIdx];
                y = row[yIdx];
              }
            }

            if (typeof x === "number" && typeof y === "number") {
              data.push({ x, y });
            }
          });

          const name = getFileName(csvPath);
          onAddSeries(name, data);
          setCsvPath(null);
        },
      });
    } catch (e) {
      console.error("Error reading CSV:", e);
      addNotification("error", "Failed to load CSV: " + e);
    }
  };

  const selectExcelFile = async () => {
    const selected = await openFile([{ name: "Excel", extensions: ["xlsx", "xls"] }]);
    if (selected) {
      setExcelPath(selected);
    }
  };

  const loadExcel = async () => {
    if (!excelPath) return;
    const xRange = parseCellRange(excelXRange);
    const yRange = parseCellRange(excelYRange);

    if (!xRange || !yRange) {
      addNotification("error", "Invalid range format. Use A1:A10");
      return;
    }

    try {
      const data = await readExcel(
        excelPath,
        excelSheet || null,
        xRange.col,
        xRange.rowStart,
        xRange.rowEnd,
        yRange.col,
        yRange.rowStart,
        yRange.rowEnd,
      );
      onAddSeries(`Excel Data`, data);
      addNotification("success", "Excel data loaded successfully");
    } catch (e) {
      console.error(e);
      addNotification("error", "Failed to load Excel: " + e);
    }
  };

  const loadManual = () => {
    const lines = manualInput.trim().split("\n");
    const data: DataPoint[] = [];

    if (manualFormat === "pairs") {
      lines.forEach((line) => {
        const parts = line.trim().split(/[\s,]+/);
        if (parts.length >= 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          if (!isNaN(x) && !isNaN(y)) data.push({ x, y });
        }
      });
    } else {
      // Lists: first line X, second line Y
      if (lines.length >= 2) {
        const xs = lines[0]
          .trim()
          .split(/[\s,]+/)
          .map(parseFloat);
        const ys = lines[1]
          .trim()
          .split(/[\s,]+/)
          .map(parseFloat);
        const count = Math.min(xs.length, ys.length);
        for (let i = 0; i < count; i++) {
          if (!isNaN(xs[i]) && !isNaN(ys[i])) {
            data.push({ x: xs[i], y: ys[i] });
          }
        }
      }
    }
    onAddSeries("Manual Data", data);
    setManualInput("");
  };

  return (
    <div className="data-tab">
      <div className="series-list">
        <h3>Loaded Series</h3>
        {series.length === 0 && <p>No data loaded.</p>}
        <ul className="series-list-ul">
          {series.map((s) => (
            <li key={s.id} className="series-list-item">
              {renamingId === s.id ? (
                <div
                  style={{
                    display: "flex",
                    gap: "5px",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <input
                    type="text"
                    value={renameName}
                    onInput={(e) => setRenameName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      else if (e.key === "Escape") cancelRename();
                    }}
                    className="rename-input"
                    autoFocus
                  />
                  <button onClick={saveRename} className="small-btn">
                    OK
                  </button>
                  <button onClick={cancelRename} className="small-btn">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      onDblClick={() => startRenaming(s)}
                      title="Double click to rename"
                      style={{ fontWeight: 500, fontSize: "1.05em" }}
                    >
                      {s.name}
                    </span>
                    <span className="series-count">{s.data.length} pts</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => startRenaming(s)} className="small-btn" style={{ flex: 1 }}>
                      Rename
                    </button>
                    <button onClick={() => startEditing(s)} className="small-btn" style={{ flex: 1 }}>
                      Edit Data
                    </button>
                    <button
                      onClick={() => removeSeries(s.id)}
                      className="small-btn remove-btn"
                      style={{ flex: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <hr />

      {editingId ? (
        <div className="edit-data-section">
          <h3>Edit Series Data</h3>
          <p>Editing: {series.find((s) => s.id === editingId)?.name}</p>
          <textarea
            rows={10}
            value={editData}
            onInput={(e) => setEditData(e.currentTarget.value)}
            className="data-textarea"
          />
          <div style={{ marginTop: "10px" }}>
            <button onClick={saveEdit} style={{ marginRight: "10px" }}>
              Save Changes
            </button>
            <button onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="add-data-section">
          <h3>Add Data</h3>
          <div className="tabs" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            {isTauri() && (
              <>
                <button
                  disabled={activeTab === "csv"}
                  onClick={() => setActiveTab("csv")}
                  style={{ flex: 1 }}
                >
                  CSV
                </button>
                <button
                  disabled={activeTab === "excel"}
                  onClick={() => setActiveTab("excel")}
                  style={{ flex: 1 }}
                >
                  Excel
                </button>
              </>
            )}
            <button
              disabled={activeTab === "manual"}
              onClick={() => setActiveTab("manual")}
              style={{ flex: 1 }}
            >
              Manual
            </button>
          </div>

          <div className="tab-content" style={{ marginTop: "10px" }}>
            {isTauri() && activeTab === "csv" && (
              <div className="csv-input">
                <button onClick={selectCsvFile}>Select File</button>
                <p>{getFileName(csvPath)}</p>

                <div className="control-group">
                  <Toggle
                    label="Has Header"
                    checked={csvHasHeader}
                    onChange={(checked) => setCsvHasHeader(checked)}
                    onLabel="Yes"
                    offLabel="No"
                  />
                </div>
                <div className="control-group">
                  <label>X Column ({csvHasHeader ? "Name" : "Index 1-based"}):</label>
                  <input type="text" value={csvXCol} onInput={(e) => setCsvXCol(e.currentTarget.value)} />
                </div>
                <div className="control-group">
                  <label>Y Column ({csvHasHeader ? "Name" : "Index 1-based"}):</label>
                  <input type="text" value={csvYCol} onInput={(e) => setCsvYCol(e.currentTarget.value)} />
                </div>
                <button onClick={loadCsv} disabled={!csvPath}>
                  Load CSV
                </button>
              </div>
            )}

            {isTauri() && activeTab === "excel" && (
              <div className="excel-input">
                <button onClick={selectExcelFile}>Select File</button>
                <p>{getFileName(excelPath)}</p>

                <div className="control-group">
                  <label>Sheet Name (Optional):</label>
                  <input
                    type="text"
                    value={excelSheet}
                    onInput={(e) => setExcelSheet(e.currentTarget.value)}
                  />
                </div>
                <div className="control-group">
                  <label>X Range (e.g. A1:A10):</label>
                  <input
                    type="text"
                    value={excelXRange}
                    onInput={(e) => setExcelXRange(e.currentTarget.value)}
                  />
                </div>
                <div className="control-group">
                  <label>Y Range (e.g. B1:B10):</label>
                  <input
                    type="text"
                    value={excelYRange}
                    onInput={(e) => setExcelYRange(e.currentTarget.value)}
                  />
                </div>
                <button onClick={loadExcel} disabled={!excelPath}>
                  Load Excel
                </button>
              </div>
            )}

            {activeTab === "manual" && (
              <div className="manual-input">
                <div className="control-group">
                  <label>Format:</label>
                  <CustomSelect
                    value={manualFormat}
                    onChange={(val) => setManualFormat(val as any)}
                    className="format-select"
                    options={[
                      { value: "pairs", label: "X Y Pairs (one per line)" },
                      {
                        value: "lists",
                        label: "X List then Y List (2 lines)",
                      },
                    ]}
                  />
                </div>
                <textarea
                  rows={5}
                  value={manualInput}
                  onInput={(e) => setManualInput(e.currentTarget.value)}
                  placeholder={manualFormat === "pairs" ? "1 2\n3 4" : "1 3 5\n2 4 6"}
                  className="data-textarea"
                />
                <button onClick={loadManual}>Load Manual</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
