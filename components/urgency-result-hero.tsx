type UrgencyResultHeroProps = {
  urgency: "emergency" | "urgent_doctor" | "monitor_home";
};

/**
 * High-visibility strip for higher-urgency outcomes so parents scan severity first.
 */
export default function UrgencyResultHero({ urgency }: UrgencyResultHeroProps) {
  if (urgency === "emergency") {
    return (
      <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
          Immediate attention
        </p>
        <p className="mt-2 text-base font-semibold leading-snug text-red-950">
          This suggests emergency or same-day urgent care may be appropriate.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-red-900/90">
          If you believe your child is in danger right now, call emergency services before relying
          on any app guidance.
        </p>
      </div>
    );
  }

  if (urgency === "urgent_doctor") {
    return (
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
          Medical review soon
        </p>
        <p className="mt-2 text-base font-semibold leading-snug text-amber-950">
          A clinician should assess this today—or sooner if symptoms worsen.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
          If breathing is hard, your child is very hard to wake, or you feel something is seriously
          wrong, seek urgent or emergency care.
        </p>
      </div>
    );
  }

  return null;
}
