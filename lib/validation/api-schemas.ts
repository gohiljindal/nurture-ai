import { z } from "zod";

import {
  MAX_FOLLOWUP_ANSWER_CHARS,
  MAX_FOLLOWUP_QUESTION_COUNT,
  MAX_SYMPTOM_TEXT_CHARS,
} from "@/lib/symptom-input-limits";

/** Shared: format Zod failures for API JSON (first message + optional field map). */
export function formatZodError(error: z.ZodError): {
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_root";
    if (fields[key] == null) {
      fields[key] = issue.message;
    }
  }
  return {
    message: error.issues[0]?.message ?? "Invalid request.",
    fields,
  };
}

/** POST /api/children — validated before Prisma `create`. */
export const createChildBodySchema = z
  .object({
    name: z.string().trim().min(1, "Child name is required.").max(120, "Name is too long."),
    photo_url: z
      .union([z.string(), z.null()])
      .optional()
      .transform((s) => {
        if (s === undefined || s === null) return null;
        const t = s.trim();
        return t === "" ? null : t;
      })
      .refine((s) => s == null || /^https?:\/\//i.test(s), "Photo URL must start with http:// or https://.")
      .refine((s) => s == null || s.length <= 1000, "Photo URL is too long.")
      .refine(
        (s) => {
          if (s == null) return true;
          if (!/supabase\.co\/storage/i.test(s)) return true;
          return /\/object\/public\//i.test(s) || /\/object\/sign\//i.test(s);
        },
        "Photo URL looks incomplete (Supabase links must include /object/public/...). Remove it, upload again, or paste the full URL from Storage."
      ),
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD for date of birth."),
    sex_at_birth: z
      .union([z.string(), z.null()])
      .optional()
      .transform((s) => {
        if (s === undefined || s === null) return null;
        const t = s.trim();
        return t === "" ? null : t;
      })
      .refine((s) => s == null || s.length <= 40, "Sex at birth label is too long."),
    is_premature: z.boolean(),
    gestational_age_weeks: z.preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.union([z.coerce.number().int().min(20).max(42), z.null()])
    ).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_premature) {
      const g = data.gestational_age_weeks;
      if (g == null || Number.isNaN(g)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter gestational age (weeks) for a premature baby (20–42).",
          path: ["gestational_age_weeks"],
        });
      }
    }
  });

export type CreateChildBody = z.infer<typeof createChildBodySchema>;

/** PATCH /api/children/[id] — update child photo url. */
export const updateChildPhotoBodySchema = z.object({
  photo_url: z
    .union([z.string(), z.null()])
    .optional()
    .transform((s) => {
      if (s === undefined || s === null) return null;
      const t = s.trim();
      return t === "" ? null : t;
    })
    .refine((s) => s == null || /^https?:\/\//i.test(s), "Photo URL must start with http:// or https://.")
    .refine((s) => s == null || s.length <= 1000, "Photo URL is too long.")
    .refine(
      (s) => {
        if (s == null) return true;
        if (!/supabase\.co\/storage/i.test(s)) return true;
        return /\/object\/public\//i.test(s) || /\/object\/sign\//i.test(s);
      },
      "Photo URL looks incomplete (Supabase links must include /object/public/...)."
    ),
});

export type UpdateChildPhotoBody = z.infer<typeof updateChildPhotoBodySchema>;

const followupPairSchema = z.object({
  question: z.string().max(500, "A follow-up question is too long."),
  answer: z.string().max(
    MAX_FOLLOWUP_ANSWER_CHARS,
    `Each answer must be at most ${MAX_FOLLOWUP_ANSWER_CHARS} characters.`
  ),
});

/** POST /api/symptom-followup */
export const symptomFollowupBodySchema = z.object({
  childId: z.string().uuid("Choose a valid child."),
  symptomText: z
    .string()
    .trim()
    .min(1, "Describe what you are seeing.")
    .max(
      MAX_SYMPTOM_TEXT_CHARS,
      `Keep your description under ${MAX_SYMPTOM_TEXT_CHARS} characters.`
    ),
  disclaimerAccepted: z.boolean().optional(),
});

export type SymptomFollowupBody = z.infer<typeof symptomFollowupBodySchema>;

/** POST /api/symptom-final */
export const symptomFinalBodySchema = z.object({
  childId: z.string().uuid("Choose a valid child."),
  symptomText: z
    .string()
    .trim()
    .min(1, "Describe what you are seeing.")
    .max(
      MAX_SYMPTOM_TEXT_CHARS,
      `Keep your description under ${MAX_SYMPTOM_TEXT_CHARS} characters.`
    ),
  followupAnswers: z
    .array(followupPairSchema)
    .max(MAX_FOLLOWUP_QUESTION_COUNT, "Too many follow-up answers.")
    .default([]),
  disclaimerAccepted: z.boolean().optional(),
});

export type SymptomFinalBody = z.infer<typeof symptomFinalBodySchema>;

/** POST /api/symptom-feedback */
export const symptomFeedbackBodySchema = z.object({
  checkId: z.string().uuid("Choose a valid saved check."),
  helpful: z.boolean(),
});

export type SymptomFeedbackBody = z.infer<typeof symptomFeedbackBodySchema>;
