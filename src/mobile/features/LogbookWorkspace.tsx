import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import DeleteLogbookDialog from './logbook/DeleteLogbookDialog';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import FloatingAddButton from '../FloatingAddButton';
import { mobileRequest } from '../api';
import { auditScreenVisit } from '../useNavigationAudit';
import { safeTodoReturn } from '../todo';
import { useListPosition } from '../useListPosition';
import { useInfiniteScroll } from '../useInfiniteScroll';
import { InfiniteScrollFooter } from '../InfiniteScrollFooter';
import { actorKey, readListMemory, readListWindow, saveListWindow, captureReturn, returnDestination, canPopReturn } from '../navigation';
import { useMobileSession } from '../session';
import { arr, listPage, normalizeRole, resultBody, type Row } from './logbook/model';
import {
  enabled,
  getDynamicAnotherRoles,
  getDynamicCategories,
  getDynamicHospitals,
  getDynamicStaffUsers,
  getDynamicStaffJejaringUsers,
  getDynamicStases,
  type DynamicChoice,
  type DynamicLogbookAction,
} from './logbook/dynamicLogbookForm';
import { canEditLogbookRecord } from './logbook/logbookEditPermission';
import LogbookForm, { SelectField } from './logbook/LogbookForm';
import LogbookDetail, { VerifierCards } from './logbook/LogbookDetail';
import LogbookListCard from './logbook/LogbookListCard';
import { AttachmentPreview } from './logbook/AttachmentFields';
import './logbook/logbook.css';
import './logbook/form-layout.css';
import { installDirtyNavigationGuard } from './logbook/dirtyNavigation';
import { groupedCategoryCards, otherCategoryIds, type CategoryGroup } from './logbook/otherCategories';
import { categoryAggregates, type CategoryAggregate } from './logbook/categoryAggregates';
import { assertReadScope, filterWireFields, isBimbinganRead, nativeFilters, ppdsChoices, readFilterPayload, readRequestRole, shouldGroupLogbooks } from './logbook/readContracts';
import { applyActionLogbookFilters, distinctFilterChoices } from './logbook/actionLogbookFilters';
import { summarizeBimbinganOperasiCategories } from './logbook/bimbinganOperasiGrouping';
export type LogbookWorkspaceProps = {
  actionId?: string;
  recordId?: string;
  mode?: 'list' | 'create' | 'edit' | 'detail';
  explore?: boolean;
  userId?: string;
};
const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : 'Permintaan gagal. Silakan coba lagi.';
const positiveId = (v: unknown) =>
  /^\d+$/.test(String(v)) && Number.isSafeInteger(Number(v)) && Number(v) > 0;
const PAGE_SIZE = 30;
const summarizeCategories=(categories:DynamicChoice[],records:Row[]):CategoryAggregate[] => summarizeBimbinganOperasiCategories(categories,records).map(c=>({id:c.id,label:c.label,count:c.count,presentation:c.presentationCount,presented:c.presentedCount}));
export default function LogbookWorkspace(props: LogbookWorkspaceProps) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const user = useMobileSession((s) => s.user);
  const actionId = props.actionId ?? params.actionId;
  const recordId = props.recordId ?? params.recordId ?? params.id;
  const mode =
    props.mode ??
    (location.pathname.endsWith('/create')
      ? 'create'
      : location.pathname.endsWith('/edit')
        ? 'edit'
        : recordId
          ? 'detail'
          : 'list');
  // Read-only provenance is the explicit Explore route, not arbitrary query/state.
  useLayoutEffect(()=>{if(mode==='detail')window.scrollTo(0,0);},[location.pathname,mode]);
  const explore = props.explore === true;
  const target = explore ? props.userId : undefined;
  const role = normalizeRole(user?.role_name);
  const [action, setAction] = useState<DynamicLogbookAction | null>(null);
  const [metadataAvailable, setMetadataAvailable] = useState(false);
  const [catalog, setCatalog] = useState<Row[]>([]);
  const [record, setRecord] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError,setMoreError]=useState('');
  const moreLock=useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState('');
  const [participants, setParticipants] = useState<DynamicChoice[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(()=>{if(user && mode==='list' && !explore && positiveId(actionId))auditScreenVisit(filterOpen?'home/dynamic-logbook-filter':'home/dynamic-logbook',Number(actionId));},[filterOpen,mode,explore,actionId,user?.id,user?.id_client]);
  const [filterDraft, setFilterDraft] = useState<Row>({});
  const [serverCategories, setServerCategories] = useState<CategoryAggregate[] | undefined>();
  const [group, setGroup] = useState<CategoryGroup | undefined>();
  const [presentation, setPresentation] = useState(false);
  const [groupComplete, setGroupComplete] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const generation = useRef(0);
  const mutationLock = useRef(false);
  const entryLock = useRef('');
  const dirty = useRef(false);
  const saveAcknowledged = useRef<{ key: string; id: string | number | null } | null>(null);
  const identityKey = `${user?.id}:${user?.id_client}`;
  const filtersKey = search.toString();
  const viewKey = `${identityKey}:${actionId}:${recordId}:${mode}:${explore}:${target}:${filtersKey}`;
  const currentView = useRef(viewKey);
  currentView.current = viewKey;
  const [loadedView, setLoadedView] = useState('');
  const [requestView, setRequestView] = useState(viewKey);
  const scopedError = requestView === viewKey ? error : '';
  const loadedViewRef = useRef(loadedView);
  loadedViewRef.current = loadedView;
  const initialLoading = loadedView !== viewKey;
  const listKey=`${identityKey}:${location.pathname}${location.search}`;
  const rememberList=useListPosition('action',listKey,user ? actorKey(user) : '',{page},mode==='list',!initialLoading && !loading);
  const navigationName = location.state?.menuActionId === actionId ? location.state.menuActionName : undefined;
  const activityName = String((Number(action?.id) === Number(actionId) ? action?.name : undefined) ?? navigationName ?? 'data kegiatan');
  const filters: Row = {};
  for (const key of [
    'start_date',
    'end_date',
    'title',
    'id_ppds',
    'id_staff',
    'id_staff_jejaring',
    'id_hospital',
    'id_category',
    'category_group',
    'id_another_role',
    'id_stase',
    'exam_result',
    'is_presentation',
  ]) {
    const value = search.get(key);
    if (value !== null && value !== '')
      filters[key] = key.startsWith('id_')
        ? Number(value)
        : key === 'is_presentation'
          ? value === 'true'
          : value;
  }
  if (role === 'ppds' && search.get('categoryView') === '1') {
    // Historical folder bookmarks carry navigation-only constraints. Explicit
    // selections are preserved in groupScope by openGroup; absent provenance
    // cannot be guessed to be a user filter. Ordinary filter URLs stay intact.
    for (const key of ['id_category', 'is_presentation', 'category_group']) delete filters[key];
    const scope = new URLSearchParams(search.get('groupScope') ?? '');
    if (positiveId(scope.get('id_category'))) filters.id_category = Number(scope.get('id_category'));
    if (['true', 'false'].includes(scope.get('is_presentation') ?? '')) filters.is_presentation = scope.get('is_presentation') === 'true';
    if (scope.get('category_group') === 'other') filters.category_group = 'other';
  }
  const base = explore ? `/mobile/explore/${target}/logbooks/${actionId}` : `/mobile/logbooks/${actionId}`;
  const readSuffix = '';
  const entryState = () => {rememberList();saveListWindow(actorKey(user!),location.pathname+location.search,page,window.scrollY);return {mobileReturn: captureReturn(user!,location)};};
  function returnBack(fallback: string) {
    if(dirty.current && !window.confirm('Perubahan belum disimpan. Keluar dari form?'))return;
    dirty.current=false;
    const context=mode==='edit' ? location.state?.formReturn : location.state?.mobileReturn;
    const destination=returnDestination(context,user!,location.pathname);
    if(destination && canPopReturn(context,user!,location.pathname,Number(window.history.state?.idx)))navigate(-1);
    else navigate(destination ?? fallback,{replace:true,state:{...(mode==='edit'?{mobileReturn:location.state?.mobileReturn}:{}),readonlyList:context?.savedList}});
  }
  function sameSession() {
    const u = useMobileSession.getState().user;
    return !!user && u?.id === user.id && u.id_client === user.id_client;
  }
  const requestList = useCallback(
    async (actionMeta: DynamicLogbookAction, requested: number, expected: number, summary = false) => {
      if (!user || !positiveId(actionId))
        throw new Error('Identitas aktivitas atau sesi tidak valid.');
      const requestedPage=requested>0 ? Math.floor(requested) : 1;
      const requestFilters={...filters};
      if(summary && search.get('categoryView')==='1') {
        delete requestFilters.id_category;delete requestFilters.is_presentation;delete requestFilters.category_group;
        // Persist user-selected filters separately from drilldown constraints so
        // refresh/deep links keep the same count scope as the category root.
        const scope = new URLSearchParams(search.get('groupScope') ?? '');
        if(scope.get('category_group')==='other')requestFilters.category_group='other';
        if(positiveId(scope.get('id_category')))requestFilters.id_category=Number(scope.get('id_category'));
        if(['true','false'].includes(scope.get('is_presentation') ?? ''))requestFilters.is_presentation=scope.get('is_presentation')==='true';
      }
      const result = resultBody(
        await mobileRequest(explore && target && !isBimbinganRead(actionMeta) && !enabled(actionMeta.allow_other_categories) ? 'getLogbookIdCustomer' : 'getLogbook', {
          id_client: user.id_client,
          id_action: Number(actionId),
          role: readRequestRole(user, role),
          user_id: user.id,
          ...(!(explore && target && !isBimbinganRead(actionMeta) && !enabled(actionMeta.allow_other_categories)) ? {
            page: requestedPage, limit: PAGE_SIZE,
            ...(shouldGroupLogbooks(actionMeta, role) && isBimbinganRead(actionMeta) ? {category_aggregates:true} : {}),
            ...readFilterPayload(requestFilters,actionMeta,role),
            ...(requestFilters.category_group==='other'?{category_group:'other'}:{}),
            ...(!summary && shouldGroupLogbooks(actionMeta, role) && search.get('categoryView')==='1' ? {id_category:filters.id_category,is_presentation:filters.is_presentation} : {}),
          } : {}),
          ...(explore && target ? { customer_id: Number(target) } : {}),
        }),
      );
      if (expected !== generation.current || currentView.current !== viewKey || !sameSession()) return null;
      const parsed = listPage(result, requestedPage, PAGE_SIZE);
      if(requestFilters.category_group==='other'&&parsed.data.some(r=>!otherCategoryIds(actionMeta).has(Number(r.id_category??r.m_action_category?.id))))throw new Error('Server belum mendukung filter kategori Lainnya. Muat ulang setelah layanan diperbarui.');
      assertReadScope(parsed.data,{id_client:user.id_client,id_action:Number(actionId),...(explore && target ? {targetActor:Number(target)} : {})});
      if(explore && target && !isBimbinganRead(actionMeta) && !enabled(actionMeta.allow_other_categories)) {
        parsed.data=applyActionLogbookFilters(parsed.data,nativeFilters(filters,actionMeta,role));
        parsed.total=parsed.data.length;parsed.hasMore=false;
      }
      return {
        ...parsed,
        aggregates: categoryAggregates(result.bimbingan_categories),
        grouped: shouldGroupLogbooks(actionMeta, role),
      };
      // Search is a stable serialization of every list filter.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [viewKey, role],
  );
  const load = useCallback(async () => {
    const token = ++generation.current;
    const current = () => token === generation.current && currentView.current === viewKey && sameSession();
    const refreshing = loadedViewRef.current === viewKey;
    setRequestView(viewKey);
    setLoading(true);
    setLoadingMore(false);
    setMoreError('');moreLock.current=false;
    setError('');
    if (!refreshing) {
      entryLock.current='';setBusy(false);
      setAction(null);
      setMetadataAvailable(false);
      setRecord(null);
      setRows([]);
      setTotal(undefined);
      setHasMore(false);
      setPage(1);
      setParticipants([]);
      setGroup(
        search.get('categoryView') === '1' && filters.category_group==='other' ? 'other' : search.get('categoryView') === '1' && positiveId(filters.id_category)
                  ? Number(filters.id_category)
          : undefined,
      );
      setPresentation(filters.is_presentation === true);
      setServerCategories(undefined);
      setGroupComplete(false);
      setArchiveConfirm(false);
      dirty.current = false;
    }
    if (!user) {
      setLoading(false);
      setError('Sesi tidak tersedia. Silakan masuk kembali.');
      return;
    }
    try {
      if (!actionId) {
        const response = resultBody(
          await mobileRequest('getMasterAction', {
            id_client: user.id_client,
            id_semester: user.id_semester,
          }),
        );
        if (!current()) return;
        assertReadScope(arr(response.data),{id_client:user.id_client});
        setCatalog(arr(response.data));
        setLoadedView(viewKey);
        return;
      }
      if (
        !positiveId(actionId) ||
        (recordId && !positiveId(recordId)) ||
        (explore && !positiveId(target))
      )
        throw new Error('ID aktivitas, logbook, atau pengguna tidak valid.');
      if(mode==='detail') {
        // Native Detail is entered from the saved record, not held hostage by
        // optional form metadata (HomeScreen openActionLogbookDetail).
        const response=resultBody(await mobileRequest('getLogbookById',{id:recordId,id_client:user.id_client,user_id:user.id}));
        if(!response.data || String(response.data.id)!==String(recordId))throw new Error('Detail logbook tidak sesuai permintaan.');
        assertReadScope([response.data],{id_client:user.id_client,id_action:Number(actionId),...(explore && target ? {targetActor:Number(target)} : {})});
        if(Number(response.data.id_action ?? response.data.m_action?.id)!==Number(actionId))throw new Error('Detail logbook bukan milik aktivitas ini.');
        if(!current())return;
        setRecord(response.data);
        setAction(previous=>({...((refreshing && Number(previous?.id)===Number(actionId))?previous:{}),...response.data.m_action,id:Number(actionId),name:response.data.m_action?.name ?? navigationName ?? 'Logbook'}));
        setLoadedView(viewKey);
        setLoading(false);
        // Optional enrichment cannot steal a subsequent route/account or turn
        // a valid saved Detail into a form-metadata error screen.
        void mobileRequest('getLogbookFormMetadata',{id_client:user.id_client,id_action:Number(actionId)}).then(result=>{
          const metadata=resultBody(result).data;
          if(!current() || !metadata || typeof metadata!=='object' || Array.isArray(metadata))return;
          if(metadata.id_client!=null && Number(metadata.id_client)!==user.id_client)return;
          if(metadata.id!=null && Number(metadata.id)!==Number(actionId))return;
          setAction({...response.data.m_action,...metadata});
        }).catch(()=>undefined);
        return;
      }
      let metadataResponse:Row;
      let available=true;
      try {
        metadataResponse=resultBody(await mobileRequest('getLogbookFormMetadata',{id_client:user.id_client,id_action:Number(actionId)}));
        if(!metadataResponse.data || typeof metadataResponse.data!=='object' || Array.isArray(metadataResponse.data))throw new Error('Metadata form logbook tidak tersedia. Tidak membuka form generik tanpa metadata.');
      } catch(error) {
        if(mode!=='list')throw error;
        // Home's list does not depend on successful form metadata. Retain a
        // previously loaded same-action menu, otherwise only its route identity;
        // never expose a generic Create/Edit form from this read-only fallback.
        available=false;
        metadataResponse={data:refreshing && action && Number(action.id)===Number(actionId) ? action : {id:Number(actionId),id_client:user.id_client,name:navigationName ?? 'Logbook'}};
      }
      const meta = metadataResponse.data as DynamicLogbookAction;
      if (meta.id_client != null && Number(meta.id_client) !== user.id_client)
        throw new Error('Metadata berasal dari institusi lain.');
      if (meta.id != null && Number(meta.id) !== Number(actionId))
        throw new Error('Metadata aktivitas tidak sesuai.');
      if (!current()) return;
      setAction(meta);
      setMetadataAvailable(available);
      if (mode === 'list') {
        const first = await requestList(meta, 1, token);
        if (!first) return;
        // Revalidate metadata and the entire loaded window; never revive stale permissions.
        const retained=readListMemory<{page:number}>('action',listKey);
        const savedWindow=readListWindow(actorKey(user),location.pathname+location.search);
        let loadedPage=first.page;
        while(first.hasMore && loadedPage < (retained?.value.page ?? savedWindow?.page ?? 1)) {
          const next=await requestList(meta,loadedPage+1,token);
          if(!next)return;
          if(next.hasMore && next.page<=loadedPage)throw new Error('Server mengulang halaman. Muat ulang daftar.');
          const ids=new Set(first.data.map(r=>String(r.id)));
          first.data=[...first.data,...next.data.filter(r=>!ids.has(String(r.id)))];
          first.hasMore=next.hasMore;first.total=next.total;loadedPage=next.page;
        }
        setRows(first.data);
        setTotal(first.total);
        setPage(loadedPage);
        setHasMore(first.hasMore);
        if (first.grouped && search.get('categoryView')==='1') {
          // Aggregates describe the request's filters: a false-presentation
          // page legitimately reports zero presentations. Read the root's user-
          // filtered scope instead; without aggregates, consume ALL its pages.
          const summary=await requestList(meta,1,token,true);
          if(!summary)return;
          let summaryRows=summary.data, summaryPage=summary.page, more=summary.hasMore;
          const ids=new Set(summaryRows.map(r=>String(r.id)));
          while(summary.aggregates === undefined && more) {
            const next=await requestList(meta,summaryPage+1,token,true);
            if(!next)return;
            const unseen=next.data.filter(r=>!ids.has(String(r.id)));
            if(next.hasMore && (!unseen.length || next.page<=summaryPage))throw new Error('Server mengulang halaman. Total kategori belum dapat dipastikan.');
            unseen.forEach(r=>ids.add(String(r.id)));summaryRows=[...summaryRows,...unseen];summaryPage=next.page;more=next.hasMore;
          }
          setServerCategories(summary.aggregates ?? summarizeCategories(getDynamicCategories(meta),summaryRows));
          setGroupComplete(true);
        } else if (first.grouped && first.aggregates !== undefined) {
          setServerCategories(first.aggregates);
          setGroupComplete(true);
        } else if (first.grouped) {
          let all = first.data;
          let current = loadedPage;
          let more = first.hasMore;
          const seen = new Set(all.map((r) => String(r.id)));
          while (more) {
            const next = await requestList(meta, current+1, token);
            if (!next) return;
            const unseen = next.data.filter((r) => !seen.has(String(r.id)));
            if (next.hasMore && (!unseen.length || next.page<=current))
              throw new Error('Server mengulang halaman. Total kategori belum dapat dipastikan.');
            unseen.forEach((r) => seen.add(String(r.id)));
            all = [...all, ...unseen];
            more = next.hasMore;
            setRows(all);
            current=next.page;
            setPage(current);
            setHasMore(more);
          }
          setGroupComplete(true);
        } else setGroupComplete(true);
      } else {
        if (mode !== 'create') {
          if (!recordId) throw new Error('ID logbook tidak tersedia.');
          const response = resultBody(
            await mobileRequest('getLogbookById', {
              id: recordId,
              id_client: user.id_client,
              user_id: user.id,
            }),
          );
          if (!response.data || String(response.data.id) !== String(recordId))
            throw new Error('Detail logbook tidak sesuai permintaan.');
          assertReadScope([response.data],{id_client:user.id_client,id_action:Number(actionId),...(explore && target ? {targetActor:Number(target)} : {})});
          if (Number(response.data.id_action ?? response.data.m_action?.id) !== Number(actionId))
            throw new Error('Detail logbook bukan milik aktivitas ini.');
          if(response.data.id_client!=null && Number(response.data.id_client)!==user.id_client)throw new Error('Detail berasal dari institusi lain.');
          if(explore && Number(response.data.id_user ?? response.data.m_user?.id)!==Number(target))throw new Error('Detail bukan milik peserta Explore ini.');
          if (!current()) return;
          setRecord(response.data);
        }
        if (enabled(meta.is_exam) && role === 'staff' && (mode === 'create' || mode === 'edit')) {
          const response = resultBody(
            await mobileRequest('getMasterPpds', { id_client: user.id_client }),
          );
          if (!current()) return;
          assertReadScope(arr(response.data),{id_client:user.id_client});
          setParticipants(
            ppdsChoices(response),
          );
        }
      }
    if(current()) setLoadedView(viewKey);
    } catch (e) {
      if (current()) setError(errorMessage(e));
    } finally {
      if (current()) setLoading(false);
    }
    // Captured filter serialization prevents a new request for every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, actionId, recordId, mode, requestList]);
  useEffect(() => {
    load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    setPreview('');
    setNotice('');
    saveAcknowledged.current = null;
  }, [identityKey, actionId, recordId, mode]);
  useEffect(() => installDirtyNavigationGuard(dirty), []);
  useEffect(() => {
    if(mode!=='list' || !filterOpen || !action || !user || !filterWireFields(action,role).includes('id_ppds'))return;
    let active=true;
    mobileRequest('getMasterPpds',{id_client:user.id_client}).then(result=>{
      if(!active || !sameSession() || currentView.current!==viewKey)return;
      const response=resultBody(result);
      assertReadScope(arr(response.data),{id_client:user.id_client});
      setParticipants(ppdsChoices(response));
    }).catch(e=>{if(active && sameSession() && currentView.current===viewKey)setError(errorMessage(e));});
    return ()=>{active=false;};
  },[filterOpen,action,identityKey,role,viewKey]);

  async function loadMore() {
    if (moreLock.current || loading || loadingMore || !hasMore || !action) return;
    moreLock.current=true;
    const token = generation.current;
    setLoadingMore(true);
    setMoreError('');
    try {
      const next = await requestList(action, page + 1, token);
      if (next) {
        const ids=new Set(rows.map(r=>String(r.id)));
        if(next.page<=page || (next.hasMore && !next.data.some(r=>!ids.has(String(r.id)))))throw new Error('Server mengulang halaman tanpa kegiatan baru. Coba lagi.');
        setRows((prev) => {
          const ids = new Set(prev.map((r) => String(r.id)));
          return [...prev, ...next.data.filter((r) => !ids.has(String(r.id)))];
        });
        setPage(next.page);
        setHasMore(next.hasMore);
        setTotal(next.total);
      }
    } catch (e) {
      if (token === generation.current && sameSession()) setMoreError(errorMessage(e));
    } finally {
      if (token === generation.current && sameSession()) {setLoadingMore(false);moreLock.current=false;}
    }
  }
  const canEdit =
    !!record &&
    !explore &&
    canEditLogbookRecord({
      role: user?.role_name,
      action,
      verifiedStatus: record.verified_status ?? record.status,
      verified: record.verified,
      fromExplore: explore,
    }) &&
    (role === 'staff' ||
      Number(record.created_by ?? record.id_user ?? record.m_user?.id) === user?.id);
  // Native list entry resolves the saved record and authoritative metadata before
  // deciding Edit. Notifications/To Do still enter Detail; Explore never mutates.
  async function openListRecord(row: Row) {
    if(entryLock.current || busy || loading || !user)return;
    entryLock.current=viewKey;setBusy(true);setError('');
    const expected=generation.current;
    const current=()=>sameSession() && expected===generation.current && currentView.current===viewKey;
    try {
      const response=resultBody(await mobileRequest('getLogbookById',{id:row.id,id_client:user.id_client,user_id:user.id}));
      if(!current())return;
      if(!response.data || String(response.data.id)!==String(row.id))throw new Error('Detail logbook tidak sesuai permintaan.');
      assertReadScope([response.data],{id_client:user.id_client,id_action:Number(actionId),...(explore && target ? {targetActor:Number(target)} : {})});
      const saved=response.data;
      let editable=false;
      if(!explore){
        try {
          const result=resultBody(await mobileRequest('getLogbookFormMetadata',{id_client:user.id_client,id_action:Number(actionId)}));
          if(!current())return;
          const meta=result.data;
          if(!meta || typeof meta!=='object' || Array.isArray(meta))throw new Error('Metadata form logbook tidak tersedia.');
          assertReadScope([meta],{id_client:user.id_client});
          if(meta.id!=null && Number(meta.id)!==Number(actionId))throw new Error('Metadata aktivitas tidak sesuai.');
          editable=canEditLogbookRecord({role:user.role_name,action:meta,verifiedStatus:saved.verified_status??saved.status,verified:saved.verified,fromExplore:false}) &&
            (role==='staff' || Number(saved.created_by??saved.id_user??saved.m_user?.id)===user.id);
        } catch(e){
          if(role==='ppds' && canEditLogbookRecord({role:user.role_name,action:null,verifiedStatus:saved.verified_status??saved.status,verified:saved.verified,fromExplore:false}))throw e;
        }
      }
      if(!current())return;
      const state=entryState();
      navigate(`${base}/${row.id}${editable?'/edit':readSuffix}`,{state:{...state,...(editable?{formReturn:state.mobileReturn}:{})}});
    } catch(e){if(current())setError(errorMessage(e));}
    finally {if(entryLock.current===viewKey)entryLock.current='';if(current())setBusy(false);}
  }
  function cancelDetailRefresh() {
    if(mode!=='detail' || !loading || initialLoading)return;
    // The shared transport owns aborts. Invalidate this view's read continuation;
    // late record and optional-metadata results can no longer replace the screen.
    generation.current++;setLoading(false);
  }
  const canCreate =
    !!action &&
    metadataAvailable &&
    !explore &&
    ((role === 'ppds' && !enabled(action.is_exam)) ||
      (role === 'staff' && enabled(action.is_exam)));
  async function save(payload: Row) {
    if (!user || !action || explore || !sameSession())
      throw new Error('Sesi berubah atau halaman hanya baca.');
    if ((mode === 'edit' && !canEdit) || (mode === 'create' && !canCreate))
      throw new Error('Anda tidak diizinkan menyimpan kegiatan ini.');
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    try {
      const saveGeneration=generation.current;
      const saveKey = `${identityKey}:${actionId}:${recordId ?? 'create'}`;
      let id: string | number | undefined;
      if (mode === 'create' && saveAcknowledged.current?.key === saveKey) {
        id = saveAcknowledged.current.id ?? undefined;
      } else {
        const response = resultBody(
          await mobileRequest(mode === 'edit' ? 'saveLogbookUpdate' : 'createLogbook', {
            ...payload,
            ...(mode === 'edit' ? { id: recordId } : {}),
            id_action: Number(actionId),
            created_by: user.id,
            id_client: user.id_client,
          }),
        );
        id = mode === 'edit' ? recordId : response.data?.id;
        if (mode === 'create')
          saveAcknowledged.current = { key: saveKey, id: positiveId(id) ? id! : null };
      }
      if (!sameSession()) throw new Error('Sesi berubah.');
      if (!positiveId(id))
        throw new Error(
          'Simpan diterima tetapi server tidak mengembalikan ID logbook. Pengiriman ulang diblokir; periksa daftar sebelum membuat kegiatan baru.',
        );
      const readback = resultBody(
        await mobileRequest('getLogbookById', { id, id_client: user.id_client, user_id: user.id }),
      );
      if (!readback.data || String(readback.data.id) !== String(id))
        throw new Error(
          'Simpan diterima tetapi detail belum dapat diverifikasi. Periksa daftar sebelum mencoba lagi.',
        );
      assertReadScope([readback.data],{id_client:user.id_client,id_action:Number(actionId)});
      if(!sameSession() || saveGeneration!==generation.current || currentView.current!==viewKey)throw new Error('Sesi atau halaman berubah.');
      dirty.current = false;
      setRecord(readback.data);
      setNotice('Logbook berhasil disimpan dan dimuat ulang.');
      if(mode==='edit' && canPopReturn(location.state?.formReturn,user,location.pathname,Number(window.history.state?.idx)))navigate(-1);
      else if(mode==='edit' && returnDestination(location.state?.formReturn,user,location.pathname))navigate(returnDestination(location.state.formReturn,user,location.pathname)!,{replace:true,state:{mobileReturn:location.state?.mobileReturn,readonlyList:location.state.formReturn.savedList}});
      else navigate(`${base}/${id}`, { replace: true, state: {mobileReturn: location.state?.mobileReturn} });
    } finally {
      setBusy(false);
      mutationLock.current = false;
    }
  }
  async function verify(payload: Row) {
    if (!user || !record || explore || role !== 'staff' || !sameSession())
      throw new Error('Verifikasi tidak diizinkan.');
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    try {
      resultBody(
        await mobileRequest('updateLogbookStatus', {
          ...payload,
          id_logbook: record.id,
          id_user: user.id,
          id_client: user.id_client,
        }),
      );
      const response = resultBody(
        await mobileRequest('getLogbookById', {
          id: record.id,
          id_client: user.id_client,
          user_id: user.id,
        }),
      );
      if (!sameSession()) throw new Error('Sesi berubah.');
      if (!response.data || String(response.data.id) !== String(record.id))
        throw new Error('Status diterima tetapi detail belum dapat diverifikasi. Muat ulang.');
      assertReadScope([response.data],{id_client:user.id_client,id_action:Number(actionId)});
      if(currentView.current!==viewKey)return;
      setRecord(response.data);
      setNotice('Status diperbarui. Detail dimuat ulang dari server.');
    } finally {
      setBusy(false);
      mutationLock.current = false;
    }
  }
  async function archive() {
    if (!user || !record || !canEdit || mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    setError('');
    try {
      resultBody(
        await mobileRequest('archiveLogbook', {
          id: record.id,
          created_by: user.id,
          id_client: user.id_client,
        }),
      );
      if (!sameSession()) return; // Read the exact record: archived rows must no longer be returned as active.
      try {
        const response = resultBody(
          await mobileRequest('getLogbookById', {
            id: record.id,
            id_client: user.id_client,
            user_id: user.id,
          }),
        );
        if (response.data && response.data.deleted_at == null)
          throw new Error('Server menerima penghapusan tetapi record masih aktif. Muat ulang daftar.');
        if(response.data)assertReadScope([response.data],{id_client:user.id_client,id_action:Number(actionId)});
      } catch (e) {
        const message = errorMessage(e);
        if (/masih aktif/.test(message)) throw e;
        if (!/not found|tidak ditemukan|tidak tersedia|404|deleted|archiv/i.test(message))
          throw new Error(`Penghapusan diterima tetapi pembacaan ulang gagal: ${message}`);
      }
      dirty.current = false;
      navigate(base);
      setArchiveConfirm(false);
      setNotice('Logbook berhasil dihapus.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      mutationLock.current = false;
    }
  }
  const grouped = !!action && shouldGroupLogbooks(action, role);
  const infinite=useInfiniteScroll({enabled:mode==='list' && hasMore && (!grouped || group!==undefined) && !initialLoading && !loading && !busy && !scopedError && !moreError && !preview && !archiveConfirm && !filterOpen,loading:loadingMore,scopeKey:viewKey,progressKey:`${page}:${rows.length}`,onLoadMore:loadMore});
  const filterFields=action ? filterWireFields(action,role) : [];
  const categories = action ? getDynamicCategories(action) : [];
  const groupedCategories = action ? groupedCategoryCards(action,serverCategories ?? summarizeCategories(categories,rows)) : [];
  const otherIds=action ? otherCategoryIds(action) : new Set<number>();
  const selectedCategory = groupedCategories.find(c=>c.id===group);
  const presentationCount = selectedCategory?.presentation ?? 0;
  const captionTotal = grouped && group!==undefined && !presentation && groupComplete ? selectedCategory?.count : total;
  const visible =
    grouped && group !== undefined
      ? rows.filter(
          (r) =>
            (group==='other' ? otherIds.has(Number(r.id_category ?? r.m_action_category?.id)) : Number(r.id_category ?? r.m_action_category?.id) === group) &&
            (presentation ? enabled(r.is_presentation) : !enabled(r.is_presentation)),
        )
      : rows;
  function openGroup(id?: CategoryGroup, present = false, back = false) {
    // Drilldown is URL state even for legacy aggregate responses, so Detail/reload can return here.
    const next = new URLSearchParams(search);
    if (id === undefined) {
      next.delete('categoryView');
      next.delete('category_group');
      next.delete('id_category');
      next.delete('is_presentation');
      const scope = new URLSearchParams(search.get('groupScope') ?? '');
      for(const key of ['id_category','is_presentation','category_group'])if(scope.has(key))next.set(key,scope.get(key)!);
      next.delete('groupScope');
    } else {
      if(search.get('categoryView')!=='1') {
        const scope=new URLSearchParams();
        for(const key of ['id_category','is_presentation','category_group'])if(search.has(key))scope.set(key,search.get(key)!);
        if(scope.size)next.set('groupScope',scope.toString());
      }
      next.set('categoryView', '1');
      if(id==='other'){next.set('category_group','other');const scope=new URLSearchParams(next.get('groupScope')??'');if(scope.has('id_category'))next.set('id_category',scope.get('id_category')!);else next.delete('id_category');}else {next.delete('category_group');next.set('id_category', String(id));}
      next.set('is_presentation', String(present));
    }
    if(back){
      const context=location.state?.groupReturn;
      const destination=location.pathname+(next.toString() ? '?'+next : '');
      if(returnDestination(context,user!,location.pathname)===destination && canPopReturn(context,user!,location.pathname,Number(window.history.state?.idx)))navigate(-1);
      else navigate(destination,{replace:true,state:{...location.state,groupReturn:undefined}});
    }else setSearch(next,{state:{...location.state,groupReturn:captureReturn(user!,location)}});
  }
  const updateFilter = (key: string, value: unknown) =>
    setFilterDraft((d) => ({ ...d, [key]: value }));
  return (
    <main className={`mweb-logbook${mode === 'list' && !initialLoading && canCreate && !filterOpen ? ' mweb-has-add' : ''}`} aria-busy={loading || (initialLoading && !scopedError) || busy}>
      {mode === 'list' && busy && entryLock.current === viewKey && (
        <div className="mweb-opening-overlay">
          <div className="mweb-opening-status" role="status" aria-live="polite" aria-atomic="true">
            <span className="mweb-spinner" aria-hidden="true" />
            Memuat logbook…
          </div>
        </div>
      )}
      <header className="mweb-workspace-header">
        <button
          className="mweb-back"
          onClick={() => {
            if (mode === 'list' && grouped && group !== undefined) {
              if (presentation) openGroup(group, false, true);
                            else openGroup(undefined, false, true);
            } else returnBack(mode==='edit' ? `${base}/${recordId}` : recordId ? (!location.state?.mobileReturn ? safeTodoReturn(search.get('returnTo')) : null) ?? `${base}${readSuffix}` : mode==='create' ? base : explore ? `/mobile/explore/${target}` : '/mobile');
          }}
          aria-label="Kembali"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div>
          <p className="mweb-eyebrow">{explore ? 'Explore · hanya baca' : 'Logbook kegiatan'}</p>
          <h1>
            {mode === 'create' ? 'Tambah ' : mode === 'edit' ? 'Edit ' : ''}
            {initialLoading ? navigationName ?? 'Logbook' : String(action?.name ?? 'Logbook')}
          </h1>
        </div>
        {(mode === 'list' || mode === 'detail') && !scopedError && <button className="mweb-btn" onClick={load} disabled={loading || initialLoading || busy}>Muat ulang</button>}
        {mode==='detail' && loading && !initialLoading && <button className="mweb-btn" onClick={cancelDetailRefresh}>Batalkan pemuatan</button>}
        {mode === 'list' && actionId && (
          <button
            className="mweb-btn"
            disabled={loading || initialLoading}
            onClick={() => {
              setFilterDraft(filters);
              setFilterOpen(!filterOpen);
            }}
          >
            Filter{Object.keys(filters).length ? ` (${Object.keys(filters).length})` : ''}
          </button>
        )}
        {mode === 'detail' && !initialLoading && canEdit && (
          <button className="mweb-btn" disabled={busy || loading} onClick={() => navigate(`${base}/${recordId}/edit`, {state:{...location.state,formReturn:captureReturn(user!,location)}})}>
            Edit
          </button>
        )}
      </header>
      {mode === 'list' && !initialLoading && canCreate && !filterOpen && (
        <FloatingAddButton title={`Tambah ${String(action?.name ?? 'Logbook')}`} onClick={() => navigate(`${base}/create`, {state:entryState()})}/>
      )}
      {notice && (
        <p className="mweb-success" role="status">
          {notice}
        </p>
      )}
      {scopedError && (
        <div className="mweb-error-panel" role="alert">
          <p>{scopedError}</p>
          <button className="mweb-btn" onClick={load} disabled={loading || busy}>
            Muat ulang
          </button>
        </div>
      )}
      {loading && !initialLoading && <div className="mweb-loading mweb-refreshing" role="status"><span className="mweb-spinner" aria-hidden="true"/>Memperbarui {activityName}…</div>}
      {initialLoading ? (scopedError && !loading ? null : (
        <div className="mweb-loading" role="status">
          <span className="mweb-spinner" aria-hidden="true" />
          Memuat {activityName}…
        </div>
      )) : (
        <>
          {!actionId ? (
            <div className="mweb-record-grid">
              {catalog.map((a) => (
                <button
                  className="mweb-card mweb-catalog-card"
                  key={a.id ?? a.id_action}
                  onClick={() => navigate(`/mobile/logbooks/${a.id ?? a.id_action}`)}
                >
                  <strong>{a.name}</strong>
                  <span> Lihat kegiatan →</span>
                </button>
              ))}
              {!catalog.length && !error && (
                <p className="mweb-empty">Belum ada aktivitas yang tersedia.</p>
              )}
            </div>
          ) : action && mode === 'list' ? (
            <>
              {filterOpen && (
                <section className="mweb-card mweb-filter-panel">
                  <h2>Filter Kegiatan</h2>
                  <div className="mweb-filter-grid">
                    {enabled(action.allow_other_categories)&&<label className="mweb-field"><span>Kelompok kategori</span><select aria-label="Kelompok kategori" value={filterDraft.category_group??''} onChange={e=>updateFilter('category_group',e.target.value||undefined)}><option value="">Semua</option><option value="other">Lainnya</option></select></label>}
                    <label className="mweb-field">
                      <span>Dari tanggal</span>
                      <input
                        type="date"
                        value={filterDraft.start_date ?? ''}
                        onChange={(e) => updateFilter('start_date', e.target.value)}
                      />
                    </label>
                    <label className="mweb-field">
                      <span>Sampai tanggal</span>
                      <input
                        type="date"
                        value={filterDraft.end_date ?? ''}
                        onChange={(e) => updateFilter('end_date', e.target.value)}
                      />
                    </label>
                    {filterFields.includes('title') && (
                      <label className="mweb-field">
                        <span>Judul</span>
                        <input
                          value={filterDraft.title ?? ''}
                          onChange={(e) => updateFilter('title', e.target.value)}
                        />
                      </label>
                    )}
                    {[
                      ['id_ppds', 'Peserta PPDS', participants],
                      ['id_staff', 'Staff', getDynamicStaffUsers(action)],
                      [
                        'id_staff_jejaring',
                        'Staff Pengajar Jejaring',
                        getDynamicStaffJejaringUsers(action),
                      ],
                      ['id_category', 'Kategori', distinctFilterChoices(categories, rows, 'category')],
                      ['id_hospital', 'Rumah Sakit', distinctFilterChoices(getDynamicHospitals(action), rows, 'hospital')],
                      ['id_another_role', 'Peran', distinctFilterChoices(getDynamicAnotherRoles(action), rows, 'another_role')],
                      ['id_stase', 'Stase', distinctFilterChoices(getDynamicStases(action), rows, 'stase')],
                    ].map(([key, label, options]) =>
                      filterFields.includes(String(key)) ? (
                        <SelectField
                          key={String(key)}
                          label={String(label)}
                          options={options as DynamicChoice[]}
                          value={filterDraft[String(key)]}
                          onChange={(id) => updateFilter(String(key), id)}
                        />
                      ) : null,
                    )}
                    {filterFields.includes('exam_result') && (
                      <label className="mweb-field">
                        <span>Hasil Ujian</span>
                        <select
                          value={filterDraft.exam_result ?? ''}
                          onChange={(e) => updateFilter('exam_result', e.target.value)}
                        >
                          <option value="">Semua hasil</option>
                          {['Lolos', 'Remidi', 'Tidak Lolos'].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {filterFields.includes('is_presentation') && (
                      <label className="mweb-field">
                        <span>Presentasi</span>
                        <select
                          value={
                            filterDraft.is_presentation === undefined
                              ? ''
                              : String(filterDraft.is_presentation)
                          }
                          onChange={(e) =>
                            updateFilter(
                              'is_presentation',
                              e.target.value === '' ? undefined : e.target.value === 'true',
                            )
                          }
                        >
                          <option value="">Semua</option>
                          <option value="true">Ya</option>
                          <option value="false">Tidak</option>
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="mweb-row">
                    <button
                      className="mweb-btn"
                      onClick={() => {
                        const next = new URLSearchParams();
                        if (explore) next.set('explore', '1');
                        if (target) next.set('userId', target);
                        setSearch(next,{state:location.state});
                        setFilterOpen(false);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      className="mweb-btn mweb-primary"
                      onClick={() => {
                        if (
                          filterDraft.start_date &&
                          filterDraft.end_date &&
                          filterDraft.start_date > filterDraft.end_date
                        ) {
                          setError('Rentang tanggal tidak valid.');
                          return;
                        }
                        const next = new URLSearchParams();
                        if (explore) next.set('explore', '1');
                        if (target) next.set('userId', target);
                        Object.entries(filterDraft).forEach(([k, v]) => {
                          if (v !== undefined && v !== '') next.set(k, String(v));
                        });
                        setSearch(next,{state:location.state});
                        setFilterOpen(false);
                      }}
                    >
                      Terapkan Filter
                    </button>
                  </div>
                </section>
              )}
              <div className="mweb-list-caption">
                <span>
                  {captionTotal !== undefined ? `${captionTotal} kegiatan` : `${rows.length} kegiatan dimuat`}
                </span>
                <button className="mweb-link" onClick={load} disabled={loading || busy}>
                  ↻ Segarkan
                </button>
              </div>
              {grouped && group === undefined ? (
                <>
                  <div className="mweb-record-grid">
                    {groupComplete ? (
                      groupedCategories.map((c) => (
                        <button
                          className="mweb-card mweb-category mweb-bimbingan-category"
                          key={c.id}
                          disabled={c.count === 0}
                          onClick={() => openGroup(c.id, false)}
                        >
                          <strong>{c.label}</strong>
                          <span className="mweb-bimbingan-counts">
                            <b>{c.count}</b>
                            {c.presentation > 0 && <small aria-label={`Presentasi terverifikasi ${c.presented} dari ${c.presentation}`}>{c.presented}/{c.presentation}</small>}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="mweb-notice">
                        Total kategori belum lengkap; muat ulang sebelum membuka kelompok.
                      </p>
                    )}
                  </div>
                  <div className="mweb-record-grid">
                  {rows
                    .filter((r) => !categories.some((c) => c.id === Number(r.id_category ?? r.m_action_category?.id)))
                    .map((r) => (
                      <LogbookListCard key={r.id} action={action} record={r} role={role}
                        onOpen={() => void openListRecord(r)} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {grouped && group !== undefined && (
                    <div className="mweb-group-heading">
                      <h2>
                        {groupedCategories.find((c) => c.id === group)?.label}
                        {presentation ? ' / Presentation' : ''}
                      </h2>
                      {!presentation && groupComplete && presentationCount > 0 && (
                        <button
                          className="mweb-card mweb-category"
                          onClick={() => openGroup(group, true)}
                        >
                          <strong>Presentation</strong>
                          <span>
                            {presentationCount}{' '}
                            kegiatan →
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                  <div className="mweb-record-grid">
                    {visible.map((r) => (
                      <LogbookListCard key={r.id} action={action} record={r} role={role}
                        groupedEntry={grouped && group !== undefined && group !== 'other' && !presentation}
                        onOpen={() => void openListRecord(r)} />
                    ))}
                  </div>
                  {!visible.length && !error && !(grouped && group !== undefined && !presentation && presentationCount > 0) && (
                    <div className="mweb-empty">
                      <h2>Belum ada kegiatan</h2>
                      <p>
                        {Object.keys(filters).length
                          ? 'Coba ubah filter pencarian.'
                          : 'Kegiatan akan tampil setelah ditambahkan.'}
                      </p>
                      {canCreate && <p>Gunakan tombol + untuk menambah kegiatan.</p>}
                    </div>
                  )}
                </>
              )}
              {hasMore && (!grouped || group !== undefined) && (
                <InfiniteScrollFooter sentinelRef={infinite.sentinelRef} loading={loadingMore} error={moreError} onLoadMore={()=>void loadMore()}/>
              )}
            </>
          ) : action && (mode === 'create' || mode === 'edit') ? (
            <>
              {(mode === 'create' ? canCreate : canEdit) ? (
                <>
                  <section className="mweb-card mweb-form-card">
                    <h2>{mode === 'create' ? 'Data kegiatan baru' : 'Edit data kegiatan'}</h2>
                    <LogbookForm
                      key={`${identityKey}:${recordId ?? 'new'}:${String(actionId)}`}
                      action={action}
                      record={mode === 'edit' ? (record ?? undefined) : undefined}
                      role={role}
                      identity={user!}
                      participants={participants}
                      externalBusy={busy}
                      history={mode === 'edit' && record ? (
                        <section className="mweb-form-history" aria-label="Riwayat verifikasi">
                          <p className="mweb-form-history-label">Riwayat tersimpan · hanya baca</p>
                          <VerifierCards record={record} edit />
                        </section>
                      ) : undefined}
                      onDelete={mode === 'edit' && record ? () => {setError('');setArchiveConfirm(true);} : undefined}


                      onSubmit={save}
                      onCancel={() => returnBack(recordId ? `${base}/${recordId}` : base)}
                      onPreview={setPreview}
                      onDirty={() => {
                        dirty.current = true;
                      }}
                    />
                  </section>
                </>
              ) : (
                <p className="mweb-notice">
                  Kegiatan ini tidak dapat diubah untuk role atau status saat ini.
                </p>
              )}
            </>
          ) : action && record ? (
            <LogbookDetail
              key={`${identityKey}:${record.id}`}
              action={action}
              record={record}
              role={role}
              identity={user!}
              readOnly={explore}
              onVerify={verify}
              onPreview={setPreview}
              busy={busy || loading}
            />
          ) : null}
        </>
      )}
      <DeleteLogbookDialog open={archiveConfirm && mode==='edit' && !!record && canEdit} busy={busy} error={error} onCancel={()=>setArchiveConfirm(false)} onConfirm={()=>void archive()}/>
      {preview && <AttachmentPreview url={preview} close={() => setPreview('')} />}
    </main>
  );
}