import { isServerAttachmentPath } from './attachmentPath';
export type UserRole = 'ppds' | 'staff' | 'institution-admin';

export type DynamicLogbookAction = Record<string, unknown>;
export type UploadedLogbookAttachment = {
  name: string;
  url_file: string;
  file_name: string;
  file_type: string;
};

export type LocalAttachmentFile = {
  label: string;
  uri: string;
  name: string;
  type: string;
  /** Server-issued metadata returned immediately after multipart upload. */
  uploaded?: UploadedLogbookAttachment;
};
export type DynamicChoice = { id: number; label: string; is_other?: boolean; required_asm?: boolean };
export type DynamicRoleMap = {
  idActionRole: number;
  label: string;
  identifier?: string;
  users: DynamicChoice[];
};
export type DynamicLogbookFormValues = {
  date: Date;
  title?: string;
  notes?: string;
  is_presentation?: boolean;
  location?: string;
  roleUsers?: Record<string, number>;
  userStaseId?: number | null;
  staffJejaringUserId?: number;
  anotherRoleId?: number;
  hospitalId?: number;
  categoryId?: number;
  staseId?: number;
  is_retake?: boolean;
  participantId?: number;
  exam_result?: string;
  emr?: {
    patient_name?: string;
    age?: string;
    month?: string;
    gender?: string;
    diagnosis?: string;
    treatment?: string;
    emr_number?: string;
  };
  asm?: Record<string, string | number>;
  attachmentFiles?: LocalAttachmentFile[];
};
export type DynamicField = {
  key:
    | 'action_roles'
    | 'another_role'
    | 'stase'
    | 'is_retake'
    | 'date'
    | 'title'
    | 'emr'
    | 'attachments'
    | 'notes'
    | 'location'
    | 'category'
    | 'hospital'
    | 'exam_result'
    | 'is_presentation'
    | 'asm';
};

export const enabled = (value: unknown) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  value === 'true' ||
  value === 't';
const sourceArray = (action: DynamicLogbookAction, ...keys: string[]) =>
  keys.find(key => Array.isArray(action[key]))
    ? (action[keys.find(key => Array.isArray(action[key]))!] as unknown[])
    : [];

// Legacy metadata may omit the flag; explicit false is always authoritative.
const allowsRelation = (
  action: DynamicLogbookAction,
  flag: 'has_category' | 'has_hospital',
  choices: DynamicChoice[],
) => action[flag] === undefined ? choices.length > 0 : enabled(action[flag]);

export function getDynamicAttachmentLabels(
  action: DynamicLogbookAction,
): string[] {
  const raw = action.attachment_name;
  const entries = Array.isArray(raw) ? raw : [raw];
  const labels = entries.flatMap(item => {
    if (typeof item === 'string') {
      const value = item.trim();
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed))
          return parsed.filter((label): label is string => typeof label === 'string');
      } catch {
        // A regular display label is not JSON.
      }
      return [value];
    }
    if (item && typeof item === 'object') {
      const label = (item as Record<string, unknown>).name ??
        (item as Record<string, unknown>).label;
      return typeof label === 'string' && label.trim() ? [label.trim()] : [];
    }
    return [];
  });
  return [...new Set(labels)];
};
const numberOrUndefined = (value: unknown) => {
  return toFiniteNumber(value);
};
const toFiniteNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const formatDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
};

const toChoices = (source: unknown, categoryMetadata=false): DynamicChoice[] =>
  (Array.isArray(source) ? source : []).flatMap(item => {
    const raw = item as Record<string, unknown>;
    const nested = (raw.m_user ??
      raw.m_another_role ??
      raw.m_hospital ??
      raw.m_stase ??
      raw.m_action_category) as Record<string, unknown> | undefined;
    const id = Number(
      raw.id_user ??
        raw.id_another_role ??
        raw.id_hospital ??
        raw.id_stase ??
        raw.id_category ??
        raw.id_action_category ??
        raw.id ??
        nested?.id,
    );
    const label =
      raw.display_name ??
      raw.name ??
      raw.role_name ??
      raw.username ??
      raw.label ??
      nested?.display_name ??
      nested?.name ??
      nested?.role_name ??
      nested?.username;
    return Number.isFinite(id) && typeof label === 'string'
      ? [{ id, label, ...(categoryMetadata && (raw.is_other !== undefined || nested?.is_other !== undefined) ? {is_other:enabled(raw.is_other ?? nested?.is_other)} : {}), ...(categoryMetadata && (raw.required_asm !== undefined || nested?.required_asm !== undefined) ? {required_asm:enabled(raw.required_asm ?? nested?.required_asm)} : {}) }]
      : [];
  });

export const getDynamicCategories = (action: DynamicLogbookAction) =>
  toChoices(
    sourceArray(action, 'categories', 'm_action_category', 'action_categories'), true,
      );
export const getDynamicHospitals = (action: DynamicLogbookAction) =>
  toChoices(sourceArray(action, 'hospitals', 'm_hospital'));
export const getDynamicAnotherRoles = (action: DynamicLogbookAction) =>
  toChoices(sourceArray(action, 'm_action_another_role', 'another_roles'));
export const getDynamicStases = (action: DynamicLogbookAction) =>
  toChoices(sourceArray(action, 'stases', 'm_stase'));
export const getDynamicStaffJejaringUsers = (action: DynamicLogbookAction) =>
  toChoices(action.staff_jejaring_users);
export function getDynamicStaseHasStaffJejaring(
  action: DynamicLogbookAction,
  userStaseId: number | null | undefined,
): boolean {
  if (!userStaseId) return false;
  const stase = sourceArray(action, 'stases', 'm_stase').find(item => {
    const raw = item as Record<string, unknown>;
    const nested = raw.m_stase as Record<string, unknown> | undefined;
    return Number(raw.id_stase ?? raw.id ?? nested?.id) === userStaseId;
  }) as Record<string, unknown> | undefined;
  return Boolean(
    stase &&
      enabled(
        stase.has_staff_jejaring ??
          (stase.m_stase as Record<string, unknown> | undefined)
            ?.has_staff_jejaring,
      ),
  );
}
export function getDynamicAsmParams(action: DynamicLogbookAction) {
  return sourceArray(action, 'm_asm_action').flatMap(item => {
    const raw = item as Record<string, unknown>;
    const metadata = raw.m_asm_param as Record<string, unknown> | undefined;
    const id = Number(raw.id_asm_param ?? metadata?.id);
    const minScore = toFiniteNumber(metadata?.min_score ?? raw.min_score);
    const maxScore = toFiniteNumber(metadata?.max_score ?? raw.max_score);
    return Number.isFinite(id)
      ? [
          {
            id,
            label: String(metadata?.name ?? raw.name ?? `Parameter ${id}`).replace(/\b(?:afektif|affective)\b/gi, 'Attitude'),
            ...(minScore !== undefined ? { minScore } : {}),
            ...(maxScore !== undefined ? { maxScore } : {}),
          },
        ]
      : [];
  });
}

/** Numeric score choices supplied by metadata, ordered for display. */
export function getDynamicScoreOptions(action: DynamicLogbookAction): number[] {
  return [
    ...new Set(
      sourceArray(action, 'score_options', 'm_score_option').flatMap(item => {
        const raw = item as Record<string, unknown>;
        const score = toFiniteNumber(raw.score ?? raw.value);
        return score === undefined ? [] : [score];
      }),
    ),
  ].sort((left, right) => left - right);
}

export function isMorbiditasAction(action: DynamicLogbookAction): boolean {
  return /morbiditas/.test(
    `${action.identifier ?? ''} ${action.name ?? ''} ${action.action_type_name ?? ''}`.toLowerCase(),
  );
}

const actionSource = (action: DynamicLogbookAction) =>
  `${action.identifier ?? ''} ${action.name ?? ''} ${action.action_type_name ?? ''}`
    .toLowerCase()
    .replace(/[_\s/]+/g, '-');

/** Workflows whose staff assessment is required even when legacy metadata omits has_score. */
export function usesStaffOnlyScore(action: DynamicLogbookAction): boolean {
  return /seminar-hasil|review-artikel|publikasi|proposal-thesis|proposal-tesis|ilmiah-stase|ilmiah-non-stase/.test(
    actionSource(action),
  );
}

const getSelectedCategoryLabel = (
  action: DynamicLogbookAction,
  categoryId: number | undefined,
) => getDynamicCategories(action).find(category => category.id === categoryId)?.label.toLowerCase();

function matchesStaffOnlyScoreCategory(
  action: DynamicLogbookAction,
  categoryId: number | undefined,
) {
  const source = actionSource(action);
  if (!/ilmiah-stase|ilmiah-non-stase/.test(source)) return true;
  const category = getSelectedCategoryLabel(action, categoryId);
  if (!category) return false;
  if (/ilmiah-non-stase/.test(source)) return /pembicara/.test(category);
  return !/pendengar/.test(category);
}

export type RequiredDynamicLogbookField =
  | 'staff'
  | 'another_role'
  | 'hospital'
  | 'category'
  | 'stase'
  | 'title'
  | 'notes'
  | 'location'
  | 'emr'
  | 'exam_result'
  | 'asm';

/** Required create fields for the workflows that mandate them in Prasi. */
export function getRequiredDynamicLogbookFields(
  action: DynamicLogbookAction,
): RequiredDynamicLogbookField[] {
  const keys = getDynamicLogbookFields(action, 'ppds').map(field => field.key);
  const requirements: RequiredDynamicLogbookField[] = [];
  if (keys.includes('action_roles')) requirements.push('staff');
  if (keys.includes('another_role')) requirements.push('another_role');
  if (keys.includes('hospital')) requirements.push('hospital');
  if (keys.includes('category')) requirements.push('category');
  if (keys.includes('stase')) requirements.push('stase');
  if (keys.includes('title')) requirements.push('title');
  if (keys.includes('notes')) requirements.push('notes');
  if (keys.includes('location')) requirements.push('location');
  if (keys.includes('emr')) requirements.push('emr');
  if (keys.includes('exam_result')) requirements.push('exam_result');
  if (keys.includes('asm')) requirements.push('asm');
  return requirements;
}

export function shouldShowDynamicEmrNumber(action: DynamicLogbookAction): boolean {
  if (!enabled(action.has_emr)) return false;
  if (Number(action.id) === 39) return true;
  const identifier = String(action.identifier ?? '').trim().toLowerCase();
  if (identifier === 'morbiditas' || identifier.includes('morbid')) return true;
  return String(action.name ?? '').trim().toLowerCase().includes('morbiditas');
}

export type DynamicScoreSelection = Pick<
  DynamicLogbookFormValues,
  'categoryId' | 'anotherRoleId'
>;

const metadataEntryId = (item: unknown, kind: 'category' | 'another-role') => {
  const raw = item as Record<string, unknown>;
  const nested =
    kind === 'category'
      ? (raw.m_action_category as Record<string, unknown> | undefined)
      : (raw.m_another_role as Record<string, unknown> | undefined);
  const id = Number(
    kind === 'category'
      ? raw.id_category ?? raw.id_action_category ?? raw.id ?? nested?.id
      : raw.id_another_role ?? raw.id ?? nested?.id,
  );
  return Number.isFinite(id) ? id : undefined;
};

const selectedMetadataRequiresAsm = (
  action: DynamicLogbookAction,
  selectionId: number | undefined,
  kind: 'category' | 'another-role',
) => {
  if (selectionId === undefined) return false;
  const source =
    kind === 'category'
      ? sourceArray(action, 'categories', 'm_action_category', 'action_categories')
      : sourceArray(action, 'm_action_another_role', 'another_roles');
  const selected = source.find(item => metadataEntryId(item, kind) === selectionId);
  if (!selected || typeof selected !== 'object') return false;
  const raw = selected as Record<string, unknown>;
  const nested =
    kind === 'category'
      ? (raw.m_action_category as Record<string, unknown> | undefined)
      : (raw.m_another_role as Record<string, unknown> | undefined);
  // An absent flag is deliberately not treated as required.
  return enabled(raw.required_asm ?? nested?.required_asm);
};

/** Mirrors Prasi score visibility using the currently selected metadata IDs. */
export function shouldShowDynamicScoreFields(
  action: DynamicLogbookAction,
  userRole: UserRole,
  selection: DynamicScoreSelection,
) {
  if (getDynamicCategories(action).find(c=>c.id===selection.categoryId)?.is_other) return userRole==='staff' && !enabled(action.is_exam);
  if (usesStaffOnlyScore(action)) {
    return userRole === 'staff' && matchesStaffOnlyScoreCategory(action, selection.categoryId);
  }
  if (!enabled(action.has_score) || userRole === 'institution-admin') return false;

  const categoryRequiresAsm = selectedMetadataRequiresAsm(
    action,
    selection.categoryId,
    'category',
  );
  if (!enabled(action.has_score_option))
    return (
      (userRole === 'ppds' || userRole === 'staff') && categoryRequiresAsm
    );

  if (userRole !== 'staff') return false;
  const anotherRoleRequiresAsm = selectedMetadataRequiresAsm(
    action,
    selection.anotherRoleId,
    'another-role',
  );
  const hasNoRoleSelection =
    selection.categoryId === undefined && selection.anotherRoleId === undefined;
  return (
    categoryRequiresAsm ||
    anotherRoleRequiresAsm ||
    (hasNoRoleSelection && !enabled(action.multiple_verification))
  );
}
export function getSelectPlaceholder(label: string) {
  return `Pilih ${label}`;
}

const roleMapRoleName = (raw: Record<string, unknown>) => {
  const role = raw.m_action_role as Record<string, unknown> | undefined;
  return String(raw.role ?? raw.role_name ?? role?.role ?? role?.name ?? '');
};

const roleMapIdentifier = (raw: Record<string, unknown>) => {
  const role = raw.m_action_role as Record<string, unknown> | undefined;
  return String(raw.identifier ?? role?.identifier ?? '');
};

/** Prasi hides Admin pejabat from every activity create form. */
export function isAdminRolemap(raw: Record<string, unknown>): boolean {
  const role = roleMapRoleName(raw).toLowerCase();
  const ident = roleMapIdentifier(raw).toLowerCase();
  return (
    role === 'admin' ||
    role.includes('admin') ||
    ident === 'admin' ||
    ident.includes('admin')
  );
}

const isVerificatorRolemap = (raw: Record<string, unknown>) => {
  const type = String(raw.type || 'verificator');
  return type === 'verificator' || type === 'approval';
};

const compareRoleLabels = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), undefined, {
    numeric: true,
    sensitivity: 'base',
  });

export function getDynamicRoleMaps(
  action: DynamicLogbookAction,
): DynamicRoleMap[] {
  const rawMaps = sourceArray(action, 'm_action_rolemap')
    .flatMap(item => {
      const raw = item as Record<string, unknown>;
      if (!isVerificatorRolemap(raw) || isAdminRolemap(raw)) return [];
      const role = raw.m_action_role as Record<string, unknown> | undefined;
      const idActionRole = Number(raw.id_action_role ?? role?.id);
      const label = roleMapRoleName(raw) || 'Staff';
      const users = toChoices(raw.users);
      return Number.isFinite(idActionRole) && users.length
        ? [{ idActionRole, label, identifier: roleMapIdentifier(raw), users }]
        : [];
    });
  const source = `${action.identifier ?? ''} ${action.name ?? ''}`.toLowerCase();
  if (!/morbiditas/.test(source))
    return rawMaps
      .sort((a, b) => compareRoleLabels(a.label, b.label))
      .map(({ identifier: _identifier, ...role }) => role);

  const roleDefinitions = [
    { match: /pelapor|reporter/, label: 'Nama staff yang melaporkan' },
    { match: /penilai|gkm|assessor/, label: 'Nama Penilai/GKM' },
    { match: /kps/, label: 'Nama KPS' },
  ];
  return rawMaps
    .filter(role => !/jejar/.test(`${role.label} ${role.identifier ?? ''}`))
    .map((role, index) => {
      const identifiedIndex = roleDefinitions.findIndex(definition =>
        definition.match.test(`${role.label} ${role.identifier ?? ''}`),
      );
      const slot = identifiedIndex >= 0 ? identifiedIndex : index;
      return { ...role, label: roleDefinitions[slot]?.label ?? role.label, slot };
    })
    .sort((a, b) => a.slot - b.slot)
    .slice(0, 3)
    .map(({ slot: _slot, ...role }) => role);
}

export function getRequiredDynamicVerifierRoleIds(action: DynamicLogbookAction): number[] {
  const source = actionSource(action);
  const roles = getDynamicRoleMaps(action);
  if (/morbiditas/.test(source)) return roles.map(role => role.idActionRole);
  const isThesisOrSeminar = /proposal[-_\s]*thesis|proposal[-_\s]*tesis|\bthesis\b|seminar[-_\s]*hasil/.test(source);
  if (isThesisOrSeminar) {
    const required = roles.filter(role =>
      /pembimbing\s*(?:1|i\b)|penguji\s*(?:1|i\b)/i.test(role.label),
    );
    if (required.length === 3) return required.map(role => role.idActionRole);
    // Legacy role labels sometimes omit the numeric suffix. In that case, keep
    // the three intended slots by removing Pembimbing 3 before taking the rest.
    return roles
      .filter(role => !/pembimbing\s*(?:3|iii\b)/i.test(role.label))
      .slice(0, 3)
      .map(role => role.idActionRole);
  }
  if (!getRequiredDynamicLogbookFields(action).includes('staff')) return [];
  return roles.map(role => role.idActionRole);
}

export function getDynamicStaffUsers(action: DynamicLogbookAction): DynamicChoice[] {
  const seen = new Set<number>();
  return getDynamicRoleMaps(action).flatMap(role => role.users).filter(user => {
    if (seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

export function getMorbiditasDefaultVerifierUserIds(
  action: DynamicLogbookAction,
): Record<string, number> {
  if (!isMorbiditasAction(action)) return {};
  const clientId = Number(action.id_client);
  const defaults = clientId === 2
    ? { penilai: /dianti/i, kps: /\bgia\b|dr\.?\s*gia/i }
    : { penilai: /adhitiya|adhitya/i, kps: /rieva/i };

  return getDynamicRoleMaps(action).reduce<Record<string, number>>((result, role) => {
    const identity = `${role.identifier ?? ''} ${role.label}`.toLowerCase();
    const match = /penilai|gkm|assessor/.test(identity)
      ? defaults.penilai
      : /\bkps\b/.test(identity)
      ? defaults.kps
      : null;
    const matchedUser = match
      ? role.users.find(user => match.test(user.label))
      : undefined;
    if (matchedUser) result[String(role.idActionRole)] = matchedUser.id;
    return result;
  }, {});
}

export type StaffJejaringFormConfig = {
  idActionRole: number;
  users: DynamicChoice[];
};

const normalizedRoleName = (value: unknown) =>
  String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/** Prasi: main Staff Pengajar plus an opted-in current PPDS stase. */
export function getEligibleStaffJejaringConfig(
  action: DynamicLogbookAction,
  userStaseId: number | null | undefined,
): StaffJejaringFormConfig | undefined {
  if (!getDynamicStaseHasStaffJejaring(action, userStaseId)) return undefined;
  const mainRole = sourceArray(action, 'm_action_rolemap').find(item => {
    const raw = item as Record<string, unknown>;
    const role = raw.m_action_role as Record<string, unknown> | undefined;
    const name = normalizedRoleName(raw.role ?? raw.role_name ?? role?.role ?? role?.name);
    const identifier = normalizedRoleName(raw.identifier ?? role?.identifier);
    return (name.includes('staff pengajar') || identifier.includes('staff pengajar')) &&
      !name.includes('jejaring') && !identifier.includes('jejaring');
  }) as Record<string, unknown> | undefined;
  if (!mainRole) return undefined;
  const nestedRole = mainRole.m_action_role as Record<string, unknown> | undefined;
  const idActionRole = Number(mainRole.id_action_role ?? nestedRole?.id);
  if (!Number.isFinite(idActionRole)) return undefined;
  return { idActionRole, users: getDynamicStaffJejaringUsers(action) };
}

/** Rejects stale or fabricated selections before a dynamic create payload is built. */
export function getValidStaffJejaringUserId(
  action: DynamicLogbookAction,
  userStaseId: number | null | undefined,
  selectedUserId: unknown,
): number | undefined {
  const config = getEligibleStaffJejaringConfig(action, userStaseId);
  const id = Number(selectedUserId);
  return config && Number.isFinite(id) && config.users.some(user => user.id === id)
    ? id
    : undefined;
}

export function getDynamicLogbookFields(
  action: DynamicLogbookAction,
  userRole?: UserRole,
): DynamicField[] {
  const fields: DynamicField[] = [];
  if (getDynamicRoleMaps(action).length && !enabled(action.is_exam)) fields.push({ key: 'action_roles' });
  if (enabled(action.is_milestone))
    fields.push({ key: 'stase' }, { key: 'is_retake' });
  fields.push({ key: 'date' });
  if (enabled(action.has_title)) fields.push({ key: 'title' });
  if (enabled(action.has_another_role) || getDynamicAnotherRoles(action).length)
    fields.push({ key: 'another_role' });
  if (enabled(action.has_emr)) fields.push({ key: 'emr' });
  if (enabled(action.has_attachment)) fields.push({ key: 'attachments' });
  if (action.has_notes === undefined || enabled(action.has_notes))
    fields.push({ key: 'notes' });
  if (enabled(action.has_location)) fields.push({ key: 'location' });
  const morbiditasSource = `${action.identifier ?? ''} ${action.name ?? ''} ${action.action_type_name ?? ''}`
    .toLowerCase();
  const isMorbiditasPpds = userRole === 'ppds' && /morbiditas/.test(morbiditasSource);
  // Prasi lets the reporting/assessment staff set Morbiditas category; PPDS
  // sees no empty category selector on Create.
  if (!isMorbiditasPpds && allowsRelation(action, 'has_category', getDynamicCategories(action)))
    fields.push({ key: 'category' });
  if (allowsRelation(action, 'has_hospital', getDynamicHospitals(action)))
    fields.push({ key: 'hospital' });
  if (enabled(action.is_exam)) fields.push({ key: 'exam_result' });
  if (enabled(action.has_presentation ?? action.is_presentation))
    fields.push({ key: 'is_presentation' });
  if ((enabled(action.has_score) || usesStaffOnlyScore(action)) && getDynamicAsmParams(action).length)
    fields.push({ key: 'asm' });
  return fields;
}

export function sanitizeCreateLogbookPayload(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const allowedKeys = [
    'date',
    'notes',
    'title',
    'location',
    'is_presentation',
    'id_category',
    'id_another_role',
    'id_hospital',
    'id_stase',
    'id_user',
    'is_retake',
    'exam_result',
    'id_client',
    'created_by',
    't_logbook_status',
    't_logbook_emr',
    't_logbook_asm',
    't_logbook_attachment',
  ] as const;
  return allowedKeys.reduce<Record<string, unknown>>((payload, key) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      if (key === 't_logbook_attachment' && Array.isArray(input[key])) {
        payload[key] = input[key].map((row: Record<string, unknown>) => {
          if (!row || typeof row.name !== 'string' || typeof row.url_file !== 'string' ||
              !isServerAttachmentPath(row.url_file)) {
            throw new Error('Referensi upload server tidak valid.');
          }
          return { name: row.name, url_file: row.url_file };
        });
      } else payload[key] = input[key];
    }
    return payload;
  }, {});
}

export function buildDynamicCreateLogbookPayload(
  action: DynamicLogbookAction,
  values: DynamicLogbookFormValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { date: formatDate(values.date) };
  if (action.has_notes === undefined || enabled(action.has_notes))
    payload.notes = values.notes?.trim() ?? '';
  if (enabled(action.has_title)) payload.title = values.title?.trim() ?? '';
  if (enabled(action.has_location))
    payload.location = values.location?.trim() ?? '';
  if (enabled(action.has_presentation ?? action.is_presentation))
    payload.is_presentation = Boolean(values.is_presentation);
  if (enabled(action.is_milestone)) {
    if (
      values.staseId &&
      getDynamicStases(action).some(choice => choice.id === values.staseId)
    )
      payload.id_stase = values.staseId;
    payload.is_retake = Boolean(values.is_retake);
  }
  if (enabled(action.is_exam)) {
    payload.exam_result = values.exam_result?.trim() ?? '';
    // A Staff-created Exam targets the PPDS selected in the form. The server
    // still re-checks that this is an active PPDS in the same client.
    if (numberOrUndefined(values.participantId) !== undefined)
      payload.id_user = numberOrUndefined(values.participantId);
  }
  if (
    values.anotherRoleId &&
    getDynamicAnotherRoles(action).some(
      choice => choice.id === values.anotherRoleId,
    )
  )
    payload.id_another_role = values.anotherRoleId;
  if (
    values.hospitalId &&
    allowsRelation(action, 'has_hospital', getDynamicHospitals(action)) &&
    getDynamicHospitals(action).some(choice => choice.id === values.hospitalId)
  )
    payload.id_hospital = values.hospitalId;
  if (
    values.categoryId &&
    allowsRelation(action, 'has_category', getDynamicCategories(action)) &&
    getDynamicCategories(action).some(choice => choice.id === values.categoryId)
  )
    payload.id_category = values.categoryId;
  const statuses: Array<{
    id_user: number;
    id_action_role: number;
    status: 'pending';
    notes?: '__staff_jejaring__';
  }> = getDynamicRoleMaps(action).flatMap(role => {
    const id_user = values.roleUsers?.[String(role.idActionRole)];
    return id_user && role.users.some(user => user.id === id_user)
      ? [{ id_user, id_action_role: role.idActionRole, status: 'pending' as const }]
      : [];
  });
  const jejaringConfig = getEligibleStaffJejaringConfig(action, values.userStaseId);
  const staffJejaringUserId = getValidStaffJejaringUserId(
    action,
    values.userStaseId,
    values.staffJejaringUserId,
  );
  if (jejaringConfig && staffJejaringUserId !== undefined)
    statuses.push({
      id_user: staffJejaringUserId,
      id_action_role: jejaringConfig.idActionRole,
      status: 'pending',
      notes: '__staff_jejaring__',
    });
  if (statuses.length) payload.t_logbook_status = statuses;
  if (enabled(action.has_emr) && values.emr) {
    const emr = values.emr;
    const morbiditas = isMorbiditasAction(action);
    payload.t_logbook_emr = [
      {
        patient_name: emr.patient_name?.trim() ?? '',
        ...(numberOrUndefined(emr.age) !== undefined
          ? { age: numberOrUndefined(emr.age) }
          : {}),
        ...(morbiditas
          ? { emr_number: emr.emr_number?.trim() ?? '' }
          : {
              ...(numberOrUndefined(emr.month) !== undefined
                ? { month: numberOrUndefined(emr.month) }
                : {}),
              gender: emr.gender?.trim() ?? '',
              treatment: emr.treatment?.trim() ?? '',
              ...(shouldShowDynamicEmrNumber(action)
                ? { emr_number: emr.emr_number?.trim() ?? '' }
                : {}),
            }),
        diagnosis: emr.diagnosis?.trim() ?? '',
      },
    ];
  }
  if ((enabled(action.has_score) || usesStaffOnlyScore(action)) && values.asm) {
    const params = new Map(
      getDynamicAsmParams(action).map(param => [param.id, param]),
    );
    const scoreOptions = new Set(getDynamicScoreOptions(action));
    const usesScoreOptions = enabled(action.has_score_option);
    const asmRows = Object.entries(values.asm).flatMap(
      ([id, score]) => {
        const id_asm_param = Number(id);
        const parsedScore = numberOrUndefined(score);
        const param = params.get(id_asm_param);
        const isWithinBounds =
          parsedScore !== undefined &&
          (!param || param.minScore === undefined || parsedScore >= param.minScore) &&
          (!param || param.maxScore === undefined || parsedScore <= param.maxScore);
        const isMetadataScoreOption =
          !usesScoreOptions ||
          (parsedScore !== undefined && scoreOptions.has(parsedScore));
        return param && isWithinBounds && isMetadataScoreOption && parsedScore !== undefined
          ? [{ id_asm_param, score: parsedScore }]
          : [];
      },
    );
    if (asmRows.length) payload.t_logbook_asm = asmRows;
  }
  if (enabled(action.has_attachment)) {
    const uploadedAttachments = (values.attachmentFiles ?? []).flatMap(file =>
      file.uploaded ? [file.uploaded] : [],
    );
    if (uploadedAttachments.length)
      payload._uploadedAttachments = uploadedAttachments;
  }
  return payload;
}
