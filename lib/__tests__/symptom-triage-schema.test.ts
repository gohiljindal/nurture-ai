import { describe, expect, it } from "vitest";

import { symptomTriageResultSchema } from "@/lib/symptom-triage-result";

const minimalValidTriage = {
  urgency: "monitor_home" as const,
  summary: "Test summary",
  recommended_action: "Watch at home",
  red_flags: [],
  disclaimer: "Not medical advice.",
  confidence: "medium" as const,
  reasoning: "Because test.",
  decision_source: "ai" as const,
  rule_reason: null,
};

describe("symptomTriageResultSchema (task 40)", () => {
  it("parses a minimal valid API triage payload", () => {
    const parsed = symptomTriageResultSchema.parse(minimalValidTriage);
    expect(parsed).toMatchSnapshot();
  });

  it("parses optional structured fields", () => {
    const parsed = symptomTriageResultSchema.parse({
      ...minimalValidTriage,
      urgency_score: 42,
      immediate_actions: ["Call 811"],
      watch_next: ["Fever"],
      decision_factors: ["Age"],
      decision_diff: {
        baseline_urgency: "monitor_home",
        final_urgency: "urgent_doctor",
        summary: "Follow-up changed urgency.",
      },
    });
    expect(parsed).toMatchSnapshot();
  });
});
