import { useEffect, useRef, useState, type ReactNode } from 'react';
import { enabled, getDynamicAnotherRoles, getDynamicAsmParams, getDynamicCategories, getDynamicHospitals, getDynamicRoleMaps, getDynamicScoreOptions, getDynamicStases, getEligibleStaffJejaringConfig, getMorbiditasDefaultVerifierUserIds, getRequiredDynamicVerifierRoleIds, isMorbiditasAction, shouldShowDynamicScoreFields, type DynamicChoice, type DynamicLogbookAction, type DynamicLogbookFormValues, type UserRole } from './dynamicLogbookForm';
import { arr, dateInput, fieldsFor, formPayload, localNow, validateValues, valuesFromRecord, type Row } from './model';
import { AttachmentFields, activeAttachments, type UploadDraft } from './AttachmentFields';

import { useMobileSession } from '../../session';
import { CategoryPicker } from './CategoryPicker';
import { getInitialExamParticipant, mergeCurrentExamParticipant } from './ActionLogbookEditParticipant';
export function SelectField({label,value,options,onChange,disabled=false,required=false}:{label:string;value?:number;options:DynamicChoice[];onChange:(id:number|undefined)=>void;disabled?:boolean;required?:boolean}) {return <label className="mweb-field"><span>{label}{required?' *':''}</span><select value={value??''} disabled={disabled} required={required} onChange={e=>onChange(e.target.value?Number(e.target.value):undefined)}><option value="">Pilih {label}</option>{value&&!options.some(o=>o.id===value)&&<option value={value}>Pilihan tersimpan (ID {value})</option>}{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select>{!options.length&&<small>Opsi belum tersedia dari server.</small>}</label>;}
export function ScoreFields({action,values,onChange,disabled=false}:{action:DynamicLogbookAction;values:Record<string,string|number>;onChange:(v:Record<string,string|number>)=>void;disabled?:boolean}) {const options=getDynamicScoreOptions(action);return <fieldset className="mweb-score" disabled={disabled}><legend>Penilaian ASM</legend>{getDynamicAsmParams(action).map(p=><label className="mweb-field" key={p.id}><span>{p.label} *</span>{enabled(action.has_score_option)?<select required value={values[p.id]??''} onChange={e=>onChange({...values,[p.id]:e.target.value})}><option value="">Pilih nilai</option>{options.map(n=><option key={n} value={n}>{n}</option>)}</select>:<input required type="number" min={p.minScore} max={p.maxScore} step="any" value={values[p.id]??''} onChange={e=>onChange({...values,[p.id]:e.target.value})}/>}</label>)}</fieldset>;}
export default function LogbookForm({action:initialAction,record,role,identity,participants:serverParticipants,onSubmit,onCancel,onPreview,onDirty,history,onDelete,externalBusy=false}:{action:DynamicLogbookAction;record?:Row;role:UserRole;identity:{id:number;id_client:number;id_stase?:number|null};participants:DynamicChoice[];onSubmit:(payload:Row)=>Promise<void>;onCancel:()=>void;onPreview:(url:string)=>void;onDirty?:()=>void;history?:ReactNode;onDelete?:()=>void;externalBusy?:boolean}) {
  const [action,setAction]=useState(initialAction);
  const [categoryPending,setCategoryPending]=useState(false);
  const categoryGate=useRef(false);
  const participants=record ? mergeCurrentExamParticipant(serverParticipants,getInitialExamParticipant(record)) : serverParticipants;
  const [values,setValues]=useState<DynamicLogbookFormValues>(()=>record?{...valuesFromRecord(record,action),userStaseId:Number(record.id_stase ?? record.m_user?.id_stase)||identity.id_stase}:{date:new Date(),userStaseId:identity.id_stase,roleUsers:role==='ppds'?getMorbiditasDefaultVerifierUserIds(action):{},emr:{},asm:{},is_presentation:false,is_retake:false});
  const [date,setDate]=useState(()=>record?dateInput(record.date):localNow());const [retained,setRetained]=useState(()=>record?activeAttachments(record):[]);const [drafts,setDrafts]=useState<UploadDraft[]>([]);const [saving,setBusy]=useState(false);const [errors,setErrors]=useState<string[]>([]);const lock=useRef(false);const form=useRef<HTMLFormElement>(null);
  const busy=saving || externalBusy;
  const [attachmentsPending,setAttachmentsPending]=useState(false);
  const attachmentGate=useRef(false);
  const pending=(value:boolean)=>{attachmentGate.current=value;setAttachmentsPending(value);};
  // The shell owns its floating navbar. Measure its actual safe-area/font height
  // locally rather than restyling it or assuming a phone-specific fixed offset.
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.mobile-bottom-nav');
    const measure = () => {
      const clearance = nav ? Math.max(0, window.innerHeight - nav.getBoundingClientRect().top) + 12 : 12;
      form.current?.style.setProperty('--mweb-form-nav-clearance', `${clearance}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav) observer.observe(nav);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const update=(patch:Partial<DynamicLogbookFormValues>)=>{setValues(v=>({...v,...patch}));onDirty?.();};const fields=fieldsFor(action,role);const morbid=isMorbiditasAction(action);const jejaring=morbid?undefined:getEligibleStaffJejaringConfig(action,values.userStaseId);
  const morbidCreate=morbid&&!record;
  const morbidEdit=morbid&&!!record;
  const defaults=role==='ppds'&&!record?getMorbiditasDefaultVerifierUserIds(action):{};
  function sameSession(){const u=useMobileSession.getState().user;return u?.id===identity.id&&u.id_client===identity.id_client;}
  async function submit(e:React.FormEvent){e.preventDefault();if(lock.current || externalBusy || categoryGate.current)return;if(!sameSession()){setErrors(['Sesi berubah. Buka kembali form dari sesi aktif.']);return;}const errs=validateValues(action,values,role,!!record);if(enabled(action.is_exam)&&!participants.some(p=>p.id===values.participantId))errs.push('Pilih peserta PPDS dari daftar server.');if(attachmentGate.current||drafts.some(d=>d.state!=='done'||!d.uploaded))errs.push('Selesaikan tinjauan dan upload lampiran, coba lagi file yang gagal, atau hapus lampiran tersebut.');if(errs.length){setErrors(errs);form.current?.querySelector<HTMLElement>('[aria-invalid="true"],input:invalid,select:invalid')?.focus();return;}lock.current=true;setBusy(true);setErrors([]);try{const payload=formPayload(action,values,role,date,record?.date);const all=drafts;
    if(enabled(action.has_attachment))payload.t_logbook_attachment=[...retained.map(a=>{if(a.id==null)throw new Error('ID lampiran tersimpan tidak tersedia. Muat ulang sebelum menyimpan.');return {id:a.id};}),...all.flatMap(a=>a.uploaded?[{name:a.uploaded.name,url_file:a.uploaded.url_file}]:[])];
    // Native Edit retains the saved reporter ID even if the current option catalog no longer contains it.
    // Assessment/KPS assignments stay server-owned; only the reporter is emitted.
    if(record&&morbid)payload.t_logbook_status=getDynamicRoleMaps(action).filter(r=>/pelapor|reporter|melaporkan/i.test(`${r.label} ${r.identifier}`)).flatMap(r=>{const id_user=values.roleUsers?.[String(r.idActionRole)];return id_user?[{id_action_role:r.idActionRole,id_user,status:'pending'}]:[];});
    if(record&&Array.isArray(payload.t_logbook_status)){payload.t_logbook_status=payload.t_logbook_status.filter((s:Row)=>!morbid||getDynamicRoleMaps(action).some(r=>r.idActionRole===s.id_action_role&&/pelapor|reporter|melaporkan/i.test(`${r.label} ${r.identifier}`))).map((s:Row)=>{const old=arr(record.t_logbook_status).find(r=>Number(r.id_action_role)===s.id_action_role&&String(r.notes??'').includes('__staff_jejaring__')===String(s.notes??'').includes('__staff_jejaring__'));return {...s,status:old?.status??'pending'};});if(!payload.t_logbook_status.length)delete payload.t_logbook_status;}
    if(!sameSession())throw new Error('Sesi telah berubah.');await onSubmit(payload);
  }catch(error){setErrors([error instanceof Error?error.message:'Gagal menyimpan logbook.']);}finally{lock.current=false;setBusy(false);}}
  // Keep one metadata renderer. Morbiditas Create follows Native's patient →
  // attachment → chronology → date → verifier sequence: documentation first,
  // then activity. The existing desktop two-column / phone stack stays intact.
  // Edit intentionally uses Native Edit's different labels and patient order.
  const documentationKeys = new Set(['emr', 'notes', 'attachments', 'asm']);
  const documentationFields = fields.filter(field => documentationKeys.has(field.key) && (field.key !== 'asm' || shouldShowDynamicScoreFields(action,role,values)));
  const activityFields = fields.filter(field => !documentationKeys.has(field.key));
  if(morbidCreate) activityFields.sort((a,b)=>Number(b.key==='date')-Number(a.key==='date'));
  const renderField = (field: typeof fields[number]) => {switch(field.key){case 'action_roles':return <section key={field.key} className="mweb-section"><h3>Staff / Verifikator</h3>{getDynamicRoleMaps(action).map(r=><SelectField key={r.idActionRole} label={r.label} required={!morbidEdit&&getRequiredDynamicVerifierRoleIds(action).includes(r.idActionRole)} disabled={defaults[String(r.idActionRole)]!==undefined||(morbidEdit&&(!/pelapor|reporter|melaporkan/i.test(`${r.label} ${r.identifier}`)||record?.verified===true||String(record?.verified_status??'').trim().toLowerCase()==='verified'))} value={values.roleUsers?.[r.idActionRole]} options={r.users} onChange={id=>update({roleUsers:{...values.roleUsers,[r.idActionRole]:id??0}})}/>)}{jejaring&&<SelectField label="Staff Pengajar Jejaring (opsional)" value={values.staffJejaringUserId} options={jejaring.users} onChange={staffJejaringUserId=>update({staffJejaringUserId})}/>}</section>;
    case 'date':return <label className="mweb-field mweb-form-wide" key="date"><span>{morbid?'Tanggal Morbiditas':'Tanggal & waktu'} *</span><input type="datetime-local" required step="1" value={date} onChange={e=>{setDate(e.target.value);onDirty?.();}}/><small>Waktu lokal perangkat. Tanggal tersimpan tidak dikonversi ke UTC.</small></label>;
    case 'title':case 'notes':case 'location':{const key=field.key;const label=morbid&&key==='notes'?'Kronologi Morbiditas':String(action[`${key}_name`]??{title:'Judul',notes:'Catatan',location:'Lokasi'}[key]);return <label className={`mweb-field${key==='notes'||key==='title'?' mweb-form-wide':''}`} key={key}><span>{label}{!morbidEdit?' *':''}</span>{key==='notes'?<textarea required={!morbidEdit} rows={4} value={values[key]??''} onChange={e=>update({[key]:e.target.value})}/>:<input required value={values[key]??''} onChange={e=>update({[key]:e.target.value})}/>}</label>;}
    case 'another_role':return <SelectField key={field.key} label={String(action.another_role_name??'Peran')} required options={getDynamicAnotherRoles(action)} value={values.anotherRoleId} onChange={anotherRoleId=>update({anotherRoleId})}/>;
    case 'category':return enabled(action.allow_other_categories)?<CategoryPicker key={field.key} action={action} identity={identity} value={values.categoryId} onChange={categoryId=>update({categoryId})} onAction={setAction} onPending={v=>{categoryGate.current=v;setCategoryPending(v);}} disabled={busy}/>:<SelectField key={field.key} label={String(action.category_name??'Kategori')} required options={getDynamicCategories(action)} value={values.categoryId} onChange={categoryId=>update({categoryId})}/>;
    case 'hospital':return <SelectField key={field.key} label="Rumah Sakit" required options={getDynamicHospitals(action)} value={values.hospitalId} onChange={hospitalId=>update({hospitalId})}/>;
    case 'stase':return <SelectField key={field.key} label="Stase" required options={getDynamicStases(action)} value={values.staseId} onChange={staseId=>update({staseId})}/>;
    case 'exam_result':return <label className="mweb-field" key={field.key}><span>Hasil Ujian *</span><select required value={values.exam_result??''} onChange={e=>update({exam_result:e.target.value})}><option value="">Pilih Status</option>{['Lolos','Remidi','Tidak Lolos'].map(v=><option key={v}>{v}</option>)}</select></label>;
    case 'is_presentation':return <div key={field.key} className="mweb-presentation-toggle"><span>Presentasi</span><button type="button" role="switch" aria-label="Presentasi" aria-checked={!!values.is_presentation} className="mweb-switch" disabled={busy} onClick={()=>update({is_presentation:!values.is_presentation})}><span className="mweb-switch-track" aria-hidden="true"><span className="mweb-switch-thumb"/></span></button></div>;
    case 'is_retake':return <label key={field.key} className="mweb-checkbox"><input type="checkbox" checked={!!values.is_retake} onChange={e=>update({is_retake:e.target.checked})}/>Mengulang</label>;
    case 'emr':return <section className="mweb-section" key="emr"><h3>Data Pasien</h3>{(morbidCreate?[['patient_name','Nama PX'],['age','Umur'],['diagnosis','DX Awal'],['emr_number','CM']]:morbidEdit?[['patient_name','Nama PX'],['age','Umur'],['emr_number','CM'],['diagnosis','DX Awal']]:[['patient_name','Nama Pasien'],['age','Usia (tahun)'],['month','Usia (bulan)'],['gender','Jenis Kelamin'],['diagnosis','Diagnosis'],['treatment','Tindakan']]).map(([key,label])=><label className={`mweb-field${['diagnosis','treatment'].includes(key)?' mweb-form-wide':''}`} key={key}><span>{label}{!morbidEdit?' *':''}</span>{key==='gender'?<select required value={values.emr?.gender??''} onChange={e=>update({emr:{...values.emr,gender:e.target.value}})}><option value="">Pilih Jenis Kelamin</option><option>Male (M)</option><option>Female (F)</option></select>:morbid&&key==='diagnosis'?<textarea required={!morbidEdit} rows={4} value={values.emr?.[key as keyof NonNullable<typeof values.emr>]??''} onChange={e=>update({emr:{...values.emr,[key]:e.target.value}})}/>:<input required={!morbidEdit} type={['age','month'].includes(key)?'number':'text'} min={['age','month'].includes(key)?0:undefined} max={key==='month'?11:undefined} step={key==='month'?1:undefined} value={values.emr?.[key as keyof NonNullable<typeof values.emr>]??''} onChange={e=>update({emr:{...values.emr,[key]:e.target.value}})}/>}</label>)}</section>;
    case 'attachments':return <AttachmentFields key="attachments" action={action} identity={identity} retained={retained} drafts={drafts} onRetained={a=>{setRetained(a);onDirty?.();}} onDrafts={a=>{setDrafts(a);onDirty?.();}} onPreview={onPreview} disabled={busy} onPendingChange={pending}/>;
    case 'asm':return shouldShowDynamicScoreFields(action,role,values)?<ScoreFields key="asm" action={action} values={values.asm??{}} onChange={asm=>update({asm})}/>:null;
    default:return null;}};
  return <form ref={form} className="mweb-form" onSubmit={submit}>
    {errors.length>0&&<div className="mweb-error-panel" role="alert" tabIndex={-1}><strong>Data belum dapat disimpan</strong><ul>{errors.map((err,i)=><li key={i}>{err}</li>)}</ul></div>}
    <p className="mweb-muted">Lengkapi data kegiatan. Kolom bertanda * wajib diisi; lampiran selalu opsional.</p>
    <fieldset disabled={busy} className={`mweb-form-fields${documentationFields.length?'':' mweb-form-single'}`}>
      <legend className="mweb-form-legend">Data logbook</legend>
      {morbidCreate&&documentationFields.length>0&&<section className="mweb-form-column" aria-label="Dokumentasi kegiatan"><h3 className="mweb-form-column-heading">Data pasien & dokumentasi</h3>{documentationFields.map(renderField)}</section>}
      <section className="mweb-form-column" aria-label="Informasi kegiatan">
        <h3 className="mweb-form-column-heading">Informasi kegiatan</h3>
        {enabled(action.is_exam)&&<SelectField label="Peserta PPDS" required value={values.participantId} options={participants} onChange={participantId=>update({participantId})}/>}
        {activityFields.map(renderField)}
      </section>
      {!morbidCreate&&documentationFields.length>0&&<section className="mweb-form-column" aria-label="Dokumentasi kegiatan">
        <h3 className="mweb-form-column-heading">{enabled(action.has_emr)?'Data pasien & dokumentasi':'Catatan & dokumentasi'}</h3>
        {documentationFields.map(renderField)}
      </section>}
    </fieldset>
    {record && history}
    <footer className="mweb-actions">{record && onDelete && <button type="button" className="mweb-btn mweb-danger mweb-delete-action" disabled={busy||drafts.some(d=>d.state==='uploading')} onClick={onDelete}>Hapus</button>}<button type="button" className="mweb-btn" disabled={busy} onClick={onCancel}>Batal</button><button type="submit" className="mweb-btn mweb-primary" disabled={busy||categoryPending||attachmentsPending||drafts.some(d=>d.state!=='done'||!d.uploaded)}>{busy?'Menyimpan…':'Simpan Logbook'}</button></footer>

  </form>;
}
