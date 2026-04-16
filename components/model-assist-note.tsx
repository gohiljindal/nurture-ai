type ModelAssistNoteProps = {
  confidence?: "low" | "medium" | "high";
  reasoning?: string | null;
};

/**
 * Frames model metadata so it reads as transparency, not medical certainty.
 */
export default function ModelAssistNote({ confidence, reasoning }: ModelAssistNoteProps) {
  const r = reasoning?.trim();
  if (!confidence && !r) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        How we thought this through
      </p>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Based on what you shared—this reflects the assistant&apos;s read of your details, not a
        medical verdict.
      </p>
      {confidence ? (
        <p className="mt-3 text-sm text-gray-800">
          <span className="font-medium text-gray-900">Fit of details:</span>{" "}
          <span className="capitalize">{confidence}</span>
        </p>
      ) : null}
      {r ? (
        <p className={`mt-2 text-sm leading-relaxed text-gray-800 ${confidence ? "" : "mt-3"}`}>
          <span className="font-medium text-gray-900">Factors considered:</span> {r}
        </p>
      ) : null}
    </div>
  );
}
