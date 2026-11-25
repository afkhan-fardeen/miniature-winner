import { Search } from "lucide-react";

export function ScanForm({ defaultValue = "", size = "xl", action = "/scan" }: { defaultValue?: string; size?: "xl" | "lg"; action?: string }) {
  const h = size === "xl" ? "input-xl" : "";
  return (
    <form action={action} className={`flex w-full flex-col gap-3 sm:flex-row ${size === "xl" ? "max-w-[600px]" : "max-w-[520px]"}`}>
      <label htmlFor="scan-site" className="sr-only">Your store website</label>
      <input
        id="scan-site" name="site" inputMode="url" autoComplete="url" required defaultValue={defaultValue}
        placeholder="yourstore.com" className={`input ${h} sm:flex-1`}
      />
      <button className={`btn btn-accent ${size === "xl" ? "btn-xl" : "btn-lg"} w-full sm:w-auto`}>
        <Search size={18} aria-hidden /> Check my store
      </button>
    </form>
  );
}
