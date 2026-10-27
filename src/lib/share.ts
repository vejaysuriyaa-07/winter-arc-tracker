// Share a slide as a PNG. The image is made ahead of time (prepareImage), so the
// share call itself runs inside the tap: iOS Safari refuses navigator.share after
// a long await. Only a user cancel counts as cancelled; any other refusal falls
// back to a download. The iPhone app swaps in Capacitor Share with a real file
// (lib/native.ts), since its web view cannot download.
import { toBlob } from "html-to-image";

export type ShareResult = "shared" | "downloaded" | "cancelled" | "failed";

type NativeShare = (file: { name: string; blob: Blob; title: string }) => Promise<ShareResult>;
let nativeShare: NativeShare | null = null;

export function setNativeShare(fn: NativeShare | null): void {
  nativeShare = fn;
}

/** Base64 for a file write, in chunks so a large image never overflows the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * The iPhone path: make the data, write it as a file, open the share sheet
 * with it. Every step is inside one try, so any failure (a conversion that
 * runs out of memory, a full disk) is reported, never left unhandled.
 */
export async function shareAsFile(
  io: {
    write: (name: string, data: string, kind: "base64" | "text") => Promise<string>;
    share: (o: { title: string; files: string[]; dialogTitle: string }) => Promise<unknown>;
  },
  name: string,
  data: () => Promise<string>,
  kind: "base64" | "text",
  title: string,
): Promise<ShareResult> {
  try {
    const uri = await io.write(name, await data(), kind);
    await io.share({ title, files: [uri], dialogTitle: title });
    return "shared";
  } catch (err) {
    return nativeShareOutcome(err);
  }
}

/** The iOS share sheet rejects with "Share canceled" when the person closes it. */
export function nativeShareOutcome(err: unknown): "cancelled" | "failed" {
  const message = err instanceof Error ? err.message : String(err);
  return /cancel/i.test(message) ? "cancelled" : "failed";
}

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
  if (nativeShare) return nativeShare({ name, blob, title });
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
