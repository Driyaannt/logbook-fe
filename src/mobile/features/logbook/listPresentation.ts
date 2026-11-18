import type { Row } from './model';
import { isBimbinganOperasiAction } from './bimbinganOperasiGrouping';

export function isPpdsBimbinganCard(action:Row,item:Row,role:string):boolean {
  return role==='ppds' && (isBimbinganOperasiAction(action)||isBimbinganOperasiAction(item.m_action));
}
export function isStaffBimbinganCard(action:Row,item:Row,role:string):boolean {
  return /^staff(?:[\s_-]*jejaring)?$/i.test(role.trim()) && (isBimbinganOperasiAction(action)||isBimbinganOperasiAction(item.m_action));
}

/** Read-only presentation of ActionLogbookListScreen, not Detail/form metadata. */
export type ListStatus = {label:string; tone:'verified'|'pending'|'rejected'|'lolos'|'remidi'|'tidak-lolos'|'unknown'; icon:'check'|'retry'|'failed'|'unknown'};
export type ListPresentation = {
  kind:'record'|'bimbingan-entry'; headline:string; subheadline:string;
  status:ListStatus; primaryLabel:string; primary:string;
  secondaryLabel:string; secondary:string; secondaryIcon:'calendar'|'location';
};
function text(value:unknown,fallback='-'):string {
  if(typeof value==='string')return value.trim()||fallback;
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  return fallback;
}
const meaningful=(value:string)=>value.trim()!==''&&value.trim()!=='-';
const enabled=(value:unknown)=>value===true||value===1||value==='1'||value==='true'||value==='t';
export function formatListDate(value:unknown):string {
  if(!value)return '-';
  let raw=text(value);if(raw==='-')return '-';
  raw=raw.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)/,'$1T$2')
    .replace(/([+-]\d{2})(\d{2})$/,'$1:$2').replace(/([+-]\d{2})$/,'$1:00');
  const parsed=new Date(raw);if(Number.isNaN(parsed.getTime()))return raw;
  return `${String(parsed.getDate()).padStart(2,'0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parsed.getMonth()]} ${parsed.getFullYear()} - ${String(parsed.getHours()).padStart(2,'0')}:${String(parsed.getMinutes()).padStart(2,'0')}`;
}
export function listStatus(item:Row):ListStatus {
  const normalized=String(item.verified_status||item.status||'').trim().toLowerCase();
  // Native action lists use aggregate status; never substitute the viewer's slot.
  if(item.verified===true||normalized==='verified')return {label:'Verified',tone:'verified',icon:'check'};
  if(normalized==='rejected')return {label:'Rejected',tone:'rejected',icon:'failed'};
  return {label:normalized==='revised'||normalized==='revision'?'Revised':'Pending',tone:'pending',icon:'retry'};
}
export function listExamStatus(value:unknown):ListStatus {
  const normalized=typeof value==='string'?value.trim().replace(/\s+/g,' ').toLowerCase():'';
  if(normalized==='lolos')return {label:'Lolos',tone:'lolos',icon:'check'};
  if(normalized==='remidi')return {label:'Remidi',tone:'remidi',icon:'retry'};
  if(normalized==='tidak lolos')return {label:'Tidak Lolos',tone:'tidak-lolos',icon:'failed'};
  return {label:'-',tone:'unknown',icon:'unknown'};
}
export function buildListPresentation(action:Row,item:Row,role:string,groupedEntry=false):ListPresentation {
  const exam=enabled(action?.is_exam)||enabled(item.m_action?.is_exam)||[action?.identifier,item.m_action?.identifier].some(v=>typeof v==='string'&&v.trim().toLowerCase()==='exam');
  const date=formatListDate(item.date);
  const staffName=Array.isArray(item.t_logbook_status)?item.t_logbook_status.map((s:Row)=>text(s?.staff_name,'')).find(Boolean)||text(item.created_by_name):text(item.created_by_name);
  const location=text(item.m_hospital?.name||item.location);
  const dateFallback=!meaningful(location);
  const ppds=role==='ppds';
  const fourRows=isPpdsBimbinganCard(action,item,role)||isStaffBimbinganCard(action,item,role);
  if(groupedEntry&&!fourRows)return {kind:'bimbingan-entry',headline:text(item.m_user?.display_name,'PPDS'),subheadline:text(item.operation_code,`LB${item.id}`),status:listStatus(item),primaryLabel:'',primary:'',secondaryLabel:'',secondary:'',secondaryIcon:'calendar'};
  return {kind:'record',headline:groupedEntry&&fourRows?date:exam?text(item.m_action_category?.name??item.category??item.title,'Exam'):text(item.title,date),
    subheadline:groupedEntry&&fourRows?'':exam?'':meaningful(text(item.title,''))&&date!=='-'?date:'Waktu input logbook',
    status:exam?listExamStatus(item.exam_result):listStatus(item),
    primaryLabel:ppds?'Staff':'PPDS',
    primary:isStaffBimbinganCard(action,item,role)?text(item.m_user?.display_name):exam?(ppds?text(item.created_by_name):text(item.m_user?.display_name)):(ppds?text(staffName,text(item.m_user?.display_name)):text(item.m_user?.display_name,staffName)),
    secondaryLabel:fourRows?'Lokasi':exam||dateFallback?'Tanggal':'Lokasi',secondary:fourRows?location:exam||dateFallback?date:location,
    secondaryIcon:!fourRows&&(exam||dateFallback)?'calendar':'location'};
}
