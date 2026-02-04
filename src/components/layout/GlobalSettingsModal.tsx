import { useState, useEffect, useRef } from "preact/hooks";
import { createPortal } from "preact/compat";
import { PlotSettings } from "../../types";
import { PlotSettingsForm } from "../tabs/PlotSettingsForm";
import "./GlobalSettingsModal.css";
import { save, open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../../platform";
import { invoke } from "@tauri-apps/api/core";
import { useNotification } from "../../contexts/NotificationContext";
import { DEFAULT_PLOT_SETTINGS } from "../../constants";
import { useFocusTrap } from "../../hooks/useFocusTrap";

// --- Helper Component for Focus Trap in Sub-Modals ---
function DialogFocusTrap({ className, children }: { className?: string; children: any }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);

  useEffect(() => {
    setTimeout(() => {
        const first = ref.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
    }, 50);
  }, []);

  return (
      <div className={className} ref={ref}>
          {children}
      </div>
  );
}

// --- Types ---


interface Preset {
  id: number;
  name: string;
  settings: PlotSettings;
  isStartup?: boolean;
}

interface GlobalSettingsModalProps {
  onClose: () => void;
  currentSettings: PlotSettings;
  onApplySettings: (settings: PlotSettings) => void;
}

const STORAGE_KEY = "lineo_global_presets";
const STARTUP_KEY = "lineo_startup_preset_id";

// --- Component ---

export function GlobalSettingsModal({ onClose, currentSettings, onApplySettings }: GlobalSettingsModalProps) {
  const { addNotification } = useNotification();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deleteAllStep, setDeleteAllStep] = useState(0); // 0: none, 1: confirm, 2: double confirm

  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  
  // The state being edited in the main window
  const [formSettings, setFormSettings] = useState<PlotSettings>(currentSettings);

  // Import / Export State
  const [pendingImport, setPendingImport] = useState<PlotSettings | null>(null); // For single file import
  const [importCandidates, setImportCandidates] = useState<Preset[] | null>(null); // For multi file import
  const [importSelection, setImportSelection] = useState<Set<number>>(new Set());
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<number>>(new Set());

  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap
  // Disable outer trap when a sub-modal is open, so the sub-modal's trap can take over
  const isSubModalOpen = showExportModal || !!importCandidates || !!pendingImport || pendingDeleteId !== null || deleteAllStep > 0;
  useFocusTrap(modalRef, !isSubModalOpen);

  // Initial focus and Escape key
  useEffect(() => {
    // Focus first interactive element
    setTimeout(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            // Only close if no sub-modals are open
            if (!showExportModal && !pendingImport && pendingDeleteId === null && activePresetId !== null && renamingId === null) {
                 // Maybe just deselect if selected?
                 // Or actually close the modal? 
                 // User request: "escape ... like for the other modals" -> usually closes the modal
                 onClose();
            } else if (renamingId !== null) {
                cancelRename();
            } else if (showExportModal) {
                setShowExportModal(false);
            } else if (pendingImport) {
                setPendingImport(null);
            } else if (pendingDeleteId !== null) {
                setPendingDeleteId(null);
            } else {
                onClose();
            }
        }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showExportModal, pendingImport, pendingDeleteId, activePresetId, renamingId, onClose]);

  // Load Presets
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const startupIdRaw = localStorage.getItem(STARTUP_KEY);
    const startupId = startupIdRaw ? Number(startupIdRaw) : null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const validPresets: Preset[] = parsed
            .filter((p: any) => p.settings !== null) 
            .map((p: any) => ({
                id: p.id,
                name: p.name,
                settings: p.settings,
                isStartup: p.id === startupId
            }));
        setPresets(validPresets);
      } catch (e) {
        console.error("Failed to parse presets", e);
      }
    }
  }, []);

  // Sync Presets
  const savePresetsToStorage = (newPresets: Preset[]) => {
    setPresets(newPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
    
    // Sync startup ID
    const startup = newPresets.find(p => p.isStartup);
    if (startup) {
        localStorage.setItem(STARTUP_KEY, startup.id.toString());
    } else {
        localStorage.removeItem(STARTUP_KEY);
    }
  };

  // --- Actions ---

  const handleAddPreset = () => {
    const newId = Date.now();
    const newPreset: Preset = {
        id: newId,
        name: "New Preset",
        settings: { ...DEFAULT_PLOT_SETTINGS },
        isStartup: false
    };
    const newPresets = [...presets, newPreset];
    savePresetsToStorage(newPresets);
    setActivePresetId(newId);
    setFormSettings({ ...DEFAULT_PLOT_SETTINGS });
  };

  const handleDuplicatePreset = () => {
    if (activePresetId === null) return;
    const activePreset = presets.find(p => p.id === activePresetId);
    if (!activePreset) return;

    const newId = Date.now();
    const newPreset: Preset = {
        id: newId,
        name: activePreset.name + " (Copy)",
        settings: { ...activePreset.settings },
        isStartup: false
    };
    const newPresets = [...presets, newPreset];
    savePresetsToStorage(newPresets);
    setActivePresetId(newId);
    setFormSettings({ ...activePreset.settings });
  };

  const handleSettingsChange = (newSettings: PlotSettings) => {
    setFormSettings(newSettings);
    if (activePresetId !== null) {
        const newPresets = presets.map(p => {
            if (p.id === activePresetId) {
                return { ...p, settings: { ...newSettings } };
            }
            return p;
        });
        savePresetsToStorage(newPresets);
    }
  };

  const handleDeletePreset = (id: number, e: Event) => {
    e.stopPropagation();
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    
    const newPresets = presets.filter(p => p.id !== pendingDeleteId);
    savePresetsToStorage(newPresets);
    
    if (activePresetId === pendingDeleteId) {
        setActivePresetId(null);
    }
    
    setPendingDeleteId(null);
    addNotification("success", "Preset deleted");
  };

  const handleInitDeleteAll = () => {
      if (presets.length === 0) return;
      setDeleteAllStep(1);
  };

  const handleConfirmDeleteAll = () => {
      if (deleteAllStep === 1) {
          setDeleteAllStep(2);
      } else if (deleteAllStep === 2) {
          savePresetsToStorage([]);
          setActivePresetId(null);
          setDeleteAllStep(0);
          addNotification("success", "All presets deleted.");
      }
  };


  const handleRenamePreset = (id: number, newName: string) => {
    const newPresets = presets.map(p => {
        if (p.id === id) return { ...p, name: newName };
        return p;
    });
    savePresetsToStorage(newPresets);
  };

  const startRenaming = (p: Preset) => {
    setRenamingId(p.id);
    setRenameName(p.name);
  };

  const saveRename = () => {
    if (renamingId !== null && renameName.trim()) {
        handleRenamePreset(renamingId, renameName);
    }
    setRenamingId(null);
    setRenameName("");
  };

  const cancelRename = () => {
      setRenamingId(null);
      setRenameName("");
  };

  const handleSetStartup = (id: number, isStartup: boolean) => {
      const newPresets = presets.map(p => ({
          ...p,
          isStartup: p.id === id ? isStartup : false
      }));
      savePresetsToStorage(newPresets);

      if (isStartup) {
          const preset = presets.find(p => p.id === id);
          if (preset) {
            onApplySettings(preset.settings);
            // Also update local form to match, to visualize the change
            setFormSettings({ ...preset.settings });
            setActivePresetId(id);
            addNotification("success", "Default preset applied to current plot.");
          }
      }
  };

  const handleSelectPreset = (preset: Preset) => {
      setActivePresetId(preset.id);
      setFormSettings({ ...preset.settings });
  };

  // --- Export Logic ---

  const openExportModal = () => {
      // Select all by default
      const allIds = new Set(presets.map(p => p.id));
      setExportSelection(allIds);
      setShowExportModal(true);
  };

  const toggleExportSelection = (id: number) => {
      const newSet = new Set(exportSelection);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExportSelection(newSet);
  };

  const handleExportConfirm = async () => {
      const presetsToExport = presets.filter(p => exportSelection.has(p.id));
      if (presetsToExport.length === 0) {
          addNotification("warning", "No presets selected to export.");
          return;
      }

      const content = JSON.stringify(presetsToExport, null, 2);

      if (isTauri()) {
        try {
            const path = await save({
                filters: [{ name: "Lineo Presets", extensions: ["json"] }],
                defaultPath: "lineo_presets.json"
            });

            if (path) {
                await invoke("save_text_file", { path, content });
                addNotification("success", `${presetsToExport.length} presets exported successfully!`);
                setShowExportModal(false);
            }
        } catch (e) {
            console.error(e);
            addNotification("error", "Failed to export presets.");
        }
      } else {
        // Browser Export
        try {
            const blob = new Blob([content], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "lineo_presets.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            addNotification("success", `${presetsToExport.length} presets exported successfully!`);
            setShowExportModal(false);
        } catch (e) {
             console.error(e);
             addNotification("error", "Failed to export presets.");
        }
      }
  };

  // --- Import Logic ---

  const processImportedContent = (content: string) => {
      try {
        const data = JSON.parse(content);
        
        if (Array.isArray(data)) {
            // It's a list check valid structure roughly
            const candidates: Preset[] = data.map((p:any, idx: number) => ({
                    id: p.id || idx,
                    name: p.name || "Imported",
                    settings: p.settings || p, 
                    isStartup: !!p.isStartup
            })).filter(p => p.settings);
            
            if (candidates.length > 0) {
                setImportCandidates(candidates);
                // Select all by default
                setImportSelection(new Set(candidates.map(p => p.id)));
            } else {
                addNotification("warning", "No valid presets found in file.");
            }
        } else {
            // Single object
            if (data.settings) {
                setPendingImport(data.settings); 
            } else {
                setPendingImport(data); 
            }
        }
      } catch (e) {
         console.error(e);
         addNotification("error", "Invalid JSON file.");
      }
  };

  const handleImportClick = async () => {
    if (isTauri()) {
        try {
            const path = await open({
                filters: [{ name: "Lineo Presets", extensions: ["json"] }],
                multiple: false
            });

            if (path && typeof path === 'string') {
                const content = await invoke("read_text_file_custom", { path });
                if (typeof content === 'string') {
                    processImportedContent(content);
                }
            }
        } catch (e) {
            console.error(e);
            addNotification("error", "Failed to import.");
        }
    } else {
        // Browser Import
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                 if (evt.target?.result) {
                     processImportedContent(evt.target.result as string);
                 }
            };
            reader.readAsText(file);
        };
        input.click();
    }
  };

  const toggleImportSelection = (id: number) => {
      const newSet = new Set(importSelection);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setImportSelection(newSet);
  };

  const confirmMultiImport = () => {
      if (!importCandidates) return;
      const toAdd = importCandidates.filter(p => importSelection.has(p.id));

      const hasExistingStartup = presets.some(p => p.isStartup);
      let newStartupClaimed = false;
      
      const newPresets = toAdd.map(p => {
          // Only allow importing as startup if:
          // 1. No existing startup preset exists in current list
          // 2. The imported preset claims startup
          // 3. We haven't already allowed another imported preset to be startup in this batch
          const shouldBeStartup = !hasExistingStartup && p.isStartup && !newStartupClaimed;
          
          if (shouldBeStartup) {
              newStartupClaimed = true;
          }

          return {
            ...p,
            id: Date.now() + Math.random(), // Regenerate IDs to avoid collisions
            isStartup: shouldBeStartup
          };
      });

      savePresetsToStorage([...presets, ...newPresets]);
      addNotification("success", `Imported ${newPresets.length} presets.`);
      setImportCandidates(null);
  };

  const finalizeSingleImport = (action: 'overwrite' | 'new') => {
      if (!pendingImport) return;

      if (action === 'overwrite' && activePresetId) {
          const newPresets = presets.map(p => {
              if (p.id === activePresetId) {
                  return { ...p, settings: { ...pendingImport } };
              }
              return p;
          });
          savePresetsToStorage(newPresets);
          setFormSettings({ ...pendingImport });
      } else {
          const newId = Date.now();
          const newPreset = {
              id: newId,
              name: "Imported Preset",
              settings: { ...pendingImport },
              isStartup: false
          };
          savePresetsToStorage([...presets, newPreset]);
          setActivePresetId(newId);
          setFormSettings({ ...pendingImport });
      }
      setPendingImport(null);
  };

  return createPortal(
    <div className="global-settings-modal-overlay" onClick={(e) => {
        if(e.target === e.currentTarget) onClose();
    }}>
      <div className="global-settings-modal" ref={modalRef}>
        <div className="modal-header">
          <h2>Global Settings</h2>
          <div className="header-actions">
             <button onClick={openExportModal}>Export...</button>
             <button onClick={handleImportClick}>Import...</button>
          </div>
        </div>
        
        <div className="auth-modal-body">
          <div className="presets-sidebar">
            <div className="presets-header-row">
                <span>Presets</span>
                {presets.length > 0 && (
                    <button 
                        className="text-button small danger-text" 
                        onClick={handleInitDeleteAll}
                        style={{ fontSize: '0.8em', padding: '2px 5px', color: '#e53935' }}
                    >
                        Delete All
                    </button>
                )}
            </div>
            <div className="presets-list" onClick={() => setActivePresetId(null)}>
              {presets.map((preset) => (
                <div 
                  key={preset.id} 
                  className={`preset-item ${activePresetId === preset.id ? "active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleSelectPreset(preset); }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation(); 
                          handleSelectPreset(preset);
                      }
                  }}
                  role="button"
                  aria-pressed={activePresetId === preset.id}
                >
                  <div className="preset-drag-handle" style={{opacity: 0.3, marginRight: 5}}>⋮</div>

                  <div className="preset-content-column">
                    {renamingId === preset.id ? (
                        <div className="rename-row" onClick={(e) => e.stopPropagation()}>
                            <input 
                                type="text"
                                value={renameName} 
                                onInput={(e) => setRenameName(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") saveRename();
                                    else if(e.key === "Escape") cancelRename();
                                }}
                                autoFocus
                                className="rename-input"
                            />
                            <button className="small-btn" onClick={saveRename}>OK</button>
                            <button className="small-btn" onClick={cancelRename}>Cancel</button>
                        </div>
                    ) : (
                        <>
                             <div 
                                className="preset-name-row"
                                onDblClick={(e) => { e.stopPropagation(); startRenaming(preset); }}
                             >
                                <span className="preset-name">{preset.name}</span>
                                {preset.isStartup && <span className="default-badge">Defaults</span>}
                             </div>
                             <div className="preset-actions-row">
                                <button className="small-btn" onClick={(e) => { e.stopPropagation(); startRenaming(preset); }}>
                                    Rename
                                </button>
                                <button 
                                    className={`small-btn ${preset.isStartup ? 'active-default' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); handleSetStartup(preset.id, !preset.isStartup); }}
                                    title="Load this preset automatically on startup"
                                    style={preset.isStartup ? { backgroundColor: '#e8f5e9', color: '#2e7d32', borderColor: '#c8e6c9' } : {}}
                                >
                                    {preset.isStartup ? "Is Default" : "Set as Default"}
                                </button>
                             </div>
                        </>
                    )}
                  </div>
                  
                  <div className="preset-actions-right">
                    <button 
                         className="icon-btn delete-btn"
                         title="Delete Preset"
                         onClick={(e) => handleDeletePreset(preset.id, e)}
                    >
                        &times;
                    </button>
                  </div>
                </div>
              ))}
              {presets.length === 0 && <div className="empty-state">No presets saved.</div>}
            </div>
            <div className="sidebar-footer" style={{ display: 'flex', gap: '5px' }}>
                <button className="primary-button" style={{ flex: 1 }} onClick={handleAddPreset}>
                    + Add
                </button>
                <button 
                    className="text-button" 
                    style={{ flex: 1, border: '1px solid var(--point-border-color)', fontSize: '0.85em' }}
                    onClick={handleDuplicatePreset}
                    disabled={activePresetId === null}
                >
                    Duplicate
                </button>
            </div>
          </div>
          
          <div className="settings-preview-area">
            {activePresetId === null ? (
                <div className="empty-selection-state" style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'var(--text-secondary)',
                    fontStyle: 'italic'
                }}>
                    Select a preset to edit settings
                </div>
            ) : (
              <>
              <div className="preview-toolbar" style={{ flexDirection: 'column', height: 'auto', gap: '8px', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>
                          Editing: <span style={{ fontWeight: 'bold' }}>{presets.find(p => p.id === activePresetId)?.name}</span>
                      </span>
                  </div>
                  
                  {activePresetId && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                className="small-btn" 
                                onClick={() => {
                                    handleSettingsChange({ ...DEFAULT_PLOT_SETTINGS }); 
                                }}
                            >
                                Reset to Defaults
                            </button>
                        <button 
                            className="small-btn"
                            onClick={() => {
                                handleSettingsChange({ ...currentSettings });
                                addNotification("info", "Loaded settings from current plot.");
                            }}
                            title="Overwrite this preset with settings from the main window"
                        >
                            Load from Current Plot
                        </button>
                        <button 
                            className="small-btn" 
                            onClick={() => {
                                onApplySettings(formSettings);
                                addNotification("success", "Settings applied.");
                            }}
                        >
                            Apply to Current Plot
                        </button>
                      </div>
                  )}
              </div>
              <div className="settings-scroll-area">
                <PlotSettingsForm 
                    plotSettings={formSettings}
                    setPlotSettings={handleSettingsChange}
                    viewMode="auto" // Mock
                    isModal={true}
                />
              </div>
              </>
            )}
          </div>
        </div>

        {/* --- Export Modal --- */}
        {showExportModal && (
            <div className="import-overlay">
                <DialogFocusTrap className="import-dialog wide-dialog">
                    <h3>Export Presets</h3>
                    <p>Select which presets to include in the export file.</p>
                    
                    <div className="selection-list">
                        <div className="selection-header">
                            <button className="text-button small" onClick={() => setExportSelection(new Set(presets.map(p => p.id)))}>Select All</button>
                            <button className="text-button small" onClick={() => setExportSelection(new Set())}>Select None</button>
                        </div>
                        {presets.map(p => (
                            <label key={p.id} className="selection-item">
                                <input 
                                    type="checkbox" 
                                    checked={exportSelection.has(p.id)} 
                                    onChange={() => toggleExportSelection(p.id)}
                                />
                                <span className="selection-name">{p.name}</span>
                            </label>
                        ))}
                    </div>

                    <div className="import-actions row">
                        <button className="text-button" onClick={() => setShowExportModal(false)}>Cancel</button>
                        <button className="primary-button" onClick={handleExportConfirm}>Export Selection</button>
                    </div>
                </DialogFocusTrap>
            </div>
        )}

        {/* --- Import Multi Modal --- */}
        {importCandidates && (
            <div className="import-overlay">
                <DialogFocusTrap className="import-dialog wide-dialog">
                    <h3>Import Presets</h3>
                    <p>Select which presets to add to your library.</p>
                    
                    <div className="selection-list">
                         <div className="selection-header">
                            <button className="text-button small" onClick={() => setImportSelection(new Set(importCandidates.map(p => p.id)))}>Select All</button>
                            <button className="text-button small" onClick={() => setImportSelection(new Set())}>Select None</button>
                        </div>
                        {importCandidates.map(p => (
                            <label key={p.id} className="selection-item">
                                <input 
                                    type="checkbox" 
                                    checked={importSelection.has(p.id)} 
                                    onChange={() => toggleImportSelection(p.id)}
                                />
                                <span className="selection-name">{p.name}</span>
                            </label>
                        ))}
                    </div>

                    <div className="import-actions row">
                        <button className="text-button" onClick={() => setImportCandidates(null)}>Cancel</button>
                        <button className="primary-button" onClick={confirmMultiImport}>Import Selected</button>
                    </div>
                </DialogFocusTrap>
            </div>
        )}

        {/* --- Single Import Decision Overlay --- */}
        {pendingImport && (
            <div className="import-overlay">
                <DialogFocusTrap className="import-dialog">
                    <h3>Import Settings</h3>
                    <p>How would you like to import these settings?</p>
                    <div className="import-actions">
                        <button 
                            className="secondary-button" 
                            disabled={!activePresetId}
                            onClick={() => finalizeSingleImport('overwrite')}
                            title={!activePresetId ? "Select a preset first" : ""}
                        >
                            Overwrite Selected
                        </button>
                        <button 
                            className="primary-button" 
                            onClick={() => finalizeSingleImport('new')}
                        >
                            Create New Preset
                        </button>
                        <button 
                            className="text-button" 
                            onClick={() => setPendingImport(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </DialogFocusTrap>
            </div>
        )}

        {/* --- Delete Confirmation Overlay --- */}
        {pendingDeleteId !== null && (
            <div className="import-overlay">
                <DialogFocusTrap className="import-dialog">
                    <h3>Delete Preset</h3>
                    <p>Are you sure you want to delete this preset? This action cannot be undone.</p>
                    <div className="import-actions">
                        <button 
                            className="primary-button" 
                            style={{ backgroundColor: "#e53935", color: "white" }}
                            onClick={confirmDelete}
                        >
                            Delete
                        </button>
                        <button 
                            className="text-button" 
                            onClick={() => setPendingDeleteId(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </DialogFocusTrap>
            </div>
        )}

        {/* --- Delete All Confirmation Overlay --- */}
        {deleteAllStep > 0 && (
            <div className="import-overlay">
                <DialogFocusTrap className="import-dialog">
                    <h3>Delete All Presets</h3>
                    {deleteAllStep === 1 ? (
                        <p>Are you sure you want to delete ALL presets? This action cannot be undone.</p>
                    ) : (
                        <p style={{ fontWeight: 'bold', color: '#e53935' }}>Are you really sure? This will wipe your entire preset library.</p>
                    )}
                    <div className="import-actions">
                        <button 
                            className="primary-button" 
                            style={{ backgroundColor: "#e53935", color: "white" }}
                            onClick={handleConfirmDeleteAll}
                        >
                            {deleteAllStep === 1 ? "Yes, Delete All" : "I Understand, Delete Everything"}
                        </button>
                        <button 
                            className="text-button" 
                            onClick={() => setDeleteAllStep(0)}
                        >
                            Cancel
                        </button>
                    </div>
                </DialogFocusTrap>
            </div>
        )}

      </div>
    </div>,
    document.body
  );
}
