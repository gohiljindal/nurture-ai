import type { AgeGroup, MilestoneOverview } from "@/lib/milestone-engine";

export type MilestoneDelayGuidance = {
  summary: string;
  bullets: string[];
};

/** Task 31 — plain-language delay heuristics + parent-facing copy. */
export function buildMilestoneDelayGuidance(
  overview: MilestoneOverview,
  age_groups: AgeGroup[]
): MilestoneDelayGuidance {
  const bullets: string[] = [];

  if (overview.red_flag_delayed > 0) {
    bullets.push(
      "At least one milestone marked urgent needs a clinician conversation — book a visit rather than waiting."
    );
  } else if (overview.delayed > 0) {
    bullets.push(
      "A few skills look later than the typical window — keep practicing daily in short playful sessions."
    );
  }

  if (overview.needs_attention && overview.red_flag_delayed === 0) {
    bullets.push(
      "Overall progress is close to expectations; note any regression or loss of skills and mention them at the visit."
    );
  }

  if (bullets.length === 0) {
    bullets.push(
      "Skills look broadly on track for this age — keep varied play, talk, and movement every day."
    );
  }

  bullets.push(
    "If you are worried, trust your instincts: early supports often work best when started sooner."
  );

  const delayedLabels = age_groups.filter((g) => g.any_delayed).map((g) => g.label);
  const summary =
    delayedLabels.length > 0
      ? `Areas to discuss: ${delayedLabels.join(", ")}.`
      : "No clustered delays flagged in the current age bands.";

  return { summary, bullets };
}
