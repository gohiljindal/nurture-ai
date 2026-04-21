import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import WatchNextTimeline from "@/components/WatchNextTimeline";
import { useFeedback } from "@/lib/hooks";
import { getRegionalEmergencyInfo } from "@/lib/emergency-lines";
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_STYLE,
  URGENCY_CONFIG,
} from "@/lib/triage-config";
import type { CheckDetail } from "@/lib/types";

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white border border-border rounded-3xl p-5 gap-3 shadow-sm">
      <View className="flex-row items-center gap-2">
        <Text className="text-base">{icon}</Text>
        <Text className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

// ── Feedback widget ───────────────────────────────────────────────────────────

function FeedbackWidget({
  checkId,
  existing,
}: {
  checkId: string;
  existing: { helpful: boolean } | null;
}) {
  const { mutateAsync: submitFeedback, isPending } = useFeedback();
  const [submitted, setSubmitted] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(
    existing?.helpful ?? null
  );

  const handle = async (helpful: boolean) => {
    if (submitted || existing) return;
    setChoice(helpful);
    try {
      await submitFeedback({ checkId, helpful });
      setSubmitted(true);
    } catch {
      setChoice(null);
    }
  };

  const done = submitted || existing != null;

  return (
    <View className="bg-white border border-slate-100 rounded-2xl p-5 items-center gap-3 shadow-sm">
      <Text className="text-sm font-bold text-slate-900">
        Was this guidance helpful?
      </Text>

      {done ? (
        <View className="flex-row items-center gap-2">
          <Text className="text-xl">{choice ? "👍" : "👎"}</Text>
          <Text className="text-sm text-slate-500">
            Thanks for the feedback.
          </Text>
        </View>
      ) : (
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => handle(true)}
            disabled={isPending}
            className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-full px-5 py-2.5 active:opacity-70"
          >
            <Text className="text-lg">👍</Text>
            <Text className="text-sm font-semibold text-green-700">
              Helpful
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handle(false)}
            disabled={isPending}
            className="flex-row items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-5 py-2.5 active:opacity-70"
          >
            <Text className="text-lg">👎</Text>
            <Text className="text-sm font-semibold text-slate-600">
              Not helpful
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props = {
  check: CheckDetail;
  onBack: () => void;
  footer: React.ReactNode;
};

export default function CheckResultContent({ check, onBack, footer }: Props) {
  const u = URGENCY_CONFIG[check.urgency];
  const t = check.triage;
  const regional = getRegionalEmergencyInfo(check.province);
  const [showClinicalReasoning, setShowClinicalReasoning] = useState(false);
  const showEmergencyLines =
    check.urgency === "emergency" || check.urgency === "urgent_doctor";
  const showReliefFlow = check.urgency === "emergency" || check.urgency === "urgent_doctor";

  return (
    <ScrollView
      contentContainerClassName="pb-14"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Urgency hero ── */}
      <View className={`${u.heroBg} px-5 pt-6 pb-8`}>
        <Pressable
          onPress={onBack}
          className="active:opacity-60 self-start mb-4"
        >
          <Text className="text-sm font-semibold text-white opacity-80">
            ‹ Back
          </Text>
        </Pressable>

        <View className="flex-row items-start gap-4">
          <View className="bg-white/20 w-14 h-14 rounded-2xl items-center justify-center">
            <Text className="text-3xl">{u.icon}</Text>
          </View>
          <View className="flex-1">
            <Text className={`text-xl font-extrabold ${u.labelColor}`}>
              {u.actionLabel}
            </Text>
            <Text className={`text-sm mt-1 ${u.subColor}`}>{u.sub}</Text>
          </View>
        </View>
      </View>

      {/* ── Content ── */}
      <View className="px-5 gap-4 -mt-4">
        {/* Summary */}
        <SectionCard title="What we think" icon="🩺">
          <Text className="text-sm text-ink-700 leading-relaxed">
            {t.summary}
          </Text>
        </SectionCard>

        {t.decision_diff ? (
          <View className="bg-violet-50 border border-violet-200 rounded-2xl px-4 py-3 gap-2">
            <Text className="text-xs font-bold text-violet-800 uppercase tracking-wide">
              What changed after follow-up
            </Text>
            <Text className="text-sm text-violet-900 leading-relaxed">
              {t.decision_diff.summary}
            </Text>
          </View>
        ) : null}

        {/* Recommended action */}
        <SectionCard title="What to do" icon="✅">
          <Text className="text-sm text-ink-700 leading-relaxed">
            {t.recommended_action}
          </Text>
        </SectionCard>

        {showReliefFlow ? (
          <View className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 gap-2">
            <Text className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
              Parent calm plan
            </Text>
            <Text className="text-sm text-indigo-900 leading-relaxed">
              Pause, take one slow breath, and do the next safest action now. You are not alone.
            </Text>
            <Text className="text-xs text-indigo-800">1) Call emergency or nurse line</Text>
            <Text className="text-xs text-indigo-800">2) Keep your child close and observed</Text>
            <Text className="text-xs text-indigo-800">3) Bring meds list and symptom timeline</Text>
          </View>
        ) : null}

        {typeof t.urgency_score === "number" && (
          <View className="bg-slate-50 border border-border rounded-2xl px-4 py-3">
            <Text className="text-xs font-semibold text-ink-500 uppercase">
              Urgency score
            </Text>
            <Text className="text-lg font-extrabold text-ink-900 mt-1">
              {t.urgency_score}
            </Text>
          </View>
        )}

        {t.immediate_actions && t.immediate_actions.length > 0 && (
          <SectionCard title="Do now" icon="⚡">
            {t.immediate_actions.map((line, i) => (
              <Text key={i} className="text-sm text-ink-700 leading-relaxed">
                • {line}
              </Text>
            ))}
          </SectionCard>
        )}

        {t.watch_next && t.watch_next.length > 0 && (
          <SectionCard title="Watch next" icon="👀">
            <WatchNextTimeline items={t.watch_next} />
          </SectionCard>
        )}

        {t.decision_factors && t.decision_factors.length > 0 && (
          <SectionCard title="What influenced this" icon="📌">
            {t.decision_factors.map((line, i) => (
              <Text key={i} className="text-sm text-ink-700 leading-relaxed">
                • {line}
              </Text>
            ))}
          </SectionCard>
        )}

        {showEmergencyLines ? (
          <>
            <View className="flex-row flex-wrap gap-2 justify-center">
              <Pressable
                onPress={() =>
                  Linking.openURL(`tel:${regional.emergencyTel}`)
                }
                className="bg-red-600 rounded-full px-4 py-2.5 active:opacity-80"
              >
                <Text className="text-xs font-bold text-white">
                  Call {regional.emergencyTel} (emergency)
                </Text>
              </Pressable>
              {regional.healthLineTel ? (
                <Pressable
                  onPress={() => {
                    const tel = regional.healthLineTel!;
                    Linking.openURL(`tel:${tel.replace(/\D/g, "")}`);
                  }}
                  className="bg-slate-700 rounded-full px-4 py-2.5 active:opacity-80"
                >
                  <Text className="text-xs font-bold text-white">
                    {regional.healthLineLabel}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          <Text className="text-[10px] text-ink-500 text-center -mt-1 px-2">
              In an emergency call {regional.emergencyTel}. Nurse lines vary by
              province — confirm the right number for your area if unsure.
            </Text>
          </>
        ) : (
          <Text className="text-[10px] text-ink-500 text-center px-2">
            For emergencies call {regional.emergencyTel}. Non-urgent advice:
            {regional.healthLineTel
              ? ` ${regional.healthLineLabel} where available.`
              : " use your provincial health line."}
          </Text>
        )}

        {/* Red flags */}
        {t.red_flags.length > 0 && (
          <View
            className={`${u.cardBg} border ${u.cardBorder} rounded-2xl p-5 gap-3`}
          >
            <View className="flex-row items-center gap-2">
              <Text className="text-base">🚩</Text>
              <Text
                className={`text-sm font-bold uppercase tracking-wide ${u.sectionText}`}
              >
                Watch for these signs
              </Text>
            </View>
            <Text className="text-xs text-ink-700 leading-relaxed">
              Go back or seek immediate care if any of these appear:
            </Text>
            {t.red_flags.map((flag, i) => (
              <View key={i} className="flex-row gap-2 items-start">
                <View
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${u.badgeBg}`}
                />
                <Text className="flex-1 text-sm text-ink-700 leading-snug">
                  {flag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Reasoning — AI only (task 49 two-layer explanation) */}
        {t.decision_source === "ai" && t.reasoning ? (
          <SectionCard title="How we decided" icon="🧠">
            <Text className="text-sm text-ink-700 leading-relaxed">
              {t.summary}
            </Text>
            <Pressable
              onPress={() => setShowClinicalReasoning((v) => !v)}
              className="self-start mt-1 bg-slate-100 rounded-full px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-ink-700">
                {showClinicalReasoning ? "Hide details" : "More detail"}
              </Text>
            </Pressable>
            {showClinicalReasoning ? (
              <Text className="text-xs text-ink-500 leading-relaxed">
                {t.reasoning}
              </Text>
            ) : null}
          </SectionCard>
        ) : null}

        {/* Safety rule — confidence + reason always visible (task 24) */}
        {t.decision_source === "safety_rule" ? (
          <View className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex-row gap-3 items-start">
            <Text className="text-base mt-0.5">🔒</Text>
            <View className="flex-1 gap-1">
              <Text className="text-xs font-bold text-red-700 uppercase tracking-wide">
                Safety rule applied · {CONFIDENCE_LABEL[t.confidence]}
              </Text>
              <Text className="text-xs text-red-700 leading-relaxed">
                {t.rule_reason?.trim() ||
                  "This result was escalated by a built-in safety rule based on age and reported symptoms."}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Badges */}
        <View className="flex-row gap-2 flex-wrap">
          <View
            className={`rounded-full px-3 py-1.5 ${CONFIDENCE_STYLE[t.confidence]}`}
          >
            <Text className="text-xs font-semibold">
              {CONFIDENCE_LABEL[t.confidence]}
            </Text>
          </View>
          <View className="bg-slate-100 rounded-full px-3 py-1.5">
            <Text className="text-xs font-semibold text-ink-500">
              {t.decision_source === "safety_rule"
                ? "Safety rule"
                : "AI analysis"}
            </Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View className="bg-slate-50 border border-border rounded-2xl px-4 py-3">
          <Text className="text-xs text-ink-500 leading-relaxed text-center">
            {t.disclaimer}
          </Text>
        </View>

        {/* Feedback */}
        <FeedbackWidget checkId={check.id} existing={check.feedback} />

        {/* Footer — screen-specific buttons */}
        {footer}
      </View>
    </ScrollView>
  );
}
