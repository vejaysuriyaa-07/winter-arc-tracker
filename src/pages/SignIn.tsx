// Sign in (SPEC 5.11): email, then the 6-digit code from the email. Optional;
// signing in merges this device's data into the account.
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { hasSupabase, sendCode, verifyCode } from "../lib/sync";
import { useTheme } from "../theme/ThemeProvider";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignIn() {
  const th = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const back = (): void => {
    if (location.key === "default") void navigate("/settings");
    else void navigate(-1);
  };
  const field = { padding: `0 ${th.input.padX}px`, borderBottom: th.input.underline, borderRadius: th.input.radius, background: th.input.background, color: th.t.text };
  const primary = { background: th.accentGradient, color: th.t.onAccent, boxShadow: `0 12px 22px -14px ${th.accent}` };

  const send = async (e?: FormEvent): Promise<void> => {
    e?.preventDefault();
    if (!EMAIL.test(email.trim()) || busy) return;
    setBusy(true);
    setError(null);
    const r = await sendCode(email.trim());
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setStep("code");
    setNote(`We sent a 6-digit code to ${email.trim()}.`);
  };

  const verify = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    const r = await verifyCode(email.trim(), code);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    void navigate("/settings", { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[88px_1fr_88px] items-center">
        <button type="button" onClick={back} className="tap justify-self-start text-[15px]" style={{ color: th.t.muted }}>Back</button>
        <h1 className="text-center text-[24px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>Sign in</h1>
        <span />
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <p className="text-[15px] leading-relaxed" style={{ color: th.t.muted }}>
          Sign in to keep your gardens on every device. There is no password: we email you a 6-digit code. Your gardens on this device come with you.
        </p>

        {!hasSupabase() ? (
          <p role="status" className="text-[15px]">Sync is not set up in this build.</p>
        ) : step === "email" ? (
          <form onSubmit={send} className="flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                data-testid="signin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 text-[16px] outline-none"
                style={field}
              />
            </label>
            <button type="submit" data-testid="send-code" disabled={!EMAIL.test(email.trim()) || busy} className="h-14 rounded-2xl text-[17px] font-semibold disabled:opacity-50" style={primary}>
              {busy ? "Sending" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-3">
            {note && <p role="status" data-testid="signin-note" className="text-[15px]">{note}</p>}
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: th.t.muted }}>Code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                data-testid="signin-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="num h-12 text-[22px] tracking-[0.4em] outline-none"
                style={field}
              />
            </label>
            <button type="submit" data-testid="verify-code" disabled={code.length !== 6 || busy} className="h-14 rounded-2xl text-[17px] font-semibold disabled:opacity-50" style={primary}>
              {busy ? "Checking" : "Sign in"}
            </button>
            <div className="flex justify-between">
              <button type="button" onClick={() => { setStep("email"); setCode(""); setError(null); }} className="tap text-[15px]" style={{ color: th.t.muted }}>Use another email</button>
              <button type="button" data-testid="resend-code" onClick={() => void send()} disabled={busy} className="tap text-[15px]" style={{ color: th.accent }}>Send a new code</button>
            </div>
          </form>
        )}
        {error && <p role="alert" data-testid="signin-error" className="text-[15px]" style={{ color: "#F87171" }}>{error}</p>}
      </div>
    </div>
  );
}
