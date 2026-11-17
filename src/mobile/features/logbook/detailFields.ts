import { DETAIL_SCHEMAS, normalizeActionKey } from './detailSchemas';
import { enabled, getDynamicAnotherRoles, getDynamicCategories, getDynamicHospitals, type DynamicLogbookAction, type UserRole } from './dynamicLogbookForm';
import { arr, type Row } from './model';
export type DetailField = {key:string;label:string;value:string;patient?:boolean;wide?:boolean;attachment?:boolean};
const text=(v:unknown):string=>typeof v==='string'?v.trim()||'-':typeof v==='number'||typeof v==='boolean'?String(v):'-';
export function formatDetailDate(value:unknown) {if(!value)return '-';const raw=text(value).replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)/,'$1T$2').replace(/([+-]\d{2})(\d{2})$/,'$1:$2').replace(/([+-]\d{2})$/,'$1:00');const d=new Date(raw);if(Number.isNaN(d.getTime()))return raw;return `${String(d.getDate()).padStart(2,'0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()} - ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
export function detailValue(record:Row,...paths:string[]) {for(const path of paths){const v=path.split('.').reduce((r,k)=>r?.[k],record);const s=text(v);if(s!=='-')return s;}return '-';}
export const isDetailExam=(action:DynamicLogbookAction)=>enabled(action.is_exam)||String(action.identifier??'').trim().toLowerCase()==='exam';
export function examPresentation(value:unknown) {const result=String(value??'').trim().replace(/\s+/g,' ').toLowerCase();return result==='lolos'?{label:'Lolos',tone:'lolos',icon:'✓'}:result==='remidi'?{label:'Remidi',tone:'remidi',icon:'↻'}:result==='tidak lolos'?{label:'Tidak Lolos',tone:'tidak-lolos',icon:'✕'}:{label:'-',tone:'unknown',icon:'–'};}
export function detailActionKey(action:DynamicLogbookAction) {return isDetailExam(action)?'exam':normalizeActionKey([action.identifier,action.name].filter(Boolean).join(' '),'');}
/** Mobile deliberately reads the primary EMR only; child insertion order is not field order. */
export function buildDetailFields(action:DynamicLogbookAction,record:Row,role:UserRole):DetailField[] {
  const family=detailActionKey(action),morbid=family==='morbiditas';
  const schema=DETAIL_SCHEMAS[family]??{admin:['participant','date','notes'],staff:['participant','date','notes'],ppds:['staff','date','notes']};
  const schemaKeys=schema[role==='institution-admin'?'admin':role];
  const isOther=enabled(record.m_action_category?.is_other)||getDynamicCategories(action).find(c=>c.id===Number(record.id_category??record.m_action_category?.id))?.is_other;
  const keys=isOther&&!schemaKeys.includes('category')?[...schemaKeys,'category']:schemaKeys;
  const emr=arr(record.t_logbook_emr)[0]??{};
  const relation=(nested:string,id:string,choices:{id:number;label:string}[],...aliases:string[])=>{
    const direct=detailValue(record,`${nested}.name`,`${nested}.role_name`,`${nested}.0.name`,`${nested}.0.role_name`,...aliases);
    if(direct!=='-')return direct;
    const matched=choices.find(c=>c.id===Number(record[id]??record[nested]?.id));return matched?.label??'-';
  };
  const category=relation('m_action_category','id_category',getDynamicCategories(action),'category','kategori');
  const points=record.m_action_category?.points;
  const map:Record<string,[string,string,boolean?,boolean?]>={
    role:['Peran',relation('m_another_role','id_another_role',getDynamicAnotherRoles(action),'role','peran','m_role.name','m_another_role.m_action_another_role.0.m_another_role.role_name','m_another_role.m_action_another_role.0.role_name')],
    patientName:[morbid?'Nama PX':'Nama Pasien (Inisial)',detailValue(emr,'patient_name'),true],
    ageYears:[morbid?'Umur':'Usia (Tahun)',detailValue(emr,'age'),true],
    ageMonths:['Usia (Bulan)',detailValue(emr,'month'),true],
    emrNumber:['CM',detailValue(emr,'emr_number'),true],
    gender:['Jenis Kelamin',detailValue(emr,'gender'),true],
    diagnosis:[morbid?'DX Awal':'Diagnosa',detailValue(emr,'diagnosis'),true,true],
    treatment:['Tindakan',detailValue(emr,'treatment'),true,true],
    notes:[morbid?'Kronologi Morbiditas':'Catatan',detailValue(record,'notes','note','catatan'),false,true],
    hospital:['Rumah Sakit',relation('m_hospital','id_hospital',getDynamicHospitals(action),'hospital','rumah_sakit')],
    category:[enabled(record.m_action_category?.is_other)||getDynamicCategories(action).find(c=>c.id===Number(record.id_category))?.is_other?'Keterangan kategori':'Kategori',morbid&&points!=null&&Number.isFinite(Number(points))?`${category} (${Number(points)})`:category],
    title:['Judul',detailValue(record,'title','judul','m_action.name'),false,true],
    location:['Location',detailValue(record,'location','lokasi')],
    presentation:['Presentasi',record.is_presentation===true?'Ya':record.is_presentation===false?'Tidak':'-'],
    status:['Status',examPresentation(record.exam_result).label],
  };
  const flag:Record<string,string>={role:'has_another_role',hospital:'has_hospital',category:'has_category',title:'has_title',notes:'has_notes',location:'has_location',presentation:'has_presentation'};
  return keys.flatMap<DetailField>(key=>{
    if(['participant','staff','date'].includes(key))return [];
    if(key.startsWith('attachment'))return [{key,label:key==='attachment'?'Attachment':key==='attachmentBefore'?'Before':'After',value:'-',attachment:true,wide:true}];
    const field=map[key];if(!field)return [];
    // Explicit metadata false wins; missing legacy flags retain the native schema.
    if(!morbid&&flag[key]&&action[flag[key]]!==undefined&&!enabled(action[flag[key]]))return [];
    if(!morbid&&field[2]&&action.has_emr!==undefined&&!enabled(action.has_emr))return [];
    if(!morbid&&key!=='status'&&field[1]==='-')return [];
    return [{key,label:field[0],value:field[1],patient:field[2],wide:field[3]}];
  });
}

