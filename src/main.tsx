import { render } from "preact";
import App from "./App";
import { NotificationProvider } from "./contexts/NotificationContext";

render(
    <NotificationProvider>
        <App />
    </NotificationProvider>, 
    document.getElementById("root")!
);
