import { Nullable } from "@/types";

export type TStaff = {
  id: number;
  display_name: string;
  username: string;
  email: Nullable<string>;
  phone: Nullable<string>;
  address: Nullable<string>;
  location: Nullable<string>;
  date_of_birth: Nullable<string>;
  nim: Nullable<string>;
  id_role: number;
  role_name: Nullable<string>;
  stase_name: Nullable<string>;
  total_logbook: number;
};

export type TStaffDetail = TStaff;

// Payload for update Staff (matches PHP backend $post keys)
export interface IStaffPayload {
  id_user: number;
  updated_by: number;
  display_name: string;
  username: string;
  email: string;
  phone: string;
  address?: Nullable<string>;
  location?: Nullable<string>;
  date_of_birth?: Nullable<string>;
  nim?: Nullable<string>;
  id_role: number;
}

export interface IStaffListParams {
  id_client: number;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
  search?: Nullable<string>;
  staff?: Nullable<number>;
  nim?: Nullable<string>;
  role?: Nullable<string>;
}

// Payload for create Staff (matches PHP backend $post keys)
export interface IStaffCreatePayload {
  id_client: number;
  created_by: number;
  display_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  address?: Nullable<string>;
  location?: Nullable<string>;
  date_of_birth?: Nullable<string>;
  nim?: Nullable<string>;
  id_role: number;
}

// Logbook types for Staff
export type TStaffLogbook = {
  id: number;
  date: Nullable<string>;
  title: Nullable<string>;
  notes: Nullable<string>;
  verified_status: Nullable<string>;
  ppds_name: Nullable<string>;
  nim: Nullable<string>;
  action_name: Nullable<string>;
  hospital_name: Nullable<string>;
  semester: Nullable<string>;
  stase_name: Nullable<string>;
  staff_name: Nullable<string>;
};

export interface IStaffLogbookListParams {
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

export type TStaffLogbookData = {
  list: TStaffLogbook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pageCount: number;
  };
};

// Payload for change password (matches PHP backend $post keys)
export interface IStaffChangePasswordPayload {
  updated_by: number;
  id_user: number;
  password: string;
  confirm_password: string;
}

// Types for Staff Logbook Detail (matches GetDetailStaffLogbook API response)
export interface TStaffLogbookDetail {
  id: number;
  category_name?: Nullable<string>;
  is_other?: boolean;
  // user
  ppds_name: Nullable<string>;
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
