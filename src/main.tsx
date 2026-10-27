import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource/young-serif/index.css";
import "@fontsource-variable/hanken-grotesk/index.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/geist/index.css";
import "./index.css";
import App from "./App";
import { initStore } from "./lib/store";
import { startSync } from "./lib/sync";

// Storage may be async (Preferences on iOS), so the state is loaded before the first render.
void initStore().then(() => {
  startSync();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
