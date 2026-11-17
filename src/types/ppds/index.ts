import { Nullable } from "@/types";

export type TPpdsInactive = TPpds & {
  inactive_at: Nullable<string>;
  inactive_notes: Nullable<string>;
};

export type TPpds = {
  id: number;
  display_name: string;
  username: string;
  email: string;
  phone: Nullable<string>;
  address: Nullable<string>;
  date_of_birth: Nullable<string>;
  nim: Nullable<string>;
  role_name: Nullable<string>;
  stase_name: Nullable<string>;
  total_logbook: number;
};

export type TPpdsDetail = TPpds & {
  status: string;
  inactive_at: Nullable<string>;
  inactive_notes: Nullable<string>;
  reactivate_date: Nullable<string>;
};

// Payload for update PPDS (matches PHP backend $post keys)
export interface IPpdsPayload {
  id_user: number;
  display_name: string;
  username: string;
  email: string;
  phone: string;
  address?: Nullable<string>;
  date_of_birth?: Nullable<string>;
  nim?: Nullable<string>;
  status?: Nullable<string>;
  inactive_at?: Nullable<string>;
  inactive_notes?: Nullable<string>;
  reactivate_date?: Nullable<string>;
}

export interface IPpdsListParams {
  id_client: number;
  page: number;
  limit: number;
  search?: Nullable<string>;
  status?: Nullable<string>;
  ppds?: Nullable<number>;
  stase?: Nullable<number>;
  nim?: Nullable<string>;
}

// Payload for create PPDS (matches PHP backend $post keys)
export interface IPpdsCreatePayload {
  id_client: number;
  display_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  address?: Nullable<string>;
  date_of_birth?: Nullable<string>;
  nim?: Nullable<string>;
}

// Logbook types
export type TPpdsLogbook = {
  id: number;
  date: string;
  title: string;
  notes: Nullable<string>;
  verified_status: string;
  ppds_name: string;
  nim: Nullable<string>;
  action: string;
  hospital: string;
  semester: Nullable<string>;
  stase_name: string;
  staff: Array<{ id: number; name: string | null }>;
};

export interface IPpdsLogbookListParams {
  id_category?: Nullable<number>;
  category_group?: 'other';
  is_presentation?: boolean;
  id_client: number;
  page?: number;
  limit?: number;
  search?: Nullable<string>;
  id_ppds?: Nullable<number>;
  id_staff?: Nullable<number>;
  id_activity?: Nullable<number>;
  id_stase?: Nullable<number>;
  start_date?: Nullable<string>;
  end_date?: Nullable<string>;
  status?: Nullable<string>;
}

export type TPpdsLogbookData = {
  list: TPpdsLogbook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
};

// Payload for change password (matches PHP backend $post keys)
export interface IPpdsChangePasswordPayload {
  updated_by: number;
  id_user: number;
  password: string;
  confirm_password: string;
}

// Types for PPDS Logbook Detail (matches GetDetailPPDSLogbook API response)
export interface TPpdsLogbookDetail {
  id: number;
  category_name?: Nullable<string>;
  is_other?: boolean;
  // user
  ppds_name: string;
  nim: Nullable<string>;
  inisial_code: Nullable<string>;

  // kegiatan
  date: Nullable<string>;
  action_name: Nullable<string>;
  hospital_name: Nullable<string>;
  notes: Nullable<string>;
  status_logbook: Nullable<string>;

  // staff
  staff: Array<{
    name: string | null;
    role: string | null;
    status: string | null;
  }>;
}

// Params for getting PPDS Logbook Detail
export interface IPpdsLogbookDetailParams {
  id_logbook: number;
}
