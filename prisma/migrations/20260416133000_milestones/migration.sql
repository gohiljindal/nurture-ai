-- Milestone reference + per-child rows (Prisma DB). Seed from supabase/seeds/milestone_definitions.sql.

CREATE TABLE "milestone_definitions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "age_months_min" INTEGER NOT NULL,
    "age_months_max" INTEGER NOT NULL,
    "age_months_avg" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "why_it_matters" TEXT NOT NULL,
    "what_to_do_if_delayed" TEXT NOT NULL,
    "red_flag" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT DEFAULT 'AAP/WHO 2023',
    "premature_notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "milestone_definitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "milestone_definitions_domain_age_min_idx" ON "milestone_definitions"("domain", "age_months_min");

CREATE TABLE "child_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "child_id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "achieved_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "child_milestones_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "child_milestones_child_id_milestone_id_key" UNIQUE ("child_id", "milestone_id")
);

CREATE INDEX "child_milestones_child_id_idx" ON "child_milestones"("child_id");

ALTER TABLE "child_milestones" ADD CONSTRAINT "child_milestones_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "child_milestones" ADD CONSTRAINT "child_milestones_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "milestone_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Seed: milestone_definitions (35+ rows, ages 0â€“24 months)
-- Reference style: AAP/CDC Developmental Milestones 2022; WHO motor development literature.
-- Re-seed: remove dependent rows first, then definitions.
--   delete from public.child_milestones;
--   delete from public.milestone_definitions;

delete from public.child_milestones;
delete from public.milestone_definitions;

insert into public.milestone_definitions
  (
    domain,
    age_months_min,
    age_months_max,
    age_months_avg,
    title,
    description,
    why_it_matters,
    what_to_do_if_delayed,
    red_flag,
    source,
    premature_notes,
    sort_order
  )
values
  -- ~1 month (0â€“2 mo window)
  (
    'motor_gross',
    0,
    2,
    1,
    'Brief head lifting when prone',
    'On tummy for short periods, your baby may start to lift the head a littleâ€”often briefly and with wobble.',
    'Neck strength is the foundation for rolling, sitting, and looking around safely.',
    'Offer short, supervised tummy time when your baby is awake and you are watching; if head control seems very floppy at the next visit, mention it.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    'For babies born preterm, ask your clinician whether to use corrected age for the first 1â€“2 years when thinking about timing.',
    1
  ),
  (
    'motor_fine',
    0,
    2,
    1,
    'Hands mostly fisted with tight grasp reflex',
    'Tiny fists and bringing hands toward the face can be typical early on.',
    'Early hand movements set the stage for reaching and exploring objects.',
    'If hands stay completely stiff or never move toward midline by the next check-in, bring it up with your pediatrician.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    2
  ),
  (
    'social',
    0,
    2,
    1,
    'Calms briefly when picked up',
    'Many newborns show they notice comfortâ€”quieting sometimes when held or spoken to softly.',
    'Early regulation with caregivers supports bonding and feeding.',
    'If your baby never calms with soothing or seems extremely irritable all the time, ask your clinicianâ€”there can be many benign causes.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    'Preterm infants may need more time to show calm responses; use corrected age when your clinician recommends.',
    3
  ),
  (
    'feeding',
    0,
    2,
    1,
    'Rhythmic sucking with feeds',
    'You may notice coordinated suckâ€“swallow patterns, especially as feeding becomes established.',
    'Safe feeding supports growth and hydration.',
    'If feeding is consistently painful, very short, or your baby is not gaining as expected, call your clinician rather than waiting.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    4
  ),

  -- ~2 months (1â€“3 mo window)
  (
    'motor_gross',
    1,
    3,
    2,
    'Smoother head control in supported sitting',
    'When you hold your baby upright with support, the head may bob less than in the first weeks.',
    'Head control helps safe handling and visual exploration.',
    'If the head always falls back with no improvement over several weeks, mention it at the visit.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    5
  ),
  (
    'social',
    0,
    3,
    2,
    'Social smile to people',
    'Around this window, many babies begin smiling back during face-to-face playâ€”not just gas-related mouth movements.',
    'Social smiling is an early back-and-forth â€œconversationâ€ that builds connection.',
    'Keep doing face-to-face time; if there is still no social smiling by 3 months, schedule a pediatric visit to review development and vision.',
    true,
    'AAP/CDC Developmental Milestones 2022',
    null,
    6
  ),
  (
    'language',
    0,
    3,
    2,
    'Coos and quiet vowel sounds',
    'You may hear soft â€œahâ€ or â€œoohâ€ sounds, especially during calm, engaged moments.',
    'Early sounds are practice for later babbling and words.',
    'If vocal play never appears by the later part of this window, ask your clinicianâ€”early supports can help.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    7
  ),
  (
    'cognitive',
    0,
    2,
    1,
    'Startle to sudden loud sounds',
    'A quick blink or startle to a sudden noise is a common protective reflex early on.',
    'Noticing sudden sounds supports safety and later listening skills.',
    'If there is no reaction to loud sounds near the ear by 2 months, tell your pediatricianâ€”hearing should be checked.',
    true,
    'AAP/CDC Developmental Milestones 2022',
    null,
    8
  ),

  -- ~4 months (3â€“5 mo window)
  (
    'motor_gross',
    3,
    5,
    4,
    'Pushes up on forearms when on tummy',
    'Tummy time may show stronger arms and a more lifted chest.',
    'This strength supports rolling and later sitting.',
    'If your baby hates tummy time, try shorter, frequent sessions; ask your clinician if lifting never improves.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    9
  ),
  (
    'motor_fine',
    3,
    5,
    4,
    'Hands open more and reach toward objects',
    'Batting or reaching toward a toy can appear, even if grasp is still clumsy.',
    'Reaching connects vision, touch, and problem-solving.',
    'Offer safe toys within reach; if there is no reaching interest by the upper end of the window, discuss with your clinician.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    10
  ),
  (
    'social',
    3,
    5,
    4,
    'Enjoys people and may laugh out loud',
    'Giggles during play and clear enjoyment of interaction often show up.',
    'Shared joy strengthens attachment and communication.',
    'If your baby seems unusually uninterested in faces or sounds across settings, bring it upâ€”often it is temperament, but it is worth reviewing.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    11
  ),
  (
    'sleep',
    3,
    6,
    4,
    'Longer night stretches may begin (variable)',
    'Some families notice slightly longer sleep periods, but wide variation is normalâ€”especially if feeding often.',
    'Rest supports growth; realistic expectations reduce parent burnout.',
    'If sleep is unsafe (only inclined surfaces) or you are worried about breathing, seek medical advice right away.',
    false,
    'AAP safe sleep guidance; healthychildren.org',
    null,
    12
  ),

  -- ~6 months (5â€“7 mo window)
  (
    'motor_gross',
    5,
    7,
    6,
    'Rolls in both directions',
    'Many babies roll tummy-to-back and back-to-tummy within this periodâ€”order varies.',
    'Rolling is early mobility and builds core strength.',
    'If there is no rolling in either direction by 7 months, ask your pediatrician about motor development.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    13
  ),
  (
    'feeding',
    5,
    7,
    6,
    'Shows readiness signs for solids (when clinician says it is time)',
    'Sitting with support, interest in food, and loss of tongue thrust can appearâ€”timing follows your clinicianâ€™s plan.',
    'Starting solids is about nutrition and learning textures, not a race.',
    'If swallowing seems unsafe or there is frequent gagging beyond typical learning, ask for feeding guidance.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    14
  ),
  (
    'language',
    5,
    7,
    6,
    'Babbling with consonant sounds',
    'Sounds like â€œba-baâ€ or â€œma-maâ€ playfullyâ€”not yet true words.',
    'Babbling practices mouth movements for later speech.',
    'If there is no babbling sounds by 7 months, mention itâ€”early supports can make a big difference.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    15
  ),
  (
    'cognitive',
    5,
    7,
    6,
    'Looks for dropped objects',
    'Your baby may briefly search where something fellâ€”early object permanence.',
    'This supports memory and understanding that things exist even when out of sight.',
    'If your baby never seems to notice objects or faces, discuss with your clinician.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    16
  ),
  (
    'social',
    5,
    7,
    6,
    'Recognizes familiar people',
    'Brightening or smiling for regular caregivers is common.',
    'Attachment helps emotional security.',
    'If there is no response to familiar voices or faces by 7 months, bring it up at the visit.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    17
  ),

  -- ~9 months (8â€“10 mo window)
  (
    'motor_gross',
    8,
    10,
    9,
    'Sits without hand support',
    'Many babies sit steadily and play with toys in their hands.',
    'Sitting frees hands for learning and social play.',
    'If sitting is not emerging by 10 months, ask your pediatrician about a motor check.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    18
  ),
  (
    'motor_fine',
    8,
    10,
    9,
    'Transfers objects hand to hand',
    'Your baby may move a toy from one hand to the other to explore it.',
    'Fine motor skills support feeding and later writing.',
    'Offer safe objects; if transfer never happens by the upper window, mention it.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    19
  ),
  (
    'language',
    8,
    10,
    9,
    'Orients to name or familiar voice',
    'When you call their name or speak from nearby, your baby may turn or look toward youâ€”not every time, but often enough to notice.',
    'Responding to a familiar voice supports communication and safety.',
    'If your baby does not respond to their name or a familiar voice by 9 months, tell your pediatricianâ€”hearing and development should be reviewed.',
    true,
    'AAP/CDC Developmental Milestones 2022',
    null,
    20
  ),
  (
    'cognitive',
    8,
    10,
    9,
    'Looks for hidden objects',
    'Brief hiding games may delightâ€”your baby may search under a cloth.',
    'Early problem-solving grows through play.',
    'If play feels very one-sided or there is no interest in people/objects, discuss with your clinician.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    21
  ),
  (
    'social',
    8,
    10,
    9,
    'Stranger awareness may increase',
    'Some babies become more hesitant with new peopleâ€”often a normal social step.',
    'It shows your baby is discriminating familiar from unfamiliar.',
    'If fear is extreme in all settings or there is no social engagement at home, ask for guidance.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    22
  ),

  -- ~12 months (11â€“13 mo window)
  (
    'motor_gross',
    11,
    13,
    12,
    'Pulls to stand and cruises furniture',
    'Many babies pull up and step sideways holding onâ€”walking timing varies a lot.',
    'Cruising builds balance for independent steps.',
    'If there is no weight-bearing or pull-to-stand by 13 months, ask your pediatrician.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    23
  ),
  (
    'motor_fine',
    11,
    13,
    12,
    'Pincer grasp emerges',
    'Picking up small bits with thumb and finger tips may begin.',
    'Fine grasp supports self-feeding and dexterity.',
    'If pincer grasp is absent by late in the window, mention it at the visit.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    24
  ),
  (
    'language',
    11,
    13,
    12,
    'First meaningful words may appear',
    'A small set of words for people or things (â€œmama,â€ â€œupâ€) can emergeâ€”wide variation is normal.',
    'Words connect ideas to the world.',
    'If there are no consistent words by 16 months, schedule a developmental reviewâ€”early language support helps.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    25
  ),
  (
    'social',
    11,
    13,
    12,
    'Points to show interest',
    'Pointing to request or share (â€œlook!â€) is a big communication step.',
    'Pointing links attention with another personâ€”early social language.',
    'If there is no pointing for joint attention by 12 months, tell your pediatricianâ€”this is worth reviewing.',
    true,
    'AAP/CDC Developmental Milestones 2022',
    null,
    26
  ),
  (
    'cognitive',
    11,
    13,
    12,
    'Imitates simple gestures',
    'Waving or clapping after you may appear during play.',
    'Imitation supports learning and social connection.',
    'If imitation never emerges by the late toddler window, discuss with your clinician.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    27
  ),

  -- ~15 months (14â€“16 mo window)
  (
    'motor_gross',
    14,
    16,
    15,
    'Walks independently',
    'Many toddlers take solo stepsâ€”some earlier, some later; shoes are less important than bare feet on safe floors.',
    'Walking expands exploration and social play.',
    'If walking is not independent by 18 months, ask your pediatrician about a motor evaluation.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    28
  ),
  (
    'language',
    14,
    16,
    15,
    'Small vocabulary grows',
    'A handful of words may be used meaningfully; understanding is often ahead of speaking.',
    'Words reduce frustration and build conversation.',
    'If there are no spoken words by 16 months, schedule a visitâ€”early speech supports can help a lot.',
    true,
    'AAP/CDC Developmental Milestones 2022',
    null,
    29
  ),
  (
    'feeding',
    14,
    16,
    15,
    'More self-feeding with fingers',
    'Messy self-feeding is typical; variety improves with practice.',
    'Self-feeding supports independence and oral motor skills.',
    'If chewing or swallowing seems unsafe, ask for feeding guidance.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    30
  ),
  (
    'sleep',
    14,
    18,
    15,
    'More predictable sleep patterns (still variable)',
    'Some toddlers consolidate sleep; others wakeâ€”culture, teething, and temperament matter.',
    'Healthy sleep supports mood and growth.',
    'If you worry about breathing, injury risk in the crib, or extreme night waking, ask your clinician for safe, practical steps.',
    false,
    'AAP sleep guidance; healthychildren.org',
    null,
    31
  ),

  -- ~18 months (17â€“19 mo window)
  (
    'language',
    17,
    19,
    18,
    'Follows simple one-step directions',
    'â€œBring me your shoesâ€ may work sometimes when your toddler is paying attention.',
    'Understanding directions supports safety and learning.',
    'If understanding seems very limited compared with peers by 18â€“24 months, ask for a language screen.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    32
  ),
  (
    'social',
    17,
    19,
    18,
    'Parallel play with other children',
    'Playing nearâ€”not always withâ€”other kids is typical.',
    'Early peer exposure supports social learning.',
    'If there is no interest in people or play across many months, discuss with your pediatrician.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    33
  ),
  (
    'cognitive',
    17,
    19,
    18,
    'Uses objects correctly in pretend (simple)',
    'Feeding a doll or talking on a toy phone may appear briefly.',
    'Pretend play links ideas together.',
    'If pretend play never appears by late toddlerhood, mention itâ€”often normal, but worth a chat.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    34
  ),
  (
    'motor_fine',
    17,
    19,
    18,
    'Stacks a few blocks',
    'Tower building may be wobbly but intentional.',
    'Stacking builds hand control and planning.',
    'If stacking or manipulation seems very limited, bring it up at the visit.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    35
  ),

  -- ~24 months (22â€“26 mo window to cap at 24 mo focus)
  (
    'language',
    22,
    26,
    24,
    'Two-word phrases (â€œmore milk,â€ â€œdaddy goâ€)',
    'Short combinationsâ€”not perfect grammarâ€”show grammar is starting.',
    'Phrases reduce tantrums and build conversation.',
    'If there are no two-word phrases by 24 months, tell your pediatricianâ€”speech and language evaluation may help.',
    true,
    'AAP/CDC Developmental Milestones 2022',
    null,
    36
  ),
  (
    'motor_gross',
    22,
    26,
    24,
    'Runs with stiff legs then smoother over time',
    'Toddlers often run before they can brake wellâ€”supervision near stairs and streets matters.',
    'Running builds endurance and coordination.',
    'If running never emerges or falls are constant without improvement, ask your clinician.',
    false,
    'AAP/CDC Developmental Milestones 2022; WHO motor development',
    null,
    37
  ),
  (
    'social',
    22,
    26,
    24,
    'Shows defiance sometimes (â€œno!â€) with emerging independence',
    'Testing limits is a sign of healthy developmentâ€”not â€œbad behaviorâ€ by itself.',
    'Independence supports confidence when paired with loving limits.',
    'If tantrums are extreme all day or you worry about safety, ask for parenting support resources.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    38
  ),
  (
    'feeding',
    22,
    26,
    24,
    'Uses a spoon with mess (learning)',
    'Self-feeding improves with practice; spills are normal.',
    'Skills for family meals grow gradually.',
    'If chewing or swallowing regresses or seems unsafe, seek medical advice.',
    false,
    'AAP/CDC Developmental Milestones 2022',
    null,
    39
  );

