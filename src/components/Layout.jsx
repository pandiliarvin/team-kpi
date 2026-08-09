import {
  useEffect,
  useState,
} from "react";

import {
  Outlet,
  useNavigate,
} from "react-router-dom";

import { Menu } from "lucide-react";

import {
  SidebarProvider,
  useSidebar,
} from "../context/SidebarContext";

import AppSidebar from "./AppSidebar";

function LayoutContent() {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    toggleMobileSidebar,
  } = useSidebar();

  const sidebarOpen = isExpanded || isHovered;

  const navigate = useNavigate();

  // --------------------------------------------------
  // Unsaved changes
  // --------------------------------------------------

  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);

  const [showUnsavedModal, setShowUnsavedModal] =
    useState(false);

  const [pendingNavigation, setPendingNavigation] =
    useState(null);

  // --------------------------------------------------
  // Listen for unsaved changes
  // --------------------------------------------------

  useEffect(() => {
    function handleUnsavedChanges(event) {
      setHasUnsavedChanges(
        Boolean(event.detail?.hasChanges)
      );
    }

    window.addEventListener(
      "kpi-unsaved-changes",
      handleUnsavedChanges
    );

    return () => {
      window.removeEventListener(
        "kpi-unsaved-changes",
        handleUnsavedChanges
      );
    };
  }, []);

  // --------------------------------------------------
  // Intercept navigation links
  // --------------------------------------------------

  useEffect(() => {
    function handleLinkClick(event) {
      // Only handle normal left-clicks
      if (event.button !== 0) return;

      // Don't interfere with Ctrl/Cmd/Shift/Alt clicks
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const link = event.target.closest("a");

      if (!link) return;

      const href = link.getAttribute("href");

      if (!href) return;

      // Ignore external links
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//")
      ) {
        return;
      }

      // Ignore links that only point to the current page
      if (
        href === window.location.pathname &&
        !href.includes("#")
      ) {
        return;
      }

      if (!hasUnsavedChanges) {
        return;
      }

      // Stop the normal React Router navigation
      event.preventDefault();
      event.stopPropagation();

      setPendingNavigation(href);
      setShowUnsavedModal(true);
    }

    document.addEventListener(
      "click",
      handleLinkClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleLinkClick,
        true
      );
    };
  }, [hasUnsavedChanges]);

  // --------------------------------------------------
  // Stay on page
  // --------------------------------------------------

  function stayOnPage() {
    setShowUnsavedModal(false);
    setPendingNavigation(null);
  }

  // --------------------------------------------------
  // Discard changes
  // --------------------------------------------------

  function discardChanges() {
    const destination = pendingNavigation;

    setShowUnsavedModal(false);
    setPendingNavigation(null);
    setHasUnsavedChanges(false);

    // Tell MonthlyKPIScores to discard local changes
    window.dispatchEvent(
      new CustomEvent("kpi-discard-changes")
    );

    if (destination) {
      navigate(destination);
    }
  }

  // --------------------------------------------------
  // Browser refresh / close protection
  // --------------------------------------------------

  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [hasUnsavedChanges]);

  // --------------------------------------------------
  // Page
  // --------------------------------------------------

  return (
    <div className="app-shell">

      {/* Sidebar */}

      <AppSidebar />

      {/* Mobile overlay */}

      {isMobileOpen && (
        <div
          className="app-overlay"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Main content */}

      <div
        className={
          sidebarOpen
            ? "app-main app-main-expanded"
            : "app-main app-main-collapsed"
        }
      >

        {/* Mobile menu button */}

        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="mobile-menu-button"
        >
          <Menu size={22} />
        </button>

        {/* Page content */}

        <main className="app-content">
          <Outlet />
        </main>

      </div>

      {/* =================================================
          UNSAVED CHANGES MODAL
          ================================================= */}

      {showUnsavedModal && (
        <div
          className="unsaved-modal-overlay"
          onClick={stayOnPage}
        >

          <div
            className="unsaved-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-modal-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="unsaved-modal-icon">
              !
            </div>

            <div className="unsaved-modal-content">

              <h2 id="unsaved-modal-title">
                Unsaved Changes
              </h2>

              <p>
                You have unsaved changes to this
                month's KPI scores. Are you sure
                you want to leave this page?
              </p>

            </div>

            <div className="unsaved-modal-actions">

              <button
                type="button"
                className="unsaved-stay-button"
                onClick={stayOnPage}
              >
                Stay on Page
              </button>

              <button
                type="button"
                className="unsaved-discard-button"
                onClick={discardChanges}
              >
                Discard Changes
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function Layout() {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
}

export default Layout;