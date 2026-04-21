/** Keeps prompts bounded and avoids huge payloads (ARCHITECTURE_MASTER task 13). */

export const MAX_SYMPTOM_TEXT_CHARS = 8_000;
export const MAX_FOLLOWUP_ANSWER_CHARS = 2_000;
export const MAX_FOLLOWUP_QUESTION_COUNT = 12;
/** Upper bound on symptom + all follow-up Q/A text (Zod superRefine on symptom-final). */
export const MAX_TOTAL_SYMPTOM_PAYLOAD_CHARS = 50_000;

export type SymptomPayloadCheck =
  | { ok: true }
  | { ok: false; status: 400; message: string };

export function validateSymptomText(symptomText: string): SymptomPayloadCheck {
  if (symptomText.length > MAX_SYMPTOM_TEXT_CHARS) {
    return {
      ok: false,
      status: 400,
      message: `Please shorten your description (max ${MAX_SYMPTOM_TEXT_CHARS} characters).`,
    };
  }
  return { ok: true };
}

export function validateFollowupAnswers(
  answers: { question: string; answer: string }[]
): SymptomPayloadCheck {
  if (answers.length > MAX_FOLLOWUP_QUESTION_COUNT) {
    return {
      ok: false,
      status: 400,
      message: "Too many follow-up answers.",
    };
  }
  for (const row of answers) {
    if (typeof row.answer === "string" && row.answer.length > MAX_FOLLOWUP_ANSWER_CHARS) {
      return {
        ok: false,
        status: 400,
        message: `Please shorten each answer (max ${MAX_FOLLOWUP_ANSWER_CHARS} characters).`,
      };
    }
  }
  return { ok: true };
}
