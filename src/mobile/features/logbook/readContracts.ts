import { arr, type Row } from './model';
import { getActionLogbookFilterFields, sanitizeActionLogbookFilters, toActionLogbookFilterPayload, type ActionLogbookFilters } from './actionLogbookFilters';
import { enabled, type DynamicLogbookAction, type UserRole } from './dynamicLogbookForm';

/** Native HomeScreen uses the paginated getLogbook path for Bimbingan Explore;
 * the explicit legacy Explore branch returns its complete array without paging. */
import { isBimbinganOperasiAction } from './bimbinganOperasiGrouping';
export const isBimbinganRead = (action: DynamicLogbookAction) => isBimbinganOperasiAction(action);
/** Other-category metadata enables the picker for PPDS, not folder navigation.
 * Use the same role gate for fetching aggregates, rendering and pagination. */
export const shouldGroupLogbooks = (action: DynamicLogbookAction, role: UserRole) =>
  role === 'staff' && (enabled(action.allow_other_categories) || isBimbinganRead(action) || enabled(action.is_grouped_by_category));
export const readRequestRole = (user: {role_name?: string}, role: UserRole) => String(user.role_name ?? '').trim().toLowerCase() === 'editor' || role === 'institution-admin' ? 'editor' : role;
const filterKeys = {
  start_date:'startDate', end_date:'endDate', title:'title', id_ppds:'ppdsId', id_staff:'staffId', id_staff_jejaring:'staffJejaringId', id_hospital:'hospitalId', id_category:'categoryId', id_another_role:'anotherRoleId', id_stase:'staseId', exam_result:'examResult', is_presentation:'isPresentation',
} as const;
export function nativeFilters(values: Row, action: DynamicLogbookAction, role: UserRole): ActionLogbookFilters {
  const filters: Row = {};
  for (const [wire, key] of Object.entries(filterKeys)) {
    const value = values[wire];
    if (value === undefined || value === '') continue;
    if (wire.endsWith('_date')) {
      // Parse a date picker value as local wall time, not UTC midnight.
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) filters[key] = new Date(`${value}T00:00:00`);
    } else if (wire.startsWith('id_')) {
      if (Number.isSafeInteger(Number(value)) && Number(value)>0) filters[key] = Number(value);
    } else if (wire === 'is_presentation') filters[key] = value === true || value === 'true';
    else filters[key] = String(value);
  }
  return sanitizeActionLogbookFilters(filters, action, role);
}
export function readFilterPayload(values: Row, action: DynamicLogbookAction, role: UserRole): Row {
  return toActionLogbookFilterPayload(nativeFilters(values, action, role));
}
export function filterWireFields(action: DynamicLogbookAction, role: UserRole) {
  const fields = getActionLogbookFilterFields(action, role);
  const aliases: Record<string,string> = {ppds:'id_ppds',staff:'id_staff',staff_jejaring:'id_staff_jejaring',hospital:'id_hospital',category:'id_category',another_role:'id_another_role',stase:'id_stase',presentation:'is_presentation'};
  return fields.map(field=>aliases[field] ?? field);
}
/** Scope checks validate supplied fields only. Server assignment scope remains
 * authoritative; a Staff viewer is NOT the record owner or Explore target. */
export function assertReadScope(rows: Row[], scope: {id_client:number; id_action?:number; targetActor?:number}) {
  for (const row of rows) {
    const mismatches=(values:unknown[],expected:number)=>values.some(value=>value!=null && Number(value)!==expected);
    if (mismatches([row.id_client,row.m_action?.id_client,row.m_user?.id_client],scope.id_client)) throw new Error('Data berasal dari institusi lain.');
    if (scope.id_action !== undefined && mismatches([row.id_action,row.m_action?.id],scope.id_action)) throw new Error('Data bukan milik aktivitas ini.');
    if (scope.targetActor !== undefined && mismatches([row.id_user,row.m_user?.id],scope.targetActor)) throw new Error('Data bukan milik peserta Explore ini.');
  }
}
export function ppdsChoices(response: Row) {
  // Actual native getMasterPpds/ActionLogbookFilterScreen contract: root user ID.
  return arr(response.data).flatMap(raw=>{
    const id=Number(raw.id), label=String(raw.display_name ?? raw.name ?? '').trim();
    return Number.isInteger(id)&&id>0&&label ? [{id,label}] : [];
  }).filter((choice,index,all)=>all.findIndex(item=>item.id===choice.id)===index);
}
