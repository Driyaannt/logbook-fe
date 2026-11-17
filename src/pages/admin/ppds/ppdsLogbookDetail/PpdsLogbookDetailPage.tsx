import { Topbar } from "@/components/layout/Topbar";
import { LoadingPage } from "@/components/layout/Loading";
import { ROUTES } from "@/utils/routes";
import { useParams, useLocation } from "react-router-dom";
import { icons } from "@/assets/images/Icon";
import { useEffect } from "react";
import { usePpdsStore } from "@/store/ppdsStore";
import { Identitas } from "./_components/Identitas";
import { Kegiatan } from "./_components/Kegiatan";
import { Staff } from "./_components/Staff";

export default function PpdsLogbookDetailPage() {
  const { idUser, idLogbook } = useParams<{
    idUser: string;
    idLogbook: string;
  }>();
  const location = useLocation();

  const {
    ppdsLogbookDetail,
    isLoading,
    loadPpdsLogbookDetail,
    resetLogbookDetail,
  } = usePpdsStore();

  useEffect(() => {
    if (idLogbook) {
      loadPpdsLogbookDetail({
        id_logbook: Number(idLogbook),
      });
    }
    return () => resetLogbookDetail();
  }, [idUser, idLogbook, loadPpdsLogbookDetail, resetLogbookDetail]);

  const isInactive = location.pathname.includes("/ppds-inactive/");

  const ppdsListRoute = isInactive ? ROUTES.ppdsInactive : ROUTES.ppds;
  const ppdsDetailRoute = isInactive
    ? ROUTES.ppdsInactiveDetail(idUser || "")
    : ROUTES.ppdsDetail(idUser || "");
  const ppdsLogbookRoute = isInactive
    ? ROUTES.ppdsInactiveLogbook(idUser || "")
    : ROUTES.ppdsLogbook(idUser || "");

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-[60px] lg:pt-0">
      <Topbar
        breadcrumbs={[
          { label: isInactive ? "PPDS Nonaktif" : "PPDS", to: ppdsListRoute },
          { label: "Detail", to: ppdsDetailRoute },
          { label: "Logbook", to: ppdsLogbookRoute + location.search },
          { label: "Detail", to: undefined },
        ]}
      />
      <div className="flex-1 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Card 1 - Identitas */}
          <Identitas data={ppdsLogbookDetail} />

          {/* Card 2 - Kegiatan */}
          <Kegiatan data={ppdsLogbookDetail} />

          {/* Card 3 - Staff */}
          <Staff data={ppdsLogbookDetail} />

          {/* Back Button */}
          <div className="flex justify-end">
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
    </div>
  );
}
