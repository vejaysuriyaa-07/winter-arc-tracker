// Settings (SPEC 5.10), laid out in the arc's look: this arc, feel, sync, your data, reset.
import { useEffect, useRef, useState } from "react";
import type { AppState } from "../types";
import { actions, flushWrites, useAppState } from "../lib/store";
import { useNow, useToday } from "../lib/today";
import { activeArc, arcHabits } from "../lib/stats";
import { arcEditLimits, themeLabel } from "../lib/arcs";
import { previewModel } from "../lib/garden";
import { parseLocal } from "../lib/dates";
import { parseImport, serialize } from "../lib/storage";
import { backupFileName, describeBackup } from "../lib/backup";
import ThemePicker from "../components/theme/ThemePicker";
import Toggle from "../components/ui/Toggle";
import { DateRow, Divider, NumberRow, RowButton, RowText, Section, TextRow } from "../components/settings/Fields";
import { ConfirmSheet, HabitsSheet, ScoringSheet } from "../components/settings/Sheets";
import { useTheme } from "../theme/ThemeProvider";
import { useNavigate } from "react-router";
import { signOut, statusText, syncNow, useSync } from "../lib/sync";
import { allowNotifications, isNative, notificationsAllowed, shareTextFile } from "../lib/native";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "long" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" });
const LONG_DATE = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

type Open = null | "theme" | "habits" | "scoring" | "reset" | "import";

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Settings() {
  const th = useTheme();
  const state = useAppState();
  const today = useToday();
  const arc = activeArc(state);
  const [open, setOpen] = useState<Open>(null);
  const sync = useSync();
  const native = isNative();
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (native) void notificationsAllowed().then((ok) => setBlocked(!ok));
  }, [native]);
  // In the iPhone app, turning a reminder on asks iOS for permission (the system prompt shows once).
  const reminder = (patch: { nudge?: boolean; recap?: boolean }): void => {
    actions.updateSettings(patch);
    if (native && (patch.nudge || patch.recap)) void allowNotifications().then((ok) => setBlocked(!ok));
  };
  const navigate = useNavigate();
  useNow(); // the "Synced N min ago" line stays fresh
  const limits = arc ? arcEditLimits(arc, today) : null;
  const [pending, setPending] = useState<AppState | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const habits = arc ? arcHabits(state, arc.id).filter((h) => h.archivedAt === undefined) : [];
  const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
  const s = state.settings;

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex h-11 items-center">
        <h1 className="text-[30px] leading-none" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Settings</h1>
      </header>

      {arc && (
        <Section title="This arc">
          <TextRow label="Name" value={arc.name} onCommit={(name) => actions.updateArc(arc.id, { name })} testId="arc-name-field" />
          <Divider />
          <RowButton label="Garden theme" value={themeLabel(arc.look, arc.season)} onClick={() => setOpen("theme")} testId="theme-row" />
          <Divider />
          {limits?.editable ? (
            <>
              <NumberRow label="Length" value={arc.lengthDays} min={limits.minLength} max={365} suffix="days" onCommit={(lengthDays) => actions.updateArc(arc.id, { lengthDays })} testId="length-field" />
              <Divider />
              <DateRow label="Started" value={arc.startDate} min={limits.earliestStart} onCommit={(startDate) => actions.updateArc(arc.id, { startDate })} testId="start-field" />
              <Divider />
              <NumberRow label="A day counts when" value={arc.threshold} min={1} max={100} suffix="% is done" onCommit={(threshold) => actions.updateArc(arc.id, { threshold })} testId="threshold-field" />
            </>
          ) : (
            <>
              <RowText label="Length" value={`${arc.lengthDays} days`} testId="length-text" />
              <Divider />
              <RowText label="Started" value={LONG_DATE.format(parseLocal(arc.startDate))} testId="start-text" />
              <Divider />
              <RowText label="A day counts when" value={`${arc.threshold}% is done`} testId="threshold-text" />
            </>
          )}
          <Divider />
          <RowButton label="Habits" value={`${habits.length} ${habits.length === 1 ? "habit" : "habits"}`} onClick={() => setOpen("habits")} testId="habits-row" />
          <Divider />
          <RowButton label="How scoring works" onClick={() => setOpen("scoring")} testId="scoring-row" />
        </Section>
      )}

      <Section title="Feel">
        <Toggle label="Night look in dark mode" detail="Switches when your iPhone does" checked={s.autoNight} onChange={(v) => actions.updateSettings({ autoNight: v })} testId="settings-auto-night" />
        <Divider />
        <Toggle label="Haptics" detail="Gentle taps on iPhone" checked={s.haptics} onChange={(v) => actions.updateSettings({ haptics: v })} testId="settings-haptics" />
        <Divider />
        <Toggle label="Sounds" checked={s.sounds} onChange={(v) => actions.updateSettings({ sounds: v })} testId="settings-sounds" />
        <Divider />
        <Toggle label="Wind and animations" detail="Off keeps every scene still" checked={s.motion} onChange={(v) => actions.updateSettings({ motion: v })} testId="settings-motion" />
        <Divider />
        <Toggle label="8pm nudge" detail="When today is open and your chain is 2+" checked={s.nudge} onChange={(v) => reminder({ nudge: v })} testId="settings-nudge" />
        <Divider />
        <Toggle label="Sunday recap" detail="A note when your week is ready" checked={s.recap} onChange={(v) => reminder({ recap: v })} testId="settings-recap" />
        {(s.nudge || s.recap) && (native ? blocked : true) && (
          <p className="pb-3 text-[13px]" data-testid="notify-note" style={{ color: th.t.muted }}>
            {native ? "Notifications are off for Grove. Turn them on in the iPhone's Settings app, under Grove." : "Notifications arrive in the iPhone app."}
          </p>
        )}
      </Section>

      <Section title="Sync">
        {!sync.configured ? (
          <RowText label="Sync" value="Not set up in this build" testId="sync-off" />
        ) : sync.email === null ? (
          <RowButton label="Sign in to sync" value="Off" onClick={() => void navigate("/signin")} testId="signin-row" />
        ) : (
          <>
            <RowText label="Account" value={sync.email} testId="sync-account" />
            <Divider />
            <RowButton label="Sync" value={statusText(sync, Date.now())} onClick={syncNow} testId="sync-status" />
            <Divider />
            <RowButton label="Sign out" value="Data stays here" onClick={() => void signOut()} testId="sign-out" />
          </>
        )}
      </Section>

      <Section title="Your data">
        <RowButton
          label="Export a backup"
          testId="export"
          onClick={async () => {
            await flushWrites();
            if (native) {
              // The iPhone app cannot download; the share sheet saves the backup file to Files or sends it.
              const r = await shareTextFile(backupFileName(today), serialize(state), "Grove backup");
              setNote(r === "shared" ? "Backup shared." : r === "failed" ? "Could not share the backup. Try again." : null);
              return;
            }
            download(serialize(state), backupFileName(today));
            setNote("Backup saved.");
          }}
        />
        <Divider />
        <RowButton label="Import a backup" testId="import" onClick={() => file.current?.click()} />
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          data-testid="import-file"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const r = parseImport(await f.text());
            if (!r.ok) {
              setNote("That file is not a Grove backup. Nothing changed.");
              return;
            }
            setNote(null);
            setPending(r.state);
            setOpen("import");
          }}
        />
        {note && <p role="status" data-testid="data-note" className="pb-3 text-[13px]" style={{ color: th.t.muted }}>{note}</p>}
      </Section>

      {arc && (
        <button type="button" data-testid="reset-arc" onClick={() => setOpen("reset")} className="h-[52px] rounded-2xl text-[16px] font-semibold" style={{ color: "#F87171", boxShadow: "0 0 0 1px rgba(248, 113, 113, 0.5)" }}>
          Reset this arc
        </button>
      )}

      {open === "theme" && arc && (
        <ThemePicker
          look={arc.look}
          season={arc.season}
          autoNight={s.autoNight}
          preview={{ model: (season) => previewModel(state, arc, today, season, habits.length), habits: habits.map((h) => h.name), arcName: arc.name, weekday: WEEKDAY.format(d), date: MONTH_DAY.format(d) }}
          onCancel={() => setOpen(null)}
          onUse={(look, season, autoNight) => {
            actions.setTheme(arc.id, look, season);
            actions.updateSettings({ autoNight });
            setOpen(null);
          }}
        />
      )}
      {open === "habits" && arc && <HabitsSheet arc={arc} onClose={() => setOpen(null)} />}
      {open === "scoring" && <ScoringSheet arc={arc} onClose={() => setOpen(null)} />}
      {open === "reset" && arc && (
        <ConfirmSheet
          title="Reset this arc?"
          body={`${arc.name} starts again today. Every check-off and mood in it is cleared. Habits you removed are deleted. Your current habits and found visitors stay. This cannot be undone, so export a backup first if you might want it.`}
          confirm="Reset"
          danger
          onClose={() => setOpen(null)}
          onConfirm={() => {
            actions.resetArc(today, arc.id);
            setOpen(null);
            setNote(null);
          }}
        />
      )}
      {open === "import" && pending && (
        <ConfirmSheet
          title="Replace your data?"
          body={`This backup has ${describeBackup(pending)}. It replaces everything on this device.`}
          confirm="Replace"
          danger
          onClose={() => {
            setOpen(null);
            setPending(null);
          }}
          onConfirm={() => {
            actions.importState(pending);
            setOpen(null);
            setPending(null);
            setNote("Backup imported.");
          }}
        />
      )}
    </div>
  );
}
