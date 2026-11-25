"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; hint?: string };

/** Password input with a show/hide toggle. */
export function PasswordField({ label, hint, id, ...rest }: Props) {
  const auto = useId();
  const fid = id ?? auto;
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={fid} className="label">{label}</label>
      <div className="relative">
        <input id={fid} type={show ? "text" : "password"} className="input pr-12" autoCapitalize="none" spellCheck={false} {...rest} />
        <button
          type="button" onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
          className="absolute right-1 top-1 grid size-10 place-items-center rounded-md text-ink-2 hover:bg-muted hover:text-ink"
        >
          {show ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink-2">{hint}</p>}
    </div>
  );
}
