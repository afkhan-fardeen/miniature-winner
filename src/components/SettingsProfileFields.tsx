"use client";

import { useState } from "react";

interface Profile { firstName: string; lastName: string; accountType: "work" | "personal"; companyName: string }

export function SettingsProfileFields({ profile }: { profile?: Profile }) {
  const [type, setType] = useState<"work" | "personal">(profile?.accountType ?? "work");
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="fn" className="label">First name</label><input id="fn" name="firstName" required maxLength={60} defaultValue={profile?.firstName} autoComplete="given-name" className="input" /></div>
        <div><label htmlFor="ln" className="label">Last name</label><input id="ln" name="lastName" required maxLength={60} defaultValue={profile?.lastName} autoComplete="family-name" className="input" /></div>
      </div>
      <fieldset>
        <legend className="label">Account type</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["work", "personal"] as const).map((v) => (
            <label key={v} className={`flex cursor-pointer items-center justify-center rounded-md border px-4 py-3 text-sm capitalize ${type === v ? "border-ink outline outline-1 outline-ink" : "border-line hover:border-ink-2"}`}>
              <input type="radio" name="accountType" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />{v}
            </label>
          ))}
        </div>
      </fieldset>
      {type === "work" && (
        <div><label htmlFor="co" className="label">Company name</label><input id="co" name="companyName" required maxLength={120} defaultValue={profile?.companyName} autoComplete="organization" className="input" /></div>
      )}
    </>
  );
}
