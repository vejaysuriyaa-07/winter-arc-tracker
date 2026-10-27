// The one-time reminders card in the iPhone app, after the first full day (SPEC 11: opt-in).
import { actions } from "../../lib/store";
import { allowNotifications } from "../../lib/native";
import { useTheme } from "../../theme/ThemeProvider";

export default function RemindersPrompt() {
  const th = useTheme();
  return (
    <section className="card flex flex-col gap-3 p-5" aria-label="Reminders" data-testid="reminders-prompt">
      <h2 className="text-[20px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Want a gentle nudge?</h2>
      <p className="text-[15px] leading-relaxed" style={{ color: th.t.muted }}>A note at 8pm when your chain is at stake, and one on Sunday evening when your week is ready.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            actions.setUiFlag("notificationsPrompted", true);
            actions.updateSettings({ nudge: true, recap: true });
            void allowNotifications();
          }}
          className="h-11 flex-1 rounded-xl text-[15px] font-semibold"
          style={{ background: th.accentGradient, color: th.t.onAccent }}
        >
          Turn on
        </button>
        <button type="button" onClick={() => actions.setUiFlag("notificationsPrompted", true)} className="h-11 flex-1 rounded-xl text-[15px]" style={{ color: th.t.muted, boxShadow: `0 0 0 1px ${th.t.line}` }}>
          Maybe later
        </button>
      </div>
    </section>
  );
}
