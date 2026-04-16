import { StatusBar } from "expo-status-bar";
import {
  PlusJakartaSans_400Regular as Poppins_400Regular,
  PlusJakartaSans_500Medium as Poppins_500Medium,
  PlusJakartaSans_600SemiBold as Poppins_600SemiBold,
  PlusJakartaSans_700Bold as Poppins_700Bold,
  PlusJakartaSans_800ExtraBold as Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "./lib/api";
import { supabase } from "./lib/supabase";
import {
  CHILD_PHOTOS_BUCKET,
  formatChildPhotoUploadErrorMessage,
} from "../../lib/child-photo-upload-error";

type SessionState = "loading" | "signed_out" | "signed_in";
type ChildRow = {
  id: string;
  name: string;
  photo_url?: string | null;
  date_of_birth: string;
  sex_at_birth: string | null;
  is_premature: boolean;
  gestational_age_weeks: number | null;
  province?: string | null;
};
type SymptomResult = {
  urgency: "emergency" | "urgent_doctor" | "monitor_home";
  summary: string;
  recommended_action: string;
  red_flags: string[];
  disclaimer: string;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  decision_source: "ai" | "safety_rule";
  rule_reason: string | null;
  checkId?: string;
};
type HistoryCheckRow = {
  id: string;
  created_at: string;
  urgency: "emergency" | "urgent_doctor" | "monitor_home";
  input_text: string;
  child_id: string;
  childName: string;
  triage: SymptomResult;
};
type HistoryCheckDetail = {
  id: string;
  created_at: string;
  input_text: string;
  urgency: "emergency" | "urgent_doctor" | "monitor_home";
  triage: SymptomResult;
  feedback: { helpful: boolean } | null;
};
type DashboardView =
  | "home"
  | "add-child"
  | "child-detail"
  | "symptom-input"
  | "followup-questions"
  | "symptom-result"
  | "history-list"
  | "history-detail";

/** Neumorphic soft UI: #f8fafc canvas, violet→blue gradient CTAs (#7c3aed → #3b82f6), soft shadows. */
const planCards = [
  { id: "play", title: "Time to Play\nand Learn", color: "#ede9fe", icon: "🧸" },
  { id: "read", title: "Let's Read\nTogether", color: "#dbeafe", icon: "📚" },
  { id: "meals", title: "Make Meals\nToday", color: "#ecfdf5", icon: "🥣" },
];

const GRADIENT = { start: "#7c3aed", end: "#3b82f6" } as const;

const THEME = {
  page: "#f8fafc",
  card: "#ffffff",
  cardSoft: "#ffffff",
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  borderSoft: "#e2e8f0",
  cta: "#6366f1",
  ctaDark: "#4f46e5",
  mint: "#a78bfa",
  mintStrong: "#7c3aed",
  pink: "#6366f1",
  pinkDark: "#4f46e5",
  peach: "#ddd6fe",
  sage: "#86efac",
  sageLight: "#ecfdf5",
  blueMuted: "#eff6ff",
};

function PrimaryButton({
  children,
  disabled,
  onPress,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        void onPress();
      }}
      style={({ pressed }) => [
        styles.primaryButtonOuter,
        disabled && { opacity: 0.55 },
        pressed && !disabled && { opacity: 0.92 },
      ]}
    >
      <LinearGradient
        colors={[GRADIENT.start, GRADIENT.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryButtonGradient}
      >
        {children}
      </LinearGradient>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable>
        <Text style={styles.seeAll}>See All  ›</Text>
      </Pressable>
    </View>
  );
}

function SignedInDashboard({
  busy,
  message,
  childList,
  childrenLoading,
  onOpenChild,
  onOpenAddChild,
  onRefreshChildren,
  onProbeApi,
  onOpenHistory,
  onSignOut,
}: {
  busy: boolean;
  message: string;
  childList: ChildRow[];
  childrenLoading: boolean;
  onOpenChild: (child: ChildRow) => void;
  onOpenAddChild: () => void;
  onRefreshChildren: () => Promise<void>;
  onProbeApi: () => Promise<void>;
  onOpenHistory: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>M</Text>
          </View>
          <View>
            <Text style={styles.dateText}>Thu, Jun 26</Text>
            <Text style={styles.nameText}>Mariam</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <Text style={styles.headerIcon}>⌕</Text>
          <Text style={styles.headerIcon}>🔔</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>Your Parenting Journey,{"\n"}Step by Step</Text>
        <Text style={styles.heroSubtitle}>
          Bonding starts with small moments. Try today&apos;s tip when you get a quiet minute.
        </Text>
      </View>

      <SectionHeader title="Today's Plan" />
      <View style={styles.planRow}>
        {planCards.map((card) => (
          <View key={card.id} style={[styles.planCard, { backgroundColor: card.color }]}>
            <View style={styles.planIconWrap}>
              <Text style={styles.planIcon}>{card.icon}</Text>
            </View>
            <Text style={styles.planCardTitle}>{card.title}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Your Children" />
      <View style={styles.childrenCard}>
        {childrenLoading ? (
          <Text style={styles.childrenMessage}>Loading children...</Text>
        ) : childList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No child profiles yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first child next so symptom checks and age-based guidance can be personalized.
            </Text>
          </View>
        ) : (
          childList.map((child) => (
            <Pressable key={child.id} style={styles.childRow} onPress={() => onOpenChild(child)}>
              <View style={styles.childAvatar}>
                {child.photo_url ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image source={{ uri: child.photo_url }} style={styles.childAvatarImage} />
                  </>
                ) : (
                  <Text style={styles.childAvatarText}>{child.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childMeta}>
                  Born {child.date_of_birth}
                  {child.sex_at_birth ? ` • ${child.sex_at_birth}` : ""}
                </Text>
              </View>
              <Text style={styles.childChevron}>›</Text>
            </Pressable>
          ))
        )}
        <Pressable style={styles.secondaryAction} disabled={busy} onPress={onRefreshChildren}>
          <Text style={styles.secondaryActionText}>🔄 Refresh children</Text>
        </Pressable>
        <PrimaryButton disabled={busy} onPress={onOpenAddChild}>
          <Text style={styles.primaryActionText}>➕ Add child</Text>
        </PrimaryButton>
      </View>

      <View style={styles.apiCard}>
        <Text style={styles.apiTitle}>Backend Connection</Text>
        <Text style={styles.apiMessage}>{message}</Text>
        <PrimaryButton disabled={busy} onPress={onProbeApi}>
          <Text style={styles.primaryActionText}>{busy ? "Working..." : "🔐 Sync and probe API"}</Text>
        </PrimaryButton>
      </View>

      <View style={styles.bottomNav}>
        <Text style={[styles.bottomNavItem, styles.bottomNavItemActive]}>🏠 Home</Text>
        <Text style={styles.bottomNavItem}>🗂️ Plan</Text>
        <Pressable onPress={() => void onOpenHistory()}>
          <Text style={styles.bottomNavItem}>📈 Track</Text>
        </Pressable>
        <Pressable onPress={onSignOut}>
          <Text style={styles.bottomNavItem}>👤 Profile</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function AddChildScreen({
  busy,
  formError,
  childName,
  childPhotoUrl,
  dateOfBirth,
  sexAtBirth,
  isPremature,
  gestationalAgeWeeks,
  onChangeChildName,
  onChangeChildPhotoUrl,
  onChangeDateOfBirth,
  onChangeSexAtBirth,
  onPickChildPhoto,
  onClearChildPhoto,
  onChangeGestationalAgeWeeks,
  onTogglePremature,
  onSubmit,
  onBack,
}: {
  busy: boolean;
  formError: string;
  childName: string;
  childPhotoUrl: string;
  dateOfBirth: string;
  sexAtBirth: string;
  isPremature: boolean;
  gestationalAgeWeeks: string;
  onChangeChildName: (value: string) => void;
  onChangeChildPhotoUrl: (value: string) => void;
  onChangeDateOfBirth: (value: string) => void;
  onChangeSexAtBirth: (value: string) => void;
  onPickChildPhoto: () => Promise<void>;
  onClearChildPhoto: () => void;
  onChangeGestationalAgeWeeks: (value: string) => void;
  onTogglePremature: () => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBack}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>Add Child</Text>
        <Text style={styles.heroSubtitle}>
          This creates the child profile used for symptom triage, age guidance, and vaccine preview.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>Child name</Text>
        <TextInput
          value={childName}
          onChangeText={onChangeChildName}
          placeholder="e.g. Mariam"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Child photo (optional)</Text>
        {childPhotoUrl ? (
          <View style={styles.photoPreviewWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image source={{ uri: childPhotoUrl }} style={styles.photoPreviewImage} />
          </View>
        ) : null}
        <View style={styles.photoPickerRow}>
          <Pressable style={styles.secondaryAction} disabled={busy} onPress={onPickChildPhoto}>
            <Text style={styles.secondaryActionText}>
              {busy ? "Uploading..." : "📷 Upload from gallery"}
            </Text>
          </Pressable>
          {childPhotoUrl ? (
            <Pressable style={styles.inlineAction} disabled={busy} onPress={onClearChildPhoto}>
              <Text style={styles.inlineActionText}>Remove photo</Text>
            </Pressable>
          ) : null}
        </View>
        <TextInput
          value={childPhotoUrl}
          onChangeText={onChangeChildPhotoUrl}
          placeholder="or paste image URL"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Date of birth</Text>
        <TextInput
          value={dateOfBirth}
          onChangeText={onChangeDateOfBirth}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Sex</Text>
        <TextInput
          value={sexAtBirth}
          onChangeText={onChangeSexAtBirth}
          placeholder="male / female / prefer not to say"
          style={styles.input}
          autoCapitalize="none"
        />

        <Pressable style={styles.toggleRow} onPress={onTogglePremature}>
          <View style={[styles.toggleBox, isPremature && styles.toggleBoxActive]}>
            <Text style={styles.toggleBoxText}>{isPremature ? "✓" : ""}</Text>
          </View>
          <Text style={styles.toggleLabel}>Baby was premature</Text>
        </Pressable>

        {isPremature ? (
          <>
            <Text style={styles.fieldLabel}>Gestational age (weeks)</Text>
            <TextInput
              value={gestationalAgeWeeks}
              onChangeText={onChangeGestationalAgeWeeks}
              placeholder="20-42"
              keyboardType="number-pad"
              style={styles.input}
            />
          </>
        ) : null}

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <PrimaryButton disabled={busy} onPress={onSubmit}>
          <Text style={styles.primaryActionText}>{busy ? "Saving..." : "💾 Save child"}</Text>
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

function ChildDetailScreen({
  child,
  busy,
  childActionError,
  confirmingRemove,
  onPickPhoto,
  onRemovePhoto,
  onOpenSymptomInput,
  onOpenHistory,
  onAskRemoveChild,
  onCancelRemoveChild,
  onRemoveChild,
  onBack,
}: {
  child: ChildRow;
  busy: boolean;
  childActionError: string;
  confirmingRemove: boolean;
  onPickPhoto: () => Promise<void>;
  onRemovePhoto: () => Promise<void>;
  onOpenSymptomInput: () => void;
  onOpenHistory: () => void;
  onAskRemoveChild: () => void;
  onCancelRemoveChild: () => void;
  onRemoveChild: () => Promise<void>;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBack}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        {child.photo_url ? (
          <View style={styles.detailHeroAvatarWrap}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image source={{ uri: child.photo_url }} style={styles.detailHeroAvatarImage} />
          </View>
        ) : null}
        <Text style={styles.heroTitle}>{child.name}</Text>
        <Text style={styles.heroSubtitle}>
          Child profile, symptom triage entry point, vaccine preview, and age-based guidance live
          here.
        </Text>
      </View>

      <View style={styles.childrenCard}>
        <Text style={styles.apiTitle}>Profile</Text>
        <View style={styles.detailPhotoSection}>
          {child.photo_url ? (
            <View style={styles.photoPreviewWrap}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image source={{ uri: child.photo_url }} style={styles.photoPreviewImage} />
            </View>
          ) : (
            <View style={[styles.photoPreviewWrap, styles.detailAvatarFallback]}>
              <Text style={styles.detailAvatarFallbackText}>👶</Text>
            </View>
          )}
          <View style={styles.photoPickerRow}>
            <Pressable style={styles.secondaryAction} disabled={busy} onPress={onPickPhoto}>
              <Text style={styles.secondaryActionText}>{busy ? "Saving..." : "📷 Change photo"}</Text>
            </Pressable>
            {child.photo_url ? (
              <Pressable style={styles.inlineAction} disabled={busy} onPress={onRemovePhoto}>
                <Text style={styles.inlineActionText}>Remove photo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Date of birth</Text>
            <Text style={styles.detailValue}>{child.date_of_birth}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sex</Text>
            <Text style={styles.detailValue}>{child.sex_at_birth || "Prefer not to say"}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Premature</Text>
            <Text style={styles.detailValue}>{child.is_premature ? "Yes" : "No"}</Text>
          </View>

          {child.is_premature ? (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Gestational age</Text>
              <Text style={styles.detailValue}>
                {child.gestational_age_weeks ? `${child.gestational_age_weeks} weeks` : "Not set"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.apiCard}>
        <Text style={styles.apiTitle}>What you can do next</Text>
        <Text style={styles.apiMessage}>This child detail shell stays focused on core MVP actions.</Text>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepTitle}>Symptom check</Text>
          <Text style={styles.nextStepText}>
            Start a symptom triage flow for {child.name} with age-aware safety rules.
          </Text>
          <Pressable style={styles.inlineAction} onPress={onOpenSymptomInput}>
            <Text style={styles.inlineActionText}>🩺 Start symptom check</Text>
          </Pressable>
        </View>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepTitle}>What&apos;s normal now</Text>
          <Text style={styles.nextStepText}>
            Show short age-based guidance cards for this child&apos;s current stage.
          </Text>
        </View>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepTitle}>Vaccine preview</Text>
          <Text style={styles.nextStepText}>
            Show a simple preview of what vaccine info matters next for this child.
          </Text>
        </View>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepTitle}>History</Text>
          <Text style={styles.nextStepText}>
            Reopen saved symptom checks to review urgency, actions, and red flags.
          </Text>
          <Pressable style={styles.inlineAction} onPress={onOpenHistory}>
            <Text style={styles.inlineActionText}>🕘 Open history</Text>
          </Pressable>
        </View>

        <View style={styles.nextStepCard}>
          <Text style={styles.nextStepTitle}>Profile management</Text>
          <Text style={styles.nextStepText}>
            Remove this child profile if you added it by mistake or no longer want it in the app.
          </Text>
          {childActionError ? <Text style={styles.formError}>{childActionError}</Text> : null}
          {!confirmingRemove ? (
            <Pressable style={[styles.inlineAction, styles.inlineDangerAction]} onPress={onAskRemoveChild}>
              <Text style={[styles.inlineActionText, styles.inlineDangerActionText]}>
                🗑️ Remove child profile
              </Text>
            </Pressable>
          ) : (
            <View style={styles.confirmRow}>
              <Pressable
                style={[styles.inlineAction, styles.inlineDangerAction]}
                disabled={busy}
                onPress={onRemoveChild}
              >
                <Text style={[styles.inlineActionText, styles.inlineDangerActionText]}>
                  {busy ? "Removing..." : "✅ Confirm remove"}
                </Text>
              </Pressable>
              <Pressable style={styles.inlineAction} disabled={busy} onPress={onCancelRemoveChild}>
                <Text style={styles.inlineActionText}>Cancel</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function SymptomInputScreen({
  child,
  busy,
  symptomText,
  disclaimerAccepted,
  symptomError,
  onChangeSymptomText,
  onToggleDisclaimer,
  onSubmit,
  onBack,
}: {
  child: ChildRow;
  busy: boolean;
  symptomText: string;
  disclaimerAccepted: boolean;
  symptomError: string;
  onChangeSymptomText: (value: string) => void;
  onToggleDisclaimer: () => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBack}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>Symptom Check for {child.name}</Text>
        <Text style={styles.heroSubtitle}>
          Describe what is happening right now in plain language. Keep it focused on this moment.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>What are you seeing?</Text>
        <TextInput
          value={symptomText}
          onChangeText={onChangeSymptomText}
          placeholder="Example: Fever since this afternoon, not feeding well, more sleepy than usual."
          style={[styles.input, styles.textArea]}
          multiline
          textAlignVertical="top"
        />

        <Pressable style={styles.toggleRow} onPress={onToggleDisclaimer}>
          <View style={[styles.toggleBox, disclaimerAccepted && styles.toggleBoxActive]}>
            <Text style={styles.toggleBoxText}>{disclaimerAccepted ? "✓" : ""}</Text>
          </View>
          <Text style={styles.toggleLabel}>
            I understand this is guidance, not a diagnosis or a substitute for urgent medical care.
          </Text>
        </Pressable>

        {symptomError ? <Text style={styles.formError}>{symptomError}</Text> : null}

        <PrimaryButton disabled={busy} onPress={onSubmit}>
          <Text style={styles.primaryActionText}>
            {busy ? "Checking..." : "➡️ Continue to follow-up questions"}
          </Text>
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

function FollowupQuestionsScreen({
  child,
  busy,
  questions,
  answers,
  followupError,
  onChangeAnswer,
  onSubmit,
  onBack,
}: {
  child: ChildRow;
  busy: boolean;
  questions: string[];
  answers: string[];
  followupError: string;
  onChangeAnswer: (index: number, value: string) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBack}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>A few follow-up questions for {child.name}</Text>
        <Text style={styles.heroSubtitle}>
          Answer these clearly so Nurture AI can decide the safest next step.
        </Text>
      </View>

      <View style={styles.formCard}>
        {questions.map((question, index) => (
          <View key={`${question}-${index}`} style={styles.questionBlock}>
            <Text style={styles.fieldLabel}>{question}</Text>
            <TextInput
              value={answers[index] ?? ""}
              onChangeText={(value) => onChangeAnswer(index, value)}
              placeholder="Type your answer"
              style={[styles.input, styles.followupInput]}
              multiline
              textAlignVertical="top"
            />
          </View>
        ))}

        {followupError ? <Text style={styles.formError}>{followupError}</Text> : null}

        <PrimaryButton disabled={busy} onPress={onSubmit}>
          <Text style={styles.primaryActionText}>
            {busy ? "Saving..." : "➡️ Continue to result"}
          </Text>
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

function ResultBadge({
  label,
  tone,
}: {
  label: string;
  tone: "emergency" | "urgent_doctor" | "monitor_home";
}) {
  return (
    <View
      style={[
        styles.resultBadge,
        tone === "emergency"
          ? styles.resultBadgeEmergency
          : tone === "urgent_doctor"
            ? styles.resultBadgeUrgent
            : styles.resultBadgeMonitor,
      ]}
    >
      <Text
        style={[
          styles.resultBadgeText,
          tone === "emergency"
            ? styles.resultBadgeTextEmergency
            : tone === "urgent_doctor"
              ? styles.resultBadgeTextUrgent
              : styles.resultBadgeTextMonitor,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SymptomResultScreen({
  child,
  result,
  onStartAnotherCheck,
  onBackToChild,
}: {
  child: ChildRow;
  result: SymptomResult;
  onStartAnotherCheck: () => void;
  onBackToChild: () => void;
}) {
  const urgencyLabel =
    result.urgency === "emergency"
      ? "Emergency care now"
      : result.urgency === "urgent_doctor"
        ? "Urgent medical assessment"
        : "Monitor at home";

  const confidenceLabel =
    result.confidence === "high"
      ? "High confidence"
      : result.confidence === "medium"
        ? "Medium confidence"
        : "Low confidence";

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBackToChild}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>Guidance for {child.name}</Text>
        <Text style={styles.heroSubtitle}>
          This is safety-first decision support based on what you shared, not a diagnosis.
        </Text>
      </View>

      <View style={styles.resultCard}>
        <View style={styles.resultBadgeRow}>
          <ResultBadge label={urgencyLabel} tone={result.urgency} />
          <View style={styles.resultConfidenceBadge}>
            <Text style={styles.resultConfidenceText}>{confidenceLabel}</Text>
          </View>
        </View>

        <Text style={styles.resultSectionTitle}>Summary</Text>
        <Text style={styles.resultBody}>{result.summary}</Text>

        <Text style={styles.resultSectionTitle}>Recommended action</Text>
        <Text style={styles.resultAction}>{result.recommended_action}</Text>

        <Text style={styles.resultSectionTitle}>Why this guidance</Text>
        <Text style={styles.resultBody}>{result.reasoning}</Text>

        {result.red_flags.length > 0 ? (
          <>
            <Text style={styles.resultSectionTitle}>Watch for these red flags</Text>
            <View style={styles.redFlagList}>
              {result.red_flags.map((flag, index) => (
                <View key={`${flag}-${index}`} style={styles.redFlagRow}>
                  <Text style={styles.redFlagBullet}>•</Text>
                  <Text style={styles.redFlagText}>{flag}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.resultMetaCard}>
          <Text style={styles.resultMetaText}>{result.disclaimer}</Text>
          <Text style={styles.resultMetaText}>
            Decision source: {result.decision_source === "safety_rule" ? "Safety rule" : "AI review"}
          </Text>
          {result.rule_reason ? (
            <Text style={styles.resultMetaText}>Safety reason: {result.rule_reason}</Text>
          ) : null}
        </View>

        <PrimaryButton onPress={onStartAnotherCheck}>
          <Text style={styles.primaryActionText}>🩺 Start another symptom check</Text>
        </PrimaryButton>
      </View>
    </ScrollView>
  );
}

function HistoryListScreen({
  busy,
  historyLoading,
  historyError,
  historyRows,
  onRefresh,
  onOpenCheck,
  onBack,
}: {
  busy: boolean;
  historyLoading: boolean;
  historyError: string;
  historyRows: HistoryCheckRow[];
  onRefresh: () => Promise<void>;
  onOpenCheck: (checkId: string) => Promise<void>;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBack}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>Symptom check history</Text>
        <Text style={styles.heroSubtitle}>
          Review saved checks and reopen details when you need to re-check past guidance.
        </Text>
      </View>

      <View style={styles.childrenCard}>
        {historyLoading ? <Text style={styles.childrenMessage}>Loading history...</Text> : null}
        {!historyLoading && historyError ? <Text style={styles.formError}>{historyError}</Text> : null}
        {!historyLoading && !historyError && historyRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No saved checks yet</Text>
            <Text style={styles.emptyStateText}>
              Your completed symptom checks will appear here for quick reference.
            </Text>
          </View>
        ) : null}

        {!historyLoading && !historyError
          ? historyRows.map((check) => (
              <Pressable
                key={check.id}
                style={styles.historyRow}
                onPress={() => void onOpenCheck(check.id)}
              >
                <View style={styles.historyRowHeader}>
                  <Text style={styles.childName}>{check.childName}</Text>
                  <ResultBadge label={formatUrgencyLabel(check.urgency)} tone={check.urgency} />
                </View>
                <Text style={styles.childMeta}>{new Date(check.created_at).toLocaleString()}</Text>
                <Text numberOfLines={2} style={styles.historyPreview}>
                  {check.input_text}
                </Text>
              </Pressable>
            ))
          : null}

        <Pressable style={styles.secondaryAction} disabled={busy} onPress={onRefresh}>
          <Text style={styles.secondaryActionText}>🔄 Refresh history</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryDetailScreen({
  check,
  loading,
  error,
  onBack,
}: {
  check: HistoryCheckDetail | null;
  loading: boolean;
  error: string;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Pressable onPress={onBack}>
          <Text style={styles.seeAll}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroBlobPink} />
        <View style={styles.heroBlobYellow} />
        <Text style={styles.heroTitle}>Saved check detail</Text>
        <Text style={styles.heroSubtitle}>
          Revisit this result if symptoms change or you need context before seeking care.
        </Text>
      </View>

      <View style={styles.resultCard}>
        {loading ? <Text style={styles.childrenMessage}>Loading check detail...</Text> : null}
        {!loading && error ? <Text style={styles.formError}>{error}</Text> : null}
        {!loading && !error && !check ? (
          <Text style={styles.childrenMessage}>No check found.</Text>
        ) : null}

        {!loading && !error && check ? (
          <>
            <View style={styles.resultBadgeRow}>
              <ResultBadge label={formatUrgencyLabel(check.urgency)} tone={check.urgency} />
              <View style={styles.resultConfidenceBadge}>
                <Text style={styles.resultConfidenceText}>
                  {formatConfidenceLabel(check.triage.confidence)}
                </Text>
              </View>
            </View>

            <Text style={styles.childMeta}>{new Date(check.created_at).toLocaleString()}</Text>

            <Text style={styles.resultSectionTitle}>Your input</Text>
            <Text style={styles.resultBody}>{check.input_text}</Text>

            <Text style={styles.resultSectionTitle}>Summary</Text>
            <Text style={styles.resultBody}>{check.triage.summary}</Text>

            <Text style={styles.resultSectionTitle}>Recommended action</Text>
            <Text style={styles.resultAction}>{check.triage.recommended_action}</Text>

            <Text style={styles.resultSectionTitle}>Why this guidance</Text>
            <Text style={styles.resultBody}>{check.triage.reasoning}</Text>

            {check.triage.red_flags.length > 0 ? (
              <>
                <Text style={styles.resultSectionTitle}>Watch for these red flags</Text>
                <View style={styles.redFlagList}>
                  {check.triage.red_flags.map((flag, index) => (
                    <View key={`${flag}-${index}`} style={styles.redFlagRow}>
                      <Text style={styles.redFlagBullet}>•</Text>
                      <Text style={styles.redFlagText}>{flag}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

function formatUrgencyLabel(urgency: "emergency" | "urgent_doctor" | "monitor_home"): string {
  if (urgency === "emergency") return "Emergency care now";
  if (urgency === "urgent_doctor") return "Urgent medical assessment";
  return "Monitor at home";
}

function formatConfidenceLabel(confidence: "low" | "medium" | "high"): string {
  if (confidence === "high") return "High confidence";
  if (confidence === "medium") return "Medium confidence";
  return "Low confidence";
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Checking session...");
  const [busy, setBusy] = useState(false);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [view, setView] = useState<DashboardView>("home");
  const [selectedChild, setSelectedChild] = useState<ChildRow | null>(null);
  const [childName, setChildName] = useState("");
  const [childPhotoUrl, setChildPhotoUrl] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sexAtBirth, setSexAtBirth] = useState("");
  const [isPremature, setIsPremature] = useState(false);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState("");
  const [formError, setFormError] = useState("");
  const [childActionError, setChildActionError] = useState("");
  const [confirmingRemoveChild, setConfirmingRemoveChild] = useState(false);
  const [symptomText, setSymptomText] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [symptomError, setSymptomError] = useState("");
  const [followupQuestions, setFollowupQuestions] = useState<string[]>([]);
  const [followupAnswers, setFollowupAnswers] = useState<string[]>([]);
  const [followupError, setFollowupError] = useState("");
  const [symptomResult, setSymptomResult] = useState<SymptomResult | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryCheckRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyDetail, setHistoryDetail] = useState<HistoryCheckDetail | null>(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyDetailError, setHistoryDetailError] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionState(data.session ? "signed_in" : "signed_out");
      setMessage(data.session ? "Signed in." : "Sign in to continue.");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionState(session ? "signed_in" : "signed_out");
      if (!session) {
        setChildren([]);
        setView("home");
        setSelectedChild(null);
        resetHistoryState();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionState !== "signed_in") return;
    void loadChildren();
  }, [sessionState]);

  async function signIn() {
    setBusy(true);
    setMessage("Signing in...");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }
    setMessage("Signed in.");
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setChildren([]);
    setView("home");
    setSelectedChild(null);
    resetSymptomInputForm();
    resetFollowupForm();
    resetSymptomResult();
    resetHistoryState();
    setBusy(false);
    setMessage("Signed out.");
  }

  function resetAddChildForm() {
    setChildName("");
    setChildPhotoUrl("");
    setDateOfBirth("");
    setSexAtBirth("");
    setIsPremature(false);
    setGestationalAgeWeeks("");
    setFormError("");
  }

  function resetChildActionError() {
    setChildActionError("");
    setConfirmingRemoveChild(false);
  }

  function resetSymptomInputForm() {
    setSymptomText("");
    setDisclaimerAccepted(false);
    setSymptomError("");
  }

  function resetFollowupForm() {
    setFollowupQuestions([]);
    setFollowupAnswers([]);
    setFollowupError("");
  }

  function resetSymptomResult() {
    setSymptomResult(null);
  }

  function resetHistoryState() {
    setHistoryRows([]);
    setHistoryError("");
    setHistoryDetail(null);
    setHistoryDetailError("");
    setHistoryLoading(false);
    setHistoryDetailLoading(false);
  }

  async function loadChildren() {
    setChildrenLoading(true);
    try {
      const res = await apiFetch("/api/children");
      const body = await res.json();

      if (!res.ok) {
        setMessage(`Children failed (${res.status}): ${JSON.stringify(body)}`);
        return;
      }

      setChildren(Array.isArray(body?.children) ? body.children : []);
    } catch (e) {
      setMessage(`Could not load children: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setChildrenLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await apiFetch("/api/symptom-checks");
      const body = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof body?.error === "string" ? body.error : "Could not load symptom history.";
        setHistoryError(errorMessage);
        return;
      }

      setHistoryRows(Array.isArray(body?.checks) ? (body.checks as HistoryCheckRow[]) : []);
    } catch (e) {
      setHistoryError(
        `Could not load symptom history: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistoryDetail(checkId: string) {
    setHistoryDetailLoading(true);
    setHistoryDetailError("");
    setView("history-detail");
    try {
      const res = await apiFetch(`/api/symptom-checks/${checkId}`);
      const body = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof body?.error === "string" ? body.error : "Could not load this check detail.";
        setHistoryDetailError(errorMessage);
        setHistoryDetail(null);
        return;
      }

      setHistoryDetail((body?.check as HistoryCheckDetail) ?? null);
    } catch (e) {
      setHistoryDetailError(
        `Could not load this check detail: ${e instanceof Error ? e.message : "unknown error"}`
      );
      setHistoryDetail(null);
    } finally {
      setHistoryDetailLoading(false);
    }
  }

  async function probeApi() {
    setBusy(true);
    setMessage("Syncing auth with backend...");
    try {
      const syncRes = await apiFetch("/api/auth/sync-app-user", { method: "POST" });
      const syncBody = await syncRes.json();

      if (!syncRes.ok) {
        setMessage(`Sync failed (${syncRes.status}): ${JSON.stringify(syncBody)}`);
        return;
      }

      const meRes = await apiFetch("/api/me");
      const meBody = await meRes.json();

      if (!meRes.ok) {
        setMessage(`Profile failed (${meRes.status}): ${JSON.stringify(meBody)}`);
        return;
      }

      const emailText = meBody?.authUser?.email ?? "signed-in user";
      const hasAppUser = Boolean(meBody?.appUser?.id);
      await loadChildren();
      setMessage(
        `Connected as ${emailText}. Prisma user ${hasAppUser ? "is ready" : "was not found"}.`
      );
    } catch (e) {
      setMessage(`API call failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function submitAddChild() {
    setBusy(true);
    setFormError("");
    try {
      const normalizedSex = sexAtBirth.trim().toLowerCase();
      const payload = {
        name: childName.trim(),
        photo_url: childPhotoUrl.trim() || null,
        date_of_birth: dateOfBirth.trim(),
        sex_at_birth:
          normalizedSex === "prefer not to say" || normalizedSex === ""
            ? null
            : sexAtBirth.trim(),
        is_premature: isPremature,
        gestational_age_weeks: isPremature
          ? gestationalAgeWeeks.trim() === ""
            ? null
            : Number(gestationalAgeWeeks.trim())
          : null,
      };

      const res = await apiFetch("/api/children", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json();

      if (!res.ok) {
        const fieldMessage =
          typeof body?.error === "string" ? body.error : "Could not save child.";
        setFormError(fieldMessage);
        return;
      }

      await loadChildren();
      resetAddChildForm();
      setView("home");
      setMessage("Child saved.");
    } catch (e) {
      setFormError(`Could not save child: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  async function selectAndUploadChildPhoto(): Promise<string | null> {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Photo permission is needed to upload a child photo.");
      }

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (picked.canceled || picked.assets.length === 0) {
        return null;
      }

      const asset = picked.assets[0];
      const uri = asset.uri;
      if (!uri) {
        throw new Error("Could not read selected photo.");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Sign in again before uploading a photo.");
      }

      const fileExt = (asset.fileName?.split(".").pop() ?? "jpg").toLowerCase();
      const safeExt = fileExt.match(/^[a-z0-9]+$/) ? fileExt : "jpg";
      const objectPath = `${user.id}/child-${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(CHILD_PHOTOS_BUCKET)
        .upload(objectPath, blob, {
          contentType: asset.mimeType ?? "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(formatChildPhotoUploadErrorMessage(uploadError.message));
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(CHILD_PHOTOS_BUCKET).getPublicUrl(objectPath);

      return publicUrl;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Could not upload photo.");
    }
  }

  async function pickAndUploadChildPhoto() {
    setBusy(true);
    setFormError("");
    try {
      const publicUrl = await selectAndUploadChildPhoto();
      if (!publicUrl) return;
      setChildPhotoUrl(publicUrl);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not upload photo.");
    } finally {
      setBusy(false);
    }
  }

  async function updateSelectedChildPhoto(photoUrl: string | null) {
    if (!selectedChild) {
      setChildActionError("Choose a child first.");
      return;
    }

    setBusy(true);
    setChildActionError("");
    try {
      const res = await apiFetch(`/api/children/${selectedChild.id}`, {
        method: "PATCH",
        body: JSON.stringify({ photo_url: photoUrl }),
      });
      const body = await res.json();

      if (!res.ok) {
        const errorMessage = typeof body?.error === "string" ? body.error : "Could not update photo.";
        setChildActionError(errorMessage);
        return;
      }

      setSelectedChild((current) => (current ? { ...current, photo_url: photoUrl } : current));
      setChildren((current) =>
        current.map((child) =>
          child.id === selectedChild.id ? { ...child, photo_url: photoUrl } : child
        )
      );
      setMessage(photoUrl ? "Child photo updated." : "Child photo removed.");
    } catch (e) {
      setChildActionError(
        `Could not update child photo: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeSelectedChildPhoto() {
    setBusy(true);
    setChildActionError("");
    try {
      const publicUrl = await selectAndUploadChildPhoto();
      if (!publicUrl) return;
      await updateSelectedChildPhoto(publicUrl);
    } catch (e) {
      setChildActionError(e instanceof Error ? e.message : "Could not update child photo.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelectedChild() {
    if (!selectedChild) {
      setChildActionError("Choose a child first.");
      return;
    }

    setBusy(true);
    setChildActionError("");
    try {
      const res = await apiFetch(`/api/children/${selectedChild.id}`, {
        method: "DELETE",
      });
      const body = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof body?.error === "string" ? body.error : "Could not remove child profile.";
        setChildActionError(errorMessage);
        return;
      }

      await loadChildren();
      setSelectedChild(null);
      setConfirmingRemoveChild(false);
      setView("home");
      setMessage("Child profile removed.");
    } catch (e) {
      setChildActionError(
        `Could not remove child profile: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitSymptomInput() {
    if (!selectedChild) {
      setSymptomError("Choose a child first.");
      return;
    }

    setBusy(true);
    setSymptomError("");

    try {
      const res = await apiFetch("/api/symptom-followup", {
        method: "POST",
        body: JSON.stringify({
          childId: selectedChild.id,
          symptomText: symptomText.trim(),
          disclaimerAccepted,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof body?.error === "string" ? body.error : "Could not start symptom check.";
        setSymptomError(errorMessage);
        return;
      }

      if (Array.isArray(body?.questions)) {
        setFollowupQuestions(body.questions);
        setFollowupAnswers(body.questions.map(() => ""));
        setFollowupError("");
        setView("followup-questions");
      } else if (typeof body?.summary === "string") {
        setSymptomResult(body as SymptomResult);
        setView("symptom-result");
      } else {
        setMessage("Symptom input submitted.");
      }
    } catch (e) {
      setSymptomError(
        `Could not start symptom check: ${e instanceof Error ? e.message : "unknown error"}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitFollowupAnswers() {
    if (!selectedChild) {
      setFollowupError("Choose a child first.");
      return;
    }

    const trimmedAnswers = followupAnswers.map((answer) => answer.trim());
    if (trimmedAnswers.some((answer) => answer.length === 0)) {
      setFollowupError("Answer all follow-up questions before continuing.");
      return;
    }

    setBusy(true);
    setFollowupError("");
    try {
      const res = await apiFetch("/api/symptom-final", {
        method: "POST",
        body: JSON.stringify({
          childId: selectedChild.id,
          symptomText: symptomText.trim(),
          followupAnswers: followupQuestions.map((question, index) => ({
            question,
            answer: trimmedAnswers[index] ?? "",
          })),
          disclaimerAccepted,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        const errorMessage =
          typeof body?.error === "string" ? body.error : "Could not finish symptom check.";
        setFollowupError(errorMessage);
        return;
      }

      setSymptomResult(body as SymptomResult);
      setView("symptom-result");
    } finally {
      setBusy(false);
    }
  }

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0f9f94" />
          <Text style={styles.loadingText}>Loading NurtureAI...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      {sessionState === "loading" ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0f9f94" />
          <Text style={styles.loadingText}>Loading NurtureAI...</Text>
        </View>
      ) : sessionState === "signed_out" ? (
        <View style={styles.authShell}>
          <View style={styles.authHero}>
            <Text style={styles.authEyebrow}>NurtureAI</Text>
            <Text style={styles.authTitle}>Mobile-first care for parents</Text>
            <Text style={styles.authSubtitle}>
              Sign in to use the new app shell and connect to the existing backend.
            </Text>
          </View>

          <View style={styles.authCard}>
            <TextInput
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <PrimaryButton disabled={busy} onPress={signIn}>
              <Text style={styles.primaryActionText}>{busy ? "Working..." : "Sign in"}</Text>
            </PrimaryButton>
            <Text style={styles.authMessage}>{message}</Text>
          </View>
        </View>
      ) : view === "add-child" ? (
        <AddChildScreen
          busy={busy}
          formError={formError}
          childName={childName}
          childPhotoUrl={childPhotoUrl}
          dateOfBirth={dateOfBirth}
          sexAtBirth={sexAtBirth}
          isPremature={isPremature}
          gestationalAgeWeeks={gestationalAgeWeeks}
          onChangeChildName={setChildName}
          onChangeChildPhotoUrl={setChildPhotoUrl}
          onChangeDateOfBirth={setDateOfBirth}
          onChangeSexAtBirth={setSexAtBirth}
          onPickChildPhoto={pickAndUploadChildPhoto}
          onClearChildPhoto={() => setChildPhotoUrl("")}
          onChangeGestationalAgeWeeks={setGestationalAgeWeeks}
          onTogglePremature={() => setIsPremature((prev) => !prev)}
          onSubmit={submitAddChild}
          onBack={() => {
            setFormError("");
            setView("home");
          }}
        />
      ) : view === "child-detail" && selectedChild ? (
        <ChildDetailScreen
          child={selectedChild}
          busy={busy}
          childActionError={childActionError}
          confirmingRemove={confirmingRemoveChild}
          onPickPhoto={changeSelectedChildPhoto}
          onRemovePhoto={async () => updateSelectedChildPhoto(null)}
          onOpenSymptomInput={() => {
            resetSymptomInputForm();
            resetFollowupForm();
            resetSymptomResult();
            resetChildActionError();
            setView("symptom-input");
          }}
          onOpenHistory={() => {
            resetChildActionError();
            void loadHistory();
            setView("history-list");
          }}
          onAskRemoveChild={() => {
            setConfirmingRemoveChild(true);
            setChildActionError("");
          }}
          onCancelRemoveChild={() => {
            setConfirmingRemoveChild(false);
          }}
          onRemoveChild={removeSelectedChild}
          onBack={() => {
            resetChildActionError();
            setView("home");
          }}
        />
      ) : view === "symptom-input" && selectedChild ? (
        <SymptomInputScreen
          child={selectedChild}
          busy={busy}
          symptomText={symptomText}
          disclaimerAccepted={disclaimerAccepted}
          symptomError={symptomError}
          onChangeSymptomText={setSymptomText}
          onToggleDisclaimer={() => setDisclaimerAccepted((prev) => !prev)}
          onSubmit={submitSymptomInput}
          onBack={() => {
            resetSymptomInputForm();
            setView("child-detail");
          }}
        />
      ) : view === "followup-questions" && selectedChild ? (
        <FollowupQuestionsScreen
          child={selectedChild}
          busy={busy}
          questions={followupQuestions}
          answers={followupAnswers}
          followupError={followupError}
          onChangeAnswer={(index, value) => {
            setFollowupAnswers((current) => current.map((item, i) => (i === index ? value : item)));
          }}
          onSubmit={submitFollowupAnswers}
          onBack={() => {
            setView("symptom-input");
          }}
        />
      ) : view === "symptom-result" && selectedChild && symptomResult ? (
        <SymptomResultScreen
          child={selectedChild}
          result={symptomResult}
          onStartAnotherCheck={() => {
            resetSymptomInputForm();
            resetFollowupForm();
            resetSymptomResult();
            setView("symptom-input");
          }}
          onBackToChild={() => {
            setView("child-detail");
          }}
        />
      ) : view === "history-list" ? (
        <HistoryListScreen
          busy={busy}
          historyLoading={historyLoading}
          historyError={historyError}
          historyRows={historyRows}
          onRefresh={loadHistory}
          onOpenCheck={openHistoryDetail}
          onBack={() => {
            if (selectedChild) {
              setView("child-detail");
            } else {
              setView("home");
            }
          }}
        />
      ) : view === "history-detail" ? (
        <HistoryDetailScreen
          check={historyDetail}
          loading={historyDetailLoading}
          error={historyDetailError}
          onBack={() => {
            setView("history-list");
          }}
        />
      ) : (
        <SignedInDashboard
          busy={busy}
          message={message}
          childList={children}
          childrenLoading={childrenLoading}
          onOpenChild={(child) => {
            setSelectedChild(child);
            resetChildActionError();
            setView("child-detail");
          }}
          onOpenAddChild={() => {
            setFormError("");
            setView("add-child");
          }}
          onRefreshChildren={loadChildren}
          onProbeApi={probeApi}
          onOpenHistory={async () => {
            await loadHistory();
            setView("history-list");
          }}
          onSignOut={signOut}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.page,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: THEME.textSecondary,
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
  },
  authShell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 18,
  },
  authHero: {
    gap: 6,
  },
  authEyebrow: {
    fontSize: 14,
    color: THEME.ctaDark,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
  },
  authTitle: {
    fontSize: 31,
    lineHeight: 38,
    fontFamily: "Poppins_800ExtraBold",
    color: THEME.textPrimary,
    letterSpacing: -0.5,
  },
  authSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: THEME.textSecondary,
    fontFamily: "Poppins_400Regular",
  },
  authCard: {
    width: "100%",
    backgroundColor: THEME.cardSoft,
    borderRadius: 26,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    shadowColor: "#1a2744",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  formCard: {
    width: "100%",
    backgroundColor: THEME.cardSoft,
    borderRadius: 26,
    padding: 18,
    gap: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    shadowColor: "#1a2744",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: THEME.card,
    fontFamily: "Poppins_400Regular",
    color: THEME.textPrimary,
  },
  textArea: {
    minHeight: 140,
    paddingTop: 14,
  },
  questionBlock: {
    gap: 8,
  },
  photoPickerRow: {
    gap: 8,
  },
  photoPreviewWrap: {
    width: 96,
    height: 96,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    backgroundColor: THEME.blueMuted,
    marginBottom: 2,
  },
  photoPreviewImage: {
    width: "100%",
    height: "100%",
  },
  followupInput: {
    minHeight: 96,
    paddingTop: 14,
  },
  fieldLabel: {
    color: THEME.textPrimary,
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  toggleBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    backgroundColor: THEME.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBoxActive: {
    backgroundColor: GRADIENT.start,
    borderColor: GRADIENT.start,
  },
  toggleBoxText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },
  toggleLabel: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  authMessage: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  formError: {
    color: "#b42318",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#5b21b6",
  },
  dateText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
  },
  nameText: {
    color: THEME.textPrimary,
    fontSize: 19,
    fontFamily: "Poppins_800ExtraBold",
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 24,
    color: THEME.textPrimary,
    fontFamily: "Poppins_500Medium",
  },
  heroCard: {
    overflow: "hidden",
    backgroundColor: "#f5f3ff",
    borderRadius: 28,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  detailHeroAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    marginBottom: 10,
  },
  detailHeroAvatarImage: {
    width: "100%",
    height: "100%",
  },
  heroBlobPink: {
    position: "absolute",
    left: -20,
    top: 0,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#c4b5fd",
    opacity: 0.45,
  },
  heroBlobYellow: {
    position: "absolute",
    right: -10,
    bottom: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#93c5fd",
    opacity: 0.4,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontFamily: "Poppins_800ExtraBold",
    color: THEME.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    maxWidth: "82%",
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textSecondary,
    fontFamily: "Poppins_400Regular",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_800ExtraBold",
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  seeAll: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
  },
  planRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  planCard: {
    flex: 1,
    minHeight: 122,
    borderRadius: 22,
    padding: 12,
    justifyContent: "space-between",
  },
  planIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  planIcon: {
    fontSize: 20,
  },
  planCardTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Poppins_700Bold",
    color: THEME.textPrimary,
  },
  childrenCard: {
    backgroundColor: THEME.cardSoft,
    borderRadius: 26,
    padding: 16,
    marginBottom: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    shadowColor: "#1a2744",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  childrenMessage: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  emptyState: {
    gap: 6,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: THEME.textPrimary,
    fontFamily: "Poppins_700Bold",
  },
  emptyStateText: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  childRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  childAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  childAvatarText: {
    color: "#5b21b6",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  childInfo: {
    flex: 1,
  },
  childChevron: {
    color: THEME.textMuted,
    fontSize: 22,
    fontFamily: "Poppins_500Medium",
  },
  childName: {
    color: THEME.textPrimary,
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  childMeta: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  historyRow: {
    borderRadius: 22,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    padding: 14,
    gap: 6,
  },
  historyRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  historyPreview: {
    color: "#4e5666",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },
  detailPhotoSection: {
    gap: 8,
    marginTop: 2,
  },
  detailAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  detailAvatarFallbackText: {
    fontSize: 38,
  },
  detailGrid: {
    gap: 12,
    marginTop: 10,
  },
  detailItem: {
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    padding: 14,
  },
  detailLabel: {
    color: THEME.textMuted,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    marginBottom: 4,
  },
  detailValue: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },
  inlineAction: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: THEME.blueMuted,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: "center",
  },
  inlineActionText: {
    color: "#2b6cb0",
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },
  inlineDangerAction: {
    backgroundColor: "#ffe9ee",
  },
  inlineDangerActionText: {
    color: "#b42318",
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    backgroundColor: THEME.card,
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#6366f1",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  apiCard: {
    backgroundColor: THEME.cardSoft,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
  },
  apiTitle: {
    fontSize: 17,
    fontFamily: "Poppins_800ExtraBold",
    color: THEME.textPrimary,
    letterSpacing: -0.2,
  },
  apiMessage: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  nextStepCard: {
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    padding: 14,
  },
  nextStepTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
  },
  nextStepText: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Poppins_400Regular",
  },
  resultCard: {
    backgroundColor: THEME.cardSoft,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
  },
  resultBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  resultBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultBadgeEmergency: {
    backgroundColor: "#fee4e2",
  },
  resultBadgeUrgent: {
    backgroundColor: "#fff1d6",
  },
  resultBadgeMonitor: {
    backgroundColor: THEME.sageLight,
  },
  resultBadgeText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },
  resultBadgeTextEmergency: {
    color: "#b42318",
  },
  resultBadgeTextUrgent: {
    color: "#b54708",
  },
  resultBadgeTextMonitor: {
    color: "#4a6b55",
  },
  resultConfidenceBadge: {
    borderRadius: 999,
    backgroundColor: THEME.blueMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultConfidenceText: {
    color: "#3d6a9e",
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
  },
  resultSectionTitle: {
    color: THEME.textPrimary,
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    marginTop: 4,
  },
  resultBody: {
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  resultAction: {
    color: THEME.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Poppins_600SemiBold",
  },
  redFlagList: {
    gap: 8,
  },
  redFlagRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  redFlagBullet: {
    color: "#b42318",
    fontSize: 16,
    lineHeight: 20,
    fontFamily: "Poppins_700Bold",
  },
  redFlagText: {
    flex: 1,
    color: THEME.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  resultMetaCard: {
    borderRadius: 18,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    padding: 14,
    gap: 6,
  },
  resultMetaText: {
    color: THEME.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "Poppins_400Regular",
  },
  primaryButtonOuter: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#5b21b6",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  primaryButtonGradient: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  confirmRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  bottomNav: {
    backgroundColor: THEME.cardSoft,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    shadowColor: "#1a2744",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  bottomNavItem: {
    color: THEME.textMuted,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  bottomNavItemActive: {
    color: "#7c3aed",
  },
});
