import {
  getLifeStageBucket,
  getLifeStageLabel,
  type LifeStageBucket,
} from "@/lib/stage-engine";

export type TodayInsightPayload = {
  title: string;
  body: string;
  stage: LifeStageBucket;
  stage_label: string;
};

type InsightTemplate = { title: string; body: string };

const POOL: Record<LifeStageBucket, InsightTemplate[]> = {
  newborn: [
    {
      title: "Skin-to-skin still counts",
      body: "Even a few minutes of calm holding helps {name} regulate breathing, temperature, and feeding cues.",
    },
    {
      title: "Feeding on cue",
      body: "Watch early hunger signs (rooting, hands to mouth) before crying — feeding is easier when {name} is calm.",
    },
    {
      title: "Safe sleep basics",
      body: "Alone, on the back, in a crib or bassinet with a firm surface — save soft bedding for supervised tummy time.",
    },
  ],
  young_infant: [
    {
      title: "Tummy time, little and often",
      body: "Short sessions spread through the day build neck strength for {name} without frustration.",
    },
    {
      title: "Respond, don’t spoil",
      body: "Comforting quickly teaches trust; you cannot spoil a baby with predictable care in the first year.",
    },
    {
      title: "Watch hydration cues",
      body: "Enough wet diapers and alert periods usually mean {name} is getting enough fluids for the day.",
    },
  ],
  older_infant: [
    {
      title: "Finger foods and exploration",
      body: "Let {name} explore textures — messy eating is part of learning coordination.",
    },
    {
      title: "Language floods in",
      body: "Narrate routines (“now we zip the coat”) — repetition builds words faster than flashcards.",
    },
    {
      title: "Stranger awareness is normal",
      body: "Clinging around new people is healthy attachment, not regression.",
    },
  ],
  toddler: [
    {
      title: "Big feelings, small bodies",
      body: "Name the feeling (“you’re mad the tower fell”) before fixing the problem — it helps {name} learn words for emotions.",
    },
    {
      title: "Predictable routines",
      body: "A simple order to the day (snack → play → nap) reduces meltdowns more than strict clocks.",
    },
    {
      title: "Play is learning",
      body: "Stacking, pouring, and pushing build math and motor skills — keep toys open-ended.",
    },
  ],
  preschool: [
    {
      title: "Practice independence safely",
      body: "Let {name} try zippers and shoes with help — confidence grows from small wins.",
    },
    {
      title: "Friendship is bumpy",
      body: "Sharing and turn-taking are still new; coach the script, don’t expect perfection.",
    },
    {
      title: "Books beat drills",
      body: "Read together daily — story language predicts school readiness better than worksheets.",
    },
  ],
  kindergarten: [
    {
      title: "School stamina builds slowly",
      body: "After long days {name} may melt down at home — it means they held it together where it mattered.",
    },
    {
      title: "Sleep still drives mood",
      body: "A steady wind-down beats later bedtimes for attention and appetite.",
    },
    {
      title: "Celebrate effort",
      body: "Praise how {name} tried, not only the score — grit grows from process praise.",
    },
  ],
  grade_readiness: [
    {
      title: "Curiosity over cramming",
      body: "Follow {name}’s questions into short investigations — depth beats flashcard volume.",
    },
    {
      title: "Movement and focus",
      body: "Outdoor play supports attention indoors better than extra seat time.",
    },
    {
      title: "Read across genres",
      body: "Mix fiction, facts, and comics — varied text builds vocabulary and stamina.",
    },
  ],
};

/** Deterministic “today” pick from age + calendar day (task 27). */
export function getTodayInsight(
  ageMonths: number,
  childName: string
): TodayInsightPayload {
  const stage = getLifeStageBucket(ageMonths);
  const pool = POOL[stage] ?? POOL.young_infant;
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const tpl = pool[dayIndex % pool.length]!;
  const name = childName.trim() || "your child";
  return {
    title: tpl.title,
    body: tpl.body.replace(/\{name\}/g, name),
    stage,
    stage_label: getLifeStageLabel(stage),
  };
}
