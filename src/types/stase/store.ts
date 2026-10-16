import { Nullable } from "@/types";
import type {
  TStaseListItem,
  IStaseListParams,
  TStaseDetail,
  IStaseCreatePayload,
  IStaseUpdatePayload,
  TMilestoneMorbiditasUndoInfo,
} from "./index";

export interface StaseData {
  list: TStaseListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
}

export interface StaseState {
  staseData: StaseData;
  selectedStase: TStaseDetail | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  isExporting: boolean;
  error: Nullable<string>;
  success: Nullable<string>;
  hasInitialized: boolean;
  // Undo state
  undoInfo: TMilestoneMorbiditasUndoInfo | null;
  isLoadingUndo: boolean;
  isExecutingUndo: boolean;
  undoError: Nullable<string>;
}

export interface StaseActions {
  loadStaseList: (params?: Partial<IStaseListParams>) => Promise<StaseData>;
  loadStaseDetail: (id_logbook: number) => Promise<void>;
  createStase: (data: IStaseCreatePayload) => Promise<boolean>;
  updateStase: (data: IStaseUpdatePayload) => Promise<boolean>;
  deleteStase: (id_logbook: number) => Promise<boolean>;
  loadExportStaseList: (params: {
    filterParams: Partial<IStaseListParams>;
    onProgress?: (progress: number, offset: number, total: number) => void;
    signal?: AbortSignal;
  }) => Promise<TStaseListItem[]>;
  cancelExport: () => void;
  // Undo actions
  fetchUndoInfo: (id_user: number) => Promise<void>;
  executeUndo: (id_user: number, confirmed: TMilestoneMorbiditasUndoInfo) => Promise<boolean>;
  clearUndoInfo: () => void;
  reset: () => void;
  resetDetail: () => void;
}

export type StaseStore = StaseState & StaseActions;
