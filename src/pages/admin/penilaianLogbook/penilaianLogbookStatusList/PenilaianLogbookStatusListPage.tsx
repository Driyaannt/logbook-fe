import { Topbar } from "@/components/layout/Topbar";
import { ROUTES } from "@/utils/routes";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Filter } from "./_components/Filter";
import { BaseTable } from "@/components/basetable/BaseTable";
import { usePenilaianLogbookStore } from "@/store/penilaianLogbookStore";
import type { ColumnDef } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { icons } from "@/assets/images/Icon";
import useWindowDimensions from "@/hooks/useWindowDimension";
import { useEffect, useRef, useState } from "react";
import { PenilaianLogbookStatusEnum } from "@/types";
import type { TPenilaianLogbookStatusListItem } from "@/types/penilaianLogbook";
import { DEFAULT_PAGE_SIZE } from "@/constants/table";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { showToast } from "@/utils/toast";
import { ExportModal } from "@/components/exportModal/ExportModal";
import { ExportFormat } from "@/components/exportButton";
import { exportToCSV, exportToExcel, ExportColumn } from "@/functions/export";
import { useUrlParams } from "@/hooks/useUrlParams";

export default function PenilaianLogbookStatusListPage() {
  const { width } = useWindowDimensions();
  const sm = width >= 480;

  const { idLogbookCategory } = useParams<{ idLogbookCategory: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    penilaianLogbookStatusList,
    penilaianLogbookStatusPagination,
    isLoading,
    isExporting,
    loadPenilaianLogbookByStatus,
    loadExportPenilaianLogbookByStatus,
    cancelExport,
    reset,
  } = usePenilaianLogbookStore();

  // ========== URL PARAMS (using useUrlParams hook) ==========
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
    filterKeys: ["id_ppds", "id_staff", "id_stase", "start_date", "end_date"],
    searchDebounceMs: 500,
  });

  // Extract filter values from URL
  const id_ppds = getNumberParam("id_ppds");
  const id_staff = getNumberParam("id_staff");
  const id_stase = getNumberParam("id_stase");
  const start_date = filters.start_date || undefined;
  const end_date = filters.end_date || undefined;

  // Determine if scored or unscored based on URL path
  const isScored = location.pathname.includes("/scored-logbook");

  // ========== HANDLERS ==========

  const handleFilterChange = (newFilters: {
    id_ppds?: number | null;
    id_staff?: number | null;
    id_stase?: number | null;
    start_date?: string;
    end_date?: string;
  }) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    resetParams();
  };

  const handleSearchChange = (query: string) => {
    setSearch(query);
  };

  const handlePaginationChange = (_pageIndex: number, pageSize: number) => {
    // BaseTable handles page changes via URL internally
    setLimit(pageSize, false);
  };

  const handleRowClick = (row: Row<TPenilaianLogbookStatusListItem>) => {
    const detailRoute = isScored
      ? ROUTES.penilaianLogbookScoredLogbookDetail(
          idLogbookCategory || "",
          String(row.original.id),
        )
      : ROUTES.penilaianLogbookUnscoredLogbookDetail(
          idLogbookCategory || "",
          String(row.original.id),
        );
    navigate(detailRoute);
  };

  // ========== DATA FETCHING ==========

  useEffect(() => {
    loadPenilaianLogbookByStatus({
      id_action: Number(idLogbookCategory),
      type: isScored
        ? PenilaianLogbookStatusEnum.SCORED
        : PenilaianLogbookStatusEnum.UNSCORED,
      page,
      limit,
      search: debouncedSearch || undefined,
      id_ppds: id_ppds ?? undefined,
      id_staff: id_staff ?? undefined,
      id_stase: id_stase ?? undefined,
      start_date,
      end_date,
    });
  }, [
    page,
    limit,
    debouncedSearch,
    id_ppds,
    id_staff,
    id_stase,
    start_date,
    end_date,
    idLogbookCategory,
    isScored,
    loadPenilaianLogbookByStatus,
  ]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

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
      const allData = await loadExportPenilaianLogbookByStatus({
        filterParams: {
          id_action: Number(idLogbookCategory),
          type: isScored
            ? PenilaianLogbookStatusEnum.SCORED
            : PenilaianLogbookStatusEnum.UNSCORED,
          id_ppds: id_ppds ?? undefined,
          id_staff: id_staff ?? undefined,
          id_stase: id_stase ?? undefined,
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
      const exportColumns: ExportColumn<TPenilaianLogbookStatusListItem>[] = [
        { header: "No", accessorKey: "no" },
        {
          header: "Tanggal",
          accessorKey: "date",
          formatter: (value) =>
            value ? dayjs(value).locale("id").format("DD MMMM YYYY") : "-",
        },
        { header: "PPDS", accessorKey: "ppds_name" },
        { header: "NIM", accessorKey: "code" },
        { header: "Inisial Code", accessorKey: "inisial_code" },
        { header: "Semester", accessorKey: "semester_name" },
        { header: "Stase", accessorKey: "stase_name" },
        { header: "Pin", accessorKey: "stage_name" },
        {
          header: "Staff Pengajar/DPJP",
          accessorKey: "staff",
          formatter: (value) => {
            if (!value || !Array.isArray(value) || value.length === 0)
              return "-";
            return value
              .map((s: { name: string | null }) => s.name)
              .filter(Boolean)
              .join(", ");
          },
        },
        { header: "Activity", accessorKey: "action_name" },
        { header: "Peran", accessorKey: "role_name" },
        { header: "Category", accessorKey: "category" },
        { header: "Title", accessorKey: "title" },
        { header: "Psikomotor", accessorKey: "psikomotor" },
        { header: "Knowledge", accessorKey: "knowledge" },
        { header: "Attitude", accessorKey: "afektif" },
        { header: "Total", accessorKey: "total" },
      ];

      // Prepare data with index number
      const dataWithIndex = allData.map((item, index) => ({
        ...item,
        no: index + 1,
      }));

      const filename = `penilaian_logbook_${isScored ? "scored" : "unscored"}_${dayjs().format("YYYY-MM-DD")}`;

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
          sheetName: "Penilaian Logbook Export",
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

  // ========== COLUMNS ==========

  const columns: ColumnDef<TPenilaianLogbookStatusListItem>[] = [
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
      header: "PPDS",
      size: 180,
      cell: ({ row: { original } }) => original.ppds_name ?? "-",
    },
    {
      accessorKey: "code",
      header: "NIM",
      size: 100,
      cell: ({ row: { original } }) => original.code ?? "-",
    },
    {
      accessorKey: "inisial_code",
      header: "Inisial Code",
      size: 100,
      cell: ({ row: { original } }) => original.inisial_code ?? "-",
    },
    {
      accessorKey: "semester_name",
      header: "Semester",
      size: 120,
      cell: ({ row: { original } }) => original.semester_name ?? "-",
    },
    {
      accessorKey: "stase_name",
      header: "Stase",
      size: 120,
      cell: ({ row: { original } }) => original.stase_name ?? "-",
    },
    {
      accessorKey: "stage_name",
      header: "Pin",
      size: 120,
      cell: ({ row: { original } }) => original.stage_name ?? "-",
    },
    {
      accessorKey: "staff",
      header: "Staff Pengajar/DPJP",
      size: 150,
      cell: ({ row: { original } }) => {
        const staffList = original.staff;
        if (!staffList || staffList.length === 0) return "-";
        return staffList.map((s) => s.name).join(", ");
      },
    },
    {
      accessorKey: "action_name",
      header: "Activity",
      size: 150,
      cell: ({ row: { original } }) => original.action_name ?? "-",
    },
    {
      accessorKey: "role_name",
      header: "Peran",
      size: 150,
      cell: ({ row: { original } }) => original.role_name ?? "-",
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
      size: 150,
      cell: ({ row: { original } }) => original.title ?? "-",
    },
    {
      accessorKey: "psikomotor",
      header: "Psikomotor",
      size: 100,
      cell: ({ row: { original } }) => original.psikomotor ?? 0,
    },
    {
      accessorKey: "knowledge",
      header: "Knowledge",
      size: 100,
      cell: ({ row: { original } }) => original.knowledge ?? 0,
    },
    {
      accessorKey: "afektif",
      header: "Attitude",
      size: 100,
      cell: ({ row: { original } }) => original.afektif ?? 0,
    },
    {
      accessorKey: "total",
      header: "Total",
      size: 100,
      cell: ({ row: { original } }) => original.total ?? 0,
    },
    {
      id: "actions",
      header: "Action",
      size: sm ? 120 : 80,
      cell: ({ row }) => {
        const handleView = (e: React.MouseEvent) => {
          e.stopPropagation();
          const detailRoute = isScored
            ? ROUTES.penilaianLogbookScoredLogbookDetail(
                idLogbookCategory || "",
                String(row.original.id),
              )
            : ROUTES.penilaianLogbookUnscoredLogbookDetail(
                idLogbookCategory || "",
                String(row.original.id),
              );
          navigate(detailRoute);
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
        total={penilaianLogbookStatusPagination.total}
        isComplete={isExportComplete}
        onCancel={handleCancelExport}
        onOk={handleOkExport}
      />

      <Topbar
        breadcrumbs={[
          { label: "Penilaian Logbook", to: ROUTES.penilaianLogbook },
          {
            label: "Status",
            to: ROUTES.penilaianLogbookDetail(idLogbookCategory || ""),
          },
          {
            label: isScored ? "Scored" : "Unscored",
            to: isScored
              ? ROUTES.penilaianLogbookScoredLogbook(idLogbookCategory || "")
              : ROUTES.penilaianLogbookUnscoredLogbook(idLogbookCategory || ""),
          },
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
          <Filter onChange={handleFilterChange} onReset={handleFilterReset} />

          {/* Table Section */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border overflow-hidden">
            <BaseTable
              data={penilaianLogbookStatusList}
              columns={columns}
              isLoading={isLoading}
              isShowNumbering
              pagination={{
                enabled: true,
                mode: "server",
                initialPageIndex: 0,
                initialPageSize: DEFAULT_PAGE_SIZE,
                pageCount: penilaianLogbookStatusPagination.pageCount ?? 1,
              }}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
              noDataText={`Tidak ada data logbook ${isScored ? "sudah" : "belum"} dinilai`}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
