import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ROUTES } from '@/utils/routes';
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, Compass, Flag, Home as HomeIcon, LogOut, UserRound, RefreshCw, CheckCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { requestMobileLogout, useMobileSession } from './session';
import { mobileRequest } from './api';
import Home from './Home';
import TodoSection from './TodoSection';
import { useInfiniteScroll } from './useInfiniteScroll';
import { InfiniteScrollFooter } from './InfiniteScrollFooter';
import LogoutDialog from './LogoutDialog';
import { mapNotificationItem, openNotification } from './notifications';
import { notificationTone, safeNotificationInput } from './foundationPresentation';
import { mergeNotificationRows, parseNotificationPage } from './foundationReads';
import LogbookWorkspace from './features/LogbookWorkspace';
import { MobileExplore, MobileMilestone, MobileProfile } from './features/WorkspaceExtras';
import navbarEmblem from '@/assets/images/logo_uns_ortho.png';
import { actorKey, captureReturn, navigationSessionKey, readListMemory, readListWindow, saveListWindow, setNavigationScope, writeListMemory } from './navigation';
import { useNavigationAudit } from './useNavigationAudit';
import './mobile.css';
import './navbar-brand.css';
import './features/logbook/category-picker.css';
function LogbookRoute({mode = 'list', explore = false}: {mode?:'list'|'create'|'edit'|'detail';explore?:boolean}) {
  const {actionId,recordId,userId} = useParams();
  const location=useLocation();
  const actor=useMobileSession(s=>s.user);
  const legacy=new URLSearchParams(location.search);
  if(!explore && (legacy.has('explore') || legacy.has('userId'))) {
    const target=legacy.get('userId');
    if(actor?.role!=='staff' || !/^[1-9]\d*$/.test(target ?? ''))return <Navigate to="/mobile" replace/>;
    legacy.delete('explore');legacy.delete('userId');
    const suffix=legacy.toString();
    return <Navigate to={`/mobile/explore/${target}/logbooks/${actionId}${recordId ? '/'+recordId : ''}${suffix ? '?'+suffix : ''}`} replace/>;
  }
  return <LogbookWorkspace actionId={actionId} recordId={recordId} mode={mode} explore={explore} userId={userId}/>;
}
function NotificationBell() {
  const user=useMobileSession(s=>s.user)!;
  const [unread,setUnread]=useState<number | null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let live=true, generation=0;
    const refresh=async()=>{
      const request=++generation;
      try {
        const result=await mobileRequest('getNotification',{id_user:user.id,id_client:user.id_client,page:1,limit:1});
        const parsed=parseNotificationPage(result,1,1);
        if(live && request===generation){setUnread(parsed.unreadTotal);setError('');}
      } catch(e) {if(live && request===generation){setUnread(null);setError((e as Error).message);}}
    };
    refresh();window.addEventListener('mobile:notifications-refresh',refresh);
    return ()=>{live=false;window.removeEventListener('mobile:notifications-refresh',refresh);};
  },[user.id,user.id_client]);
  return <><Link to="/mobile/notifications" aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'} className="mobile-notification-bell"><Bell size={22}/>{unread !== null && unread>0 && <span className="mobile-notification-count">{unread>99 ? '99+' : unread}</span>}</Link>{error && <span className="mobile-error" role="alert">{error}</span>}</>;
}
function Notifications() {
  const user = useMobileSession(s=>s.user)!;
  const location = useLocation();
  const actor = actorKey(user);
  const sessionKey=useRef(navigationSessionKey()).current;
  const memoryKey = `${actor}:${location.pathname}${location.search}`;
  type Snapshot = {rows: Record<string,any>[]; page: number; more: boolean};
  const restored = useRef(readListMemory<Snapshot>('notifications',memoryKey)).current;
  const savedWindow=useRef(readListWindow(actor,location.pathname+location.search)).current;
  const [rows,setRows] = useState<Record<string,any>[]>(restored?.value.rows ?? []);
  const [error,setError] = useState('');
  const [page,setPage] = useState(restored?.value.page ?? 1);
  const [more,setMore] = useState(restored?.value.more ?? false);
  const [busy,setBusy] = useState(false);
  const generation=useRef(0);
  const loadLock=useRef(false);
  const [moreError,setMoreError]=useState('');
  const [loadingMore,setLoadingMore]=useState(false);
  const live = useRef(true);
  const snapshot = useRef({rows,page,more});
  snapshot.current = {rows,page,more};
  useLayoutEffect(()=>{
    live.current=true;
    if(restored) window.scrollTo(0,restored.scroll);
    return ()=>{live.current=false;writeListMemory('notifications',memoryKey,actor,snapshot.current,window.scrollY);};
  },[memoryKey]);
  async function load(next=1, refresh=false) {
    if(loadLock.current)return;
    loadLock.current=true;
    const request=++generation.current;
    if(next>1){setLoadingMore(true);setMoreError('');}else {setBusy(true);setError('');setMoreError('');}
    try {
      let collected:Record<string,any>[]=[];let loaded=next,hasMore=false;
      const last=next===1 ? (refresh ? page : savedWindow?.page ?? 1) : next;
      for(let p=next;p<=last;p++){
        const result=await mobileRequest('getNotification',{id_user:user.id,id_client:user.id_client,page:p,limit:30});
        if(request!==generation.current || !live.current || !sameSession())return;
        const parsed=parseNotificationPage(result,p,30);
        if(next>1 && (parsed.page<=page || (parsed.hasMore && !parsed.rows.some(row=>!rows.some(old=>String(old.id)===String(row.id))))))throw new Error('Server mengulang halaman tanpa notifikasi baru. Coba lagi.');
        collected=mergeNotificationRows(collected,parsed.rows);loaded=parsed.page;
        hasMore=parsed.hasMore;
        if(!hasMore)break;
      }
      setRows(old=>next===1 ? collected : mergeNotificationRows(old,collected));setPage(loaded);setMore(hasMore);
    }catch(e){if(request===generation.current && live.current && sameSession())(next>1 ? setMoreError : setError)((e as Error).message);}finally{if(request===generation.current && live.current && sameSession()){setBusy(false);setLoadingMore(false);loadLock.current=false;}}
  }
  useEffect(()=>{loadLock.current=false;if(!restored)load();return ()=>{generation.current++;loadLock.current=false;};},[user.id,user.id_client]);
  const navigate = useNavigate();
  const windowRestored=useRef(false);
  useLayoutEffect(()=>{if(!busy && rows.length && savedWindow && !restored && !windowRestored.current){windowRestored.current=true;window.scrollTo(0,savedWindow.scroll);}},[busy,rows.length]);
  useEffect(()=>{
    const onRead=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.actor===actor)setRows(old=>old.map(row=>detail.id==null || row.id===detail.id ? {...row,read:true}:row));};
    window.addEventListener('mobile:notification-read',onRead);
    return ()=>window.removeEventListener('mobile:notification-read',onRead);
  },[actor]);
  const clickLock = useRef(false);
  const sameSession = () => {
    const current = useMobileSession.getState().user;
    return current?.id === user.id && current.id_client === user.id_client && sessionKey===navigationSessionKey();
  };
  const readSuccess = (id: unknown) => {
    if (!sameSession()) return;
    const mark = (rows: Record<string,any>[])=>rows.map(row=>id==null || row.id===id ? {...row,read:true} : row);
    if(live.current) setRows(mark);
    else {const memory=readListMemory<Snapshot>('notifications',memoryKey);if(memory)writeListMemory('notifications',memoryKey,actor,{...memory.value,rows:mark(memory.value.rows)},memory.scroll);}
    window.dispatchEvent(new CustomEvent('mobile:notification-read',{detail:{actor,id}}));
    window.dispatchEvent(new Event('mobile:notifications-refresh'));
  };
  const infinite=useInfiniteScroll({enabled:more && !busy && !error && !moreError && !clickLock.current,loading:loadingMore,scopeKey:memoryKey,progressKey:`${page}:${rows.length}`,onLoadMore:()=>load(page+1)});
  async function open(item: Record<string,any>) {
    if (clickLock.current) return;
    clickLock.current=true;setBusy(true);setError('');
    const request=++generation.current;
    saveListWindow(actor,location.pathname+location.search,page,window.scrollY);
    const from=captureReturn(user,location);
    try {
      const route=await openNotification(item,user,mobileRequest,()=>readSuccess(item.id));
      if (route && live.current && request===generation.current && sameSession()) navigate(route,{state:{from:'/mobile/notifications',mobileReturn:from}});
    } catch(e) {if(live.current && request===generation.current && sameSession())setError((e as Error).message);}
    finally {if(request===generation.current){clickLock.current=false;if(live.current && sameSession())setBusy(false);}}
  }
  async function markRead(id?:number|string) {
    if (clickLock.current) return;
    clickLock.current=true;setBusy(true);setError('');
    try {
      const result=await mobileRequest(id==null ? 'readAllNotifications' : 'readNotification',{id_user:user.id,id_client:user.id_client,...(id==null ? {} : {id})});
      if (!sameSession()) return;
      if (result.success!==true) throw new Error('Server belum mengonfirmasi notifikasi dibaca.');
      readSuccess(id ?? null);
    } catch(e){if(sameSession())setError((e as Error).message);}
    finally{clickLock.current=false;if(sameSession())setBusy(false);}
  }
  return <section className="mobile-notifications"><div className="mobile-section-heading mobile-notifications-heading"><h1>Notifikasi</h1><div className="mobile-notifications-tools"><button aria-label="Muat ulang notifikasi" disabled={busy} onClick={()=>load(1,true)}><RefreshCw className={busy ? 'mobile-notification-refreshing' : undefined} size={18} aria-hidden="true"/><span>Muat ulang</span></button><button disabled={busy || !rows.length} onClick={()=>{if(window.confirm('Tandai semua notifikasi sebagai sudah dibaca?'))markRead();}}><CheckCheck size={18} aria-hidden="true"/><span>Tandai semua dibaca</span></button></div></div>{error && <p className="mobile-error" role="alert">{error}</p>}{busy && <p role="status">Memuat…</p>}{rows.map((n,index)=>{const item={...mapNotificationItem(safeNotificationInput(n),index),status:notificationTone(n)};return <article className={`mobile-panel mobile-notification-card ${item.isRead ? '' : 'is-unread'} ${item.status ? 'is-'+item.status : ''}`} key={item.key}><strong>{item.title}</strong>{item.status && <span className="mobile-notification-status">{item.status==='rejected' ? 'Ditolak' : 'Dibatalkan'}</span>}<p>{item.message}</p><small>{item.timeAgo}</small><div className="mobile-actions"><button disabled={busy || item.isRead || item.id===null} onClick={()=>markRead(item.id!)}>{item.isRead ? 'Sudah dibaca' : 'Tandai dibaca'}</button>{item.logbookId!==null && <button disabled={busy} onClick={()=>open(n)}>Buka logbook</button>}</div></article>;})}{!busy && !rows.length && <div className="mobile-empty"><Bell/><h3>Belum ada notifikasi</h3></div>}{more && <InfiniteScrollFooter sentinelRef={infinite.sentinelRef} loading={loadingMore} error={moreError} onLoadMore={()=>void load(page+1)}/>} </section>;
}
export default function MobileApp() {
  const {user} = useMobileSession();
  const shell = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const nav = shell.current?.querySelector<HTMLElement>('.mobile-bottom-nav');
    const measure = () => shell.current?.style.setProperty('--mobile-nav-height', `${nav ? Math.max(0, window.innerHeight - nav.getBoundingClientRect().top) : 0}px`);
    measure();
    const observer = new ResizeObserver(measure);
    if (nav) observer.observe(nav);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [user?.id, user?.id_client, user?.role]);
  setNavigationScope(user ? actorKey(user) : '');
  const institution = useAuthStore(s=>s.isAuthenticated && s.user?.role_name === 'institution');
  useNavigationAudit(!institution);
  if(institution) return <Navigate to={ROUTES.dashboard} replace/>;
  if(!user) return <Navigate to={ROUTES.login} replace/>;
  const nav = [{to:'/mobile',label:'Home',icon:HomeIcon},...(user.role==='staff' ? [{to:'/mobile/explore',label:'Explore',icon:Compass}] : []),{to:'/mobile/milestone',label:'Milestone',icon:Flag},{to:'/mobile/profile',label:'Profile',icon:UserRound}];
  return <div ref={shell} className="mobile-app" key={`${user.id_client}:${user.id}:${user.role}`}>
    <header className="mobile-header"><Link to="/mobile" className="mobile-brand" aria-label="Medic Link Logbook — Home"><img className="mobile-brand-emblem" src={navbarEmblem} alt="Ortopaedi dan Traumatologi UNS"/><span className="mobile-brand-wordmark"><strong>MEDIC LINK</strong><span>LOGBOOK</span></span></Link><div className="mobile-header-actions"><NotificationBell/><Link to="/mobile/profile" className="mobile-avatar" aria-label="Profil">{user.display_name.slice(0,1).toUpperCase()}</Link><button onClick={requestMobileLogout} aria-label="Keluar"><LogOut size={20}/></button></div></header>
    <LogoutDialog/>
    <main className="mobile-main"><Routes>
      <Route index element={<Home/>}/>
      <Route path="todo" element={user.role==='staff' ? <TodoSection full/> : <Navigate to="/mobile" replace/>}/>
      <Route path="logbooks/:actionId" element={<LogbookRoute/>}/>
      <Route path="logbooks/:actionId/create" element={<LogbookRoute mode="create"/>}/>
      <Route path="logbooks/:actionId/:recordId" element={<LogbookRoute mode="detail"/>}/>
      <Route path="logbooks/:actionId/:recordId/edit" element={<LogbookRoute mode="edit"/>}/>
      <Route path="explore" element={user.role==='staff' ? <MobileExplore/> : <Navigate to="/mobile" replace/>}/>
      <Route path="explore/:userId" element={user.role==='staff' ? <MobileExplore/> : <Navigate to="/mobile" replace/>}/>
      <Route path="explore/:userId/logbooks/:actionId" element={user.role==='staff' ? <LogbookRoute explore/> : <Navigate to="/mobile" replace/>}/>
      <Route path="explore/:userId/logbooks/:actionId/:recordId" element={user.role==='staff' ? <LogbookRoute mode="detail" explore/> : <Navigate to="/mobile" replace/>}/>
      <Route path="milestone" element={<MobileMilestone/>}/>
      <Route path="profile/*" element={<MobileProfile/>}/>
      <Route path="notifications" element={<Notifications/>}/>
      <Route path="*" element={<section className="mobile-empty"><h1>Halaman tidak ditemukan</h1><Link to="/mobile">Kembali ke Home</Link></section>}/>
    </Routes></main>
    <nav className="mobile-bottom-nav" aria-label="Navigasi utama">{nav.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/mobile'}><Icon size={23}/><span>{label}</span></NavLink>)}</nav>
  </div>;
}
