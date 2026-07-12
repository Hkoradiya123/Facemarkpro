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
    <div className={`portal-shell ${variant}`}>
      <div
        className={`sidebar-overlay${sidebarOpen ? " show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside className={`portal-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
             <img src={SIDEBAR_LOGO_URL} alt="FaceMarkPro" />
          </div>
          <div className="brand-copy">
            <div className="brand-title">
              <span>FaceMark</span>
              <span className="accent">Pro</span>
            </div>
            <p className="brand-subtitle">Your face is your Attendance</p>
          </div>
        </div>

        <div
          className={`profile-section ${profileMenuItems.length ? "profile-trigger" : ""}`}
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
          <div className="profile-photo">
            {effectiveProfile.photoPath ? (
              <img src={effectiveProfile.photoPath} alt={effectiveProfile.name} />
            ) : (
              effectiveProfile.avatar
            )}
          </div>
          <div className="profile-copy">
            <h5>{effectiveProfile.name}</h5>
            {effectiveProfile.meta ? <p>{effectiveProfile.meta}</p> : null}
          </div>
        </div>

        {profileMenuItems.length && profileMenuOpen ? (
          <div className="profile-dropdown">
            {profileMenuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="profile-dropdown-link"
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

        <nav className="nav-links">
          {effectiveNav.map((item, index) => {
            const Icon = iconMap[item.icon];
            const link = (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link${isNavItemActive(item.to) ? " active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-icon">{Icon ? <Icon /> : "*"}</span>
                <span>{item.label}</span>
              </Link>
            );

            if (index === 0 && sidebarAction) {
              return (
                <div key={`${item.to}-row`} className="sidebar-top-action-row">
                  {link}
                  {sidebarAction}
                </div>
              );
            }

            return link;
          })}
        </nav>

        <div className="sidebar-footer">
          {variant === "faculty" ? (
            <Link
              to="/admin/dashboard"
              className={`nav-link nav-link-dashboard${isNavItemActive("/admin/dashboard") ? " active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">
                <FaHouse />
              </span>
              <span>Admin Dashboard</span>
            </Link>
          ) : null}
          <div className="sidebar-footer-row">
              <Link
                to="/login"
                className="nav-link logout-link"
                onClick={() => {
                  clearAuth();
                  setSidebarOpen(false);
                }}
              >
              <span className="nav-icon">
                <FaArrowRightFromBracket />
              </span>
              <span>Logout</span>
            </Link>
            <button
              type="button"
              className={`sidebar-mini-switch ${theme === "dark" ? "is-dark" : ""}`}
              aria-label="Toggle day and night mode"
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              <span />
            </button>
          </div>
        </div>
      </aside>

      <main className="portal-main">
        <header className="page-header">
          <div className="page-heading">
            <button className="sidebar-toggle" type="button" onClick={() => setSidebarOpen(true)}>
              <FaBars />
            </button>
            <div>
              <h1>{title}</h1>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="page-actions">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}

export { PageShell };
