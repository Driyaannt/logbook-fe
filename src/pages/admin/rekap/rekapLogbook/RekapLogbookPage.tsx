import { Topbar } from "@/components/layout/Topbar";
import { ROUTES } from "@/utils/routes";
import { useNavigate } from "react-router-dom";
import { Filter } from "./_components/Filter";
import { BaseTable } from "@/components/basetable/BaseTable";
import { useRekapStore } from "@/store/rekapStore";
import { useAuthStore } from "@/store/authStore";
import type { ColumnDef } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { icons } from "@/assets/images/Icon";
import useWindowDimensions from "@/hooks/useWindowDimension";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/table";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { showToast } from "@/utils/toast";
import { ExportModal } from "@/components/exportModal/ExportModal";
import { ExportFormat } from "@/components/exportButton";
import { exportToCSV, exportToExcel, ExportColumn } from "@/functions/export";
import { useUrlParams } from "@/hooks/useUrlParams";
import type { TRekapLogbookItem } from "@/types/rekap";
import { StatusBadge } from "@/components/statusBadge";
import { rekapApi } from "@/services/rekapApi";
import { FormStase } from "@/pages/admin/rekap/rekapLogbook/_components/FormStase";

export default function RekapLogbookPage() {
  const { width } = useWindowDimensions();
  const sm = width >= 480;
  const navigate = useNavigate();

  const { user } = useAuthStore();
  const {
    rekapLogbook,
    rekapLogbookPagination,
    isLoadingLogbook,
    isExportingLogbook,
    loadRekapLogbook,
    loadExportRekapLogbook,
    cancelExportLogbook,
    resetLogbook,
  } = useRekapStore();

  // select
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [isLoadingFormStase, setIsLoadingFormStase] = useState<boolean>(false);
  // console.log({ selectedIds });

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOffset, setExportOffset] = useState(0);
  const [isExportComplete, setIsExportComplete] = useState(false);
  const exportControllerRef = useRef<AbortController | null>(null);

  // ========== URL PARAMS (using useUrlParams hook) ==========
  // Note: Rekap uses string-based filters (name as value), not numeric IDs
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
  } = useUrlParams({
    defaultPage: 1,
    defaultLimit: DEFAULT_PAGE_SIZE,
    filterKeys: [
      "ppds_name",
      "staff_name",
      "activity_name",
      "stase_name",
      "start_date",
      "end_date",
      "status",
    ],
    searchDebounceMs: 500,
  });

  // Extract filter values from URL (string-based for Rekap)
  const ppds_name = filters.ppds_name as string | undefined;
  const staff_name = filters.staff_name as string | undefined;
  const activity_name = filters.activity_name as string | undefined;
  const stase_name = filters.stase_name as string | undefined;
  const start_date = filters.start_date as string | undefined;
  const end_date = filters.end_date as string | undefined;
  const status = filters.status as string | undefined;

  // ========== HANDLERS ==========

  const handleFilterChange = (newFilters: {
    ppds_name?: string | null;
    staff_name?: string | null;
    activity_name?: string | null;
    stase_name?: string | null;
    start_date?: string;
    end_date?: string;
    status?: string | null;
  }) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    resetParams();
  };

  // ========== DATA FETCHING ==========

  useEffect(() => {
    if (user?.id_client) {
      loadRekapLogbook({
        id_client: user.id_client,
        page,
        limit,
        search: debouncedSearch || undefined,
        ppds_name: ppds_name ?? undefined,
        staff_name: staff_name ?? undefined,
        activity_name: activity_name ?? undefined,
        stase_name: stase_name ?? undefined,
        start_date,
        end_date,
        status: status ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    limit,
    debouncedSearch,
    ppds_name,
    staff_name,
    activity_name,
    stase_name,
    start_date,
    end_date,
    status,
  ]);

  useEffect(() => {
    return () => resetLogbook();
  }, [resetLogbook]);

  const handleExport = async (format: ExportFormat) => {
    // Create new AbortController for this export
    exportControllerRef.current = new AbortController();

    setExportProgress(0);
    setExportOffset(0);
    setIsExportComplete(false);
    setShowExportModal(true);

    try {
      const allData = await loadExportRekapLogbook({
        filterParams: {
          id_client: user?.id_client ?? 0,
          ppds_name: ppds_name ?? undefined,
          staff_name: staff_name ?? undefined,
          activity_name: activity_name ?? undefined,
          stase_name: stase_name ?? undefined,
          start_date,
          end_date,
          status: status ?? undefined,
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
      const exportColumns: ExportColumn<TRekapLogbookItem>[] = [
        { header: "No", accessorKey: "no" },
        {
          header: "Tanggal",
          accessorKey: "date",
          formatter: (value) =>
            value ? dayjs(value).locale("id").format("DD MMM YYYY - HH:mm") : "-",
        },
        { header: "PPDS", accessorKey: "ppds" },
        { header: "NIM", accessorKey: "nim" },
        { header: "Semester", accessorKey: "semester" },
        { header: "Stase", accessorKey: "stase" },
        { header: "PIN", accessorKey: "pin" },
        { header: "Staff Pengajar/DPJP", accessorKey: "staff" },
        { header: "Activity", accessorKey: "action" },
        { header: "Peran", accessorKey: "peran" },
        { header: "Category", accessorKey: "category" },
        { header: "Title", accessorKey: "title" },
        { header: "Patient", accessorKey: "patient" },
        { header: "Diagnosis", accessorKey: "diagnosis" },
        { header: "Treatment", accessorKey: "treatment" },
        { header: "EMR Number", accessorKey: "emr_number" },
        { header: "Status", accessorKey: "status" },
      ];

      // Prepare data with index number
      const dataWithIndex = allData.map((item, index) => ({
        ...item,
        no: index + 1,
      }));

      const filename = `rekap_logbook_${dayjs().format("YYYY-MM-DD")}`;

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
          sheetName: "Rekap Logbook Export",
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
      cancelExportLogbook();
    }
    setShowExportModal(false);
    setIsExportComplete(false);
    exportControllerRef.current = null;
  };

  const handleOkExport = () => {
    setShowExportModal(false);
    setIsExportComplete(false);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
  };

  const handlePaginationChange = (_pageIndex: number, pageSize: number) => {
    setLimit(pageSize, false);
  };

  const handleRowClick = (row: Row<TRekapLogbookItem>) => {
    navigate(
      ROUTES.rekapLogbookDetail(
        String(`${row.original.id}-${row.original.staff}`),
      ),
    );
  };

  const handleView = (e: React.MouseEvent, id: number, staff: string) => {
    e.stopPropagation();
    navigate(ROUTES.rekapLogbookDetail(String(`${id}-${staff}`)));
  };

  // Define columns for Rekap Logbook table
  const columns: ColumnDef<TRekapLogbookItem>[] = [
    {
      accessorKey: "date",
      header: "Date",
      size: 180,
      cell: ({ row: { original } }) =>
        original.date ? (
          <span className="whitespace-nowrap">
            {dayjs(original.date).locale("id").format("DD MMM YYYY - HH:mm")}
          </span>
        ) : (
          "-"
        ),
    },
    {
      accessorKey: "ppds",
      header: "PPDS",
      size: 160,
      cell: ({ row: { original } }) => (
        <span className="font-medium">{original.ppds ?? "-"}</span>
      ),
    },
    {
      accessorKey: "nim",
      header: "NIM",
      size: 100,
      cell: ({ row: { original } }) => original.nim ?? "-",
    },
    {
      accessorKey: "semester",
      header: "Semester",
      size: 120,
      cell: ({ row: { original } }) => original.semester ?? "-",
    },
    {
      accessorKey: "stase",
      header: "Stase",
      size: 130,
      cell: ({ row: { original } }) => {
        return original.stase ? (
          <span className="px-2 py-1 bg-[#EAF6EF] text-[#066649] rounded-md text-xs font-medium whitespace-nowrap">
            {original.stase}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      accessorKey: "pin",
      header: "PIN",
      size: 150,
      cell: ({ row: { original } }) => original.pin ?? "-",
    },
    {
      accessorKey: "staff",
      header: "Staff Pengajar/DPJP",
      size: 130,
      cell: ({ row: { original } }) => original.staff ?? "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 150,
      cell: ({ row: { original } }) => {
        return original.status ? StatusBadge({ status: original.status }) : "-";
      },
    },
    {
      accessorKey: "action",
      header: "Activity",
      size: 150,
      cell: ({ row: { original } }) => original.action ?? "-",
    },
    {
      accessorKey: "peran",
      header: "Peran",
      size: 130,
      cell: ({ row: { original } }) => original.peran ?? "-",
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 150,
      cell: ({ row: { original } }) => original.category ?? "-",
    },
    {
      accessorKey: "title",
      header: "Title",
      size: 200,
      cell: ({ row: { original } }) => original.title ?? "-",
    },
    {
      accessorKey: "patient",
      header: "Patient",
      size: 200,
      cell: ({ row: { original } }) => original.patient ?? "-",
    },
    {
      accessorKey: "diagnosis",
      header: "Diagnosis",
      size: 200,
      cell: ({ row: { original } }) => original.diagnosis ?? "-",
    },
    {
      accessorKey: "treatment",
      header: "Treatment",
      size: 200,
      cell: ({ row: { original } }) => original.treatment ?? "-",
    },
    {
      id: "actions",
      header: "Action",
      size: sm ? 120 : 80,
      cell: ({ row: { original } }) => {
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handleView(e, original.id, original.staff ?? "")}
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
        total={rekapLogbookPagination.total}
        isComplete={isExportComplete}
        onCancel={handleCancelExport}
        onOk={handleOkExport}
      />

      <Topbar
        breadcrumbs={[
          { label: "Rekap" },
          { label: "Logbook", to: ROUTES.rekapLogbook },
        ]}
        searchPlaceholder="Cari logbook..."
        onExport={handleExport}
        onSearch={handleSearch}
        isLoading={isExportingLogbook}
        initialSearchValue={search}
      />
      <div className="flex-1 px-4 sm:px-6 py-2 overflow-hidden">
        <div className="h-full flex flex-col gap-2">
          {/* Filter Section */}
          <Filter onChange={handleFilterChange} onReset={handleFilterReset} />

          {selectedIds.length > 0 && (
            <FormStase
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              isLoadingFormStase={isLoadingFormStase}
              setIsLoadingFormStase={setIsLoadingFormStase}
            />
          )}

          {/* Table Section */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border overflow-hidden">
            <BaseTable
              getRowId={(row) => `${row.id}-${row.staff}`}
              data={rekapLogbook}
              columns={columns}
              isLoading={isLoadingLogbook}
              isShowNumbering
              pagination={{
                enabled: true,
                mode: "server",
                initialPageIndex: 0,
                initialPageSize: DEFAULT_PAGE_SIZE,
                pageCount: rekapLogbookPagination.pageCount ?? 1,
              }}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
              noDataText="Tidak ada data logbook"
              className="h-full"
              selection={{
                enabled: true,
                selectedIds,
                onSelectedIdsChange: setSelectedIds,
                totalCount: rekapLogbookPagination.total,
                onSelectAll: async () => {
                  // panggil API yang sama tapi TANPA limit/pagination
                  const res = await rekapApi.getRekapLogbookList({
                    ...filters,
                    id_client: user?.id_client ?? 0,
                    limit: rekapLogbookPagination.total,
                  });
                  return res.data.map((row) => `${row.id}-${row.staff}`);
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
