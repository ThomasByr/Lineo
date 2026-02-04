import { useState, useEffect, useRef } from "preact/hooks";
import { useProject } from "../../contexts/ProjectContext";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./MenuBar.css";

interface MenuBarProps {
  zoom: number;
  setZoom: (z: number) => void;
  onOpenAbout: () => void;
  onOpenGlobalSettings: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

export function MenuBar({
  zoom,
  setZoom,
  onOpenAbout,
  onOpenGlobalSettings,
  theme,
  setTheme,
}: MenuBarProps) {
  const {
    saveProject,
    saveProjectAs,
    loadProject,
    undo,
    redo,
    canUndo,
    canRedo,
    hasSavedPath,
    autoCrop,
    toggleAutoCrop,
    setIsExportModalOpen,
    setIsExportSettingsModalOpen,
    projectName,
  } = useProject();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setActiveMenu(null), activeMenu !== null);

  // Close menu on window blur
  useEffect(() => {
    const handleBlur = () => {
      setActiveMenu(null);
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMouseEnter = (menu: string) => {
    if (activeMenu) {
      setActiveMenu(menu);
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.min(Math.max(zoom + delta, 0.5), 2.0); // Limit zoom 50% - 200%
    setZoom(Number(newZoom.toFixed(1)));
  };

  const handleKeyDown = (e: KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const ctrlKey = isMac ? "Cmd" : "Ctrl";

  return (
    <div
      className="menubar"
      ref={menuRef}
      role="menubar"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setActiveMenu(null);
        }
      }}
    >
      <div className="menu-item" role="none">
        <div
          className={`menu-trigger ${activeMenu === "file" ? "active" : ""}`}
          onClick={() => toggleMenu("file")}
          onMouseEnter={() => handleMouseEnter("file")}
          role="menuitem"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={activeMenu === "file"}
          onKeyDown={(e) => handleKeyDown(e, () => toggleMenu("file"))}
        >
          File
        </div>
        <div className={`menu-dropdown ${activeMenu === "file" ? "open" : ""}`} role="menu">
          <div
            className={`menu-option ${!hasSavedPath ? "disabled" : ""}`}
            onClick={() => hasSavedPath && handleAction(() => saveProject())}
            role="menuitem"
            tabIndex={hasSavedPath ? 0 : -1}
            aria-disabled={!hasSavedPath}
            onKeyDown={(e) => hasSavedPath && handleKeyDown(e, () => handleAction(() => saveProject()))}
          >
            <span>Save</span>
            <span className="shortcut">({ctrlKey}+S)</span>
          </div>
          <div
            className="menu-option"
            onClick={() => handleAction(saveProjectAs)}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(saveProjectAs))}
          >
            <span>Save As...</span>
            <span className="shortcut">({ctrlKey}+Shift+S)</span>
          </div>
          <div
            className="menu-option"
            onClick={() => handleAction(loadProject)}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(loadProject))}
          >
            <span>Load...</span>
            <span className="shortcut">({ctrlKey}+O)</span>
          </div>
          <div className="menu-divider" role="separator"></div>
          <div
            className="menu-option"
            onClick={() => handleAction(() => setIsExportModalOpen(true))}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(() => setIsExportModalOpen(true)))}
          >
            <span>Export...</span>
          </div>
          <div className="menu-divider" role="separator"></div>
          <div
            className={`menu-option ${!canUndo ? "disabled" : ""}`}
            onClick={() => canUndo && handleAction(undo)}
            role="menuitem"
            tabIndex={canUndo ? 0 : -1}
            aria-disabled={!canUndo}
            onKeyDown={(e) => canUndo && handleKeyDown(e, () => handleAction(undo))}
          >
            <span>Undo</span>
            <span className="shortcut">({ctrlKey}+Z)</span>
          </div>
          <div
            className={`menu-option ${!canRedo ? "disabled" : ""}`}
            onClick={() => canRedo && handleAction(redo)}
            role="menuitem"
            tabIndex={canRedo ? 0 : -1}
            aria-disabled={!canRedo}
            onKeyDown={(e) => canRedo && handleKeyDown(e, () => handleAction(redo))}
          >
            <span>Redo</span>
            <span className="shortcut">({ctrlKey}+Y)</span>
          </div>
        </div>
      </div>

      <div className="menu-item" role="none">
        <div
          className={`menu-trigger ${activeMenu === "settings" ? "active" : ""}`}
          onClick={() => toggleMenu("settings")}
          onMouseEnter={() => handleMouseEnter("settings")}
          role="menuitem"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={activeMenu === "settings"}
          onKeyDown={(e) => handleKeyDown(e, () => toggleMenu("settings"))}
        >
          Settings
        </div>
        <div className={`menu-dropdown ${activeMenu === "settings" ? "open" : ""}`} role="menu">
          <div
            className="menu-option"
            style={{ cursor: "default", backgroundColor: "transparent" }}
            role="group"
            aria-label="Zoom controls"
          >
            <span>App Zoom</span>
            <div className="zoom-controls">
              <button
                className="zoom-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoom(-0.1);
                }}
                aria-label="Zoom Out"
              >
                -
              </button>
              <span className="zoom-value" aria-live="polite">
                {Math.round(zoom * 100)}%
              </span>
              <button
                className="zoom-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoom(0.1);
                }}
                aria-label="Zoom In"
              >
                +
              </button>
            </div>
          </div>
          <div className="menu-divider" role="separator"></div>
          <div
            className="menu-option"
            onClick={() => handleAction(onOpenGlobalSettings)}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(onOpenGlobalSettings))}
          >
            <span>Global Settings...</span>
          </div>
          <div
            className="menu-option"
            onClick={() => handleAction(() => setIsExportSettingsModalOpen(true))}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(() => setIsExportSettingsModalOpen(true)))}
          >
            <span>Export Settings...</span>
          </div>
          <div
            className="menu-option"
            onClick={() => handleAction(toggleAutoCrop)}
            role="menuitem"
            tabIndex={0}
            aria-checked={autoCrop}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(toggleAutoCrop))}
          >
            <span>{autoCrop ? "Disable Auto Crop" : "Enable Auto Crop"}</span>
            <span className="shortcut" style={{ marginLeft: "10px" }}>
              {autoCrop ? "✓" : ""}
            </span>
          </div>
          <div className="menu-divider" role="separator"></div>
          <div
            className="menu-option"
            onClick={() => handleAction(() => setTheme(theme === "light" ? "dark" : "light"))}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) =>
              handleKeyDown(e, () => handleAction(() => setTheme(theme === "light" ? "dark" : "light")))
            }
          >
            <span>{theme === "light" ? "Switch to Dark Mode 🌙" : "Switch to Light Mode ☀️"}</span>
          </div>
        </div>
      </div>

      <div className="menu-item" role="none">
        <div
          className={`menu-trigger ${activeMenu === "help" ? "active" : ""}`}
          onClick={() => toggleMenu("help")}
          onMouseEnter={() => handleMouseEnter("help")}
          role="menuitem"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={activeMenu === "help"}
          onKeyDown={(e) => handleKeyDown(e, () => toggleMenu("help"))}
        >
          Help
        </div>
        <div className={`menu-dropdown ${activeMenu === "help" ? "open" : ""}`} role="menu">
          <div
            className="menu-option"
            onClick={() => handleAction(onOpenAbout)}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, () => handleAction(onOpenAbout))}
          >
            <span>About</span>
          </div>
        </div>
      </div>

      {projectName && <div className="project-title">{projectName}</div>}
    </div>
  );
}
