import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaArrowRightFromBracket, FaBars, FaHouse } from "react-icons/fa6";
import { getStoredAuthUser, getStoredAuthRole, clearAuth, buildProfileFromUser } from "../../utils/auth";
import { SIDEBAR_LOGO_URL, iconMap, THEME_KEY } from "../../utils/constants";

function PageShell({ variant, nav, title, subtitle, profile, actions, sidebarAction, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof document !== "undefined") {
      if (document.body.classList.contains("dark")) return "dark";
      if (document.body.classList.contains("light")) return "light";
    }
    return localStorage.getItem(THEME_KEY) || "light";
  });
  const location = useLocation();
  const storedUser = getStoredAuthUser();
  const storedRole = getStoredAuthRole();

  const authDrivenProfile =
    variant === "faculty" || variant === "admin"
      ? buildProfileFromUser(storedUser, variant === "admin" ? "admin" : "faculty")
      : profile;

  const effectiveProfile = {
    ...profile,
    ...authDrivenProfile,
    avatar: authDrivenProfile?.avatar || profile?.avatar || "U",
    name: authDrivenProfile?.name || profile?.name || "User",
    meta: authDrivenProfile?.meta || profile?.meta || "",
    photoPath: authDrivenProfile?.photoPath || profile?.photoPath || "",
  };

  const effectiveNav = useMemo(() => {
    // Hide admin shortcut for non-admin faculty users to keep sidebar focused.
    if (variant === "faculty" && String(storedRole || "").toLowerCase() !== "super_admin") {
      return nav.filter((item) => item.to !== "/admin/dashboard");
    }
    return nav;
  }, [nav, storedRole, variant]);

  const profileMenuItems = useMemo(() => {
    if (variant !== "faculty") return [];

    const items = [{ label: "Profile", to: "/faculty/profile" }];
    items.push({ label: "Admin Dashboard", to: "/admin/dashboard" });
    return items;
  }, [variant]);

  useEffect(() => {
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme } }));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isNavItemActive = (targetPath) => {
    if (!targetPath) return false;
    if (location.pathname === targetPath) return true;
    return location.pathname.startsWith(`${targetPath}/`);
  };

  return (
    <div className={`portal-shell ${variant} flex min-h-screen overflow-x-hidden bg-ui-bg text-ui-text dark:bg-ui-bg-dark dark:text-ui-text-dark`}>
      <div
        className={`sidebar-overlay fixed inset-0 z-[1100] bg-black/45 transition-opacity duration-300 ease-in-out ${
          sidebarOpen ? "show opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`portal-sidebar ${sidebarOpen ? "open" : ""} fixed inset-y-0 left-0 z-[1200] flex w-[306px] flex-col gap-[18px] overflow-hidden bg-[linear-gradient(145deg,#fff_0%,#f8fafc_100%)] p-[22px_18px_26px] shadow-[2px_0_20px_rgba(0,0,0,0.06)] dark:bg-[linear-gradient(160deg,#111827_0%,#1f2937_100%)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.35)] max-[992px]:w-[min(86vw,320px)] max-[992px]:rounded-tr-[20px] max-[992px]:rounded-br-[20px] max-[992px]:transition-[transform,opacity,visibility] max-[992px]:duration-[420ms] max-[992px]:ease-[cubic-bezier(0.22,1,0.36,1)] ${
          sidebarOpen
            ? "max-[992px]:translate-x-0 max-[992px]:opacity-100 max-[992px]:visible"
            : "max-[992px]:-translate-x-full max-[992px]:opacity-0 max-[992px]:invisible"
        }`}
      >
        <div className="sidebar-brand mb-0.5 flex items-center gap-2.5 border-b border-slate-400/20 px-2.5 pb-4 pt-3.5">
          <div className="brand-mark grid h-[52px] w-[52px] place-items-center rounded-2xl border border-blue-500/[0.18] bg-[linear-gradient(135deg,#f8fbff,#e6f0ff)] font-bold text-[#1976d2] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-blue-400/25 dark:bg-[linear-gradient(135deg,#151c2b,#273451)] dark:text-blue-400 dark:shadow-[inset_0_1px_0_rgba(96,165,250,0.1)]">
             <img src={SIDEBAR_LOGO_URL} alt="FaceMarkPro" />
          </div>
          <div className="brand-copy flex min-w-0 flex-col gap-0.5">
            <div className="brand-title flex gap-0.5 text-lg font-black text-ui-text dark:text-ui-text-dark">
              <span>FaceMark</span>
              <span className="accent text-[#4facfe] dark:text-blue-400">Pro</span>
            </div>
            <p className="brand-subtitle mt-1 text-xs font-medium text-ui-text-muted dark:text-ui-text-muted-dark">Your face is your Attendance</p>
          </div>
        </div>

        <div
          className={`profile-section ${profileMenuItems.length ? "profile-trigger" : ""} mx-0.5 mb-3 flex items-center gap-3 border-b border-slate-400/[0.24] px-3 pb-[18px] pt-4 ${
            profileMenuItems.length ? "cursor-pointer rounded-2xl transition-colors duration-200 ease-in-out hover:bg-[#4facfe]/[0.08]" : ""
          }`}
          onClick={() => {
            if (profileMenuItems.length) setProfileMenuOpen((open) => !open);
          }}
          role={profileMenuItems.length ? "button" : undefined}
          tabIndex={profileMenuItems.length ? 0 : undefined}
          onKeyDown={(event) => {
            if (!profileMenuItems.length) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setProfileMenuOpen((open) => !open);
            }
          }}
        >
          <div className="profile-photo grid h-[74px] w-[74px] flex-shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#6a3f2c,#22130d_72%)] text-2xl font-bold text-[#f9d39c] shadow-[0_6px_18px_rgba(15,23,42,0.14)]">
            {effectiveProfile.photoPath ? (
              <img src={effectiveProfile.photoPath} alt={effectiveProfile.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              effectiveProfile.avatar
            )}
          </div>
          <div className="profile-copy">
            <h5 className="m-0 text-base font-bold text-ui-text dark:text-ui-text-dark">{effectiveProfile.name}</h5>
            {effectiveProfile.meta ? <p className="mt-1 text-xs font-medium text-ui-text-muted dark:text-ui-text-muted-dark">{effectiveProfile.meta}</p> : null}
          </div>
        </div>

        {profileMenuItems.length && profileMenuOpen ? (
          <div className="profile-dropdown -mt-1.5 mx-0.5 mb-3 flex flex-col gap-1.5 rounded-xl border border-ui-border bg-ui-card p-2 dark:border-ui-border-dark dark:bg-ui-card-dark">
            {profileMenuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="profile-dropdown-link block rounded-[10px] px-3 py-2.5 font-semibold text-ui-text hover:bg-[#4facfe]/[0.12] dark:text-ui-text-dark"
                onClick={() => {
                  setSidebarOpen(false);
                  setProfileMenuOpen(false);
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}

        <nav className="nav-links flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          {effectiveNav.map((item, index) => {
            const Icon = iconMap[item.icon];
            const active = isNavItemActive(item.to);
            const link = (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link${active ? " active" : ""} flex items-center gap-3.5 rounded-2xl px-[18px] py-3.5 text-[15px] font-medium text-ui-text transition-all duration-[250ms] ease-in-out dark:text-ui-text-dark ${
                  active
                    ? "bg-[linear-gradient(135deg,#4d98db_0%,#2d7ed2_100%)] text-[#374151] shadow-[0_8px_20px_rgba(59,130,246,0.24)]"
                    : "hover:translate-x-1 hover:bg-[#4facfe]/[0.12]"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className={`nav-icon inline-grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-lg text-center text-[15px] font-bold opacity-90 ${active ? "text-white" : "text-slate-500"}`}>
                  {Icon ? <Icon /> : "*"}
                </span>
                <span>{item.label}</span>
              </Link>
            );

            if (index === 0 && sidebarAction) {
              return (
                <div key={`${item.to}-row`} className="sidebar-top-action-row mb-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5">
                  {link}
                  {sidebarAction}
                </div>
              );
            }

            return link;
          })}
        </nav>

        <div className="sidebar-footer mt-auto">
          {variant === "faculty" ? (
            <Link
              to="/admin/dashboard"
              className={`nav-link nav-link-dashboard flex items-center gap-3.5 rounded-2xl px-[18px] py-3.5 text-[15px] font-medium text-ui-text opacity-[0.82] hover:opacity-100 dark:text-ui-text-dark ${isNavItemActive("/admin/dashboard") ? "opacity-100" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon inline-grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-lg text-slate-500">
                <FaHouse />
              </span>
              <span>Admin Dashboard</span>
            </Link>
          ) : null}
          <div className="sidebar-footer-row flex items-center justify-between gap-3 border-t border-slate-400/[0.24] px-1 pb-0.5 pt-4">
              <Link
                to="/login"
                className="logout-link nav-link flex min-w-[130px] items-center justify-center gap-3.5 rounded-2xl bg-[linear-gradient(135deg,#ff4b4b,#df2d2d)] px-[18px] py-3.5 text-[15px] font-medium text-white shadow-[0_8px_20px_rgba(220,38,38,0.22)]"
                onClick={() => {
                  clearAuth();
                  setSidebarOpen(false);
                }}
              >
              <span className="nav-icon inline-grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-lg text-white">
                <FaArrowRightFromBracket />
              </span>
              <span>Logout</span>
            </Link>
            <button
              type="button"
              className={`sidebar-mini-switch relative h-9 w-[66px] flex-shrink-0 cursor-pointer rounded-full border-0 ${theme === "dark" ? "is-dark bg-slate-600" : "bg-gray-300"}`}
              aria-label="Toggle day and night mode"
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              <span
                className={`absolute top-1 h-7 w-7 rounded-full shadow-[0_2px_8px_rgba(15,23,42,0.12)] ${
                  theme === "dark" ? "left-[calc(100%-32px)] bg-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.35)]" : "left-1 bg-white"
                }`}
              />
            </button>
          </div>
        </div>
      </aside>

      <main className="portal-main ml-[306px] w-[calc(100%-306px)] flex-1 p-[14px_18px_24px] text-ui-text dark:text-ui-text-dark max-[992px]:ml-0 max-[992px]:w-full max-[992px]:p-[18px]">
        <header className="page-header mb-6 flex items-start justify-between gap-4 max-[992px]:flex-col max-[992px]:items-stretch max-[992px]:gap-3.5">
          <div className="page-heading flex items-start gap-3.5 max-[992px]:w-full max-[992px]:justify-start">
            <button
              className="sidebar-toggle hidden h-[42px] w-[42px] cursor-pointer place-items-center rounded-xl border border-ui-border bg-ui-card dark:border-ui-border-dark dark:bg-ui-card-dark max-[992px]:inline-grid"
              type="button"
              onClick={() => setSidebarOpen(true)}
            >
              <FaBars />
            </button>
            <div>
              <h1 className="m-0 text-[30px] max-[992px]:text-[clamp(1.35rem,4.2vw,1.8rem)]">{title}</h1>
              {subtitle ? <p className="mt-1.5 text-ui-text-muted dark:text-ui-text-muted-dark">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="page-actions flex items-center gap-3 max-[992px]:w-full max-[992px]:justify-end">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}

export { PageShell };
