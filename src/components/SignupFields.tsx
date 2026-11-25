"use client";

import { Briefcase, User } from "lucide-react";
import { useState } from "react";
import { Field } from "./AuthShell";

export function SignupFields() {
  const [type, setType] = useState<"work" | "personal">("work");
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" name="firstName" required maxLength={60} autoComplete="given-name" />
        <Field label="Last name" name="lastName" required maxLength={60} autoComplete="family-name" />
      </div>

      <fieldset>
        <legend className="label">I&apos;m using Klyroo for</legend>
        <div className="grid grid-cols-2 gap-3">
          {([["work", "Work", Briefcase], ["personal", "Personal", User]] as const).map(([v, label, Icon]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-3 text-sm transition-colors ${type === v ? "border-ink outline outline-1 outline-ink" : "border-line hover:border-ink-2"}`}>
              <input type="radio" name="accountType" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
              <Icon size={18} aria-hidden /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      {type === "work" && <Field label="Company name" name="companyName" required maxLength={120} autoComplete="organization" />}

      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <p className="-mt-2 text-xs text-ink-2">At least 8 characters.</p>

      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input type="checkbox" name="terms" required className="mt-1 size-4 accent-ink" />
        <span>I agree to the <a href="/terms" className="text-ink underline underline-offset-4">Terms</a> and <a href="/privacy" className="text-ink underline underline-offset-4">Privacy Policy</a>.</span>
      </label>
    </>
  );
}
