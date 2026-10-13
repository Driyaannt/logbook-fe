import { useEffect, useCallback } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { ROUTES } from "@/utils/routes";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { RoleEnum } from "@/types";
import { useAuthStore } from "@/store/authStore";
import {
  LoginPage,
  ExamplePage,
  ExampleDetailPage,
  ExampleItemPage,
  ExampleSubItemPage,
  DashboardPage,
  PpdsListPage,
  PpdsCreatePage,
  PpdsDetailPage,
  PpdsChangePasswordPage,
  PpdsLogbookPage,
  PpdsLogbookDetailPage,
  PpdsInactiveListPage,
  StaffListPage,
  StaffCreatePage,
  StaffDetailPage,
  StaffChangePasswordPage,
  StaffLogbookPage,
  StaffLogbookDetailPage,
  StaseListPage,
  PenilaianLogbookListPage,
  PenilaianLogbookStatusPage,
  PenilaianLogbookStatusListPage,
  RekapReportPage,
  RekapReportDetailPage,
  RekapPenilaianPage,
  RekapPenilaianDetailPage,
  RekapLogbookPage,
  RekapLogbookDetailPage,
  ProfilePage,
  ProfileEditPage,
  StaseFormPage,
  UnverifiedLogbookPage,
  PenilaianLogbookDetailPage,
  UnverifiedLogbookDetailPage,
  HospitalListPage,
  HospitalFormPage,
  MorbidityListPage,
  MorbidityByUserPage,
  MorbidityByUserDetailPage,
} from "@/pages";

function App() {
  const { isInitialized } = useAuthStore();
  const init = useCallback(() => useAuthStore.getState().init(), []);

  useEffect(() => {
    init();
  }, [init]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#087F5B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />

        {/* Example Routes - without AdminLayout */}
        <Route path={ROUTES.example} element={<ExamplePage />} />
        <Route path={ROUTES.exampleDetail()} element={<ExampleDetailPage />} />
        <Route
          path={ROUTES.exampleItem(":exampleId")}
          element={<ExampleItemPage />}
        />
        <Route
          path={ROUTES.exampleSubItem(":exampleId", ":itemId")}
          element={<ExampleSubItemPage />}
        />

        {/* Auth Routes - Guest only (redirect if already logged in) */}
        <Route
          path={ROUTES.login}
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path={ROUTES.logout}
          element={<Navigate to={ROUTES.login} replace />}
        />

        {/* Protected Admin Routes */}
        <Route
          path={ROUTES.dashboard}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <DashboardPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.unverifiedLogbook}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <UnverifiedLogbookPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.unverifiedLogbookDetail(":idLogbook")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <UnverifiedLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* PPDS Routes */}
        <Route
          path={ROUTES.ppds}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsCreate}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsCreatePage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsChangePassword(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsChangePasswordPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsLogbook(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsLogbookPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsLogbookDetail(":idUser", ":idLogbook")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* PPDS Inactive Routes */}
        <Route
          path={ROUTES.ppdsInactive}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsInactiveListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsInactiveDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsInactiveLogbook(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsLogbookPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ppdsInactiveLogbookDetail(":idUser", ":idLogbook")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PpdsLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Staff Routes */}
        <Route
          path={ROUTES.staff}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaffListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staffCreate}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaffCreatePage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staffDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaffDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staffChangePassword(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaffChangePasswordPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staffLogbook(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaffLogbookPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staffLogbookDetail(":idUser", ":idLogbook")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaffLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Hospital Routes */}
        <Route
          path={ROUTES.hospital}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <HospitalListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.hospitalCreate}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <HospitalFormPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.hospitalDetail(":idHospital")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <HospitalFormPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Morbidity Routes */}
        <Route
          path={ROUTES.morbidity}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <MorbidityListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.morbidityByUser(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <MorbidityByUserPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.morbidityByUserDetail(":idUser", ":idLogbook")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <MorbidityByUserDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Stase Routes */}
        <Route
          path={ROUTES.stase}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaseListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staseCreate}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaseFormPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.staseDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <StaseFormPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Penilaian Logbook Routes */}
        <Route
          path={ROUTES.penilaianLogbook}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PenilaianLogbookListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.penilaianLogbookDetail(":idLogbookCategory")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PenilaianLogbookStatusPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.penilaianLogbookScoredLogbook(":idLogbookCategory")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PenilaianLogbookStatusListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.penilaianLogbookScoredLogbookDetail(
            ":idLogbookCategory",
            ":idLogbook",
          )}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PenilaianLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.penilaianLogbookUnscoredLogbook(":idLogbookCategory")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PenilaianLogbookStatusListPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.penilaianLogbookUnscoredLogbookDetail(
            ":idLogbookCategory",
            ":idLogbook",
          )}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <PenilaianLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Rekap Routes */}
        <Route
          path={ROUTES.rekapReport}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <RekapReportPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.rekapReportDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <RekapReportDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.rekapPenilaian}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <RekapPenilaianPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.rekapPenilaianDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <RekapPenilaianDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.rekapLogbook}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <RekapLogbookPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.rekapLogbookDetail(":idUser")}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <RekapLogbookDetailPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile Route */}
        <Route
          path={ROUTES.profile}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <ProfilePage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.profileEdit}
          element={
            <ProtectedRoute allowedRoles={[RoleEnum.INSTITUTION]}>
              <AdminLayout>
                <ProfileEditPage />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                <p className="text-gray-600">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
