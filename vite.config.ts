import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa"; // Import Workbox PWA support

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "robots.txt", "assets/logo.png"],
      manifest: {
        name: "Expenses Tracker",
        short_name: "Expenses Tracker",
        description: "Track your travel expenses with ease",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/assets/logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,png,ico,svg,json}"], // Cache all hashed files dynamically
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst", // Prioritize fresh data
          },
          {
            urlPattern: ({ request }) =>
                ["style", "script", "image"].includes(request.destination),
            handler: "CacheFirst", // Use cache first for assets
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
