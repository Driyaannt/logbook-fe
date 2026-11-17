// Saved-score presentation: Native assessment gates with stricter actor-only ownership.
import { verificationFor, type Row } from './model';
import type { UserRole } from './dynamicLogbookForm';
import { ownAssessmentRows } from './assessmentOwnership';
type GetLogbookItem = Row & {t_logbook_asm?:Row[]};
type ScoreDraft = {score_psikomotor:string;score_knowledge:string;score_affective:string};
type ScoreItem = {label:string;value:string};
const isStaffRole=(role:UserRole)=>role==='staff';
// Staff ownership is resolved from saved ASM authorship, never parent fields.
const SCORE_FIELD_CONFIGS: Array<{
  key: keyof ScoreDraft;
  label: string;
  paramId: number;
  keywords: string[];
  fallbackPaths: string[];
}> = [
  {
    key: 'score_psikomotor',
    label: 'Skor Psikomotor',
    paramId: 4,
    keywords: ['psikomotor', 'psychomotor'],
    fallbackPaths: ['score_psikomotor', 'psikomotor_score', 'skor_psikomotor'],
  },
  {
    key: 'score_knowledge',
    label: 'Skor Knowledge',
    paramId: 5,
    keywords: ['knowledge', 'pengetahuan'],
    fallbackPaths: ['score_knowledge', 'knowledge_score', 'skor_knowledge'],
  },
  {
    key: 'score_affective',
    label: 'Skor Attitude',
    paramId: 6,
    keywords: ['afektif', 'affective', 'attitude'],
    fallbackPaths: ['score_affective', 'affective_score', 'skor_affective'],
  },
];

export function toDisplayText(value: unknown, fallback = '-') {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized || fallback;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function hasMeaningfulValue(value: string) {
  return value.trim() !== '' && value.trim() !== '-';
}

function isTrueFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  return normalized === 't' || normalized === 'true' || normalized === '1';
}

export function shouldShowScoreAssessment(record: GetLogbookItem) {
  const action = record.m_action as Record<string, unknown> | null;
  if(isTrueFlag(record.m_action_category?.is_other))return !isTrueFlag(action?.is_exam);
  const source = `${action?.identifier ?? ''} ${action?.name ?? ''}`
    .toLowerCase()
    .replace(/[_\s/]+/g, '-');
  const categoryLabel = [
    record.m_action_category?.name,
    record.m_another_role?.role_name,
    record.m_another_role?.m_action_another_role?.[0]?.role_name,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  const isStaffOnlyScientificAction =
    /seminar-hasil|review-artikel|publikasi|proposal-thesis|proposal-tesis|ilmiah-stase|ilmiah-non-stase/.test(
      source,
    );

  // Prasi-Bun requires staff assessment for these scientific workflows even
  // when old action metadata has_score is false/missing. Ilmiah Stase excludes
  // Pendengar; Ilmiah Non Stase is assessed only for Pembicara.
  if (isStaffOnlyScientificAction) {
    if (/ilmiah-stase/.test(source)) return !/pendengar/.test(categoryLabel);
    if (/ilmiah-non-stase/.test(source)) {
      return (
        /pembicara/.test(categoryLabel) && !/pendengar/.test(categoryLabel)
      );
    }
    return true;
  }

  const isBimbinganOperasi = /bimbingan[-\s]*operasi/.test(source);
  const hasScore = isTrueFlag(action?.has_score);
  const isExam = isTrueFlag(action?.is_exam);
  // Bimbingan Operasi is assessed by Staff for every record. Presentation only
  // changes the logbook content; it must not hide the ASM assessment fields.
  if (isBimbinganOperasi) return !isExam;
  const categoryRequiresAsm = isTrueFlag(
    record.m_action_category?.required_asm,
  );
  const anotherRoleRequiresAsm = isTrueFlag(
    record.m_another_role?.required_asm ??
      record.m_another_role?.m_action_another_role?.[0]?.required_asm,
  );

  return hasScore && !isExam && (categoryRequiresAsm || anotherRoleRequiresAsm);
}

function buildScoreDraft(
  record: GetLogbookItem,
  currentUserId?: number,
): ScoreDraft {
  const rawScores = ownAssessmentRows(record, currentUserId);
  const scoreFromKeywords = (keywords: string[]) => {
    const matched = rawScores.find(entry => {
      const haystack = [
        entry?.name,
        entry?.label,
        entry?.aspect,
        entry?.type,
        entry?.category,
      ]
        .map(value =>
          String(value ?? '')
            .trim()
            .toLowerCase(),
        )
        .join(' ');

      return keywords.some(keyword => haystack.includes(keyword));
    });

    return toDisplayText(matched?.score, '');
  };
  const scoreFromParamId = (paramId: number) => {
    // Legacy tenant-1 rows use 1/2/3; current status writes use 4/5/6.
    const matched = rawScores.find(
      entry =>
        Number(entry?.id_asm_param) === paramId ||
        Number(entry?.id_asm_param) === paramId - 3,
    );
    return toDisplayText(matched?.score, '');
  };

  return SCORE_FIELD_CONFIGS.reduce<ScoreDraft>(
    (result, config) => {
      const scoreValue =
        scoreFromKeywords(config.keywords) ||
        scoreFromParamId(config.paramId);

      result[config.key] = hasMeaningfulValue(scoreValue) ? scoreValue : '';
      return result;
    },
    {
      score_psikomotor: '',
      score_knowledge: '',
      score_affective: '',
    },
  );
}



export function buildScoreItems(
  record: GetLogbookItem,
  userRole: UserRole,
  currentUserId?: number,
): ScoreItem[] {
  // Read-only results follow this actor's active verification, not the aggregate
  // logbook status. Draft hydration stays independent so Unverifikasi keeps ASM.
  if (!isStaffRole(userRole) || !shouldShowScoreAssessment(record) ||
      verificationFor(record, currentUserId ?? 0).row?.status !== 'verified') {
    return [];
  }

  const scoreDraft = buildScoreDraft(
    record,
    currentUserId,
  );

  return SCORE_FIELD_CONFIGS.map(config => ({
    label: config.label,
    value: scoreDraft[config.key],
  })).filter(item => hasMeaningfulValue(item.value));
}

/** Prasi-Bun Explore parity: average each assessment parameter across every
 * verifier, then average those parameter averages for Total Skor. */
export function buildExploreAverageScoreItems(
  record: GetLogbookItem,
): ScoreItem[] {
  const rows = Array.isArray(record.t_logbook_asm) ? record.t_logbook_asm : [];
  const formatAverage = (value: number) => String(Number(value.toFixed(2)));
  const parameterAverages = SCORE_FIELD_CONFIGS.flatMap(config => {
    const scores = rows.flatMap(row => {
      if (row.deleted_at != null || !hasMeaningfulValue(toDisplayText(row.score, ''))) return [];
      const paramId = Number(row.id_asm_param);
      // Tenant-1 legacy assessments use 1/2/3; current writes use 4/5/6.
      if (paramId !== config.paramId && paramId !== config.paramId - 3) return [];
      const score = Number(row.score);
      return Number.isFinite(score) ? [score] : [];
    });
    if (!scores.length) return [];
    const average =
      scores.reduce((total, score) => total + score, 0) / scores.length;
    return [{ label: config.label, value: formatAverage(average), average }];
  });
  if (!parameterAverages.length) return [];

  const totalAverage =
    parameterAverages.reduce((total, item) => total + item.average, 0) /
    parameterAverages.length;
  return [
    ...parameterAverages.map(({ label, value }) => ({ label, value })),
    { label: 'Total Skor', value: formatAverage(totalAverage) },
  ];
}

