import { Topbar } from "@/components/layout/Topbar";
import { ROUTES } from "@/utils/routes";
import { useNavigate, useParams } from "react-router-dom";
import { Filter } from "./_components/Filter";
import { BaseTable } from "@/components/basetable/BaseTable";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { icons } from "@/assets/images/Icon";
import useWindowDimensions from "@/hooks/useWindowDimension";
import { useEffect } from "react";
import { DEFAULT_PAGE_SIZE } from "@/constants/table";
import "dayjs/locale/id";
import { useUrlParams } from "@/hooks/useUrlParams";
import { useMorbidityStore } from "@/store/morbidityStore";
import { TMorbidityByUser } from "@/types/morbidity";
import dayjs from "dayjs";
import { StatusBadge } from "@/components/statusBadge";

export default function MorbidityByUserPage() {
  const { width } = useWindowDimensions();
  const sm = width >= 480;

  const { idUser } = useParams<{ idUser: string }>();
  const navigate = useNavigate();

  const { morbidityByUserData, isLoading, loadMorbidityByUserList, reset } =
    useMorbidityStore();

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
  } = useUrlParams({
    defaultPage: 1,
    defaultLimit: DEFAULT_PAGE_SIZE,
    filterKeys: ["status"],
    searchDebounceMs: 500,
  });

  const status = filters.status as string | undefined;

  // ========== HANDLERS ==========

  const handleFilterChange = (newFilters: { status?: string | null }) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    resetParams();
  };

  const handleSearchChange = (query: string) => {
    setSearch(query);
  };

  const handlePaginationChange = (_pageIndex: number, pageSize: number) => {
    setLimit(pageSize, false);
  };

  // ========== DATA FETCHING ==========

  useEffect(() => {
    if (idUser) {
      loadMorbidityByUserList({
        page,
        limit,
        search: debouncedSearch || undefined,
        id_user: Number(idUser),
        status: status ?? undefined,
      });
    }
  }, [page, limit, debouncedSearch, idUser, loadMorbidityByUserList, status]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleRowClick = (row: Row<TMorbidityByUser>) => {
    if (row.original.id) {
      navigate(
        ROUTES.morbidityByUserDetail(String(idUser), String(row.original.id)),
      );
    }
  };

  // Define columns for Morbidity table
  const columns: ColumnDef<TMorbidityByUser>[] = [
    {
      accessorKey: "display_name",
      header: "Student Name",
      size: 200,
      cell: ({ row: { original } }) => original.display_name ?? "-",
    },
    {
      accessorKey: "patient_name",
      header: "PX Name",
      size: 200,
      cell: ({ row: { original } }) => original.patient_name ?? "-",
    },
    {
      accessorKey: "date",
      header: "Date Morbidity",
      size: 150,
      cell: ({ row: { original } }) =>
        original.date
          ? dayjs(original.date).locale("id").format("DD MMM YYYY - HH:mm")
          : "-",
    },
    {
      accessorKey: "semester",
      header: "Semester",
      size: 120,
      cell: ({ row: { original } }) => original.semester ?? "-",
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 150,
      cell: ({ row: { original } }) => original.category ?? "-",
    },
    {
      accessorKey: "staff_pelapor",
      header: "Staff Pelapor",
      size: 200,
      cell: ({ row: { original } }) => original.staff_pelapor ?? "-",
    },
    {
      accessorKey: "staff_penilai",
      header: "Staff Penilai",
      size: 200,
      cell: ({ row: { original } }) => original.staff_penilai ?? "-",
    },
    {
      accessorKey: "staff_kps",
      header: "Staff KPS",
      size: 200,
      cell: ({ row: { original } }) => original.staff_kps ?? "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 120,
      cell: ({ row: { original } }) =>
        original.status ? (
          <StatusBadge status={original.status.toLocaleLowerCase()} />
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      id: "actions",
      header: "Action",
      size: sm ? 180 : 120,
      cell: ({ row }) => {
        const handleView = (e: React.MouseEvent) => {
          e.stopPropagation();
          if (row.original.id) {
            navigate(
              ROUTES.morbidityByUserDetail(
                String(idUser),
                String(row.original.id),
              ),
            );
          }
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
      <Topbar
        breadcrumbs={[
          { label: "Morbiditas", to: ROUTES.morbidity },
          {
            label: `Morbiditas By ${morbidityByUserData?.list[0]?.display_name ?? "User"}`,
            to: ROUTES.morbidityByUser(String(idUser)),
          },
        ]}
        searchPlaceholder="Cari morbiditas..."
        onSearch={handleSearchChange}
        initialSearchValue={search}
      />
      <div className="flex-1 px-4 sm:px-6 py-2 overflow-hidden">
        <div className="h-full flex flex-col gap-2">
          {/* Filter Section */}
          <Filter onChange={handleFilterChange} onReset={handleFilterReset} />

          {/* Table Section */}
          <div className="flex-1 min-h-0 bg-white rounded-lg border overflow-hidden">
            <BaseTable
              data={morbidityByUserData.list}
              columns={columns}
              isLoading={isLoading}
              isShowNumbering
              pagination={{
                enabled: true,
                mode: "server",
                initialPageIndex: 0,
                initialPageSize: DEFAULT_PAGE_SIZE,
                pageCount: morbidityByUserData.pagination.pageCount ?? 1,
              }}
              onPaginationChange={handlePaginationChange}
              onRowClick={handleRowClick}
              noDataText="Tidak ada data morbiditas"
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
