// The one-time sign-in card after the first full day (SPEC 5.11).
import { useNavigate } from "react-router";
import { actions } from "../../lib/store";
import { useTheme } from "../../theme/ThemeProvider";

export default function SignInPrompt() {
  const th = useTheme();
  const navigate = useNavigate();
  return (
    <section className="card flex flex-col gap-3 p-5" aria-label="Keep your garden" data-testid="signin-prompt">
      <h2 className="text-[20px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Keep your garden safe</h2>
      <p className="text-[15px] leading-relaxed" style={{ color: th.t.muted }}>Sign in with your email to sync your arcs to your other devices. It is optional.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            actions.setUiFlag("signInPrompted", true);
            void navigate("/signin");
          }}
          className="h-11 flex-1 rounded-xl text-[15px] font-semibold"
          style={{ background: th.accentGradient, color: th.t.onAccent }}
        >
          Sign in
        </button>
        <button type="button" onClick={() => actions.setUiFlag("signInPrompted", true)} className="h-11 flex-1 rounded-xl text-[15px]" style={{ color: th.t.muted, boxShadow: `0 0 0 1px ${th.t.line}` }}>
          Maybe later
        </button>
      </div>
    </section>
  );
}
