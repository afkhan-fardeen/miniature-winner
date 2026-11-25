import { ArrowRight } from "lucide-react";

/** Captures the store's address and carries it into sign-up, so the first brand is pre-filled. */
export function StartForm({ size = "xl" }: { size?: "xl" | "lg" }) {
  const h = size === "xl" ? "input-xl" : "";
  return (
    <form action="/signup" className={`flex w-full flex-col gap-3 sm:flex-row ${size === "xl" ? "max-w-[620px]" : "max-w-[540px]"}`}>
      <label htmlFor="start-site" className="sr-only">Your store&apos;s website</label>
      <input id="start-site" name="site" inputMode="url" autoComplete="url" placeholder="yourstore.com" className={`input ${h} sm:flex-1`} />
      <button className={`btn btn-accent ${size === "xl" ? "btn-xl" : "btn-lg"} w-full sm:w-auto`}>
        Start your 3-day free trial <ArrowRight size={18} aria-hidden />
      </button>
    </form>
  );
}
