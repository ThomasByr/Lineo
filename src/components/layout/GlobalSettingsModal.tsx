import { useState, useEffect } from "preact/hooks";
import { createPortal } from "preact/compat";
import { PlotSettings } from "../../types";
import { PlotSettingsForm } from "../tabs/PlotSettingsForm";
import { EditableLabel } from "../ui/EditableLabel";
import "./GlobalSettingsModal.css";
import { save, open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "../../platform";
import { invoke } from "@tauri-apps/api/core";

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

// --- Compact Toggle Switch ---

function CompactSwitch({ checked, onChange, title }: { checked: boolean, onChange: (c: boolean) => void, title?: string }) {
    return (
        <label className="compact-switch" title={title} onClick={(e) => e.stopPropagation()}>
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={(e) => onChange(e.currentTarget.checked)} 
            />
            <span className="slider round"></span>
        </label>
    );
}

// --- Component ---

export function GlobalSettingsModal({ onClose, currentSettings, onApplySettings }: GlobalSettingsModalProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  
  // The state being edited in the main window
  const [formSettings, setFormSettings] = useState<PlotSettings>(currentSettings);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Import State
  const [pendingImport, setPendingImport] = useState<PlotSettings | null>(null);

  // Load Presets
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const startupIdRaw = localStorage.getItem(STARTUP_KEY);
    const startupId = startupIdRaw ? parseInt(startupIdRaw) : null;

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Normalize old format if necessary (where nulls existed)
        const validPresets: Preset[] = parsed
            .filter((p: any) => p.settings !== null) // Filter out empty slots from old version
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

  // Sync Presets to Storage
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
        settings: { ...formSettings },
        isStartup: false
    };
    const newPresets = [...presets, newPreset];
    savePresetsToStorage(newPresets);
    setActivePresetId(newId); // Select the new one
    setIsFormDirty(false); // Since it matches the form
  };

  const handleUpdateActivePreset = () => {
    if (activePresetId === null) return;
    const newPresets = presets.map(p => {
        if (p.id === activePresetId) {
            return { ...p, settings: { ...formSettings } };
        }
        return p;
    });
    savePresetsToStorage(newPresets);
    setIsFormDirty(false);
  };

  const handleDeletePreset = (id: number, e: Event) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this preset?")) {
        const newPresets = presets.filter(p => p.id !== id);
        savePresetsToStorage(newPresets);
        if (activePresetId === id) {
            setActivePresetId(null);
        }
    }
  };

  const handleRenamePreset = (id: number, newName: string) => {
    const newPresets = presets.map(p => {
        if (p.id === id) return { ...p, name: newName };
        return p;
    });
    savePresetsToStorage(newPresets);
  };

  const handleSetStartup = (id: number, isStartup: boolean) => {
      const newPresets = presets.map(p => ({
          ...p,
          isStartup: p.id === id ? isStartup : false
      }));
      savePresetsToStorage(newPresets);
  };

  const handleSelectPreset = (preset: Preset) => {
      // If dirty, maybe warn? For now just switch.
      setActivePresetId(preset.id);
      setFormSettings({ ...preset.settings });
      setIsFormDirty(false);
  };

  // --- Export / Import ---

  const handleExport = async () => {
      if (!isTauri()) {
        alert("Export is only available in the desktop app.");
        return;
      }

      try {
        const content = JSON.stringify(presets, null, 2);
        const path = await save({
            filters: [{ name: "Lineo Presets", extensions: ["json"] }],
            defaultPath: "lineo_presets.json"
        });

        if (path) {
            await invoke("save_text_file", { path, contents: content });
            alert("Presets exported successfully!");
        }
      } catch (e) {
          console.error(e);
          alert("Failed to export presets.");
      }
  };

  const handleImportClick = async () => {
    if (!isTauri()) return;

    try {
        const path = await open({
            filters: [{ name: "Lineo Presets", extensions: ["json"] }],
            multiple: false
        });

        if (path && typeof path === 'string') {
            const content = await invoke("read_text_file_custom", { path });
            if (typeof content === 'string') {
                const data = JSON.parse(content);
                // We assume the user creates a "Preset Export", which is an array of Presets.
                // Or maybe they export a single settings file (from the old version?).
                // Let's assume it's an array of presets for now, or a single PlotSettings object if we want to import settings.
                
                // Requirement check: "when importing... choose if I want to overwrite the current/selected id or add a new one"
                // This implies we are importing *settings*, not necessarily a whole library of presets.
                // But typically "Export" in this modal exports the list.
                
                // Let's handle both: If array -> Multiple import (maybe concat?). 
                // If single object (PlotSettings) -> Import as single (trigger decision).
                
                if (Array.isArray(data)) {
                    // It's a full backup. Confirm overwrite or append?
                    if(confirm("This file contains multiple presets. Append them to your list?")) {
                         // Assign new IDs to avoid conflicts
                         const toAdd = data.map((p:any) => ({
                             id: Date.now() + Math.random(),
                             name: p.name || "Imported",
                             settings: p.settings || p, // Handle both structures if possible
                             isStartup: false
                         })).filter(p => p.settings); // valid only
                         savePresetsToStorage([...presets, ...toAdd]);
                         alert(`Imported ${toAdd.length} presets.`);
                    }
                } else {
                    // It's a single object, likely settings.
                    // Or maybe the user exported "Presets" and got the array.
                    // If the user wants to import *into* a slot, they probably mean importing a config file.
                    // Let's treat the data as "Settings" to be applied to a slot.
                    if (data.settings) {
                         setPendingImport(data.settings); // It was a Preset object
                    } else {
                         setPendingImport(data); // It was raw settings
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
        alert("Failed to import.");
    }
  };

  const finalizeImport = (action: 'overwrite' | 'new') => {
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
          setIsFormDirty(false);
      } else {
          // New
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
          setIsFormDirty(false);
      }
      setPendingImport(null);
  };

  return createPortal(
    <div className="global-settings-modal-overlay" onClick={(e) => {
        if(e.target === e.currentTarget) onClose();
    }}>
      <div className="global-settings-modal">
        <div className="modal-header">
          <h2>Global Settings</h2>
          <div className="header-actions">
             <button className="secondary-button" onClick={handleExport}>Export All</button>
             <button className="secondary-button" onClick={handleImportClick}>Import...</button>
             <button className="close-button" onClick={onClose} style={{ marginLeft: '10px' }}>&times;</button>
          </div>
        </div>
        
        <div className="auth-modal-body">
          <div className="presets-sidebar">
            <div className="presets-header-row">
                <span>Presets</span>
                <span className="subtitle">Startup?</span>
            </div>
            <div className="presets-list">
              {presets.map((preset) => (
                <div 
                  key={preset.id} 
                  className={`preset-item ${activePresetId === preset.id ? "active" : ""}`}
                  onClick={() => handleSelectPreset(preset)}
                >
                  <div className="preset-drag-handle" style={{opacity: 0.3, marginRight: 5}}>⋮</div>
                  <div className="preset-content">
                    <EditableLabel 
                        value={preset.name} 
                        onSave={(val) => handleRenamePreset(preset.id, val)}
                        className="preset-name-edit" 
                    />
                  </div>
                  
                  <div className="preset-actions-right">
                    <CompactSwitch 
                        checked={!!preset.isStartup} 
                        onChange={(c) => handleSetStartup(preset.id, c)}
                        title="Load on startup"
                    />
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
            <div className="sidebar-footer">
                <button className="primary-button full-width" onClick={handleAddPreset}>
                    + Add Preset
                </button>
            </div>
          </div>
          
          <div className="settings-preview-area">
              <div className="preview-toolbar">
                  <span>
                      {activePresetId ? "Editing Preset" : "Format Settings"}
                      {isFormDirty && activePresetId && " (Modified)"}
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {activePresetId && (
                        <button 
                            className="primary-button small" 
                            disabled={!isFormDirty}
                            onClick={handleUpdateActivePreset}
                        >
                            Save Changes
                        </button>
                    )}
                    <button className="secondary-button small" onClick={() => onApplySettings(formSettings)}>
                        Apply to Current Plot
                    </button>
                  </div>
              </div>
              <div className="settings-scroll-area">
                <PlotSettingsForm 
                    plotSettings={formSettings}
                    setPlotSettings={(s) => {
                        setFormSettings(s);
                        setIsFormDirty(true);
                    }}
                    viewMode="auto" // Mock
                    isModal={true}
                />
              </div>
          </div>
        </div>

        {/* Import Decision Overlay */}
        {pendingImport && (
            <div className="import-overlay">
                <div className="import-dialog">
                    <h3>Import Settings</h3>
                    <p>How would you like to import these settings?</p>
                    <div className="import-actions">
                        <button 
                            className="secondary-button" 
                            disabled={!activePresetId}
                            onClick={() => finalizeImport('overwrite')}
                            title={!activePresetId ? "Select a preset first" : ""}
                        >
                            Overwrite Selected
                        </button>
                        <button 
                            className="primary-button" 
                            onClick={() => finalizeImport('new')}
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
                </div>
            </div>
        )}

      </div>
    </div>,
    document.body
  );
}
