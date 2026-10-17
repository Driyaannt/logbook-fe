import { Nullable } from "@/types";

export type TMorbidity = {
  id: number;
  display_name: string;
  code: string;
  id_user: number;
  id_stase: Nullable<number>;
  id_semester: number;
  poin_aktif: number;
  jml_logbook: number;
  verified: number;
};

export interface IMorbidityListParams {
  id_client: number;
  page?: number;
  limit?: number;
  search?: Nullable<string>;
}

export interface IMorbidityByUserListParams extends IMorbidityListParams {
  id_user?: number;
  status?: string;
}

export type TMorbidityByUser = {
  id: number;
  display_name: string;
  patient_name: string;
  date: string;
  semester: string;
  category: string;
  staff_pelapor: string;
  staff_penilai: string;
  staff_kps: string;
  status: string;
};

export type TMorbidityByUserDetail = TMorbidityByUser & {
  umur: string;
  cm: string;
  dx_awal: string;
  kronologi_morbiditas: string;
  lampiran: string;
  staff: Array<{
    status_id: number;
    id_user: number;
    id_action_role: number;
    name: string | null;
    role: string | null;
    role_identifier: string | null;
    status: string | null;
    verify_notes: string | null;
  }>;
};
