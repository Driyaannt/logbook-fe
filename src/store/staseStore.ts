import { create } from "zustand";
import { staseApi } from "@/services/staseApi";
import { useAuthStore } from "@/store/authStore";
import { usePpdsStore } from "@/store/ppdsStore";
import { useMorbidityStore } from "@/store/morbidityStore";
import type {
  StaseData,
  StaseState,
  StaseStore,
} from "@/types/stase/store";
import { EXPORT_LIMIT } from "@/constants/export";

let undoRequest = 0;
let lastListParams: Parameters<typeof staseApi.getStaseList>[0] | undefined;

const initialState: StaseState = {
  staseData: {
    list: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      pageCount: 1,
    },
  },
  selectedStase: null,
  isLoading: false,
  isLoadingDetail: false,
  isExporting: false,
  error: null,
  success: null,
  hasInitialized: false,
  // Undo state
  undoInfo: null,
  isLoadingUndo: false,
  isExecutingUndo: false,
  undoError: null,
};

export const useStaseStore = create<StaseStore>((set, get) => ({
  ...initialState,

  loadStaseList: async (params) => {
    const { user } = useAuthStore.getState();

    set({ isLoading: true, error: null });
    try {
      lastListParams = { id_client: user?.id_client ?? 0, ...params };
      const response = await staseApi.getStaseList({
        id_client: user?.id_client ?? 0,
        ...params,
      });
      const data: StaseData = {
        list: response.data,
        pagination: {
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.total,
          pageCount: Math.ceil(response.total / response.pagination.limit),
        },
      };
      set({
        staseData: data,
        isLoading: false,
        hasInitialized: true,
      });
      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load stase";
      set({
        error: message,
        isLoading: false,
        hasInitialized: true,
      });
      throw error;
    }
  },

  loadStaseDetail: async (id_logbook: number) => {
    set({ isLoadingDetail: true, error: null, selectedStase: null });
    try {
      const response = await staseApi.getStaseDetail({ id_logbook });
      set({ selectedStase: response.data || null, isLoadingDetail: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load stase detail",
        isLoadingDetail: false,
      });
    }
  },

  createStase: async (data) => {
    if (get().isExecutingUndo || get().isLoading) return false;
    set({ isLoading: true, error: null, success: null });
    try {
      await staseApi.createStase(data);
      set({ isLoading: false, success: "Data berhasil dibuat!" });
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to create stase",
        isLoading: false,
      });
      return false;
    }
  },

  updateStase: async (data) => {
    if (get().isExecutingUndo || get().isLoading) return false;
    set({ isLoading: true, error: null, success: null });
    try {
      await staseApi.updateStase(data);
      set({ isLoading: false, success: "Data berhasil diupdate!" });
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update stase",
        isLoading: false,
      });
      return false;
    }
  },

  deleteStase: async (id_logbook) => {
    if (get().isExecutingUndo || get().isLoading) return false;
    set({ isLoading: true, error: null, success: null });
    try {
      const { user } = useAuthStore.getState();
      const response = await staseApi.deleteStase({ id_logbook, created_by: user?.id ?? 0, id_client: user?.id_client ?? 0 });
      set({ isLoading: false, success: response.message ?? "Data berhasil dihapus!" });
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to delete stase",
        isLoading: false,
      });
      return false;
    }
  },

  loadExportStaseList: async ({ filterParams, onProgress, signal }) => {
    const { user } = useAuthStore.getState();

    set({ isExporting: true });

    try {
      // Step 1: Get total count from first fetch
      const firstResponse = await staseApi.getStaseList({
        id_client: user?.id_client ?? 0,
        ...filterParams,
        page: 1,
        limit: 1,
      });

      // Check if cancelled before continuing
      if (signal?.aborted) {
        set({ isExporting: false });
        throw new Error("EXPORT_CANCELLED");
      }

      const total = firstResponse.total;

      if (total === 0) {
        set({ isExporting: false });
        return [];
      }

      // Step 2: Batch export with limit
      const totalBatch = Math.ceil(total / EXPORT_LIMIT);
      let allData: typeof firstResponse.data = [];

      for (let i = 0; i < totalBatch; i++) {
        // Check if cancelled before each batch
        if (signal?.aborted) {
          set({ isExporting: false });
          throw new Error("EXPORT_CANCELLED");
        }

        const response = await staseApi.getStaseList({
          id_client: user?.id_client ?? 0,
          ...filterParams,
          page: i + 1,
          limit: EXPORT_LIMIT,
        });

        // Check if cancelled after each batch
        if (signal?.aborted) {
          set({ isExporting: false });
          throw new Error("EXPORT_CANCELLED");
        }

        allData.push(...response.data);

        // Call progress callback
        if (onProgress) {
          onProgress(Math.round(((i + 1) / totalBatch) * 100), allData.length, total);
        }
      }

      set({ isExporting: false });
      return allData;
    } catch (error) {
      set({ isExporting: false });
      throw error;
    }
  },

  cancelExport: () => {
    set({ isExporting: false });
  },

  fetchUndoInfo: async (id_user: number) => {
    const { user } = useAuthStore.getState();
    const request = ++undoRequest;
    set({ isLoadingUndo: true, undoError: null, undoInfo: null });
    try {
      const response = await staseApi.getMorbiditasUndoInfo({
        created_by: user?.id ?? 0,
        id_client: user?.id_client ?? 0,
        id_user,
      });
      if (request !== undoRequest) return;
      if (Number(response.data?.id_user) !== id_user) throw new Error("Preview bukan milik PPDS yang dipilih; Refresh status Undo");
      set({ undoInfo: response.data, isLoadingUndo: false });
    } catch (error) {
      if (request !== undoRequest) return;
      set({
        undoError:
          error instanceof Error ? error.message : "Failed to fetch undo info",
        isLoadingUndo: false,
        undoInfo: null,
      });
    }
  },

  executeUndo: async (id_user, confirmed) => {
    const { user } = useAuthStore.getState();
    const current = get().undoInfo;
    if (get().isExecutingUndo || get().isLoading) return false;
    if (get().isLoadingUndo || !current?.can_undo || !current.will_archive_transition || !confirmed?.can_undo || !confirmed.will_archive_transition ||
        confirmed.id_user !== id_user || current?.id_user !== id_user ||
        ![confirmed.archive_logbook_id, confirmed.current_session_id, confirmed.restore_session_id].every(id => Number.isSafeInteger(id) && Number(id) > 0) ||
        current.archive_logbook_id !== confirmed.archive_logbook_id ||
        current.current_session_id !== confirmed.current_session_id || current.restore_session_id !== confirmed.restore_session_id) {
      set({ undoError: "Preview sudah berubah atau tidak memiliki bukti arsip; Refresh status Undo" });
      return false;
    }
    ++undoRequest;
    set({ isExecutingUndo: true, undoError: null });
    try {
      const response = await staseApi.executeMorbiditasUndo({
        created_by: user?.id ?? 0,
        id_client: user?.id_client ?? 0,
        id_user,
        id_logbook: confirmed.archive_logbook_id!,
        expected_current_session_id: confirmed.current_session_id!,
        expected_restore_session_id: confirmed.restore_session_id!,
      });
      if (response.status !== true || Number(response.data?.archived_logbook_id) !== confirmed.archive_logbook_id) {
        throw new Error("Respons tidak mengonfirmasi kartu transisi yang diarsipkan; muat ulang sebelum mencoba lagi");
      }
      set({ undoInfo: null, selectedStase: null, hasInitialized: false, staseData: initialState.staseData });
      usePpdsStore.setState({ selectedPpds: null, hasInitialized: false });
      useMorbidityStore.getState().reset();
      // Mutation succeeded: refresh failure must never invite a second mutation.
      const refreshed = await Promise.allSettled([
        get().loadStaseList(lastListParams),
        usePpdsStore.getState().loadPpdsDetail(id_user),
      ]);
      set({ isExecutingUndo: false, undoError: refreshed.some(result => result.status === "rejected") ? "Undo berhasil; sebagian data belum termuat, silakan Refresh." : null });
      return true;
    } catch (error) {
      set({
        undoError:
          error instanceof Error ? error.message : "Failed to execute undo",
        isExecutingUndo: false,
        undoInfo: null,
      });
      return false;
    }
  },

  clearUndoInfo: () => {
    ++undoRequest;
    set({ undoInfo: null, isLoadingUndo: false, undoError: null });
  },

  reset: () => { ++undoRequest; set({ ...initialState, isExecutingUndo: get().isExecutingUndo }); },
  resetDetail: () =>
    set({ selectedStase: null, isLoadingDetail: false, error: null }),
}));
