import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// VITE_TARGET=native builds the iPhone app's bundle: Capacitor serves it from its
// own origin, so asset paths are relative and there is no service worker.
const native = process.env.VITE_TARGET === "native";

export default defineConfig({
  base: native ? "./" : "/winter-arc-tracker/",
  plugins: [
    react(),
    tailwindcss(),
    !native && VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Grove",
        short_name: "Grove",
        description: "A habit tracker where every arc is a garden.",
        start_url: "/winter-arc-tracker/",
        scope: "/winter-arc-tracker/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F8F4EB",
        theme_color: "#F8F4EB",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png}", "**/*-latin-*.woff2"],
        navigateFallback: "/winter-arc-tracker/index.html",
      },
    }),
  ],
});
