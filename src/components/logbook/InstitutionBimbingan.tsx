import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import type { IPpdsLogbookListParams } from "@/types/ppds";
import type { IStaffLogbookListParams } from "@/types/staff";
import { ppdsApi } from "@/services/ppdsApi";
import { staffApi } from "@/services/staffApi";
import { mobileRequest, MobileApiError } from "@/mobile/api";
import {
  enabled,
  getDynamicCategories,
  type DynamicLogbookAction,
} from "@/mobile/features/logbook/dynamicLogbookForm";
import {
  groupedCategoryCards,
  otherCategoryIds,
  type CategoryGroup,
} from "@/mobile/features/logbook/otherCategories";
import { summarizeBimbinganOperasiCategories } from "@/mobile/features/logbook/bimbinganOperasiGrouping";
import type { Row } from "@/mobile/features/logbook/model";
/** Existing Institution PPDS/Staff Logbook route, never a Mobile role promotion.
 * Counts use the complete filtered Web list, not a guessed first-page total. */
export function InstitutionBimbingan({
  kind,
  idUser,
  children,
}: {
  kind: "ppds" | "staff";
  idUser: string;
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user),
    [search, setSearch] = useSearchParams(),
    location = useLocation(),
    navigate = useNavigate();
  const [meta, setMeta] = useState<DynamicLogbookAction | null>(null),
    [rows, setRows] = useState<Row[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [refresh, setRefresh] = useState(0);
  const activity = Number(search.get("id_activity")),
    key = `${user?.id}:${user?.id_client}:${kind}:${idUser}:${search}:${refresh}`;
  const [loaded, setLoaded] = useState("");
  const group: CategoryGroup | undefined =
    search.get("categoryView") === "1"
      ? search.get("category_group") === "other"
        ? "other"
        : Number(search.get("id_category")) || undefined
      : undefined;
  const presentation = search.get("is_presentation") === "true";
  useEffect(() => {
    let active = true;
    setMeta(null);
    setError("");
    setRows([]);
    if (!activity || !user?.id_client) return;
    setLoading(true);
    (async () => {
      let response: Row;
      try {
        response = await mobileRequest("getLogbookFormMetadata", {
          id_client: user.id_client,
          id_action: activity,
        });
      } catch (error) {
        // An older deployment has no category metadata capability. Keep its
        // existing table unless this URL explicitly requests Other navigation.
        if (
          error instanceof MobileApiError &&
          error.status === 404 &&
          group === undefined &&
          search.get("category_group") !== "other"
        ) {
          if (active) {
            setMeta({ allow_other_categories: false });
            setLoaded(key);
          }
          return;
        }
        throw error;
      }
      const action = response.data;
      if (
        !action ||
        Number(action.id) !== activity ||
        (action.id_client != null &&
          Number(action.id_client) !== user.id_client)
      )
        throw Error("Metadata aktivitas tidak sesuai.");
      if (!active) return;
      setMeta(action);
      if (!enabled(action.allow_other_categories)) {
        setLoaded(key);
        return;
      }
      const scope = new URLSearchParams(search);
      if (group !== undefined) {
        scope.delete("id_category");
        scope.delete("is_presentation");
        scope.delete("category_group");
        const saved = new URLSearchParams(search.get("groupScope") ?? "");
        for (const k of ["id_category", "is_presentation", "category_group"])
          if (saved.has(k)) scope.set(k, saved.get(k)!);
      }
      const params: Row & IPpdsLogbookListParams & IStaffLogbookListParams = {
        id_client: user.id_client,
        [kind === "ppds" ? "id_ppds" : "id_staff"]: Number(idUser),
        id_activity: activity,
        limit: 100,
      };
      for (const k of [
        "id_ppds",
        "id_staff",
        "id_stase",
        "id_category",
        "start_date",
        "end_date",
        "status",
        "search",
        "is_presentation",
        "category_group",
      ]) {
        if (
          (kind === "ppds" && k === "id_ppds") ||
          (kind === "staff" && k === "id_staff")
        )
          continue;
        const v = scope.get(k);
        if (v !== null && v !== "")
          params[k] = k.startsWith("id_")
            ? Number(v)
            : k === "is_presentation"
              ? v === "true"
              : v;
      }
      async function complete(extra: Row = {}) {
        const all: Row[] = [],
          seen = new Set<string>();
        let page = 1;
        while (true) {
          const result: Row =
            kind === "ppds"
              ? await ppdsApi.getPpdsLogbookList({ ...params, ...extra, page })
              : await staffApi.getStaffLogbookList({
                  ...params,
                  ...extra,
                  page,
                });
          if (!active) return [];
          const data = Array.isArray(result.data)
            ? result.data
            : result.data?.list;
          if (!Array.isArray(data)) throw Error("Daftar logbook tidak valid.");
          const pagination = result.data.pagination ?? result.pagination;
          const total = Number(result.total ?? pagination?.total),
            size = Number(pagination?.limit),
            returnedPage = Number(pagination?.page);
          if (
            !pagination ||
            !Number.isSafeInteger(total) ||
            total < 0 ||
            !Number.isSafeInteger(size) ||
            size <= 0 ||
            returnedPage !== page
          )
            throw Error(
              "Total kategori belum dapat dipastikan: pagination server tidak tersedia.",
            );
          const pageCount = Math.max(1, Math.ceil(total / size));
          let added = 0;
          for (const r of data) {
            if (!("id_category" in r) || !("is_presentation" in r))
              throw Error(
                "Server belum mendukung kategori Lainnya: metadata kategori/presentasi pada daftar belum tersedia.",
              );
            if (r.id == null) throw Error("ID logbook tidak tersedia.");
            if (!seen.has(String(r.id))) {
              seen.add(String(r.id));
              all.push(r);
              added++;
            }
          }
          if (page >= pageCount) {
            if (all.length !== total)
              throw Error("Total kategori belum lengkap. Muat ulang.");
            return all;
          }
          if (!added) throw Error("Server mengulang halaman.");
          page++;
        }
      }
      const all = await complete();
      if (group !== undefined)
        await complete({
          ...(group === "other"
            ? { category_group: "other" }
            : { id_category: group }),
          is_presentation: presentation,
        });
      if (active) {
        setRows(all);
        setLoaded(key);
      }
    })()
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Gagal memuat kategori.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key]);
  if (!activity) return <>{children}</>;
  if (!loading && !error && meta && !enabled(meta.allow_other_categories))
    return <>{children}</>;
  const categories = meta ? getDynamicCategories(meta) : [],
    ids = meta ? otherCategoryIds(meta) : new Set<number>();
  const countScope =
    group !== undefined
      ? new URLSearchParams(search.get("groupScope") ?? "")
      : search;
  const scoped = rows.filter(
    (r) =>
      (!countScope.get("id_category") ||
        Number(r.id_category ?? r.m_action_category?.id) ===
          Number(countScope.get("id_category"))) &&
      (countScope.get("category_group") !== "other" ||
        ids.has(Number(r.id_category ?? r.m_action_category?.id))) &&
      (!countScope.has("is_presentation") ||
        enabled(r.is_presentation) ===
          (countScope.get("is_presentation") === "true")),
  );
  const counts = summarizeBimbinganOperasiCategories(categories, scoped).map(
    (c) => ({
      id: c.id,
      label: c.label,
      count: c.count,
      presentation: c.presentationCount,
      presented: c.presentedCount,
    }),
  );
  const cards = meta ? groupedCategoryCards(meta, counts) : [],
    selected = cards.find((c) => c.id === group);
  const visible = scoped.filter(
    (r) =>
      (group === "other"
        ? ids.has(Number(r.id_category ?? r.m_action_category?.id))
        : Number(r.id_category ?? r.m_action_category?.id) === group) &&
      enabled(r.is_presentation) === presentation,
  );
  function open(id?: CategoryGroup, present = false) {
    const next = new URLSearchParams(search);
    next.delete("page");
    if (id === undefined) {
      next.delete("categoryView");
      next.delete("category_group");
      next.delete("id_category");
      next.delete("is_presentation");
      const saved = new URLSearchParams(search.get("groupScope") ?? "");
      for (const k of ["id_category", "is_presentation", "category_group"])
        if (saved.has(k)) next.set(k, saved.get(k)!);
      next.delete("groupScope");
    } else {
      if (group === undefined) {
        const scope = new URLSearchParams();
        for (const k of ["id_category", "is_presentation", "category_group"])
          if (search.has(k)) scope.set(k, search.get(k)!);
        next.set("groupScope", scope.toString());
      }
      next.set("categoryView", "1");
      if (id === "other") {
        next.set("category_group", "other");
        next.delete("id_category");
      } else {
        next.delete("category_group");
        next.set("id_category", String(id));
      }
      next.set("is_presentation", String(present));
    }
    setSearch(next);
  }
  return (
    <section
      className="h-full overflow-auto p-4"
      aria-label="Kategori logbook Institution"
      aria-busy={loading}
    >
      {meta && enabled(meta.allow_other_categories) && group === undefined && (
        <label className="block mb-3">
          Kelompok kategori
          <select
            aria-label="Kelompok kategori"
            className="block w-full border rounded-lg p-2"
            value={search.get("category_group") ?? ""}
            onChange={(e) => {
              const next = new URLSearchParams(search);
              next.delete("page");
              if (e.target.value) next.set("category_group", e.target.value);
              else next.delete("category_group");
              setSearch(next);
            }}
          >
            <option value="">Semua</option>
            <option value="other">Lainnya</option>
          </select>
        </label>
      )}
      <div className="flex gap-3 mb-4">
        {group !== undefined && (
          <button
            className="text-[#087F5B]"
            onClick={() => (presentation ? open(group, false) : open())}
          >
            Kembali ke{" "}
            {presentation ? (selected?.label ?? "kategori") : "kategori"}
          </button>
        )}
        <button
          className="text-[#087F5B]"
          onClick={() => setRefresh((v) => v + 1)}
        >
          Segarkan kategori
        </button>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : loading || loaded !== key ? (
        <p role="status">Memuat kategori…</p>
      ) : group === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {cards.map((c) => (
            <button
              className="rounded-lg border p-4 text-left"
              key={c.id}
              disabled={!c.count}
              onClick={() => open(c.id)}
            >
              <strong>{c.label}</strong>
              <span className="block">{c.count} kegiatan</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <h2 className="font-semibold mb-3">
            {selected?.label}
            {presentation ? " / Presentation" : ""}
          </h2>
          {!presentation && !!selected?.presentation && (
            <button
              className="rounded-lg border p-4 mb-3"
              onClick={() => open(group, true)}
            >
              Presentation {selected.presentation} kegiatan
            </button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visible.map((r) => (
              <button
                className="rounded-lg border p-4 text-left"
                key={r.id}
                onClick={() =>
                  navigate(`${location.pathname}/${r.id}${location.search}`)
                }
              >
                <strong>{r.title ?? r.ppds_name ?? `Logbook ${r.id}`}</strong>
                <span className="block">
                  Keterangan kategori:{" "}
                  {r.category_name ??
                    r.m_action_category?.name ??
                    categories.find((c) => c.id === Number(r.id_category))
                      ?.label ??
                    "-"}
                </span>
                <span>{r.verified_status}</span>
              </button>
            ))}
          </div>
          {!visible.length && <p>Belum ada kegiatan</p>}
        </>
      )}
    </section>
  );
}
