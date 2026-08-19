import { afterEach, describe, expect, it } from "vitest";
import { resolveTelegramWebhookOrigin } from "./telegram";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => { process.env.NEXT_PUBLIC_APP_URL = originalAppUrl; });

describe("Telegram webhook origin", () => {
  it("uses a configured HTTPS production URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://futonic.vercel.app/";
    expect(resolveTelegramWebhookOrigin(new Request("http://localhost/api"))).toBe("https://futonic.vercel.app");
  });

  it("falls back to Vercel HTTPS headers when the configured URL is local", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    const request = new Request("http://internal/api", { headers: { "x-forwarded-proto": "https", "x-forwarded-host": "futonic.vercel.app" } });
    expect(resolveTelegramWebhookOrigin(request)).toBe("https://futonic.vercel.app");
  });
});
