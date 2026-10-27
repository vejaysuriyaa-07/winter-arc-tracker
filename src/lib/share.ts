// Share a slide as a PNG. The image is made ahead of time (prepareImage), so the
// share call itself runs inside the tap: iOS Safari refuses navigator.share after
// a long await. Only a user cancel counts as cancelled; any other refusal falls
// back to a download. The native build swaps in Capacitor Share (phase 8).
import { toBlob } from "html-to-image";

type NativeShare = (file: { name: string; blob: Blob; title: string }) => Promise<boolean>;
let nativeShare: NativeShare | null = null;

export function setNativeShare(fn: NativeShare): void {
  nativeShare = fn;
}

export type ShareResult = "shared" | "downloaded" | "cancelled" | "failed";

/** Renders the element with an opaque background (a transparent PNG shows on black in Photos). */
export async function prepareImage(el: HTMLElement, background: string): Promise<Blob | null> {
  try {
    // No cacheBust: its query string would skip the offline cache for fonts.
    return await toBlob(el, { pixelRatio: 2, backgroundColor: background });
  } catch {
    return null;
  }
}

export function shareOutcome(err: unknown): "cancelled" | "fallback" {
  return err instanceof DOMException && err.name === "AbortError" ? "cancelled" : "fallback";
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareBlob(blob: Blob, name: string, title: string): Promise<ShareResult> {
  if (nativeShare) return (await nativeShare({ name, blob, title })) ? "shared" : "cancelled";
  const file = new File([blob], name, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (err) {
      if (shareOutcome(err) === "cancelled") return "cancelled";
    }
  }
  download(blob, name);
  return "downloaded";
}
