import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/winter-arc-tracker/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Winter Arc Tracker",
        short_name: "Winter Arc",
        description: "A gamified daily habit tracker for your winter arc.",
        start_url: "/winter-arc-tracker/",
        scope: "/winter-arc-tracker/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0A0F0D",
        theme_color: "#0A0F0D",
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
