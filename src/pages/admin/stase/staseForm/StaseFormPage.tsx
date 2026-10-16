import { Topbar } from "@/components/layout/Topbar";
import { ROUTES } from "@/utils/routes";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InputField } from "@/components/fields/inputField";
import { CalendarSelect } from "@/components/fields/calendarSelect";
import { SingleSelect } from "@/components/fields/singleSelect";
import { SwitchField } from "@/components/fields/switchField";
import { icons } from "@/assets/images/Icon";
import type { BasicSelectOpt } from "@/types";
import type { TMilestoneMorbiditasUndoInfo } from "@/types/stase";
import {
  staseSchema,
  createInitialStaseValues,
  StaseFormData,
} from "@/validations/stase/stase";
import { useStaseStore } from "@/store/staseStore";
import { useMasterStore } from "@/store/masterStore";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState, useCallback } from "react";
import dayjs from "dayjs";
import { showToast } from "@/utils/toast";
import { ConfirmationModal } from "@/components/confirmationModal";
import useModal from "@/hooks/useModal";

export default function StaseFormPage() {
  const { idUser } = useParams<{ idUser: string }>();
  const idLogbook = idUser;
  const navigate = useNavigate();

  const {
    selectedStase,
    isLoading,
    loadStaseDetail,
    createStase,
    updateStase,
    deleteStase,
    resetDetail,
    // Undo
    undoInfo,
    isLoadingUndo,
    isExecutingUndo,
    undoError,
    fetchUndoInfo,
    executeUndo,
    clearUndoInfo,
  } = useStaseStore();

  const {
    ppdsActiveOptions,
    staseOptions,
    stageOptions,
    semesterOptions,
    fetchPPDSActiveOptions,
    fetchStaseOptions,
    fetchStageByStase,
    fetchSemesterOptions,
  } = useMasterStore();

  const { user } = useAuthStore();

  // Guard to prevent cascading effects during initial form population in edit mode
  const [isFormInitialized, setIsFormInitialized] = useState(true);

  // Initial load
  useEffect(() => {
    if (user?.id_client) {
      fetchPPDSActiveOptions({ id_client: user.id_client });
      fetchStaseOptions({ id_client: user.id_client });
    }
  }, [user?.id_client, fetchPPDSActiveOptions, fetchStaseOptions]);

  // Load detail when in edit mode
  useEffect(() => {
    if (idLogbook) {
      loadStaseDetail(Number(idLogbook));
    }
    return () => {
      resetDetail();
      clearUndoInfo();
    };
  }, [idLogbook, loadStaseDetail, resetDetail, clearUndoInfo]);

  const isEditMode = !!idLogbook;

  const handleDelete = async () => {
    if (idLogbook) {
      const success = await deleteStase(Number(idLogbook));
      if (success) {
        const successMessage = useStaseStore.getState().success;
        showToast(successMessage ?? "Data berhasil dihapus!", "success", {
          duration: 3000,
        });
        navigate(ROUTES.stase);
      } else {
        const errorMessage = useStaseStore.getState().error;
        showToast(errorMessage ?? "Gagal menghapus data", "error", {
          duration: 4000,
        });
      }
    }
    toggleDelete(false);
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StaseFormData>({
    resolver: zodResolver(staseSchema),
    defaultValues: createInitialStaseValues,
  });

  // Watch stase and stage values for cascading
  const watchedIdStase = useWatch({ control, name: "id_stase" });
  const watchedIdStage = useWatch({ control, name: "id_stage" });
  const watchedIdUser = useWatch({ control, name: "id_user" });

  // When stase changes, fetch stage by stase and populate dropdown
  useEffect(() => {
    if (isFormInitialized && watchedIdStase) {
      fetchStageByStase({ id_stase: Number(watchedIdStase) });
    }
  }, [isFormInitialized, watchedIdStase, fetchStageByStase]);

  // When stage changes, fetch semesters
  useEffect(() => {
    if (watchedIdStage) {
      fetchSemesterOptions({ id_stage: Number(watchedIdStage) });
    }
  }, [watchedIdStage, fetchSemesterOptions]);

  // Add and Edit preview the selected PPDS's active transition, never the edited card.
  useEffect(() => {
    if (watchedIdUser) {
      fetchUndoInfo(watchedIdUser);
    } else {
      clearUndoInfo();
    }
  }, [watchedIdUser, isEditMode, fetchUndoInfo, clearUndoInfo]);

  // Set initial values when selectedStase is loaded in edit mode
  useEffect(() => {
    if (selectedStase && isEditMode) {
      setIsFormInitialized(false);
      reset({
        id_user: selectedStase.id_user,
        id_stase: selectedStase.id_stase,
        id_stage: selectedStase.id_stage,
        id_semester: selectedStase.id_semester,
        date: selectedStase.date ? new Date(selectedStase.date) : undefined,
        notes: selectedStase.notes ?? "",
        is_retake: selectedStase.is_retake ?? false,
      });
      // Load stage for the stase
      if (selectedStase.id_stase) {
        fetchStageByStase({ id_stase: selectedStase.id_stase });
      }
      // Load semesters for the initial stage
      if (selectedStase.id_stage) {
        fetchSemesterOptions({ id_stage: selectedStase.id_stage });
      }
      // Mark form as initialized after reset
      setIsFormInitialized(true);
    }
  }, [
    selectedStase,
    isEditMode,
    reset,
    fetchStageByStase,
    fetchSemesterOptions,
  ]);

  const onSubmit = async (data: StaseFormData) => {
    if (!data.id_user || !data.id_stase || !data.id_stage || !data.id_semester || !data.date || isExecutingUndo) {
      return;
    }

    const payload = {
      id_user: data.id_user,
      id_stase: data.id_stase,
      id_stage: data.id_stage!,
      id_semester: data.id_semester,
      date: dayjs(data.date).format("YYYY-MM-DD"),
      id_client: user?.id_client ?? 0,
      notes: data.notes ?? "",
      is_retake: data.is_retake,
    };

    let success = false;
    if (isEditMode && idLogbook) {
      success = await updateStase({
        ...payload,
        updated_by: user?.id ?? 0,
        id_logbook: Number(idLogbook),
      });
    } else {
      success = await createStase({ ...payload, created_by: user?.id ?? 0 });
    }

    if (success) {
      const successMessage = useStaseStore.getState().success;
      showToast(successMessage ?? "Data berhasil disimpan!", "success");
      navigate(ROUTES.stase);
    } else {
      const errorMessage = useStaseStore.getState().error;
      showToast(errorMessage ?? "Data gagal disimpan!", "error", {
        duration: 4000,
      });
    }
  };

  // Delete modal
  const { isShown: isShowDelete, toggle: toggleDelete } = useModal();
  // Undo confirmation modal
  const { isShown: isShowUndoConfirm, toggle: toggleUndoConfirm } = useModal();
  const [confirmedUndo, setConfirmedUndo] = useState<TMilestoneMorbiditasUndoInfo | null>(null);
  const safeUndo = !!undoInfo?.can_undo && undoInfo.id_user === watchedIdUser && undoInfo.will_archive_transition === true &&
    [undoInfo.archive_logbook_id, undoInfo.current_session_id, undoInfo.restore_session_id].every(id => Number.isSafeInteger(id) && Number(id) > 0);

  useEffect(() => {
    setConfirmedUndo(null);
    toggleUndoConfirm(false);
  }, [watchedIdUser]);

  const openUndoConfirm = () => {
    if (!safeUndo || isLoadingUndo || isExecutingUndo) return;
    setConfirmedUndo({ ...undoInfo! });
    toggleUndoConfirm(true);
  };

  const handleRefreshUndo = useCallback(() => {
    setConfirmedUndo(null);
    toggleUndoConfirm(false);
    if (watchedIdUser) {
      fetchUndoInfo(watchedIdUser);
    }
  }, [watchedIdUser, fetchUndoInfo]);

  const handleExecuteUndo = async () => {
    if (!watchedIdUser || !confirmedUndo || isExecutingUndo) return;
    const success = await executeUndo(watchedIdUser, confirmedUndo);
    toggleUndoConfirm(false);
    if (success) {
      showToast("Undo berhasil! Semester & stase dikembalikan.", "success", {
        duration: 3000,
      });
      // Store has reloaded the list and PPDS profile; leave any archived Edit card.
      navigate(ROUTES.stase);
    } else {
      const errorMessage = useStaseStore.getState().undoError;
      showToast(errorMessage ?? "Gagal melakukan undo", "error", {
        duration: 4000,
      });
    }
  };

  // Convert options helper
  const ppdsSelectOptions: BasicSelectOpt<number>[] = ppdsActiveOptions.map(
    (opt) => ({
      value: Number(opt.value),
      label: opt.label,
    }),
  );

  const staseSelectOptions: BasicSelectOpt<number>[] = staseOptions.map(
    (opt) => ({
      value: Number(opt.value),
      label: opt.label,
    }),
  );

  const stageSelectOptions: BasicSelectOpt<number>[] = stageOptions.map(
    (opt) => ({
      value: Number(opt.value),
      label: opt.label,
    }),
  );

  const semesterSelectOptions: BasicSelectOpt<number>[] = semesterOptions.map(
    (opt) => ({
      value: Number(opt.value),
      label: opt.label,
    }),
  );

  // Determine the selected user's display name for undo banner
  const selectedUserName =
    undoInfo?.display_name ??
    ppdsSelectOptions.find((opt) => opt.value === watchedIdUser)?.label ??
    "";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-[114px] lg:pt-0">
      <Topbar
        breadcrumbs={[
          { label: "Stase", to: ROUTES.stase },
          { label: isEditMode ? "Detail" : "Tambah Stase" },
        ]}
        onSave={handleSubmit(onSubmit)}
        onDelete={isEditMode ? () => toggleDelete(true) : undefined}
        isLoading={isLoading || isExecutingUndo}
      />
      <div className="flex-1 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Existing amber Undo banner, shared by Add and Edit. */}
          {watchedIdUser && (isLoadingUndo || undoInfo || undoError) && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
              {isLoadingUndo ? (
                <div className="flex items-center gap-2 text-amber-700">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    Memuat info undo...
                  </span>
                </div>
              ) : undoError ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-800">{undoError}</span>
                  <button
                    type="button"
                    onClick={handleRefreshUndo}
                    className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    <icons.RotateCcw className="h-3 w-3" />
                    Refresh
                  </button>
                </div>
              ) : undoInfo ? (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-semibold text-amber-900">
                        Undo Ganti Semester — {selectedUserName}
                      </h4>
                      {safeUndo ? (
                        <>
                          <p className="text-xs text-amber-800">
                            Sekarang:{" "}
                            <span className="font-medium">
                              {undoInfo.current_semester_name}
                            </span>{" "}
                            · Poin aktif{" "}
                            <span className="font-medium">
                              {undoInfo.current_active_points ?? 0}
                            </span>
                          </p>
                          <p className="text-xs text-amber-800">
                            Undo ke:{" "}
                            <span className="font-medium">
                              {undoInfo.restore_semester_name}
                            </span>{" "}
                            /{" "}
                            <span className="font-medium">
                              {undoInfo.restore_stase_name}
                            </span>{" "}
                            · Estimasi poin{" "}
                            <span className="font-medium">
                              {undoInfo.restore_points ?? "—"}
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-amber-800">
                          {undoInfo.reason ?? "Bukti arsip/token sesi belum tersedia. Refresh atau perbarui backend sebelum Undo."}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {safeUndo && (
                      <button
                        type="button"
                        onClick={openUndoConfirm}
                        disabled={isExecutingUndo}
                        className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                      >
                        {isExecutingUndo ? (
                          <>
                            <svg
                              className="h-3 w-3 animate-spin"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Memproses...
                          </>
                        ) : (
                          "Undo semester, stase & poin"
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRefreshUndo}
                      disabled={isLoadingUndo || isExecutingUndo}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                    >
                      <icons.RotateCcw className="h-3 w-3" />
                      Refresh
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Form - 2 Column Layout */}
          <div className="bg-white rounded-lg border p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {/* Row 1: User* | Stase* */}
              <Controller
                name="id_user"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      User<span className="text-[#D95D43] ml-1">*</span>
                    </label>
                    <SingleSelect
                      {...field}
                      options={ppdsSelectOptions}
                      disabled={isEditMode || isExecutingUndo}
                      value={
                        ppdsSelectOptions.find(
                          (opt) => opt.value === field.value,
                        ) || null
                      }
                      onChange={(option) =>
                        field.onChange(option?.value as number)
                      }
                      isSearchable
                      isClearable={false}
                      errorMessage={errors.id_user?.message}
                    />
                  </div>
                )}
              />
              <Controller
                name="id_stase"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Stase<span className="text-[#D95D43] ml-1">*</span>
                    </label>
                    <SingleSelect
                      {...field}
                      options={staseSelectOptions}
                      disabled={isEditMode || isExecutingUndo}
                      value={
                        staseSelectOptions.find(
                          (opt) => opt.value === field.value,
                        ) || null
                      }
                      onChange={(option) =>
                        field.onChange(option?.value as number)
                      }
                      isSearchable
                      isClearable={false}
                      errorMessage={errors.id_stase?.message}
                    />
                  </div>
                )}
              />

              {/* Row 2: Stage* | Semester* */}
              <Controller
                name="id_stage"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Stage<span className="text-[#D95D43] ml-1">*</span>
                    </label>
                    <SingleSelect
                      {...field}
                      options={stageSelectOptions}
                      disabled={isEditMode || isExecutingUndo}
                      value={
                        stageSelectOptions.find(
                          (opt) => opt.value === field.value,
                        ) || null
                      }
                      onChange={(option) => {
                        field.onChange(option?.value as number);
                        // Reset semester when stage changes
                        setValue("id_semester", null);
                      }}
                      isSearchable
                      isClearable={false}
                      errorMessage={errors.id_stage?.message}
                    />
                    <span className="text-xs text-gray-500">
                      Pilih stase terlebih dahulu
                    </span>
                  </div>
                )}
              />
              <Controller
                name="id_semester"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">
                      Semester<span className="text-[#D95D43] ml-1">*</span>
                    </label>
                    <SingleSelect
                      {...field}
                      options={semesterSelectOptions}
                      disabled={isEditMode || isExecutingUndo}
                      value={
                        semesterSelectOptions.find(
                          (opt) => opt.value === field.value,
                        ) || null
                      }
                      onChange={(option) =>
                        field.onChange(option?.value as number)
                      }
                      isSearchable
                      isClearable={false}
                      errorMessage={errors.id_semester?.message}
                    />
                    <span className="text-xs text-gray-500">
                      Pilih stage terlebih dahulu
                    </span>
                  </div>
                )}
              />

              {/* Row 3: Date* | Notes */}
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <CalendarSelect
                    label="Date"
                    {...field}
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    placeholder="Pilih tanggal..."
                    errorMessage={errors.date?.message}
                  />
                )}
              />
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <InputField
                    label="Notes"
                    {...field}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Masukkan catatan..."
                  />
                )}
              />

              {/* Row 4: Mengulang Stase (full width) */}
              <div className="sm:col-span-2">
                <Controller
                  name="is_retake"
                  control={control}
                  render={({ field }) => (
                    <SwitchField
                      checked={field.value}
                      onChange={field.onChange}
                      label="Mengulang Stase"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <icons.ArrowLeft className="h-4 w-4" />
              Kembali
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isShown={isShowDelete}
        toggle={toggleDelete}
        title="Hapus Stase"
        description="Apakah Anda yakin ingin menghapus data stase ini? Data yang dihapus tidak dapat dikembalikan."
        onConfirm={handleDelete}
        confirmText="Hapus"
        cancelText="Batal"
        confirmVariant="destructive"
        cancelVariant="outline"
      />

      {/* Undo Confirmation Modal */}
      <ConfirmationModal
        isShown={isShowUndoConfirm}
        toggle={toggleUndoConfirm}
        title="Konfirmasi Undo Semester"
        isLoading={isExecutingUndo}
        description={`Kartu transisi #${confirmedUndo?.archive_logbook_id ?? ""} (${confirmedUndo?.archive_semester_name ?? ""} / ${confirmedUndo?.archive_stase_name ?? ""}) akan diarsipkan. Profil kembali ke ${confirmedUndo?.restore_semester_name ?? ""} / ${confirmedUndo?.restore_stase_name ?? ""}, poin ${confirmedUndo?.restore_points ?? "—"}. Kartu lama dan aktivitas lain tetap tersimpan. Lanjutkan?`}
        onConfirm={handleExecuteUndo}
        confirmText="Ya, Undo"
        cancelText="Batal"
        confirmVariant="destructive"
        cancelVariant="outline"
      />
    </div>
  );
}
