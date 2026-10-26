import { MotionConfig } from "motion/react";
import { HashRouter, NavLink, Route, Routes } from "react-router";
import Toast from "./components/Toast";
import { useLevelUp } from "./lib/useLevelUp";
import Today from "./pages/Today";
import Calendar from "./pages/Calendar";
import Insights from "./pages/Insights";
import Goals from "./pages/Goals";
import Settings from "./pages/Settings";

type Tab = { to: string; label: string; icon: string };

const TABS: Tab[] = [
  { to: "/", label: "Today", icon: "M4 12 12 4l8 8M6 10v10h12V10" },
  { to: "/calendar", label: "Calendar", icon: "M4 6h16v14H4zM4 10h16M8 4v4M16 4v4" },
  { to: "/insights", label: "Insights", icon: "M4 19 9 12l4 4 7-9M4 19h16" },
  { to: "/goals", label: "Goals", icon: "M12 3v18M6 9l6-6 6 6M5 21h14" },
  { to: "/settings", label: "Settings", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12h2M18 12h2M12 4v2M12 18v2" },
];

function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md justify-around">
        {TABS.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `tap flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  isActive ? "text-green" : "text-dim"
                }`
              }
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function LevelToast() {
  const { toast, dismiss } = useLevelUp();
  return <Toast toast={toast} onDismiss={dismiss} />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <LevelToast />
        <div className="mx-auto min-h-dvh max-w-md px-4 pb-24" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        </div>
        <TabBar />
      </HashRouter>
    </MotionConfig>
  );
}
