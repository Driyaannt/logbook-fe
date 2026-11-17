import { InstitutionBimbingan } from "@/components/logbook/InstitutionBimbingan";
import { Topbar } from "@/components/layout/Topbar";
import { ROUTES } from "@/utils/routes";
import { useParams, useNavigate } from "react-router-dom";
import { Filter } from "./_components/Filter";
import { BaseTable } from "@/components/basetable/BaseTable";
import { useStaffStore } from "@/store/staffStore";
import { useAuthStore } from "@/store/authStore";
import type { ColumnDef } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import type { TStaffLogbook } from "@/types/staff";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { Button } from "@/components/ui/button";
import { icons } from "@/assets/images/Icon";
import useWindowDimensions from "@/hooks/useWindowDimension";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/table";
import { StatusBadge } from "@/components/statusBadge";
import { showToast } from "@/utils/toast";
import { ExportModal } from "@/components/exportModal/ExportModal";
import { ExportFormat } from "@/components/exportButton";
import { exportToCSV, exportToExcel, ExportColumn } from "@/functions/export";
import { useUrlParams } from "@/hooks/useUrlParams";

export default function StaffLogbookPage() {
  const { width } = useWindowDimensions();
  const sm = width >= 480;

  const { idUser } = useParams<{ idUser: string }>();
  const navigate = useNavigate();

  const {
    staffLogbookData,
    isLoading,
    isExporting,
    loadStaffLogbookList,
    loadExportStaffLogbookList,
    cancelExport,
    reset,
  } = useStaffStore();
  const { user } = useAuthStore();

  // ========== URL PARAMS (using useUrlParams hook) ==========
  // Note: id_staff is NOT a filter key because it's controlled by URL (idUser)
  const {
    page,
    limit,
    search,
    debouncedSearch,
    filters,
    setLimit,
    setSearch,
    setFilters,
    resetParams,
    getNumberParam,
  } = useUrlParams({
    defaultPage: 1,
    defaultLimit: DEFAULT_PAGE_SIZE,
    filterKeys: [
      "id_ppds",
      "id_activity",
      "id_stase",
      "status",
      "start_date",
      "end_date",
    ],
    searchDebounceMs: 500,
  });

  // Extract filter values from URL
  const id_ppds = getNumberParam("id_ppds");
  const id_activity = getNumberParam("id_activity");
  const id_stase = getNumberParam("id_stase");
  const status = filters.status || undefined;
  const start_date = filters.start_date || undefined;
  const end_date = filters.end_date || undefined;

  // ========== HANDLERS ==========

  const handleFilterChange = (newFilters: {
    id_ppds?: number | null;
    id_activity?: number | null;
    id_stase?: number | null;
    status?: string | null;
    start_date?: string;
    end_date?: string;
  }) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    resetParams();
  };

  // ========== DATA FETCHING ==========

  useEffect(() => {
    if (user?.id_client && idUser) {
      loadStaffLogbookList({
        id_client: user.id_client,
        id_staff: Number(idUser),
        page,
        limit,
        search: debouncedSearch || undefined,
        id_ppds: id_ppds ?? undefined,
        id_activity: id_activity ?? undefined,
        id_stase: id_stase ?? undefined,
        status: status ?? undefined,
        start_date,
        end_date,
      });
    }
  }, [
    page,
    limit,
    debouncedSearch,
    id_ppds,
    id_activity,
    id_stase,
    status,
    start_date,
    end_date,
    user?.id_client,
    idUser,
    loadStaffLogbookList,
  ]);

  useEffect(() => {
    // IMPORTANT: This reset() MUST be called on unmount to clean up the store state.
    return () => {
      reset();
    };
  }, [reset]);

  const logbooks = staffLogbookData?.list || [];

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOffset, setExportOffset] = useState(0);
  const [isExportComplete, setIsExportComplete] = useState(false);
  const exportControllerRef = useRef<AbortController | null>(null);

  const handleExport = async (format: ExportFormat) => {
    // Create new AbortController for this export
    exportControllerRef.current = new AbortController();

    setExportProgress(0);
    setExportOffset(0);
    setIsExportComplete(false);
    setShowExportModal(true);

    try {
      const allData = await loadExportStaffLogbookList({
        filterParams: {
          id_client: user?.id_client ?? 0,
          id_staff: Number(idUser),
          id_ppds: id_ppds ?? undefined,
          id_activity: id_activity ?? undefined,
          id_stase: id_stase ?? undefined,
          status: status ?? undefined,
          start_date,
          end_date,
        },
        onProgress: (progress, offset) => {
          setExportProgress(progress);
          setExportOffset(offset);
        },
        signal: exportControllerRef.current.signal,
      });

      if (allData.length === 0) {
        showToast("Tidak ada data untuk diekspor", "error");
        setShowExportModal(false);
        return;
      }

      // Define columns for export
      const exportColumns: ExportColumn<TStaffLogbook>[] = [
        { header: "No", accessorKey: "no" },
        {
          header: "Tanggal",
          accessorKey: "date",
          formatter: (value) =>
            value ? dayjs(value).locale("id").format("DD MMMM YYYY") : "-",
        },
        { header: "Peserta PPDS", accessorKey: "ppds_name" },
        { header: "NIP", accessorKey: "nim" },
        { header: "Stase", accessorKey: "stase_name" },
        { header: "Staff Pengajar/DPJP", accessorKey: "staff_name" },
        { header: "Activity", accessorKey: "action_name" },
        { header: "Hospital", accessorKey: "hospital_name" },
        { header: "Notes", accessorKey: "notes" },
        { header: "Verified Status", accessorKey: "verified_status" },
      ];

      // Prepare data with index number
      const dataWithIndex = allData.map((item, index) => ({
        ...item,
        no: index + 1,
      }));

      const filename = `staff_logbook_export_${dayjs().format("YYYY-MM-DD")}`;

      if (format === "csv") {
        exportToCSV({
          data: dataWithIndex,
          columns: exportColumns,
          filename: `${filename}.csv`,
        });
      } else if (format === "excel") {
        await exportToExcel({
          data: dataWithIndex,
          columns: exportColumns,
          filename: `${filename}.xlsx`,
          sheetName: "Staff Logbook Export",
        });
      }

      showToast(`Berhasil mengekspor ${allData.length} data`, "success");

      // Set complete state - modal stays open until user clicks OK
      setIsExportComplete(true);
    } catch (error) {
      // Check if cancelled
      if (error instanceof Error && error.message === "EXPORT_CANCELLED") {
        showToast("Export dibatalkan", "error");
        setShowExportModal(false);
        return;
      }
      console.error("Export error:", error);
      showToast(
        error instanceof Error ? error.message : "Gagal mengekspor data",
        "error",
      );
      setShowExportModal(false);
    } finally {
      exportControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (exportControllerRef.current) {
      exportControllerRef.current.abort();
      cancelExport();
    }
    setShowExportModal(false);
    setIsExportComplete(false);
    exportControllerRef.current = null;
  };

  const handleOkExport = () => {
    setShowExportModal(false);
    setIsExportComplete(false);
  };

  const handleSearchChange = (query: string) => {
    setSearch(query);
  };

  const handlePaginationChange = (_pageIndex: number, pageSize: number) => {
    setLimit(pageSize, false);
  };

  const handleRowClick = (row: Row<TStaffLogbook>) => {
    navigate(
      ROUTES.staffLogbookDetail(String(idUser), String(row.original.id)),
    );
  };

  // Define columns for Logbook table
  const columns: ColumnDef<TStaffLogbook>[] = [
    {
      accessorKey: "date",
      header: "Date",
      size: 180,
      cell: ({ row: { original } }) => {
        return original.date ? (
          <span className="whitespace-nowrap">
            {dayjs(original.date).locale("id").format("DD MMM YYYY - HH:mm")}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "ppds_name",
      header: "Peserta PPDS",
      size: 180,
      cell: ({ row: { original } }) => (
        <span className="font-medium">{original.ppds_name ?? "-"}</span>
      ),
    },
    {
      accessorKey: "nim",
      header: "NIP",
      size: 120,
      cell: ({ row: { original } }) => original.nim ?? "-",
    },
    {
      accessorKey: "stase_name",
      header: "Stase",
      size: 150,
      cell: ({ row: { original } }) => original.stase_name ?? "-",
    },
    {
      accessorKey: "staff_name",
      header: "Staff Pengajar/DPJP",
      size: 180,
      cell: ({ row: { original } }) => {
        return original.staff_name ? (
          <span>{original.staff_name}</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "action_name",
      header: "Activity",
      size: 180,
      cell: ({ row: { original } }) => (
        <span className="font-medium">{original.action_name ?? "-"}</span>
      ),
    },
    {
      accessorKey: "hospital_name",
      header: "Hospital",
      size: 150,
      cell: ({ row: { original } }) => {
        return original.hospital_name ? (
          <span className="flex items-center gap-1">
            <icons.MapPin className="h-3 w-3 text-gray-400" />
            {original.hospital_name}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      size: 200,
      cell: ({ row: { original } }) => {
        return original.notes ? (
          <span className="truncate block max-w-[180px]" title={original.notes}>
            {original.notes}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "verified_status",
      header: "Verified Status",
      size: 140,
      cell: ({ row: { original } }) =>
        original.verified_status ? (
          <StatusBadge status={original.verified_status} />
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      id: "actions",
      header: "Action",
      size: sm ? 120 : 80,
      cell: ({ row: { original } }) => {
        const handleView = (e: React.MouseEvent) => {
          e.stopPropagation();
          navigate(
            ROUTES.staffLogbookDetail(String(idUser), String(original.id)),
          );
        };

        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="bg-[#087F5B] text-white hover:bg-[#066649]"
            >
              <icons.Eye className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col pt-[114px] lg:pt-0">
      <ExportModal
        isShown={showExportModal}
        progress={exportProgress}
        offset={exportOffset}
        total={staffLogbookData?.pagination.total ?? 0}
        isComplete={isExportComplete}
        onCancel={handleCancelExport}
        onOk={handleOkExport}
      />

      <Topbar
        breadcrumbs={[
          { label: "Staff", to: ROUTES.staff },
          { label: "Detail", to: ROUTES.staffDetail(String(idUser)) },
          { label: "Logbook", to: ROUTES.staffLogbook(String(idUser)) },
        ]}
        searchPlaceholder="Cari logbook..."
        onExport={handleExport}
        onSearch={handleSearchChange}
        isLoading={isExporting}
        initialSearchValue={search}
      />
      <div className="flex-1 px-4 sm:px-6 py-2 overflow-hidden">
        <div className="h-full flex flex-col gap-2">
          {/* Filter Section */}
          <Filter
            onChange={handleFilterChange}
            onReset={handleFilterReset}
            initialStaffId={idUser ? Number(idUser) : undefined}
          />

          {/* Table Section */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border overflow-hidden">
            <InstitutionBimbingan kind="staff" idUser={String(idUser)}><BaseTable
              data={logbooks}
              columns={columns}
              isLoading={isLoading}
              isShowNumbering={true}
              pagination={{
                enabled: true,
                mode: "server",
                initialPageIndex: 0,
                initialPageSize: DEFAULT_PAGE_SIZE,
                pageCount: staffLogbookData?.pagination.pageCount ?? 1,
              }}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
              noDataText="Tidak ada data logbook"
              className="h-full"
            /></InstitutionBimbingan>
          </div>
        </div>
      </div>
    </div>
  );
}
