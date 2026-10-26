// Bottom sheet in the current look. Escape and the backdrop close it.
import type { ReactNode } from "react";
import { useSheet } from "../../lib/useSheet";
import { useTheme } from "../../theme/ThemeProvider";

export default function Sheet({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId?: string }) {
  useSheet(onClose);
  const th = useTheme();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: "rgba(15, 14, 10, 0.45)" }} />
      <section
        data-testid={testId}
        className="relative w-full max-w-md px-4 pt-2"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
          background: th.isNight ? "linear-gradient(180deg, #1C2119 0%, #151913 100%)" : `linear-gradient(180deg, ${th.t.base[0]} 0%, ${th.t.base[1]} 100%)`,
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -18px 40px -20px rgba(0, 0, 0, 0.45)",
          color: th.t.text,
        }}
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-[5px] w-10 rounded-full" style={{ background: th.t.line }} />
        <h2 className="mb-3 text-[22px]" style={{ fontFamily: th.t.fonts.display, fontWeight: th.t.fonts.headingWeight }}>
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}
