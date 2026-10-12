import { cn } from "@/lib/utils";
import { useCallback, useMemo, forwardRef } from "react";
import Select, { type Props as ReactSelectProps } from "react-select";
import { BasicSelectOpt } from "@/types";
import useWindowDimensions from "@/hooks/useWindowDimension";

interface Props extends Omit<
  ReactSelectProps,
  "isMulti" | "disabled" | "value" | "onChange"
> {
  value?: BasicSelectOpt<string | number> | null;
  onChange?: (value: BasicSelectOpt<string | number> | null) => void;
  required?: boolean;
  selectClassName?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
  disabled?: boolean;
  isRtl?: boolean;
  closeMenuOnSelect?: boolean;
  maxMenuHeight?: number;
  popupContainer?: "body" | "parent";
  errorMessage?: string;
}

export const SingleSelect = forwardRef<Select, Props>(
  (
    {
      value,
      onChange,
      required,
      selectClassName,
      isSearchable = true,
      isClearable = true,
      isRtl = false,
      closeMenuOnSelect = true,
      maxMenuHeight = 240,
      popupContainer = "parent",
      errorMessage,
      disabled,
      ...rest
    },
    ref,
  ) => {
    const { width } = useWindowDimensions();
    const md = width >= 768;
    const fontSize = md ? "14px" : "16px";

    const handleChange = useCallback(
      (e: BasicSelectOpt<string | number> | null) => {
        onChange?.(e);
      },
      [onChange],
    );

    const selectProps = useMemo(
      () => ({
        id: rest.id || rest.name,
        className: cn("w-full", selectClassName),
        isSearchable,
        isClearable,
        isRtl,
        isMulti: false as const,
        closeMenuOnSelect,
        required,
        maxMenuHeight,
        menuPosition: "fixed" as const,
        menuPortalTarget: popupContainer === "body" ? document.body : null,
        value,
        onChange: handleChange,
        ...rest,
      }),
      [
        rest.id,
        rest.name,
        selectClassName,
        isSearchable,
        isClearable,
        isRtl,
        closeMenuOnSelect,
        required,
        maxMenuHeight,
        popupContainer,
        value,
        handleChange,
        rest,
      ],
    );

    return (
      <div className="flex flex-col gap-1">
        <Select
          ref={ref}
          {...selectProps}
          isDisabled={disabled}
          styles={{
            indicatorSeparator: (base) => ({
              ...base,
              display: "none",
            }),

            singleValue: (base) => ({
              ...base,
              fontSize,
              color: "hsl(var(--foreground))",
            }),

            control: (base, state) => ({
              ...base,
              borderRadius: "6px",
              cursor: state.isDisabled ? "not-allowed" : "pointer",
              border: `1px solid ${
                errorMessage
                  ? "hsl(var(--destructive))"
                  : state.isFocused
                    ? "hsl(var(--ring))"
                    : "hsl(var(--input))"
              }`,
              boxShadow: state.isFocused
                ? "0 0 0 2px hsl(var(--ring) / 0.2)"
                : "none",
              backgroundColor: state.isDisabled
                ? "hsl(var(--muted))"
                : "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              minHeight: "40px",
              fontSize,
              opacity: 1,
              "&:hover": {
                borderColor: errorMessage
                  ? "hsl(var(--destructive))"
                  : "hsl(var(--ring))",
              },
            }),

            menu: (base) => ({
              ...base,
              borderRadius: "6px",
              zIndex: popupContainer === "body" ? 10000 : 9999,
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              boxShadow: "0 4px 12px hsl(0 0% 0% / 0.08)",
              overflow: "hidden",
            }),

            menuPortal: (base) => ({
              ...base,
              zIndex: popupContainer === "body" ? 10000 : 9999,
            }),

            menuList: (base) => ({
              ...base,
              padding: "4px",
            }),

            option: (base, state) => ({
              ...base,
              cursor: state.isDisabled ? "not-allowed" : "pointer",
              fontSize,
              borderRadius: "4px",
              backgroundColor: state.isSelected
                ? "hsl(var(--primary))"
                : state.isFocused
                  ? "hsl(var(--accent))"
                  : "transparent",
              color: state.isSelected
                ? "hsl(var(--primary-foreground))"
                : "hsl(var(--popover-foreground))",
              opacity: state.isDisabled ? 0.5 : 1,
              "&:active": {
                backgroundColor: state.isSelected
                  ? "hsl(var(--primary))"
                  : "hsl(var(--accent))",
              },
            }),

            dropdownIndicator: (base, state) => ({
              ...base,
              display: "flex",
              color: state.isDisabled
                ? "hsl(var(--muted-foreground))"
                : "hsl(var(--muted-foreground))",
              "&:hover": {
                color: "hsl(var(--foreground))",
              },
            }),

            clearIndicator: (base) => ({
              ...base,
              padding: "0px 8px",
              color: "hsl(var(--muted-foreground))",
              "&:hover": {
                color: "hsl(var(--destructive))",
              },
            }),

            placeholder: (base) => ({
              ...base,
              fontSize,
              color: "hsl(var(--muted-foreground))",
            }),

            input: (base) => ({
              ...base,
              fontSize,
              color: "hsl(var(--foreground))",
            }),

            valueContainer: (base) => ({
              ...base,
              padding: "2px 12px",
            }),

            noOptionsMessage: (base) => ({
              ...base,
              color: "hsl(var(--muted-foreground))",
              fontSize,
            }),

            loadingMessage: (base) => ({
              ...base,
              color: "hsl(var(--muted-foreground))",
              fontSize,
            }),
          }}
          {...(rest as any)}
        />
        {errorMessage && (
          <p className="text-sm text-[#D95D43]">{errorMessage}</p>
        )}
      </div>
    );
  },
);

SingleSelect.displayName = "SingleSelect";
