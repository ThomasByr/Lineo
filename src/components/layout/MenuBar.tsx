import { useState, useEffect, useRef } from "preact/hooks";
import { useProject } from "../../contexts/ProjectContext";
import "./MenuBar.css";

interface MenuBarProps {
  zoom: number;
  setZoom: (z: number) => void;
  onOpenAbout: () => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}

export function MenuBar({ zoom, setZoom, onOpenAbout, theme, setTheme }: MenuBarProps) {
  const {
    saveProject,
    saveProjectAs,
    loadProject,
    undo,
    redo,
    canUndo,
    canRedo,
    hasSavedPath,
    exportChart,
    autoCrop,
    toggleAutoCrop,
    setIsExportModalOpen,
    projectName,
  } = useProject();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    const handleBlur = () => {
      setActiveMenu(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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

  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const ctrlKey = isMac ? "Cmd" : "Ctrl";

  return (
    <div
      className="menubar"
      ref={menuRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setActiveMenu(null);
        }
      }}
    >
      <div className="menu-item">
        <div
          className={`menu-trigger ${activeMenu === "file" ? "active" : ""}`}
          onClick={() => toggleMenu("file")}
          onMouseEnter={() => handleMouseEnter("file")}
        >
          File
        </div>
        <div className={`menu-dropdown ${activeMenu === "file" ? "open" : ""}`}>
          <div
            className={`menu-option ${!hasSavedPath ? "disabled" : ""}`}
            onClick={() => hasSavedPath && handleAction(() => saveProject())}
          >
            <span>Save</span>
            <span className="shortcut">({ctrlKey}+S)</span>
          </div>
          <div className="menu-option" onClick={() => handleAction(saveProjectAs)}>
            <span>Save As...</span>
            <span className="shortcut">({ctrlKey}+Shift+S)</span>
          </div>
          <div className="menu-option" onClick={() => handleAction(loadProject)}>
            <span>Load...</span>
            <span className="shortcut">({ctrlKey}+O)</span>
          </div>
          <div className="menu-divider"></div>
          <div className="menu-option" onClick={() => handleAction(() => exportChart("png"))}>
            <span>Export to PNG</span>
          </div>
          <div className="menu-option" onClick={() => handleAction(() => exportChart("jpg"))}>
            <span>Export to JPG</span>
          </div>
          <div className="menu-divider"></div>
          <div
            className={`menu-option ${!canUndo ? "disabled" : ""}`}
            onClick={() => canUndo && handleAction(undo)}
          >
            <span>Undo</span>
            <span className="shortcut">({ctrlKey}+Z)</span>
          </div>
          <div
            className={`menu-option ${!canRedo ? "disabled" : ""}`}
            onClick={() => canRedo && handleAction(redo)}
          >
            <span>Redo</span>
            <span className="shortcut">({ctrlKey}+Y)</span>
          </div>
        </div>
      </div>

      <div className="menu-item">
        <div
          className={`menu-trigger ${activeMenu === "settings" ? "active" : ""}`}
          onClick={() => toggleMenu("settings")}
          onMouseEnter={() => handleMouseEnter("settings")}
        >
          Settings
        </div>
        <div className={`menu-dropdown ${activeMenu === "settings" ? "open" : ""}`}>
          <div className="menu-option" style={{ cursor: "default", backgroundColor: "transparent" }}>
            <span>App Zoom</span>
            <div className="zoom-controls">
              <button
                className="zoom-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoom(-0.1);
                }}
              >
                -
              </button>
              <span className="zoom-value">{Math.round(zoom * 100)}%</span>
              <button
                className="zoom-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoom(0.1);
                }}
              >
                +
              </button>
            </div>
          </div>
          <div className="menu-divider"></div>
          <div className="menu-option" onClick={() => handleAction(() => setIsExportModalOpen(true))}>
            <span>Export Settings...</span>
          </div>
          <div className="menu-option" onClick={() => handleAction(toggleAutoCrop)}>
            <span>{autoCrop ? "Disable Auto Crop" : "Enable Auto Crop"}</span>
            <span className="shortcut" style={{ marginLeft: "10px" }}>
              {autoCrop ? "✓" : ""}
            </span>
          </div>
          <div className="menu-divider"></div>
          <div
            className="menu-option"
            onClick={() => handleAction(() => setTheme(theme === "light" ? "dark" : "light"))}
          >
            <span>{theme === "light" ? "Switch to Dark Mode 🌙" : "Switch to Light Mode ☀️"}</span>
          </div>
        </div>
      </div>

      <div className="menu-item">
        <div
          className={`menu-trigger ${activeMenu === "help" ? "active" : ""}`}
          onClick={() => toggleMenu("help")}
          onMouseEnter={() => handleMouseEnter("help")}
        >
          Help
        </div>
        <div className={`menu-dropdown ${activeMenu === "help" ? "open" : ""}`}>
          <div className="menu-option" onClick={() => handleAction(onOpenAbout)}>
            <span>About</span>
          </div>
        </div>
      </div>

      {projectName && <div className="project-title">{projectName}</div>}
    </div>
  );
}
