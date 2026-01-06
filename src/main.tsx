import { render } from "preact";
import App from "./App";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProjectProvider } from "./contexts/ProjectContext";

render(
  <NotificationProvider>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </NotificationProvider>,
  document.getElementById("root")!,
);
