import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { icons } from "@/assets/images/Icon";
import { ROUTES } from "@/utils/routes";
import orthoLogo from "@/assets/images/logo_uns_ortho.png";
import { navItems } from "@/data/sidebar";
import { useAuthStore } from "@/store/authStore";
import { ConfirmationModal } from "@/components/confirmationModal";

export const Sidebar = () => {
  const [openMenus, setOpenMenus] = useState<string[]>(["Rekap"]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    setIsMobileMenuOpen(false);
    navigate(ROUTES.login);
  };

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header - Visible only on mobile, acts as header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={orthoLogo} alt="Logo UNS Orthopaedi" className="h-10 w-10 object-contain" />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold leading-none tracking-tight text-[#04563D]">MEDIC LINK</span>
            <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-[#087F5B]">LOGBOOK</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? (
            <icons.X className="w-6 h-6 text-gray-600" />
          ) : (
            <icons.Menu className="w-6 h-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:h-screen lg:bg-white lg:border-r lg:border-gray-100 lg:flex-col lg:px-4 lg:py-6 lg:gap-1">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 px-2 mb-7">
          <img src={orthoLogo} alt="Logo UNS Orthopaedi" className="w-20 h-20 object-contain" />
          <div className="flex flex-col gap-1.5">
            <span className="text-2xl font-bold leading-none tracking-tight text-[#04563D]">MEDIC LINK</span>
            <span className="text-xs font-semibold uppercase leading-none tracking-[0.22em] text-[#087F5B]">LOGBOOK</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isOpen = openMenus.includes(item.label);

            if (item.children) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    <icons.ChevronDown
                      size={16}
                      className={`ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="flex flex-col gap-0.5 pl-9 mt-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={({ isActive }) =>
                            `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              isActive
                                ? "bg-[#087F5B] text-white"
                                : "text-gray-800 hover:bg-gray-100"
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            if (item.label === "Logout") {
              return (
                <button
                  key={item.to}
                  onClick={() => setShowLogoutModal(true)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to!}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#087F5B] text-white"
                      : "text-gray-800 hover:bg-gray-100"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 mt-16">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu */}
          <aside className="relative w-72 h-[calc(100vh-4rem)] bg-white overflow-y-auto">
            <nav className="flex flex-col gap-1 p-4">
              {navItems.map((item) => {
                const isOpen = openMenus.includes(item.label);

                if (item.children) {
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() => toggleMenu(item.label)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        <icons.ChevronDown
                          size={16}
                          className={`ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="flex flex-col gap-0.5 pl-9 mt-1">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              onClick={handleNavClick}
                              className={({ isActive }) =>
                                `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  isActive
                                    ? "bg-[#087F5B] text-white"
                                    : "text-gray-800 hover:bg-gray-100"
                                }`
                              }
                            >
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.label === "Logout") {
                  return (
                    <button
                      key={item.to}
                      onClick={() => setShowLogoutModal(true)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-800 hover:bg-gray-100 transition-colors"
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to!}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#087F5B] text-white"
                          : "text-gray-800 hover:bg-gray-100"
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Logout Modal */}
      <ConfirmationModal
        isShown={showLogoutModal}
        toggle={(open) => setShowLogoutModal(open ?? !showLogoutModal)}
        title="Keluar"
        description="Apakah Anda yakin ingin keluar dari aplikasi?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        confirmText="Keluar"
        cancelText="Batal"
        confirmVariant="destructive"
        cancelVariant="outline"
      />
    </>
  );
};
