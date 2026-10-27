// The iPhone app's wiring (SPEC 11). Everything here is a no-op on the web.
// Storage stays in lib/storage.ts (nativeStorage).
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { todayLocal } from "./dates";
import { setFeedbackDriver } from "./feedback";
import { applyPlan, hapticSteps, nudgePlan } from "./nudges";
import { bytesToBase64, setNativeShare, shareAsFile, type ShareResult } from "./share";
import { nativeFileWriter } from "./storage";
import * as store from "./store";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// ---------- haptics ----------

async function playHaptic(event: Parameters<typeof hapticSteps>[0]): Promise<void> {
  for (const step of hapticSteps(event)) {
    if ("wait" in step) await new Promise((r) => setTimeout(r, step.wait));
    else if ("impact" in step) await Haptics.impact({ style: step.impact === "light" ? ImpactStyle.Light : ImpactStyle.Medium });
    else await Haptics.notification({ type: step.notify === "success" ? NotificationType.Success : NotificationType.Warning });
  }
}

// ---------- notifications ----------

let lastPlan = "";

/** Brings pending notifications in line with the plan. Quietly does nothing without permission. */
async function reschedule(): Promise<void> {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") return;
  lastPlan = await applyPlan(LocalNotifications, nudgePlan(store.getState(), todayLocal(), new Date()), lastPlan);
}

let planTimer: ReturnType<typeof setTimeout> | undefined;
function replan(): void {
  clearTimeout(planTimer);
  planTimer = setTimeout(() => void reschedule().catch(() => undefined), 500);
}

/** Whether iOS allows Grove's notifications (false on the web). */
export async function notificationsAllowed(): Promise<boolean> {
  if (!isNative()) return false;
  return (await LocalNotifications.checkPermissions()).display === "granted";
}

/** Asks iOS for permission (the first time it shows the system prompt). True when allowed. */
export async function allowNotifications(): Promise<boolean> {
  if (!isNative()) return false;
  const r = await LocalNotifications.requestPermissions();
  lastPlan = "";
  replan();
  return r.display === "granted";
}

// ---------- share ----------

/** Puts a file in the app's cache and opens the iOS share sheet with it (Save to Files, Photos, Messages...). */
async function shareFile(name: string, data: () => Promise<string>, kind: "base64" | "text", title: string): Promise<ShareResult> {
  const io = {
    write: async (n: string, d: string, k: "base64" | "text") => (await nativeFileWriter())(n, d, k),
    share: (o: { title: string; files: string[]; dialogTitle: string }) => Share.share(o),
  };
  return shareAsFile(io, name, data, kind, title);
}

/** Shares a text file, such as the backup. */
export function shareTextFile(name: string, text: string, title: string): Promise<ShareResult> {
  return shareFile(name, async () => text, "text", title);
}

// ---------- start ----------

function followLook(): void {
  const apply = (): void => {
    const night = document.documentElement.dataset.look === "night";
    void StatusBar.setStyle({ style: night ? Style.Dark : Style.Light }).catch(() => undefined);
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, { attributes: true, attributeFilter: ["data-look"] });
}

/** Called once after the first render in the iPhone app. */
export function startNative(): void {
  if (!isNative()) return;
  setFeedbackDriver((e) => void playHaptic(e).catch(() => undefined));
  followLook();
  void SplashScreen.hide().catch(() => undefined);
  // The recap image goes to the share sheet as a real PNG file.
  setNativeShare(({ name, blob, title }) => shareFile(name, async () => bytesToBase64(new Uint8Array(await blob.arrayBuffer())), "base64", title));
  replan();
  store.subscribe(replan);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && replan());
  // Past midnight or 20:00 with the app left open, the plan changes without any data change.
  setInterval(replan, 5 * 60_000);
}
