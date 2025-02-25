import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function registerCustomSW() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker
                .register("/service-worker.js")
                .then((registration) => {
                    console.log("Custom SW registered with scope:", registration.scope);
                })
                .catch((err) => {
                    console.error("SW registration failed", err);
                });
        });
    }
}

const root = createRoot(document.getElementById("root")!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

registerCustomSW();
