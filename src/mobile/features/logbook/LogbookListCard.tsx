import { CalendarDays, MapPin, UserRound, Shapes, Barcode, CircleCheck, RotateCcw, CircleX, CircleHelp } from 'lucide-react';
import type { Row } from './model';
import {enabled,getDynamicCategories} from './dynamicLogbookForm';
import { buildListPresentation, isPpdsBimbinganCard, isStaffBimbinganCard } from './listPresentation';
import './list-cards.css';

/** One native Pressable maps to one keyboard-accessible HTML button. */
export default function LogbookListCard({action,record,role,groupedEntry=false,onOpen}:{action:Row;record:Row;role:string;groupedEntry?:boolean;onOpen:()=>void}) {
  const card=buildListPresentation(action,record,role,groupedEntry);
  const fourRows=card.kind==='record'&&(isPpdsBimbinganCard(action,record,role)||isStaffBimbinganCard(action,record,role));
  const categoryId=Number(record.id_category??record.m_action_category?.id);
  const category=getDynamicCategories(action).find(c=>c.id===categoryId) ?? (fourRows?getDynamicCategories(record.m_action??{}).find(c=>c.id===categoryId):undefined);
  const rawCategoryName=record.m_action_category?.name??category?.label;
  const categoryName=fourRows?(String(rawCategoryName??'').trim()||'-'):rawCategoryName;
  const operationCode=String(record.operation_code??'').trim()||'-';
  const StatusIcon=card.status.icon==='check'?CircleCheck:card.status.icon==='retry'?RotateCcw:card.status.icon==='failed'?CircleX:CircleHelp;
  const SecondaryIcon=card.secondaryIcon==='location'?MapPin:CalendarDays;
  const categoryRow=(fourRows||enabled(record.m_action_category?.is_other)||category?.is_other) && <span className="mweb-list-info-row"><Shapes size={16} aria-hidden="true"/><span className="mweb-list-label">Kategori :</span><span data-list-key="category">{categoryName}</span></span>;
  return <button type="button" className={`mweb-card mweb-record-card mweb-list-card mweb-list-${card.kind} mweb-list-tone-${card.status.tone}`} onClick={onOpen}>
    <span className="mweb-list-top">
      <span className="mweb-list-heading">
        <span data-list-key="headline" className="mweb-list-headline">{card.headline}</span>
        {card.kind==='record'&&card.subheadline&&<span data-list-key="subheadline" className="mweb-list-subheadline">{card.subheadline}</span>}
      </span>
      <span className="mweb-list-status"><StatusIcon size={15} aria-hidden="true"/><span data-list-key="status">{card.status.label}</span></span>
    </span>
    {card.kind==='bimbingan-entry'&&<span data-list-key="subheadline" className="mweb-list-subheadline">{card.subheadline}</span>}
    {card.kind==='bimbingan-entry'&&categoryRow}
    {card.kind==='record'&&<span className="mweb-list-info">
      <span className="mweb-list-info-row"><UserRound size={16} aria-hidden="true"/><span className="mweb-list-label">{card.primaryLabel}</span><span data-list-key="primary">{card.primary}</span></span>
      {categoryRow}
      <span className="mweb-list-info-row"><SecondaryIcon size={16} aria-hidden="true"/><span className="mweb-list-label">{card.secondaryLabel}</span><span data-list-key="secondary">{card.secondary}</span></span>
      {fourRows&&<span className="mweb-list-info-row"><Barcode size={16} aria-hidden="true"/><span className="mweb-list-label">Operation Code</span><span data-list-key="operation-code">{operationCode}</span></span>}
    </span>}
  </button>;
}
