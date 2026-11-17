import { enabled, getDynamicCategories, getDynamicAsmParams, getDynamicScoreOptions, type DynamicLogbookAction, type UserRole } from './dynamicLogbookForm';
import { shouldShowScoreAssessment } from './detailScores';
import { verificationFor, type Row } from './model';
import { ownAssessmentRows } from './assessmentOwnership';

// Saved-record assessment is deliberately separate from Create's visibility.
// Saved action/relation flags win over optional form-metadata enrichment.
export function requiresSavedAssessment(record:Row, action:DynamicLogbookAction, role:UserRole, actorId:number, readOnly=false) {
  const verify=verificationFor(record,actorId);
  const savedAction={...action,...record.m_action};
  return !readOnly && role==='staff' && !enabled(savedAction.is_exam) && record.verified!==true && verify.allowed.includes('verified') &&
    ['pending','revised','revision'].includes(String(verify.row?.status??'').trim().toLowerCase()) &&
    !['verified','rejected'].includes(String(record.verified_status||record.status||'').trim().toLowerCase()) &&
    shouldShowScoreAssessment({...record,m_action:savedAction,m_action_category:{...getDynamicCategories(action).find(c=>c.id===Number(record.id_category??record.m_action_category?.id)),...record.m_action_category}});
}
const definitions = [
  {key:'score_psikomotor',match:/psikomotor|psychomotor/i,legacy:1,current:4},
  {key:'score_knowledge',match:/knowledge|pengetahuan/i,legacy:2,current:5},
  {key:'score_affective',match:/affective|afektif|affectif|attitude/i,legacy:3,current:6},
] as const;
export function savedAssessmentDraft(record:Row,action:DynamicLogbookAction,actorId:number):Record<string,string|number> {
  const rows=ownAssessmentRows(record,actorId);
  return Object.fromEntries(getDynamicAsmParams(action).map(p=>{
    const definition=definitions.find(d=>d.match.test(p.label));
    const exact=rows.find(r=>Number(r.id_asm_param)===p.id);
    const semantic=definition && (rows.find(r=>definition.match.test([r.name,r.label,r.aspect,r.type,r.category].join(' '))) ?? rows.find(r=>Number(r.id_asm_param)===definition.legacy || Number(r.id_asm_param)===definition.current));
    const raw=(exact??semantic)?.score;
    return [p.id,raw==null?'':String(raw).trim()];
  }));
}
export function assessmentWireScores(action:DynamicLogbookAction,scores:Record<string,string|number>):Row {
  const params=getDynamicAsmParams(action),options=getDynamicScoreOptions(action);
  if(!params.length)throw new Error('Parameter penilaian belum tersedia dari metadata server.');
  for(const p of params){
    const raw=scores[p.id],n=Number(raw);
    if(raw==null || String(raw).trim()==='' || !Number.isFinite(n) || (p.minScore!==undefined && n<p.minScore) || (p.maxScore!==undefined && n>p.maxScore) || (enabled(action.has_score_option) && !options.includes(n)))throw new Error(`Nilai ${p.label} tidak valid.`);
  }
  return Object.fromEntries(definitions.map(d=>{
    const matches=params.filter(p=>d.match.test(p.label));
    if(matches.length!==1)throw new Error(`Metadata ${d.key} tidak tersedia atau ambigu; tidak membuat ID penilaian lokal.`);
    return [d.key,String(scores[matches[0].id])];
  }));
}
export function rejectionNote(row:Row):string {
  const raw=row.reject_notes ?? (['rejected','revised','revision'].includes(String(row.status??'').trim().toLowerCase()) ? String(row.notes??row.revision_note??'').replace(/^__staff_jejaring__\s*/i,'') : '');
  return typeof raw==='string'?raw.trim():typeof raw==='number'||typeof raw==='boolean'?String(raw):'';
}
