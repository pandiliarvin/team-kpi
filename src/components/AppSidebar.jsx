import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  KeyRound,
} from "lucide-react";

import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

function AppSidebar() {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    toggleSidebar,
    setIsHovered,
  } = useSidebar();

  const { user, signOut } = useAuth();

  const location = useLocation();

  const isOpen = isExpanded || isHovered || isMobileOpen;

  const [openGroups, setOpenGroups] = useState({
    kpi: true,
  });

  const [showAccountModal, setShowAccountModal] =
    useState(false);

  const [memberName, setMemberName] = useState("");

  // --------------------------------------------------
  // Get member information
  // --------------------------------------------------

  useEffect(() => {
    async function fetchMember() {
      if (!user?.id) {
        setMemberName("");
        return;
      }

      const { data, error } = await supabase
        .from("members")
        .select("name")
        .eq("auth_user_id", user.id)
        .single();

      if (error) {
        console.error(
          "Error fetching member:",
          error
        );

        setMemberName("");
        return;
      }

      setMemberName(data?.name || "");
    }

    fetchMember();
  }, [user]);

  // --------------------------------------------------
  // Format full name
  // --------------------------------------------------

  const rawDisplayName =
    memberName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const displayName = rawDisplayName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(
      (name) =>
        name.charAt(0).toUpperCase() +
        name.slice(1)
    )
    .join(" ");

  // --------------------------------------------------
  // Profile initial
  // --------------------------------------------------

  const firstName = displayName
    .trim()
    .split(/\s+/)[0];

  const profileInitial =
    firstName?.charAt(0)?.toUpperCase() || "U";

  // --------------------------------------------------
  // Toggle KPI group
  // --------------------------------------------------

  const toggleGroup = (group) => {
    setOpenGroups((previous) => ({
      ...previous,
      [group]: !previous[group],
    }));
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  async function handleLogout() {
    setShowAccountModal(false);

    await signOut();
  }

  return (
    <>
      <aside
        className={`
          app-sidebar
          ${isOpen ? "app-sidebar-open" : "app-sidebar-collapsed"}
          ${isMobileOpen ? "app-sidebar-mobile-open" : ""}
        `}
        onMouseEnter={() => {
          if (!isExpanded) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >

        {/* =========================
            LOGO
            ========================= */}

        <div className="sidebar-logo">

          <div className="sidebar-brand">

            <div className="sidebar-logo-mark">
              <span>IS</span>
            </div>

            {isOpen && (
              <div className="sidebar-brand-text">
                <h2>IS KPI Portal</h2>
                <span>
                  Performance Management
                </span>
              </div>
            )}

          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-collapse-button"
            aria-label="Toggle sidebar"
          >
            {isOpen ? (
              <ChevronLeft size={17} />
            ) : (
              <ChevronRight size={17} />
            )}
          </button>

        </div>


        {/* =========================
            NAVIGATION
            ========================= */}

        <div className="sidebar-navigation">

          <nav className="sidebar-nav">

            {/* Dashboard */}

            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `sidebar-nav-link ${
                  isActive
                    ? "sidebar-nav-link-active"
                    : "sidebar-nav-link-inactive"
                } ${
                  !isOpen
                    ? "sidebar-nav-link-collapsed"
                    : ""
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`sidebar-nav-icon ${
                      isActive
                        ? "sidebar-nav-icon-active"
                        : ""
                    }`}
                  >
                    <LayoutDashboard
                      size={20}
                      strokeWidth={
                        isActive ? 2.2 : 1.8
                      }
                    />
                  </span>

                  {isOpen && (
                    <span className="sidebar-nav-text">
                      Dashboard
                    </span>
                  )}
                </>
              )}
            </NavLink>


            {/* =========================
                KPI GROUP
                ========================= */}

            <div className="sidebar-group">

              <button
                type="button"
                onClick={() =>
                  toggleGroup("kpi")
                }
                className={`
                  sidebar-group-button
                  ${
                    !isOpen
                      ? "sidebar-group-button-collapsed"
                      : ""
                  }
                  ${
                    location.pathname === "/kpis" ||
                    location.pathname ===
                      "/monthly-scores"
                      ? "sidebar-group-button-active"
                      : ""
                  }
                `}
              >

                <span className="sidebar-group-left">

                  <span
                    className={`sidebar-nav-icon ${
                      location.pathname ===
                        "/kpis" ||
                      location.pathname ===
                        "/monthly-scores"
                        ? "sidebar-nav-icon-section-active"
                        : ""
                    }`}
                  >
                    <BarChart3
                      size={20}
                      strokeWidth={
                        location.pathname ===
                          "/kpis" ||
                        location.pathname ===
                          "/monthly-scores"
                          ? 2.2
                          : 1.8
                      }
                    />
                  </span>

                  {isOpen && (
                    <span className="sidebar-nav-text">
                      KPI
                    </span>
                  )}

                </span>

                {isOpen && (
                  <ChevronDown
                    size={17}
                    className={`sidebar-group-chevron ${
                      openGroups.kpi
                        ? "sidebar-group-chevron-open"
                        : ""
                    }`}
                  />
                )}

              </button>


              {/* KPI children */}

              {isOpen &&
                openGroups.kpi && (
                  <div className="sidebar-submenu">

                    <NavLink
                      to="/kpis"
                      className={({ isActive }) =>
                        `sidebar-submenu-link ${
                          isActive
                            ? "sidebar-submenu-link-active"
                            : ""
                        }`
                      }
                    >
                      <span>
                        KPI Guidelines
                      </span>
                    </NavLink>

                    <NavLink
                      to="/monthly-scores"
                      className={({ isActive }) =>
                        `sidebar-submenu-link ${
                          isActive
                            ? "sidebar-submenu-link-active"
                            : ""
                        }`
                      }
                    >
                      <span>
                        Monthly KPI Scores
                      </span>
                    </NavLink>

                  </div>
                )}

            </div>

          </nav>

        </div>


        {/* =========================
            PROFILE FOOTER
            ========================= */}

        <div className="sidebar-footer">

          <button
            type="button"
            className={`
              sidebar-profile
              ${
                !isOpen
                  ? "sidebar-profile-collapsed"
                  : ""
              }
            `}
            onClick={() =>
              setShowAccountModal(true)
            }
            title={!isOpen ? displayName : ""}
          >

            {/* Profile Initial */}

            <div className="sidebar-profile-avatar">
              {profileInitial}
            </div>

            {/* Full Name */}

            {isOpen && (
              <div className="sidebar-profile-info">

                <span className="sidebar-profile-name">
                  {displayName}
                </span>

                <span className="sidebar-profile-label">
                  Account
                </span>

              </div>
            )}

          </button>

        </div>

      </aside>


      {/* =================================================
          ACCOUNT MODAL
          ================================================= */}

      {showAccountModal && (
        <div
          className="account-modal-overlay"
          onClick={() =>
            setShowAccountModal(false)
          }
        >

          <div
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Modal Header */}

            <div className="account-modal-header">

              <div className="account-modal-avatar">
                {profileInitial}
              </div>

              <div>

                <h2 id="account-modal-title">
                  {displayName}
                </h2>

                <p>
                  {user?.email}
                </p>

              </div>

            </div>


            {/* Modal Options */}

            <div className="account-modal-options">

              {/* Reset Password */}

              <NavLink
                to="/reset-password"
                className="account-modal-option"
                onClick={() =>
                  setShowAccountModal(false)
                }
              >

                <span className="account-modal-option-icon">
                  <KeyRound size={18} />
                </span>

                <span>
                  Reset Password
                </span>

              </NavLink>


              {/* Logout */}

              <button
                type="button"
                className="
                  account-modal-option
                  account-modal-logout
                "
                onClick={handleLogout}
              >

                <span className="account-modal-option-icon">
                  <LogOut size={18} />
                </span>

                <span>
                  Logout
                </span>

              </button>

            </div>


            {/* Cancel */}

            <button
              type="button"
              className="account-modal-close"
              onClick={() =>
                setShowAccountModal(false)
              }
            >
              Cancel
            </button>

          </div>

        </div>
      )}
    </>
  );
}

export default AppSidebar;