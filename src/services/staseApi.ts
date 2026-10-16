import axios from "axios";
import type { IStaseUndoPayload, IStaseArchivePayload } from "@/types/stase";
import type { ApiResponse, ApiPaginationResponse } from "@/types";
import type { TStaseListItem, TStaseDetail, IStaseListParams, IStaseCreatePayload, IStaseUpdatePayload, TMilestoneMorbiditasUndoInfo } from "@/types/stase";

const API_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

if (!API_URL || !API_TOKEN) {
  throw new Error(
    "API configuration is missing. Please check environment variables.",
  );
}

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export const staseApi = {
  async getStaseList(
    params: IStaseListParams,
  ): Promise<ApiPaginationResponse<TStaseListItem[]>> {
    try {
      const { data: responseData } = await apiClient.post(
        "GetListStase",
        params,
      );

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to fetch");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async getStaseDetail(
    params: { id_logbook: number }
  ): Promise<ApiResponse<TStaseDetail>> {
    try {
      const { data: responseData } = await apiClient.post(
        "GetDetailStase",
        params,
      );

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to fetch");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async deleteStase(payload: IStaseArchivePayload): Promise<ApiResponse<null>> {
    try {
      const { data: responseData } = await apiClient.post("RemoveStase", payload);

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to delete");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async createStase(data: IStaseCreatePayload): Promise<ApiResponse<null>> {
    try {
      const { data: responseData } = await apiClient.post(
        "CreateStase",
        data,
      );

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to create");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },

  async updateStase(data: IStaseUpdatePayload): Promise<ApiResponse<null>> {
    try {
      const { data: responseData } = await apiClient.post(
        "UpdateStase",
        data,
      );

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to update");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },

  /**
   * Get undo preview info for a user's milestone/morbiditas semester.
   */
  async getMorbiditasUndoInfo(params: {
    created_by: number;
    id_client: number;
    id_user: number;
  }): Promise<ApiResponse<TMilestoneMorbiditasUndoInfo>> {
    try {
      const { data: responseData } = await apiClient.post(
        "GetMorbiditasUndoInfo",
        params,
      );

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to fetch undo info");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },

  /**
   * Execute undo of milestone/morbiditas semester.
   */
  async executeMorbiditasUndo(params: IStaseUndoPayload): Promise<ApiResponse<{ archived_logbook_id: number }>> {
    try {
      const { data: responseData } = await apiClient.post(
        "UndoMorbiditasStase",
        params,
      );

      if (responseData.status === false) {
        throw new Error(responseData.message || "Failed to undo");
      }

      return responseData;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          throw new Error(responseData.message);
        }
        throw new Error(error.message);
      }
      throw error;
    }
  },
};
