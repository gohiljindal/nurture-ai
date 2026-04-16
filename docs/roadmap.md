# NurtureAI product roadmap

Prioritized phases for **NurtureAI** (pediatric health navigation for parents). This aligns MVP scope with a longer vision without committing to everything at once.

## Principles

- **Q1 = prove one loop:** logged-in parent → child context → symptom triage + safety → saved history → age-grounded reassurance (not article overload).
- **Q2 = deepen trust:** education surfaces that **don’t fight** triage (static “when to seek care,” vaccine next steps without a full reminder engine).
- **Q3+ = platform depth:** trackers, reminders, richer intelligence — only after retention and trust are real.

**Positioning:** NurtureAI is **decision-first** (what to do right now) more than a pure content library (e.g. BabyCenter-style breadth). Borrow **age-first organization** and **scannable reassurance**, not the full feature surface.

---

## Q1 — MVP (ship and validate)

**In scope for MVP:** auth, child profiles, dashboard, symptom input → follow-ups → result, safety-first escalation, history, check detail, child detail, **what to expect now**, **vaccine preview**.

| Theme | What to ship | Why it’s here |
|--------|----------------|----------------|
| **Core decision loop** | Symptom → follow-ups → result; server-backed checks; auth + child resolved on the server | Core product promise. |
| **Safety** | Deterministic rules + clear escalation copy; consistent “not a diagnosis” | Non-negotiable for health-adjacent trust. |
| **Age context** | **What to expect now** (short, scannable) | Age spine without a full content library. |
| **Preventive touch** | **Vaccine preview** (next milestone, plain language) | High value vs full scheduler complexity. |
| **Prematurity (light)** | Corrected vs chronological context where gestational age exists | Trust lever without a separate “premie app.” |

**Explicitly out of Q1:** full growth charts, full feeding/sleep/milestone engines, reminders, payments, clinic integrations, major redesign that rebuilds everything.

---

## Q2 — “BabyCenter patterns” without becoming BabyCenter

More **surfaces** and **education**, still decision-first.

| Theme | What to add | Pattern |
|--------|-------------|--------|
| **Age snapshot** | One **per-child** view: “At this age, often normal / worth asking about / seek care” (tight bullets) | Age-first organization |
| **Emergency education** | Single **static** page: signs that mean seek emergency care now; link to in-app triage | Reassurance + limits |
| **Vaccines (no reminder engine yet)** | Expand preview → clear next doses + link to public (e.g. Ontario) schedule | Practical prevention |
| **Visit prep (light)** | **Checklist** of questions for well-baby visits (templates by age), not a heavy AI generator | Prepared in a 15-minute visit |
| **History UX** | Filter by child; clearer check detail for “what we said last time” | Continuity |

---

## Q3+ — Depth and “full companion” territory

Only after Q1–Q2 justify the build cost.

| Idea | Typical phase | Notes |
|------|----------------|-------|
| Growth percentile / WHO plots | Q3+ | Data model, UX, liability review |
| Feeding intelligence (deep) | Q3+ | Scope explodes; optional age-based guides first |
| Sleep guide (deep) | Q3+ | Avoid competing with triage for “what do I do tonight?” |
| Milestone alerter | Q3+ | Sensitive; needs clinical framing and guardrails |
| Vaccination scheduler + **reminders** | Q3+ | Notifications, prefs, reliability |
| Clinic integrations | Late | Compliance and partnerships |
| Premature “specialist mode” (full) | Q3+ (or late Q2 if narrowly scoped) | Corrected age **across modules**, not just labels |

---

## One-line phase summary

- **Q1:** Decide safely tonight.  
- **Q2:** Know what’s normal this month and what’s urgent.  
- **Q3+:** Track growth, feeding, sleep, and visits — with guardrails.

---

*Last updated from internal planning; adjust dates and scope in PRs as the product learns.*
