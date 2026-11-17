import {
  businessRefused,
  mutationAudit,
  sanitizeAuditEvent,
  type AuditEvent,
} from "./audit";
import { useMobileSession } from "./session";
import { navigationSessionKey } from "./navigation";
// Source: READONLY Mobile src/api/{authApi,masterApi}.ts. Not the institution API.
// Direct Hachi transport by default in development and production.
// Browser CORS/preflight must be allowed by Hachi; never auto-retry through a proxy.
export function resolveMobileApiUrl(configured?: string): string {
  const value =
    configured || "https://hachi.kelava.id/index.php?r=apiMobileService/";
  // The relative gateway remains explicit opt-in only, not an automatic fallback.
  // No arbitrary hosts, embedded credentials, controller switches or proxy targets.
  if (!value.includes("/index.php?r=apiMobileService/")) {
    throw new Error("Konfigurasi VITE_MOBILE_API_URL tidak valid.");
  }
  return value;
}
export const MOBILE_API_URL = resolveMobileApiUrl(
  import.meta.env.VITE_MOBILE_API_URL,
);
const requests = new Set<AbortController>();
let generation = 0;
export function clearMobileRequests() {
  generation += 1;
  requests.forEach((request) => request.abort());
  requests.clear();
}
export class MobileApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = "MobileApiError";
  }
}
export class MobileApiBusinessError extends MobileApiError {
  readonly kind = "business-refusal";
  constructor(
    message: string,
    public readonly response: Readonly<Record<string, unknown>>,
    status = 200,
  ) {
    super(message, status);
    this.name = "MobileApiBusinessError";
  }
}
/** Separate bounded transport: no recursive audit, no auth-expiry side effects, no failure propagation. */
export async function writeAuditTrail(event: AuditEvent): Promise<void> {
  const safe = sanitizeAuditEvent(event);
  if (!safe) return;
  const actor = useMobileSession.getState().user;
  if (
    !actor ||
    actor.id !== event.id_user ||
    actor.id_client !== event.id_client
  )
    return;
  const controller = new AbortController();
  requests.add(controller);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      fetch(`${MOBILE_API_URL}writeAuditTrail`, {
        method: "POST",
        credentials: "omit",
        redirect: "error",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(safe),
      }),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve();
        }, 2500);
      }),
    ]);
  } catch {
    /* Best effort only. */
  } finally {
    if (timer) clearTimeout(timer);
    requests.delete(controller);
  }
}
export async function mobileRequest(
  endpoint: string,
  payload: Record<string, unknown> = {},
): Promise<any> {
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(endpoint))
    throw new MobileApiError("Endpoint mobile tidak valid.");
  const controller = new AbortController();
  const started = generation;
  const auditSession = navigationSessionKey();
  const actor = useMobileSession.getState().user;
  requests.add(controller);
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${MOBILE_API_URL}${endpoint}`, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (started !== generation || controller.signal.aborted)
      throw new MobileApiError("Sesi telah berubah.");
    if (response.status === 401) {
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("mobile:unauthorized"));
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new MobileApiError(
        `Respons API bukan JSON yang valid (HTTP ${response.status}). Periksa routing/proxy atau gateway/WAF server.`,
        response.status,
      );
    }
    const message =
      typeof body.message === "string"
        ? body.message
        : `Gagal memuat layanan mobile (HTTP ${response.status}).`;
    if (businessRefused(body))
      throw new MobileApiBusinessError(message, body, response.status);
    if (!response.ok) throw new MobileApiError(message, response.status);
    const current = useMobileSession.getState().user;
    if (
      actor &&
      current?.id === actor.id &&
      current.id_client === actor.id_client &&
      auditSession === navigationSessionKey()
    ) {
      const event = mutationAudit(endpoint, payload, body, actor);
      if (event) void writeAuditTrail(event).catch(() => undefined);
    }
    return body; // Preserve server envelope/data/total/has_more, no invented values.
  } catch (error) {
    if (error instanceof MobileApiError) throw error;
    throw new MobileApiError(
      controller.signal.aborted
        ? "Permintaan dibatalkan atau melewati batas waktu."
        : "Gagal terhubung ke API mobile. Periksa koneksi dan konfigurasi CORS server.",
    );
  } finally {
    clearTimeout(timer);
    requests.delete(controller);
  }
}
