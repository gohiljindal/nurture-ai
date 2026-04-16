type CareActionsProps = {
  urgency: "emergency" | "urgent_doctor" | "monitor_home";
};

export default function CareActions({ urgency }: CareActionsProps) {
  return (
    <div className="nurture-card mt-6">
      <h3 className="text-lg font-semibold text-slate-900">Get help now</h3>

      {urgency === "emergency" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-800">Emergency care needed</p>
            <p className="mt-1 text-sm text-red-700">
              If your child is struggling to breathe, has blue lips, is very hard to wake,
              has a seizure, or seems much worse, call 911 or go to the nearest emergency department now.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="tel:911"
              className="rounded-2xl bg-red-600 px-4 py-3 text-center font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Call 911
            </a>
            <a
              href="tel:811"
              className="rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-800 hover:bg-stone-50"
            >
              Call 811
            </a>
          </div>
        </div>
      ) : urgency === "urgent_doctor" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900">Medical review recommended soon</p>
            <p className="mt-1 text-sm text-amber-800">
              Contact your child’s doctor, urgent care, or Health811. If breathing worsens,
              your child becomes hard to wake, or you are seriously worried, go to emergency care.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="tel:811"
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-3 text-center font-semibold text-white shadow-[0_8px_22px_rgba(91,33,182,0.22)] hover:opacity-95"
            >
              Call 811
            </a>
            <a
              href="https://health811.ontario.ca/static/guest/symptom-assessment"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-800 hover:bg-stone-50"
            >
              Open Health811
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-900">Monitor at home for now</p>
            <p className="mt-1 text-sm text-green-800">
              Keep watching your child closely. If symptoms worsen, new red flags appear,
              or you are unsure, call 811 or seek medical care.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="tel:811"
              className="rounded-2xl border-2 border-stone-300 bg-white px-4 py-3 text-center font-semibold text-stone-800 hover:bg-stone-50"
            >
              Call 811
            </a>
            <a
              href="https://health811.ontario.ca/static/guest/symptom-assessment"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-3 text-center font-semibold text-white shadow-[0_8px_22px_rgba(91,33,182,0.22)] hover:opacity-95"
            >
              Open Health811
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
