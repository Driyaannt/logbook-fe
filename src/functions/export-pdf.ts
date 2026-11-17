import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import dayjs from "dayjs";
import type { ExportColumn, ExportOptions } from "./export";

const ROWS_PER_BATCH = 200;
const PAGE_MARGIN = 10;
const TABLE_TOP = 23;

function getExportValue<T>(row: T, column: ExportColumn<T>) {
  let value: any;

  if (typeof column.accessorKey === "string") {
    value = column.accessorKey
      .split(".")
      .reduce<any>((current, key) => current?.[key], row);
  } else if (column.accessorKey !== undefined) {
    value = (row as any)[column.accessorKey];
  }

  if (column.formatter) {
    value = column.formatter(value, row);
  }

  return value === null || value === undefined || value === ""
    ? "-"
    : String(value);
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

export async function exportPDFDocument<T>(
  options: ExportOptions<T> & {
    onProgress?: (progress: number) => void;
    signal?: AbortSignal;
  },
) {
  const {
    data,
    columns,
    filename = `export_${dayjs().format("YYYY-MM-DD")}.pdf`,
    summaryRows,
    onProgress,
    signal,
  } = options;

  if (!data || data.length === 0) {
    return;
  }

  try {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
      compress: true,
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - PAGE_MARGIN * 2;
    const columnStyles = Object.fromEntries(
      columns.map((column, index) => [
        index,
        {
          cellWidth:
            (contentWidth * (column.pdfWidth ?? 100 / columns.length)) / 100,
        },
      ]),
    );
    const drawPageHeader = () => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(6, 102, 73);
      doc.text("REKAP LOGBOOK", PAGE_MARGIN, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(75, 85, 99);
      doc.text(
        `Dicetak ${dayjs().locale("id").format("DD MMMM YYYY HH:mm")}`,
        pageWidth - PAGE_MARGIN,
        11,
        { align: "right" },
      );

      doc.setDrawColor(8, 127, 91);
      doc.setLineWidth(0.4);
      doc.line(PAGE_MARGIN, 15, pageWidth - PAGE_MARGIN, 15);
    };
    const tableOptions = {
      columns: columns.map((column, index) => ({
        header: column.header,
        dataKey: String(index),
      })),
      columnStyles,
      margin: {
        top: TABLE_TOP,
        right: PAGE_MARGIN,
        bottom: PAGE_MARGIN + 5,
        left: PAGE_MARGIN,
      },
      showHead: "everyPage" as const,
      theme: "grid" as const,
      styles: {
        font: "helvetica",
        fontSize: 5.5,
        cellPadding: 1.2,
        overflow: "linebreak" as const,
        valign: "top" as const,
        lineColor: [107, 114, 128] as [number, number, number],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [194, 214, 236] as [number, number, number],
        textColor: [31, 41, 55] as [number, number, number],
        fontStyle: "bold" as const,
        halign: "center" as const,
      },
      didDrawPage: drawPageHeader,
    };

    const body: Record<string, string>[] = [];
    for (let offset = 0; offset < data.length; offset += ROWS_PER_BATCH) {
      if (signal?.aborted) {
        throw new Error("EXPORT_CANCELLED");
      }

      const batch = data.slice(offset, offset + ROWS_PER_BATCH);
      body.push(
        ...batch.map((row) =>
          Object.fromEntries(
            columns.map((column, index) => [
              String(index),
              getExportValue(row, column),
            ]),
          ),
        ),
      );

      onProgress?.(
        Math.round(((offset + batch.length) / data.length) * 20),
      );
      if (offset + ROWS_PER_BATCH < data.length) {
        await yieldToBrowser();
      }
    }

    if (signal?.aborted) {
      throw new Error("EXPORT_CANCELLED");
    }

    autoTable(doc, {
      ...tableOptions,
      body,
      startY: TABLE_TOP,
    });
    onProgress?.(90);

    if (summaryRows?.length) {
      const finalY =
        (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
          ?.finalY ?? TABLE_TOP;
      autoTable(doc, {
        head: [[{ content: "Ringkasan", colSpan: 2 }]],
        body: summaryRows.map((row) => [row.label, String(row.value)]),
        startY: finalY + 5,
        margin: {
          top: TABLE_TOP,
          right: PAGE_MARGIN,
          bottom: PAGE_MARGIN + 5,
          left: PAGE_MARGIN,
        },
        tableWidth: 130,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2,
          lineColor: [107, 114, 128],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [194, 214, 236],
          textColor: [31, 41, 55],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: "bold" },
          1: { cellWidth: 50 },
        },
        didDrawPage: drawPageHeader,
      });
    }

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(
        `Halaman ${page} dari ${totalPages}`,
        pageWidth - PAGE_MARGIN,
        doc.internal.pageSize.getHeight() - 5,
        { align: "right" },
      );
    }

    doc.save(filename);
    onProgress?.(100);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    throw error;
  }
}
