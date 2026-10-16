export type TStaseListItem = {
  id: number;
  user_name: string;
  stase_name: string;
  date: string;
  notes: string | null;
  is_retake: boolean;
};

export interface IStaseListParams {
  id_client: number;
  page?: number;
  limit?: number;
  search?: string | null;
  id_ppds?: number | null;
  id_stase?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

export type TStaseDetail = {
  id: number;
  id_user: number;
  id_stase: number;
  id_stage: number;
  id_semester: number;
  date: string;
  notes: string | null;
  is_retake: boolean;
};

export interface IStaseCreatePayload {
  id_stage: number;
  id_client: number;
  id_user: number;
  id_stase: number;
  id_semester: number;
  date: string;
  notes?: string | null;
  is_retake?: boolean;
  created_by: number;
}

export interface TMilestoneMorbiditasUndoInfo {
  archive_logbook_id?: number;
  current_session_id?: number;
  restore_session_id?: number;
  will_archive_transition?: boolean;
  archive_semester_name?: string;
  archive_stase_name?: string;
  archive_created_date?: string;
  archive_activity_date?: string;
  id_user: number;
  display_name?: string;
  can_undo: boolean;
  reason?: string | null;
  current_semester_id?: number;
  current_semester_name?: string;
  current_active_points?: number;
  restore_semester_id?: number;
  restore_semester_name?: string;
  restore_stase_id?: number;
  restore_stase_name?: string;
  restore_stage_id?: number;
  restore_stage_name?: string;
  restore_points?: number;
}

export interface IStaseUndoPayload {
  created_by: number;
  id_client: number;
  id_user: number;
  id_logbook: number;
  expected_current_session_id: number;
  expected_restore_session_id: number;
}

export interface IStaseArchivePayload {
  id_logbook: number;
  created_by: number;
  id_client: number;
}

export interface IStaseUpdatePayload extends Omit<
  IStaseCreatePayload,
  "created_by"
> {
  id_logbook: number;
  updated_by: number;
}
