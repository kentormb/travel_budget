import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration"; // Ensure it's correctly imported

const root = createRoot(document.getElementById("root")!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

// Register the service worker
serviceWorkerRegistration.register();
