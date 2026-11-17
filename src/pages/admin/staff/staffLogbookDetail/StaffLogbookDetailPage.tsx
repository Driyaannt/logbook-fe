import { Topbar } from "@/components/layout/Topbar";
import { LoadingPage } from "@/components/layout/Loading";
import { ROUTES } from "@/utils/routes";
import { useParams, useLocation } from "react-router-dom";
import { icons } from "@/assets/images/Icon";
import { useEffect } from "react";
import { useStaffStore } from "@/store/staffStore";
import { Identitas } from "./_components/Identitas";
import { Kegiatan } from "./_components/Kegiatan";
import { Staff } from "./_components/Staff";

export default function StaffLogbookDetailPage() {
  const location=useLocation();
  const { idUser, idLogbook } = useParams<{
    idUser: string;
    idLogbook: string;
  }>();

  const {
    staffLogbookDetail,
    isLoadingDetail,
    loadStaffLogbookDetail,
    resetLogbookDetail,
  } = useStaffStore();

  useEffect(() => {
    if (idLogbook) {
      loadStaffLogbookDetail(Number(idLogbook));
    }
    return () => resetLogbookDetail();
  }, [idUser, idLogbook, loadStaffLogbookDetail, resetLogbookDetail]);

  if (isLoadingDetail) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-[60px] lg:pt-0">
      <Topbar
        breadcrumbs={[
          { label: "Staff", to: ROUTES.staff },
          { label: "Detail", to: ROUTES.staffDetail(String(idUser)) },
          { label: "Logbook", to: ROUTES.staffLogbook(String(idUser)) + location.search },
          { label: "Detail" },
        ]}
      />
      <div className="flex-1 px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <Identitas data={staffLogbookDetail} />
          <Kegiatan data={staffLogbookDetail} />
          <Staff data={staffLogbookDetail} />

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
