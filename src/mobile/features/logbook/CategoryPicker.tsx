import { useId, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { mobileRequest, MobileApiBusinessError } from "../../api";
import { enabled, getDynamicCategories, type DynamicLogbookAction } from "./dynamicLogbookForm";
import { mergeSavedCategory } from "./otherCategories";
import { useMobileSession } from "../../session";

/** Category persistence is independent of the surrounding Create/Edit form. */
export function CategoryPicker({ action, value, identity, onChange, onAction, onPending, disabled = false }: {
  action: DynamicLogbookAction; value?: number;
  identity: { id: number; id_client: number };
  onChange: (id: number | undefined) => void;
  onAction: (a: DynamicLogbookAction) => void;
  onPending: (v: boolean) => void; disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [proposedName, setProposedName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState(-1);
  const [candidates, setCandidates] = useState<Record<string, unknown>[]>([]);
  const lock = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const choices = getDynamicCategories(action);
  const matches = choices.filter(c => c.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const canAdd = !!query.trim() && !matches.length && enabled(action.allow_other_categories);
  const count = matches.length + (canAdd ? 1 : 0);
  const blocked = disabled || pending;
  const same = () => {
    const user = useMobileSession.getState().user;
    return user?.id === identity.id && user.id_client === identity.id_client;
  };
  function close() { setOpen(false); setQuery(""); setActive(-1); }
  function select(raw: Record<string, unknown>, message: string) {
    if (!same()) throw Error("Sesi berubah.");
    const updated = mergeSavedCategory(action, raw, { id_client: identity.id_client, id_action: Number(action.id) });
    onAction(updated);
    onChange(Number(raw.id));
    setCandidates([]);
    setError("");
    setNotice(message);
  }
  function choose(index: number) {
    if (blocked || !same()) return;
    if (index < matches.length) {
      onChange(matches[index].id);
      setCandidates([]); setError(""); setNotice(""); close();
    } else if (canAdd) {
      const name = query.trim();
      close(); setProposedName(name); setCandidates([]); setError(""); setNotice(""); setConfirmation(name);
    }
  }
  async function save(name: string, confirm_similar = false) {
    if (lock.current || disabled || !name.trim() || !same()) return;
    lock.current = true; setPending(true); onPending(true); setError(""); setNotice(""); setCandidates([]);
    setConfirmation(null);
    try {
      const response = await mobileRequest("createOtherCategory", {
        created_by: identity.id, id_client: identity.id_client,
        id_action: Number(action.id), name, confirm_similar,
      });
      if (!same()) throw Error("Sesi berubah.");
      if (response.success !== true || !response.data) throw Error("Kategori belum dapat dipastikan tersimpan. Muat ulang metadata.");
      select(response.data, response.created === true
        ? "Kategori baru berhasil ditambahkan."
        : "Kategori sudah tersedia dan dipilih. Tidak ada kategori baru yang dibuat.");
    } catch (e) {
      if (same() && e instanceof MobileApiBusinessError && e.response.code === "CATEGORY_SIMILAR") {
        const data = e.response.data as { candidates?: Record<string, unknown>[] } | undefined;
        setCandidates(data?.candidates ?? []);
      }
      setError(e instanceof Error ? e.message : "Gagal menyimpan kategori.");
    } finally {
      lock.current = false; setPending(false); onPending(false);
    }
  }
  return <section className="mweb-category-picker">
    <div className="mweb-field">
      <label id={`${listId}-label`}>{String(action.category_name ?? "Kategori")} *</label>
      <Popover.Root open={open && !blocked} onOpenChange={next => { if (!next) close(); else if (!blocked && same()) {setOpen(true); setActive(-1);} }}>
        <Popover.Trigger asChild>
          <button type="button" ref={trigger} role="combobox" aria-labelledby={`${listId}-label`} aria-controls={listId} aria-expanded={open && !blocked} aria-haspopup="listbox" aria-required="true" disabled={blocked} className="mweb-category-trigger" onKeyDown={e => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true); }
          }}><span>{choices.find(c => c.id === value)?.label ?? "Pilih kategori"}</span><svg className="mweb-category-chevron" width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg></button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="mweb-category-menu" align="start" sideOffset={4} onOpenAutoFocus={e => {e.preventDefault(); search.current?.focus();}} onCloseAutoFocus={e => {e.preventDefault(); if (!confirmation) trigger.current?.focus();}}>
            <input ref={search} type="search" role="searchbox" aria-label="Cari kategori" placeholder="Cari kategori…" aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} value={query} onChange={e => {setQuery(e.target.value); setActive(-1);}} onKeyDown={e => {
              if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {e.preventDefault(); e.stopPropagation();}
              if (e.key === "Escape") close();
              if (e.key === "ArrowDown") setActive(i => count ? (i + 1) % count : -1);
              if (e.key === "ArrowUp") setActive(i => count ? (i <= 0 ? count - 1 : i - 1) : -1);
              if (e.key === "Enter" && active >= 0 && active < count) choose(active);
            }}/>
            <div role="listbox" id={listId} aria-labelledby={`${listId}-label`}>
              {matches.map((c, i) => <button type="button" role="option" id={`${listId}-${i}`} key={c.id} aria-selected={value === c.id} data-active={active === i} onMouseMove={() => setActive(i)} onClick={() => choose(i)}>{c.label}</button>)}
              {!matches.length && <p>Belum ada kategori yang cocok.</p>}
              {canAdd && <button type="button" role="option" id={`${listId}-0`} aria-selected="false" data-active={active === 0} onMouseMove={() => setActive(0)} onClick={() => choose(0)}>+ Tambahkan kategori "{query.trim()}"</button>}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
    {pending && <p role="status">Menyimpan kategori…</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {candidates.length > 0 && <div className="mweb-notice">
      <p>Kategori serupa sudah tersedia. Gunakan kategori yang sesuai atau konfirmasikan nama yang berbeda.</p>
      {candidates.map(c => <button key={String(c.id)} type="button" className="mweb-btn" disabled={blocked || !enabled(c.required_asm)} onClick={() => {
        if (blocked || !same()) return;
        try {select(c, "Kategori yang sudah ada dipilih.");} catch(e) {setError(e instanceof Error ? e.message : "Kategori tidak valid.");}
      }}>Gunakan {String(c.name)}</button>)}
      <button type="button" className="mweb-btn" disabled={blocked} onClick={() => void save(proposedName, true)}>Tetap tambah kategori berbeda</button>
    </div>}
    <Dialog.Root open={confirmation !== null && !disabled} onOpenChange={next => {if (!next) setConfirmation(null);}}>
      <Dialog.Portal><Dialog.Overlay className="mobile-logout-overlay"/>
        <Dialog.Content className="mobile-logout-dialog" onOpenAutoFocus={e => {e.preventDefault(); cancel.current?.focus();}} onCloseAutoFocus={e => {e.preventDefault(); trigger.current?.focus();}}>
          <Dialog.Title className="mobile-logout-title">Tambah kategori?</Dialog.Title>
          <Dialog.Description className="mobile-logout-description">Yakin ingin menambahkan kategori "{confirmation}"? Kategori dapat digunakan PPDS lain dan wajib dinilai.</Dialog.Description>
          <div className="mobile-logout-actions">
            <button ref={cancel} type="button" onClick={() => setConfirmation(null)}>Batal</button>
            <button type="button" className="mobile-logout-confirm" disabled={blocked} onClick={() => {if (confirmation) void save(confirmation);}}>Tambah kategori</button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}
