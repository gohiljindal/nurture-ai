/**
 * Shared Tailwind class tokens.
 * Use these instead of raw strings so a single change propagates everywhere.
 */

export const T = {
  // ── Page / surfaces ─────────────────────────────────────────────────────────
  page:       "flex-1 bg-page",
  card:       "bg-card rounded-2xl border border-border",
  cardPadded: "bg-card rounded-2xl border border-border p-4",

  // ── Typography ───────────────────────────────────────────────────────────────
  kicker:   "text-[11px] font-semibold text-brand-500 tracking-widest uppercase",
  h1:       "text-2xl font-extrabold text-slate-900",
  h2:       "text-xl font-bold text-slate-900",
  h3:       "text-base font-semibold text-slate-900",
  body:     "text-sm font-sans text-slate-600 leading-relaxed",
  muted:    "text-xs font-sans text-slate-400",
  label:    "text-sm font-semibold text-slate-800",

  // ── Inputs ───────────────────────────────────────────────────────────────────
  input:    "border border-slate-200 rounded-xl px-4 py-3 text-sm font-sans text-slate-900 bg-white",

  // ── Buttons ──────────────────────────────────────────────────────────────────
  btnPrimary:   "bg-brand-500 rounded-full py-[14px] items-center justify-center",
  btnSecondary: "border border-border rounded-full py-[14px] items-center justify-center bg-card",
  btnText:      "text-sm font-semibold text-white",
  btnTextAlt:   "text-sm font-semibold text-slate-800",

  // ── Urgency badges ───────────────────────────────────────────────────────────
  badgeEmergency:    "bg-red-50 border border-red-200 rounded-full px-3 py-1",
  badgeUrgent:       "bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1",
  badgeMonitor:      "bg-green-50 border border-green-200 rounded-full px-3 py-1",
  badgeTextEmergency:"text-[11px] font-bold text-red-700",
  badgeTextUrgent:   "text-[11px] font-bold text-yellow-800",
  badgeTextMonitor:  "text-[11px] font-bold text-green-800",
} as const;
