import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DownloadIcon,
  FileDownIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  buttonText?: string;
  csvText?: string;
  excelText?: string;
  pdfText?: string;
  /** Array of allowed export formats. If only one format is provided, button will directly export without showing popover. Default: ['csv', 'excel'] */
  formats?: ExportFormat[];
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  loading = false,
  disabled = false,
  className,
  buttonText = "Export",
  csvText = "Export as CSV",
  excelText = "Export as Excel",
  pdfText = "Export as PDF",
  formats = ["csv", "excel"],
}) => {
  const [open, setOpen] = useState(false);

  const handleExport = (format: ExportFormat) => {
    setOpen(false);
    onExport(format);
  };

  // If only one format is available, directly export without popover
  const isSingleFormat = formats.length === 1;
  const singleFormat = isSingleFormat ? formats[0] : null;

  // Single format: direct button without popover
  if (isSingleFormat && singleFormat) {
    return (
      <Button
        type="button"
        className={cn("flex items-center gap-2", className)}
        disabled={loading || disabled}
        onClick={() => onExport(singleFormat)}
      >
        <DownloadIcon className="h-4 w-4" />
        <span>{loading ? "Exporting..." : buttonText}</span>
      </Button>
    );
  }

  // Multiple formats: show popover with format selection
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          className={cn("flex items-center gap-2", className)}
          disabled={loading || disabled}
        >
          <DownloadIcon className="h-4 w-4" />
          <span>{loading ? "Exporting..." : buttonText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="end">
        <div className="flex flex-col">
          {formats.includes("csv") && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors"
              onClick={() => handleExport("csv")}
              disabled={loading}
            >
              <FileTextIcon className="h-4 w-4" />
              <span>{csvText}</span>
            </button>
          )}
          {formats.includes("excel") && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors"
              onClick={() => handleExport("excel")}
              disabled={loading}
            >
              <FileSpreadsheetIcon className="h-4 w-4" />
              <span>{excelText}</span>
            </button>
          )}
          {formats.includes("pdf") && (
            <button
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors"
              onClick={() => handleExport("pdf")}
              disabled={loading}
            >
              <FileDownIcon className="h-4 w-4" />
              <span>{pdfText}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};