import Link from "next/link";

type Props = {
  variant?: "primary" | "outline";
  className?: string;
};

export default function StartSymptomCheckLink({
  variant = "primary",
  className = "",
}: Props) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white shadow-[0_8px_22px_rgba(91,33,182,0.25)] ring-1 ring-violet-500/20 hover:opacity-95"
      : "border-2 border-slate-300/90 bg-white text-slate-800 shadow-sm hover:bg-slate-50";

  return (
    <Link href="/check-symptom" className={`${base} ${styles} ${className}`.trim()}>
      🩺 Start Symptom Check
    </Link>
  );
}
