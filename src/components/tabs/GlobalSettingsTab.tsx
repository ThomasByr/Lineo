import { PlotSettings, ViewMode } from "../../types";
import { PlotSettingsForm } from "./PlotSettingsForm";

interface GlobalSettingsTabProps {
  plotSettings: PlotSettings;
  setPlotSettings: (settings: PlotSettings, skipHistory?: boolean) => void;
  viewMode: ViewMode;
  startTransaction?: () => void;
  commitTransaction?: (description: string) => void;
}

export function GlobalSettingsTab(props: GlobalSettingsTabProps) {
  return <PlotSettingsForm {...props} />;
}
