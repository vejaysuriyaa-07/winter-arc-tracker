// Resolves the theme (look x season) for the active arc and applies it as CSS
// variables. ThemeScope does the same for a subtree (arc cards, New arc, the
// theme picker preview), so each can render in its own look and season.
import { createContext, useContext, useLayoutEffect, useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { Look, Season } from "../types";
import { themeFor, type Theme } from "./tokens";

const ThemeContext = createContext<Theme>(themeFor("journal", "winter"));

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

// ---------- dark mode ----------

const DARK = "(prefers-color-scheme: dark)";

function subscribeDark(cb: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(DARK);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isDark = (): boolean => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(DARK).matches;

export function useSystemDark(): boolean {
  return useSyncExternalStore(subscribeDark, isDark, () => false);
}

/** The look actually shown: Night while the system is dark and "Night look in dark mode" is on. */
export function effectiveLook(look: Look, autoNight: boolean, systemDark: boolean): Look {
  return autoNight && systemDark ? "night" : look;
}

// ---------- css variables ----------

export function themeVars(th: Theme): Record<string, string> {
  const t = th.t;
  return {
    "--g-text": t.text,
    "--g-muted": t.muted,
    "--g-line": t.line,
    "--g-surface": t.surface,
    "--g-on-accent": t.onAccent,
    "--g-ring": t.ring,
    "--g-base-0": t.base[0],
    "--g-base-1": t.base[1],
    "--g-accent": th.accent,
    "--g-tint": th.tint,
    "--g-accent-gradient": th.accentGradient,
    "--g-font-display": t.fonts.display,
    "--g-font-body": t.fonts.body,
    "--g-card-bg": th.card.background,
    "--g-card-border": th.card.border,
    "--g-card-radius": `${th.card.radius}px`,
    "--g-card-shadow": th.card.shadow,
    "--g-nav-bg": th.navBackground,
  };
}

/** Applies a theme to <html> and provides it to the app. */
export function ThemeProvider({ look, season, progress = 0, children }: { look: Look; season: Season; progress?: number; children: ReactNode }) {
  const th = useMemo(() => themeFor(look, season), [look, season]);
  // Layout effects: the first paint is already in the right look (no journal flash for Night).
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(themeVars(th))) root.style.setProperty(k, v);
    root.dataset.look = look;
    root.dataset.season = season;
    root.style.colorScheme = th.isNight ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", th.t.base[0]);
  }, [th, look, season]);
  useLayoutEffect(() => {
    // backgroundImage only: the shorthand would reset background-attachment: fixed.
    document.body.style.backgroundImage = th.pageBackground(progress);
  }, [th, progress]);
  return <ThemeContext.Provider value={th}>{children}</ThemeContext.Provider>;
}

/** A subtree in its own look and season. Paints its own background when `paint` is set. */
export function ThemeScope({ look, season, paint = false, className, style, children, ...rest }: {
  look: Look; season: Season; paint?: boolean; className?: string; style?: CSSProperties; children: ReactNode;
} & Record<`data-${string}`, string>) {
  const th = useMemo(() => themeFor(look, season), [look, season]);
  const vars = themeVars(th) as CSSProperties;
  return (
    <ThemeContext.Provider value={th}>
      <div
        {...rest}
        data-look={look}
        data-season={season}
        className={className}
        style={{ ...vars, color: th.t.text, fontFamily: th.t.fonts.body, ...(paint ? { backgroundImage: th.pageBackground(0) } : {}), ...style }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
