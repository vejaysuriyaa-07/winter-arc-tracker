import { MotionConfig } from "motion/react";
import { lazy, Suspense } from "react";
import { HashRouter, NavLink, Route, Routes } from "react-router";
import { useAppState, useSaveFailed } from "./lib/store";
import { useToday } from "./lib/today";
import { activeArc, dailyCompletion } from "./lib/stats";
import { ThemeProvider, effectiveLook, useSystemDark, useTheme } from "./theme/ThemeProvider";
import NightSky from "./scenes/NightSky";
import Garden from "./pages/Garden";
import Progress from "./pages/Progress";
import Arcs from "./pages/Arcs";
import Settings from "./pages/Settings";
import Placeholder from "./pages/Placeholder";
import NewArc from "./pages/NewArc";
import ArcComplete from "./components/arcs/ArcComplete";
import { arcToCelebrate } from "./lib/arcs";

// Screenshot target for the scene engine; compiled in only for e2e builds (VITE_SHOWCASE=1).
const Showcase = import.meta.env.VITE_SHOWCASE === "1" ? lazy(() => import("./pages/dev/Showcase")) : null;

type Tab = { to: string; label: string; icon: string };

// Icons from docs/design/Skin.dc.html.
const TABS: Tab[] = [
  { to: "/", label: "Garden", icon: "M12 21V11M12 11C12 7 9 5 5 5C5 9 8 11 12 11ZM12 14C12 11 14.5 9 18 9C18 12 15.5 14 12 14ZM6 21H18" },
  { to: "/progress", label: "Progress", icon: "M12 3A9 9 0 1 0 12.01 3ZM12 6.5A5.5 5.5 0 1 0 12.01 6.5ZM12 10A2 2 0 1 0 12.01 10Z" },
  { to: "/arcs", label: "Arcs", icon: "M3 18C6 10 18 10 21 18M7 18C9 14 15 14 17 18" },
  { to: "/settings", label: "Settings", icon: "M4 7H13M19 7H20M4 17H6M12 17H20M16 4.5A2.5 2.5 0 1 0 16.01 4.5ZM9 14.5A2.5 2.5 0 1 0 9.01 14.5Z" },
];

function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 22px)", background: "var(--g-nav-bg)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 px-2 pt-2">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `tap flex h-[54px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? "text-accent" : "text-muted"}`
              }
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function SaveBanner() {
  const failed = useSaveFailed();
  if (!failed) return null;
  return (
    <div role="alert" data-testid="save-banner" className="mb-3 rounded-xl border border-miss/50 bg-miss/10 px-3 py-2 text-sm text-miss">
      Couldn't save your last change. Export a backup in Settings.
    </div>
  );
}

function Sky() {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  if (!th.isNight) return null;
  const arc = activeArc(state);
  const p = arc ? (dailyCompletion(state, arc.id, today).percent ?? 0) / 100 : 0;
  return <NightSky accent={th.accent} progress={p} />;
}

/** Shows the arc-complete celebration once per finished arc, on whatever tab is open. */
function CompleteGate() {
  const state = useAppState();
  const today = useToday();
  const arc = arcToCelebrate(state, today);
  return arc ? <ArcComplete key={arc.id} arc={arc} today={today} /> : null;
}

function Themed({ children }: { children: React.ReactNode }) {
  const state = useAppState();
  const today = useToday();
  const dark = useSystemDark();
  const arc = activeArc(state);
  const look = effectiveLook(arc?.look ?? "journal", state.settings.autoNight, dark);
  const progress = arc ? (dailyCompletion(state, arc.id, today).percent ?? 0) / 100 : 0;
  return (
    <ThemeProvider look={look} season={arc?.season ?? "winter"} progress={progress}>
      {children}
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Routes>
          {Showcase && (
            <Route
              path="/dev/showcase"
              element={
                <Suspense fallback={null}>
                  <Showcase />
                </Suspense>
              }
            />
          )}
          <Route
            path="/arcs/new"
            element={
              <Themed>
                <NewArc />
              </Themed>
            }
          />
          <Route path="*" element={<Shell />} />
        </Routes>
      </HashRouter>
    </MotionConfig>
  );
}

function Shell() {
  return (
    <Themed>
        <Sky />
        <div className="relative z-10 mx-auto min-h-dvh max-w-md px-4 pb-28" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
          <SaveBanner />
          <Routes>
            <Route path="/" element={<Garden />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/arcs" element={<Arcs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/month" element={<Placeholder title="Month" />} />
            <Route path="/plant/:id" element={<Placeholder title="Plant" />} />
            <Route path="/visitors" element={<Placeholder title="Visitors" />} />
            <Route path="/recap/:week" element={<Placeholder title="Recap" />} />
            <Route path="/signin" element={<Placeholder title="Sign in" />} />
          </Routes>
        </div>
        <TabBar />
        <CompleteGate />
    </Themed>
  );
}
