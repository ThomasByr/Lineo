import { PlotSettings, ViewMode } from "../../types";
import { PlotSettingsForm } from "./PlotSettingsForm";

interface GlobalSettingsTabProps {
  plotSettings: PlotSettings;
  setPlotSettings: (settings: PlotSettings, skipHistory?: boolean) => void;
  viewMode: ViewMode;
  startTransaction?: () => void;
  commitTransaction?: (description: string) => void;
  onOpenGlobalSettings?: () => void;
}

export function GlobalSettingsTab(props: GlobalSettingsTabProps) {
  return (
    <div className="global-settings-tab-wrapper">
        <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid var(--point-border-color)" }}>
            <p style={{ fontSize: "0.9em", color: "var(--text-secondary)", marginTop: 0, marginBottom: "10px" }}>
                Customize your plot appearance here. Use the button below to manage saved presets and defaults.
            </p>
            <button 
                onClick={props.onOpenGlobalSettings}
                style={{ width: "100%", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
                <span>⚙️</span> Manage Presets & Defaults
            </button>
        </div>
        <PlotSettingsForm {...props} />
    </div>
  );
}
