import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/card/card";
import { BaseTable } from "@/components/basetable/BaseTable";
import { BaseTableSpan } from "@/components/baseTableSpan/BaseTableSpan";
import { ConfirmationModal } from "@/components/confirmationModal";
import { ExportButton } from "@/components/exportButton";
import type { ExportFormat } from "@/components/exportButton";
import { LeafletMap } from "@/components/leafletMap";
import { TurnstileWidget } from "@/components/turnstile";
import { BarChart } from "@/components/chart/barChart";
import { LineChart } from "@/components/chart/lineChart";
import { DoughnutChart } from "@/components/chart/doughnutChart";
import { useExampleStore } from "@/store/exampleStore";
import {
  barChartData,
  doughnutChartData,
  lineChartData,
  sampleSpanData,
  sampleTableData,
  spanColumns,
  tableColumns,
} from "@/data/exampleMockData";

export default function ExamplePage() {
  const modalOpen = useExampleStore((state) => state.modalOpen);
  const exportLoading = useExampleStore((state) => state.exportLoading);
  const selectedFormat = useExampleStore((state) => state.selectedExportFormat);
  const turnstileToken = useExampleStore((state) => state.turnstileToken);
  const setModalOpen = useExampleStore((state) => state.setModalOpen);
  const setExportLoading = useExampleStore((state) => state.setExportLoading);
  const setSelectedExportFormat = useExampleStore(
    (state) => state.setSelectedExportFormat,
  );
  const setTurnstileToken = useExampleStore((state) => state.setTurnstileToken);

  const exportText = selectedFormat
    ? `Last export: ${selectedFormat.toUpperCase()}`
    : "No export yet";

  const handleExport = async (format: ExportFormat) => {
    setSelectedExportFormat(format);
    setExportLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setExportLoading(false);
  };

  const handleConfirm = async () => {
    setModalOpen(false);
  };

  const handleToggleModal = (open?: boolean) => {
    setModalOpen(open ?? true);
  };

  const chartSection = useMemo(
    () => (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Bar Chart</CardTitle>
            <CardDescription>Sample truck volume</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <BarChart data={barChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Chart</CardTitle>
            <CardDescription>Queue trend</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <LineChart data={lineChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Doughnut Chart</CardTitle>
            <CardDescription>Status share</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <DoughnutChart data={doughnutChartData} />
          </CardContent>
        </Card>
      </div>
    ),
    [],
  );

  return (
    <div className="space-y-8 p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Global Components Sample</CardTitle>
            <CardDescription>
              Contoh penggunaan global components dan store state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              <ExportButton
                onExport={handleExport}
                loading={exportLoading}
                buttonText="Export Data"
              />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">{exportText}</p>
              <p className="text-sm text-slate-600">
                Turnstile token: {turnstileToken ?? "not verified"}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Show confirmation modal
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Map & Turnstile</CardTitle>
            <CardDescription>
              Leaflet map and Cloudflare Turnstile preview.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-72 overflow-hidden rounded-lg border border-slate-200">
              <LeafletMap
                coordinates="-6.2088,106.8456"
                assetName="Jakarta"
                height="100%"
              />
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <TurnstileWidget
                siteKey="1x00000000000000000000AA"
                onVerify={(token) => setTurnstileToken(token)}
                onError={(error) => console.error(error)}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {chartSection}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>BaseTable Sample</CardTitle>
            <CardDescription>
              Reusable table component with pagination.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[420px]">
            <BaseTable
              data={sampleTableData}
              columns={tableColumns}
              pagination={{
                enabled: true,
                initialPageSize: 5,
                initialPageIndex: 0,
              }}
              isShowNumbering
              noDataText="Tidak ada data"
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>BaseTableSpan Sample</CardTitle>
            <CardDescription>Table with multi-level headers.</CardDescription>
          </CardHeader>
          <CardContent className="h-[420px]">
            <BaseTableSpan
              data={sampleSpanData}
              columns={spanColumns}
              pagination={{
                enabled: true,
                initialPageSize: 5,
                initialPageIndex: 0,
              }}
              isShowNumbering
              noDataText="Tidak ada data"
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isShown={modalOpen}
        toggle={handleToggleModal}
        title="Confirm Action"
        description="Apakah anda yakin ingin melanjutkan?"
        confirmText="Ya, lanjutkan"
        cancelText="Batal"
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
        isLoading={exportLoading}
      />
    </div>
  );
}
