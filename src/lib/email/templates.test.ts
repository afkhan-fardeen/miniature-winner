import { describe, expect, it } from "vitest";
import { confirmEmail, passwordChanged, renewalReminder, resetPassword, subscriptionActive, trialEnding } from "./templates";

const url = "https://useklyroo.com/auth/confirm?token_hash=abc&type=signup";

describe("email templates", () => {
  it("includes the action link in both html and text", () => {
    for (const r of [confirmEmail({ firstName: "Ada", url }), resetPassword({ firstName: "Ada", url })]) {
      expect(r.html).toContain("token_hash=abc");
      expect(r.text).toContain(url);
      expect(r.subject.length).toBeGreaterThan(5);
    }
  });
  it("escapes user-supplied names", () => {
    const r = confirmEmail({ firstName: '<script>alert("x")</script>', url });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
  it("renders billing and lifecycle emails with the right facts", () => {
    const active = subscriptionActive({ firstName: "Ada", brands: 3, months: 12, expiresAt: new Date("2027-11-25T00:00:00Z"), total: 90000 });
    expect(active.html).toContain("£900");
    expect(active.html).toContain("25 November 2027");
    expect(trialEnding({ firstName: "Ada", daysLeft: 1, endsAt: new Date("2026-12-09T00:00:00Z") }).subject).toContain("tomorrow");
    expect(renewalReminder({ firstName: "Ada", brands: 2, renewsAt: new Date("2027-01-10T00:00:00Z"), amount: 72000 }).text).toContain("£720");
    expect(passwordChanged({ firstName: "Ada", when: new Date("2026-11-25T00:00:00Z") }).html).toContain("reset your password now");
  });
});
