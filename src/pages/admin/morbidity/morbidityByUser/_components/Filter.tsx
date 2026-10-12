import { FilterPanel } from "@/components/filterPanel";
import type { FilterFieldConfig, FilterValue } from "@/components/filterPanel";
import { LogbookStatusEnum, type BasicSelectOpt } from "@/types";
import { useEffect, useMemo } from "react";
import { useMasterStore } from "@/store/masterStore";
import { useAuthStore } from "@/store/authStore";
import { useSearchParams } from "react-router-dom";

type FilterChangeHandler = (filters: { status?: string | null }) => void;

type FilterResetHandler = () => void;

export const Filter = ({
  onChange,
  onReset,
}: {
  onChange: FilterChangeHandler;
  onReset: FilterResetHandler;
}) => {
  const [searchParams] = useSearchParams();

  const { logbookStatusOptions, fetchLogbookStatusOptions } = useMasterStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.id_client) {
      fetchLogbookStatusOptions();
    }
  }, [user?.id_client, fetchLogbookStatusOptions]);

  const logbookStatusNameOptions: BasicSelectOpt<string>[] =
    logbookStatusOptions
      .filter((opt) => opt.value !== LogbookStatusEnum.APPROVED)
      .map((opt) => ({
        label: String(opt.label),
        value: String(opt.value),
      }));

  // Read current filter values from URL
  const currentFilters = useMemo(
    () => ({
      status: searchParams.get("status") || undefined,
    }),
    [searchParams],
  );

  const filterFields: FilterFieldConfig[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: logbookStatusNameOptions,
      placeholder: "Pilih Status...",
    },
  ];

  // Build sync values from URL params - these will sync when URL changes (back navigation)
  const syncValues = useMemo((): Record<string, FilterValue> | undefined => {
    const values: Record<string, FilterValue> = {};

    // Status option from URL (string-based, value = label)
    if (currentFilters.status) {
      const statusOpt = logbookStatusNameOptions.find(
        (opt) => opt.value === currentFilters.status,
      );
      if (statusOpt) values.status = statusOpt;
    }

    return Object.keys(values).length > 0 ? values : undefined;
  }, [
    currentFilters,
    logbookStatusNameOptions,
  ]);

  // Helper to get string value from select option
  const getSelectValue = (
    key: string,
    data: Record<string, FilterValue>,
  ): string | null => {
    const val = data[key];
    if (val && typeof val === "object" && "value" in val) {
      return (val as { value: string }).value ?? null;
    }
    return null;
  };

  const handleSearch = (data: Record<string, FilterValue>) => {
    const filters = {
      status: getSelectValue("status", data),
    };
    onChange(filters);
  };

  return (
    <FilterPanel
      fields={filterFields}
      onSearch={handleSearch}
      onReset={onReset}
      syncValues={syncValues}
    />
  );
};
