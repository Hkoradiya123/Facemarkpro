# Tailwind Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Tailwind v4 in the Vite build and rebuild `Shared.jsx`'s presentational components on Tailwind utilities, pixel-matching current visuals, without breaking the 31 pages not yet migrated.

**Architecture:** Tailwind v4 via `@tailwindcss/vite`, theme tokens defined in `@theme` seeded from the existing `--ui-*` CSS variables. `styles.css` (legacy) and the new `tailwind.css` are both imported side by side — Tailwind loads second so its utilities win the cascade — until Phase 5 removes the legacy files. `Shared.jsx` is split into `src/components/shared/*.jsx` by responsibility, re-exported through a barrel `Shared.jsx` so none of the 32 pages' imports change. Migrated components keep their legacy classnames alongside new Tailwind utilities so unmigrated pages' CSS overrides keep matching.

**Tech Stack:** React 18, Vite 8, Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`), react-router-dom, react-icons.

## Global Constraints

- No visual/branding changes — every migrated element must reproduce the exact colors, spacing, radii, shadows, and transition timing of its current CSS rule.
- `main.jsx` imports `styles.css` **before** `styles/tailwind.css` (not a replacement) — both stay imported through Phase 4.
- Every migrated element keeps its original legacy classname(s) alongside new Tailwind utility classes.
- Dark mode toggle sets the theme class on **both** `document.body` (legacy, still read by unmigrated pages' `--ui-*` variables) and `document.documentElement` (new, read by Tailwind `dark:` utilities) — same `THEME_KEY` localStorage key.
- No component library, no `cva`/`clsx` — plain JS/JSX template literals, matching current code style.
- All 32 pages' `import { ... } from "../../components/Shared"` statements must work unmodified after this plan.
- No frontend test suite exists (`package.json` has no `test` script) — verification is manual/visual per task.

---

### Task 1: Install and configure Tailwind v4

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/styles/tailwind.css`
- Modify: `frontend/src/main.jsx`

**Interfaces:**
- Produces: `bg-ui-bg`, `bg-ui-bg-dark`, `bg-ui-card`, `bg-ui-card-dark`, `bg-ui-card-muted`, `bg-ui-card-muted-dark`, `border-ui-border`, `border-ui-border-dark`, `text-ui-text`, `text-ui-text-dark`, `text-ui-text-muted`, `text-ui-text-muted-dark` Tailwind color utilities (and their `bg-`/`text-`/`border-` variants), available to every later task.

- [ ] **Step 1: Install Tailwind dependencies**

Run (from `frontend/`):
```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add the Tailwind Vite plugin**

Edit `frontend/vite.config.js`:
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const configuredBackendOrigin = env.VITE_BACKEND_ORIGIN || "http://localhost:5000";
  let backendTarget = configuredBackendOrigin;

  try {
    const parsed = new URL(configuredBackendOrigin);
    const isLocalHost = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    const hasExplicitPort = Boolean(parsed.port);
    if (isLocalHost && !hasExplicitPort) {
      parsed.port = "5000";
      backendTarget = parsed.toString().replace(/\/$/, "");
    }
  } catch {
    backendTarget = "http://localhost:5000";
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/faculty/profile/photo": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/profile": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/attendance": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/register_student_face": {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
```

- [ ] **Step 3: Create the Tailwind entry stylesheet with theme tokens**

Create `frontend/src/styles/tailwind.css`:
```css
@import "tailwindcss";

@theme {
  --color-ui-bg: #f5f7fb;
  --color-ui-bg-dark: #0f172a;
  --color-ui-card: #ffffff;
  --color-ui-card-dark: #111827;
  --color-ui-card-muted: #f8fafc;
  --color-ui-card-muted-dark: #1f2937;
  --color-ui-border: #e2e8f0;
  --color-ui-border-dark: #334155;
  --color-ui-text: #1f2937;
  --color-ui-text-dark: #e5e7eb;
  --color-ui-text-muted: #64748b;
  --color-ui-text-muted-dark: #94a3b8;

  --color-brand-from: #4facfe;
  --color-brand-to: #00f2fe;
}
```

- [ ] **Step 4: Wire the new stylesheet into main.jsx (alongside the legacy one)**

Edit `frontend/src/main.jsx`:
```js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./styles.css";
import "./styles/tailwind.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Verify the build compiles and Tailwind utilities apply**

Run:
```bash
cd frontend && npm run build
```
Expected: build succeeds with no errors.

Then run `npm run dev`, open the app in a browser, open devtools, and in the console run:
```js
document.body.insertAdjacentHTML("beforeend", '<div id="tw-probe" class="fixed bottom-2 right-2 z-[9999] bg-ui-card text-ui-text p-2 rounded">probe</div>')
```
Expected: a small box appears bottom-right styled with the `ui-card`/`ui-text` colors (confirms `@theme` tokens compiled into real utilities). Remove the probe element afterward (`document.getElementById("tw-probe").remove()`).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/styles/tailwind.css frontend/src/main.jsx
git commit -m "feat: add Tailwind v4 alongside existing CSS"
```

---

### Task 2: Split Shared.jsx into per-responsibility files (mechanical, no visual change)

**Files:**
- Create: `frontend/src/components/shared/auth.jsx`
- Create: `frontend/src/components/shared/PageShell.jsx`
- Create: `frontend/src/components/shared/Card.jsx`
- Create: `frontend/src/components/shared/StatGrid.jsx`
- Create: `frontend/src/components/shared/Table.jsx`
- Create: `frontend/src/components/shared/ProfileFields.jsx`
- Create: `frontend/src/components/shared/FormGrid.jsx`
- Create: `frontend/src/components/shared/Skeletons.jsx`
- Modify: `frontend/src/components/Shared.jsx` (becomes a barrel re-export)

**Interfaces:**
- Consumes: nothing from Task 1 (this task is a pure code move; no Tailwind classes are added yet).
- Produces: `PageShell`, `SectionCard`, `StatGrid`, `SimpleTable`, `ProfileFields`, `FormGrid`, `SkeletonBlock`, `TableSkeleton`, `FilterSkeleton`, `DashboardSkeleton`, `FullScreenPortalSkeleton`, `AuthGate`, `RequireFacultyAuth`, `RequireAdminAuth` — all with identical signatures to today, now importable both from their new home and from `../../components/Shared` (unchanged for all 32 pages).

- [ ] **Step 1: Create `frontend/src/components/shared/Skeletons.jsx`**

Move `SkeletonBlock`, `TableSkeleton`, `FilterSkeleton`, `DashboardSkeleton`, `FullScreenPortalSkeleton` verbatim (byte-identical JSX/CSS classnames — no Tailwind yet):
```jsx
import React from "react";

function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton-block ${className}`.trim()} />;
}

function TableSkeleton({ rows = 5, columns = 4, className = "" }) {
  const rowStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <div className={`table-wrap skeleton-table-wrap ${className}`.trim()}>
      <div className="table-skeleton-grid" role="presentation">
        <div className="table-skeleton-row table-skeleton-row-head" style={rowStyle}>
          {Array.from({ length: columns }, (_, index) => (
            <div key={`head-${index}`} className="table-skeleton-cell">
              <SkeletonBlock className="skeleton-line skeleton-cell-head" />
            </div>
          ))}
        </div>

        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="table-skeleton-row" style={rowStyle}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="table-skeleton-cell">
                <SkeletonBlock className={`skeleton-line skeleton-cell${colIndex === 0 ? " short" : ""}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSkeleton({ fields = 6 }) {
  return (
    <div className="report-filter-grid">
      {Array.from({ length: fields }, (_, index) => (
        <div key={`filter-${index}`} className="field-label skeleton-filter-item">
          <SkeletonBlock className="skeleton-line skeleton-label" />
          <SkeletonBlock className="skeleton-input" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton({ variant = "faculty" }) {
  if (variant === "student") {
    return (
      <div className="dashboard-skeleton student">
        <div className="dashboard-skeleton-stats">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`student-stat-${index}`} className="dashboard-skeleton-card stat">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="skeleton-line skeleton-text short" />
            </div>
          ))}
        </div>

        <div className="dashboard-skeleton-grid student-grid">
          <div className="dashboard-skeleton-card schedule">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars short" />
          </div>

          <div className="dashboard-skeleton-card attendance">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-chart" />
          </div>

          <div className="dashboard-skeleton-card timetable">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-chart" />
          </div>

          <div className="dashboard-skeleton-card actions">
            <SkeletonBlock className="skeleton-line skeleton-title short" />
            <SkeletonBlock className="skeleton-line skeleton-text" />
            <SkeletonBlock className="skeleton-line skeleton-text" />
            <SkeletonBlock className="skeleton-line skeleton-text short" />
          </div>

          <div className="dashboard-skeleton-card summary">
            <SkeletonBlock className="skeleton-line skeleton-title" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars" />
            <SkeletonBlock className="skeleton-table-bars short" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-skeleton faculty">
      <div className="dashboard-skeleton-grid">
        <div className="dashboard-skeleton-card hero">
          <SkeletonBlock className="skeleton-line skeleton-title" />
          <SkeletonBlock className="skeleton-line skeleton-text" />
          <SkeletonBlock className="skeleton-chart" />
        </div>
        <div className="dashboard-skeleton-card side">
          <SkeletonBlock className="skeleton-line skeleton-title short" />
          <SkeletonBlock className="skeleton-line skeleton-text short" />
          <SkeletonBlock className="skeleton-line skeleton-text" />
        </div>
        <div className="dashboard-skeleton-card chart">
          <SkeletonBlock className="skeleton-line skeleton-title" />
          <SkeletonBlock className="skeleton-chart" />
        </div>
        <div className="dashboard-skeleton-card table">
          <SkeletonBlock className="skeleton-line skeleton-title" />
          <SkeletonBlock className="skeleton-table-bars" />
          <SkeletonBlock className="skeleton-table-bars" />
          <SkeletonBlock className="skeleton-table-bars short" />
        </div>
      </div>
    </div>
  );
}

function FullScreenPortalSkeleton({ variant = "faculty" }) {
  return (
    <div className={`portal-shell portal-loading-screen ${variant}`}>
      <aside className="portal-sidebar portal-sidebar-skeleton">
        <div className="sidebar-brand">
          <div className="brand-mark portal-skeleton-square">
            <SkeletonBlock className="portal-skeleton-fill" />
          </div>
          <div className="portal-skeleton-copy">
            <SkeletonBlock className="skeleton-line skeleton-title short" />
            <SkeletonBlock className="skeleton-line skeleton-text short" />
          </div>
        </div>

        <div className="profile-section portal-skeleton-profile">
          <div className="profile-photo portal-skeleton-avatar">
            <SkeletonBlock className="portal-skeleton-fill" />
          </div>
          <div className="portal-skeleton-copy">
            <SkeletonBlock className="skeleton-line skeleton-title short" />
            <SkeletonBlock className="skeleton-line skeleton-text short" />
          </div>
        </div>

        <div className="nav-links portal-skeleton-nav">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`nav-skeleton-${index}`}
              className={`nav-link portal-skeleton-nav-item${index === 0 ? " active" : ""}`}
            >
              <span className="nav-icon portal-skeleton-icon">
                <SkeletonBlock className="portal-skeleton-fill" />
              </span>
              <SkeletonBlock className={`skeleton-line${index === 0 ? " short" : ""}`} />
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-footer-row portal-skeleton-footer">
            <SkeletonBlock className="portal-skeleton-logout" />
            <SkeletonBlock className="portal-skeleton-toggle" />
          </div>
        </div>
      </aside>

      <main className="portal-main portal-main-skeleton">
        <header className="page-header portal-skeleton-header">
          <div className="page-heading portal-skeleton-heading">
            <div>
              <SkeletonBlock className="skeleton-line portal-skeleton-page-title" />
              <SkeletonBlock className="skeleton-line portal-skeleton-page-subtitle" />
            </div>
          </div>
          <SkeletonBlock className="portal-skeleton-header-action" />
        </header>

        <div className="portal-skeleton-dashboard">
          <div className="portal-skeleton-grid top">
            <div className="dashboard-skeleton-card portal-skeleton-card wide">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="portal-skeleton-timetable" />
            </div>
            <div className="portal-skeleton-column">
              <div className="dashboard-skeleton-card portal-skeleton-card">
                <SkeletonBlock className="skeleton-line skeleton-title short" />
                <SkeletonBlock className="portal-skeleton-hero-card" />
              </div>
              <div className="portal-skeleton-grid compact">
                <div className="dashboard-skeleton-card portal-skeleton-card compact">
                  <SkeletonBlock className="skeleton-line skeleton-title short" />
                  <SkeletonBlock className="skeleton-line skeleton-text short" />
                  <SkeletonBlock className="skeleton-line skeleton-text short" />
                </div>
                <div className="dashboard-skeleton-card portal-skeleton-card compact">
                  <SkeletonBlock className="skeleton-line skeleton-title short" />
                  <SkeletonBlock className="portal-skeleton-widget-bar" />
                  <SkeletonBlock className="skeleton-line skeleton-text" />
                </div>
              </div>
            </div>
          </div>

          <div className="portal-skeleton-grid middle">
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-tall" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-medium" />
            </div>
          </div>

          <div className="portal-skeleton-grid bottom">
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="portal-skeleton-calendar" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="skeleton-line skeleton-text" />
              <SkeletonBlock className="skeleton-line skeleton-text" />
              <SkeletonBlock className="skeleton-line skeleton-text short" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card">
              <SkeletonBlock className="skeleton-line skeleton-title short" />
              <SkeletonBlock className="portal-skeleton-widget-bar" />
              <SkeletonBlock className="skeleton-line skeleton-text" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { SkeletonBlock, TableSkeleton, FilterSkeleton, DashboardSkeleton, FullScreenPortalSkeleton };
```

- [ ] **Step 2: Create `frontend/src/components/shared/auth.jsx`**

```jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getStoredAuthRole, getStoredAuthUser, hasAuthToken, apiUrl, clearAuth, persistAuth } from "../../utils/auth";
import { FullScreenPortalSkeleton } from "./Skeletons";

function AuthGate({ roles, children }) {
  const [status, setStatus] = useState("checking");
  const localRole = getStoredAuthRole();

  useEffect(() => {
    let mounted = true;

    async function verify() {
      const localRole = getStoredAuthRole();
      const localTokenPresent = hasAuthToken();
      const localAuthAllowed = localTokenPresent && localRole && roles.some(r => String(r).toLowerCase() === String(localRole).toLowerCase());

      if (!localTokenPresent || !localRole) {
        if (mounted) setStatus("denied");
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/auth/whoami"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));

        if (response.ok && payload.authenticated) {
          const role = payload.role;
          const isAllowed = roles.some(r => String(r).toLowerCase() === String(role || "").toLowerCase());

          if (!isAllowed) {
            console.warn(`AuthGate: Role "${role}" not in allowed list:`, roles);
            if (mounted) setStatus("denied");
            return;
          }

          persistAuth({ token: "session", role, user: payload.user || getStoredAuthUser() || {} });
          if (mounted) setStatus("allowed");
          return;
        }

        console.warn("AuthGate: Authenticated check failed", payload);
        clearAuth();
        if (mounted) setStatus("denied");
      } catch (err) {
        if (localAuthAllowed) {
          console.warn("AuthGate: whoami request failed, using cached auth state", err);
          if (mounted) setStatus("allowed");
          return;
        }

        console.error("AuthGate Exception:", err);
        clearAuth();
        if (mounted) setStatus("denied");
      }
    }

    verify();
    return () => {
      mounted = false;
    };
  }, [roles]);

  if (status === "checking") {
    const loadingVariant = String(localRole || "").toLowerCase() === "super_admin" ? "admin" : "faculty";
    return (
      <FullScreenPortalSkeleton variant={loadingVariant} />
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireFacultyAuth({ children }) {
  return <AuthGate roles={["teacher", "super_admin", "faculty"]}>{children}</AuthGate>;
}

function RequireAdminAuth({ children }) {
  return <AuthGate roles={["super_admin"]}>{children}</AuthGate>;
}

export { AuthGate, RequireFacultyAuth, RequireAdminAuth };
```

- [ ] **Step 3: Create `frontend/src/components/shared/PageShell.jsx`**

Move `PageShell` verbatim (byte-identical — no Tailwind yet, that's Task 3):
```jsx
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
```

- [ ] **Step 4: Create `frontend/src/components/shared/Card.jsx`, `StatGrid.jsx`, `Table.jsx`, `ProfileFields.jsx`, `FormGrid.jsx`**

`frontend/src/components/shared/Card.jsx`:
```jsx
import React from "react";

function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`content-card ${className}`}>
      {(title || action) && (
        <div className="section-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export { SectionCard };
```

`frontend/src/components/shared/StatGrid.jsx`:
```jsx
import React from "react";

function StatGrid({ stats }) {
  return (
    <div className="stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="stat-card">
            <div className="stat-copy">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
            <div className={`stat-icon tone-${stat.tone}`} aria-hidden="true">
              {Icon ? <Icon /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export { StatGrid };
```

`frontend/src/components/shared/Table.jsx`:
```jsx
import React from "react";

function SimpleTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table className="simple-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { SimpleTable };
```

`frontend/src/components/shared/ProfileFields.jsx`:
```jsx
import React from "react";

function ProfileFields({ items }) {
  return (
    <div className="profile-fields">
      {items.map(([label, value]) => (
        <div key={label} className="field-row">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export { ProfileFields };
```

`frontend/src/components/shared/FormGrid.jsx`:
```jsx
import React from "react";

function FormGrid({ fields, action }) {
  return (
    <form className="settings-form" onSubmit={(event) => event.preventDefault()}>
      <div className="field-grid">
        {fields.map((field) => (
          <label key={field.label} className="field-label">
            <span>{field.label}</span>
            <input type={field.type} placeholder={field.placeholder || ""} />
          </label>
        ))}
      </div>
      <button className="primary-btn" type="submit">
        {action}
      </button>
    </form>
  );
}

export { FormGrid };
```

- [ ] **Step 5: Replace `frontend/src/components/Shared.jsx` with a barrel re-export**

```jsx
export { AuthGate, RequireFacultyAuth, RequireAdminAuth } from "./shared/auth";
export { PageShell } from "./shared/PageShell";
export { SectionCard } from "./shared/Card";
export { StatGrid } from "./shared/StatGrid";
export { SimpleTable } from "./shared/Table";
export { ProfileFields } from "./shared/ProfileFields";
export { FormGrid } from "./shared/FormGrid";
export { SkeletonBlock, TableSkeleton, FilterSkeleton, DashboardSkeleton, FullScreenPortalSkeleton } from "./shared/Skeletons";
```

- [ ] **Step 6: Verify the app still builds and renders identically**

Run:
```bash
cd frontend && npm run build
```
Expected: build succeeds, no import errors (a missing/renamed export would fail here).

Run `npm run dev`, log in, and load one page per role (e.g. `AdminDashboard`, a faculty page, a student page). Expected: pixel-identical to before this task — this step only moved code, no classnames or JSX structure changed.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Shared.jsx frontend/src/components/shared/
git commit -m "refactor: split Shared.jsx into per-responsibility files behind a barrel export"
```

---

### Task 3: Migrate PageShell to Tailwind

**Files:**
- Modify: `frontend/src/components/shared/PageShell.jsx`

**Interfaces:**
- Consumes: `bg-ui-*`, `text-ui-*`, `border-ui-*` tokens from Task 1's `@theme`.
- Produces: no signature change — `PageShell` still takes `{ variant, nav, title, subtitle, profile, actions, sidebarAction, children }`.

- [ ] **Step 1: Replace the theme-sync effect to also target `<html>`**

In `frontend/src/components/shared/PageShell.jsx`, replace:
```js
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme } }));
  }, [theme]);
```
with:
```js
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme } }));
  }, [theme]);
```

- [ ] **Step 2: Rewrite the returned JSX with Tailwind utilities, keeping every legacy classname**

Replace the whole `return (...)` block with:
```jsx
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
```

- [ ] **Step 3: Verify light mode, dark mode, and mobile sidebar behavior manually**

Run `npm run dev`, log in as any role, and check:
1. Sidebar, nav links, profile section, logout button, and theme toggle look identical to before this task in light mode.
2. Click the theme toggle — dark mode colors match the previous `body.dark` appearance, and reloading the page keeps the chosen theme (`localStorage.getItem("theme")`).
3. Resize the browser below 992px width — the sidebar collapses off-screen, the hamburger button (`sidebar-toggle`) appears, clicking it slides the sidebar in with the overlay backdrop, clicking the overlay closes it.

Expected: no visible difference from the pre-Task-3 screenshots at any of the three checks.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared/PageShell.jsx
git commit -m "feat: migrate PageShell to Tailwind utilities"
```

---

### Task 4: Migrate SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid to Tailwind

**Files:**
- Modify: `frontend/src/components/shared/Card.jsx`
- Modify: `frontend/src/components/shared/StatGrid.jsx`
- Modify: `frontend/src/components/shared/Table.jsx`
- Modify: `frontend/src/components/shared/ProfileFields.jsx`
- Modify: `frontend/src/components/shared/FormGrid.jsx`

**Interfaces:**
- Consumes: `bg-ui-*`, `text-ui-*`, `border-ui-*` tokens from Task 1.
- Produces: no signature changes to any of the 5 components.

- [ ] **Step 1: Migrate `SectionCard`**

Replace `frontend/src/components/shared/Card.jsx`:
```jsx
import React from "react";

function SectionCard({ title, action, children, className = "" }) {
  return (
    <section className={`content-card min-w-0 rounded-[18px] bg-ui-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-ui-card-dark max-[992px]:p-[18px] ${className}`}>
      {(title || action) && (
        <div className="section-head mb-[18px] flex items-center justify-between gap-3">
          <h3 className="m-0 text-xl text-ui-text dark:text-ui-text-dark">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export { SectionCard };
```

- [ ] **Step 2: Migrate `StatGrid`**

Replace `frontend/src/components/shared/StatGrid.jsx`:
```jsx
import React from "react";

const TONE_BG = {
  blue: "bg-[#4facfe]/[0.16]",
  green: "bg-emerald-500/[0.16]",
  purple: "bg-[#6c5ce7]/[0.16]",
  amber: "bg-orange-500/[0.18]",
  cyan: "bg-[#17a2b8]/[0.16]",
};

function StatGrid({ stats }) {
  return (
    <div className="stats-grid mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 max-[992px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] max-[992px]:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article key={stat.label} className="stat-card flex items-center justify-between rounded-[18px] bg-ui-card p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:bg-ui-card-dark max-[992px]:p-[18px]">
            <div className="stat-copy flex flex-col gap-1">
              <strong className="text-[30px] text-ui-text dark:text-ui-text-dark">{stat.value}</strong>
              <span className="text-sm text-ui-text-muted dark:text-ui-text-muted-dark">{stat.label}</span>
            </div>
            <div
              className={`stat-icon tone-${stat.tone} flex h-14 w-14 items-center justify-center rounded-2xl text-white/90 [&>svg]:h-[22px] [&>svg]:w-[22px] ${TONE_BG[stat.tone] || ""}`}
              aria-hidden="true"
            >
              {Icon ? <Icon /> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export { StatGrid };
```

- [ ] **Step 3: Migrate `SimpleTable`**

Replace `frontend/src/components/shared/Table.jsx`:
```jsx
import React from "react";

function SimpleTable({ columns, rows }) {
  return (
    <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
      <table className="simple-table w-full min-w-0 table-fixed border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                className="border-b border-[#edf2f7] bg-[#f8fafc] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] text-left text-[clamp(10px,1vw,14px)] font-semibold text-[#64748b] [overflow-wrap:anywhere] [word-break:break-word]"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-[#edf2f7] p-[clamp(6px,1.2vw,12px)_clamp(6px,1.4vw,14px)] align-middle text-[clamp(10px,1vw,14px)] [overflow-wrap:anywhere] [word-break:break-word]"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { SimpleTable };
```

- [ ] **Step 4: Migrate `ProfileFields`**

Replace `frontend/src/components/shared/ProfileFields.jsx`:
```jsx
import React from "react";

function ProfileFields({ items }) {
  return (
    <div className="profile-fields flex flex-col gap-3.5">
      {items.map(([label, value]) => (
        <div key={label} className="field-row flex justify-between gap-5 border-b border-[#eef2f7] pb-2.5">
          <span className="text-[#64748b]">{label}</span>
          <strong className="text-ui-text dark:text-ui-text-dark">{value}</strong>
        </div>
      ))}
    </div>
  );
}

export { ProfileFields };
```

- [ ] **Step 5: Migrate `FormGrid`**

Replace `frontend/src/components/shared/FormGrid.jsx`:
```jsx
import React from "react";

function FormGrid({ fields, action }) {
  return (
    <form className="settings-form flex flex-col gap-[18px]" onSubmit={(event) => event.preventDefault()}>
      <div className="field-grid grid grid-cols-2 gap-4 max-[992px]:grid-cols-1">
        {fields.map((field) => (
          <label key={field.label} className="field-label flex flex-col gap-2 text-[#475569]">
            <span>{field.label}</span>
            <input
              type={field.type}
              placeholder={field.placeholder || ""}
              className="w-full rounded-xl border border-[#dbe4ee] bg-white px-3.5 py-3"
            />
          </label>
        ))}
      </div>
      <button
        className="primary-btn cursor-pointer rounded-xl border-0 bg-[linear-gradient(135deg,#4facfe,#00c6fb)] px-[18px] py-3 text-white shadow-[0_10px_24px_rgba(79,172,254,0.22)]"
        type="submit"
      >
        {action}
      </button>
    </form>
  );
}

export { FormGrid };
```

- [ ] **Step 6: Verify manually**

Run `npm run dev`, load `AdminDashboard` (uses `SectionCard` + `StatGrid`), `AdminTablePage` (uses `SimpleTable`), and a faculty/student profile page (uses `ProfileFields` + `FormGrid`). Check in both light and dark mode:
1. Card backgrounds, radius, padding, and shadow match pre-migration.
2. Stat tiles' tone-colored icon backgrounds (blue/green/purple/amber) match pre-migration.
3. Table header background/text color and cell borders match pre-migration.
4. Resize below 992px — stat grid and form field grid collapse to fewer/1 column as before.

Expected: no visible difference at any of the four checks.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/shared/Card.jsx frontend/src/components/shared/StatGrid.jsx frontend/src/components/shared/Table.jsx frontend/src/components/shared/ProfileFields.jsx frontend/src/components/shared/FormGrid.jsx
git commit -m "feat: migrate SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid to Tailwind"
```

---

### Task 5: Migrate skeleton components to Tailwind

**Files:**
- Modify: `frontend/src/styles/tailwind.css`
- Modify: `frontend/src/components/shared/Skeletons.jsx`

**Interfaces:**
- Consumes: `bg-ui-card`/`bg-ui-card-dark` tokens from Task 1.
- Produces: no signature changes to `SkeletonBlock`, `TableSkeleton`, `FilterSkeleton`, `DashboardSkeleton`, `FullScreenPortalSkeleton`.

- [ ] **Step 1: Register the shimmer keyframes in the Tailwind stylesheet**

Append to `frontend/src/styles/tailwind.css`:
```css

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

- [ ] **Step 2: Rewrite `SkeletonBlock` to carry the shimmer look itself**

In `frontend/src/components/shared/Skeletons.jsx`, replace the `SkeletonBlock` function:
```jsx
function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`skeleton-block relative overflow-hidden bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(90deg,#1e293b_0%,#334155_50%,#1e293b_100%)] ${className}`.trim()}
    />
  );
}
```

- [ ] **Step 3: Add layout utilities for every skeleton "shape" className used via `SkeletonBlock`**

In the same file, replace every call site's `className` string on `<SkeletonBlock ... />` per this mapping (each `className` prop gets its Tailwind layout utilities appended after the legacy tokens, space-separated):

| Legacy className | Tailwind utilities to append |
|---|---|
| `skeleton-line` | `h-[14px] rounded-full` |
| `skeleton-line skeleton-title` | `h-[14px] rounded-full h-5 w-[58%]` |
| `skeleton-line skeleton-title short` | `h-[14px] rounded-full h-5 w-[36%]` |
| `skeleton-line skeleton-text` | `h-[14px] rounded-full w-[86%]` |
| `skeleton-line skeleton-text short` | `h-[14px] rounded-full w-[36%]` |
| `skeleton-line skeleton-cell-head` | `h-[14px] rounded-full w-[80%] h-3` |
| `skeleton-line skeleton-cell` | `h-[14px] rounded-full w-full h-3` |
| `skeleton-line skeleton-cell short` | `h-[14px] rounded-full w-full h-3 w-[36%]` |
| `skeleton-line skeleton-label` | `h-[14px] rounded-full w-[42%] h-3` |
| `skeleton-input` | `w-full h-[42px] rounded-xl` |
| `skeleton-chart` | `w-full h-[150px] rounded-2xl` |
| `skeleton-chart portal-skeleton-chart-tall` | `w-full h-[150px] rounded-2xl h-[250px]` |
| `skeleton-chart portal-skeleton-chart-medium` | `w-full h-[150px] rounded-2xl h-[210px]` |
| `skeleton-table-bars` | `h-3 rounded-full` |
| `skeleton-table-bars short` | `h-3 rounded-full w-[65%]` |
| `portal-skeleton-fill` | `w-full h-full rounded-[inherit]` |
| `portal-skeleton-logout` | `w-[132px] h-12 rounded-2xl` |
| `portal-skeleton-toggle` | `w-[66px] h-9 rounded-full` |
| `portal-skeleton-page-title` (also has `skeleton-line`) | `h-[14px] rounded-full w-[min(340px,42vw)] h-[30px] mb-2.5` |
| `portal-skeleton-page-subtitle` (also has `skeleton-line`) | `h-[14px] rounded-full w-[min(520px,56vw)] h-4` |
| `portal-skeleton-header-action` | `w-[146px] h-[42px] rounded-xl` |
| `portal-skeleton-widget-bar` | `w-full h-5 rounded-full` |
| `portal-skeleton-timetable` | `w-full min-h-[220px] rounded-[18px]` |
| `portal-skeleton-hero-card` | `w-full min-h-[96px] rounded-[18px]` |
| `portal-skeleton-calendar` | `w-full min-h-[180px] rounded-[18px]` |
| `skeleton-line` (nav skeleton, plain) | `h-[14px] rounded-full` |
| `skeleton-line short` (nav skeleton, active) | `h-[14px] rounded-full w-[36%]` |

Full rewritten file:
```jsx
import React from "react";

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`skeleton-block relative overflow-hidden bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite] dark:bg-[linear-gradient(90deg,#1e293b_0%,#334155_50%,#1e293b_100%)] ${className}`.trim()}
    />
  );
}

function TableSkeleton({ rows = 5, columns = 4, className = "" }) {
  const rowStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };

  return (
    <div className={`table-wrap skeleton-table-wrap w-full max-w-full min-w-0 overflow-auto ${className}`.trim()}>
      <div className="table-skeleton-grid grid gap-2.5" role="presentation">
        <div className="table-skeleton-row table-skeleton-row-head mb-0.5 grid items-center gap-3" style={rowStyle}>
          {Array.from({ length: columns }, (_, index) => (
            <div key={`head-${index}`} className="table-skeleton-cell min-w-0">
              <SkeletonBlock className="skeleton-line skeleton-cell-head h-[14px] rounded-full w-[80%] h-3" />
            </div>
          ))}
        </div>

        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="table-skeleton-row grid items-center gap-3" style={rowStyle}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="table-skeleton-cell min-w-0">
                <SkeletonBlock
                  className={`skeleton-line skeleton-cell h-[14px] rounded-full w-full h-3${colIndex === 0 ? " short w-[36%]" : ""}`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterSkeleton({ fields = 6 }) {
  return (
    <div className="report-filter-grid grid grid-cols-4 gap-3.5 max-[992px]:grid-cols-2 max-[640px]:grid-cols-1">
      {Array.from({ length: fields }, (_, index) => (
        <div key={`filter-${index}`} className="field-label skeleton-filter-item pointer-events-none flex flex-col gap-2">
          <SkeletonBlock className="skeleton-line skeleton-label h-[14px] rounded-full w-[42%] h-3" />
          <SkeletonBlock className="skeleton-input w-full h-[42px] rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton({ variant = "faculty" }) {
  if (variant === "student") {
    return (
      <div className="dashboard-skeleton student mb-[18px]">
        <div className="dashboard-skeleton-stats mb-4 grid grid-cols-4 gap-4 max-[1024px]:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`student-stat-${index}`}
              className="dashboard-skeleton-card stat grid min-h-[112px] gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]"
            >
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
            </div>
          ))}
        </div>

        <div className="dashboard-skeleton-grid student-grid grid grid-cols-2 gap-[18px] max-[768px]:grid-cols-1">
          <div className="dashboard-skeleton-card schedule min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars short h-3 rounded-full w-[65%]" />
          </div>

          <div className="dashboard-skeleton-card attendance min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
          </div>

          <div className="dashboard-skeleton-card timetable min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
          </div>

          <div className="dashboard-skeleton-card actions min-h-[176px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
            <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
            <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
            <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          </div>

          <div className="dashboard-skeleton-card summary min-h-[176px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
            <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
            <SkeletonBlock className="skeleton-table-bars short h-3 rounded-full w-[65%]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-skeleton faculty mb-[18px]">
      <div className="dashboard-skeleton-grid grid grid-cols-2 gap-[18px] max-[768px]:grid-cols-1">
        <div className="dashboard-skeleton-card hero min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
          <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
          <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
        </div>
        <div className="dashboard-skeleton-card side min-h-[180px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
          <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
        </div>
        <div className="dashboard-skeleton-card chart min-h-[220px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
          <SkeletonBlock className="skeleton-chart w-full h-[150px] rounded-2xl" />
        </div>
        <div className="dashboard-skeleton-card table min-h-[180px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
          <SkeletonBlock className="skeleton-line skeleton-title h-[14px] rounded-full h-5 w-[58%]" />
          <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
          <SkeletonBlock className="skeleton-table-bars h-3 rounded-full" />
          <SkeletonBlock className="skeleton-table-bars short h-3 rounded-full w-[65%]" />
        </div>
      </div>
    </div>
  );
}

function FullScreenPortalSkeleton({ variant = "faculty" }) {
  return (
    <div className={`portal-shell portal-loading-screen ${variant} flex min-h-screen overflow-x-hidden bg-ui-bg dark:bg-ui-bg-dark max-[992px]:block`}>
      <aside className="portal-sidebar portal-sidebar-skeleton pointer-events-none fixed inset-y-0 left-0 z-[1200] flex w-[306px] flex-col gap-[18px] overflow-hidden bg-[linear-gradient(145deg,#fff_0%,#f8fafc_100%)] p-[22px_18px_26px] shadow-[2px_0_20px_rgba(0,0,0,0.06)] dark:bg-[linear-gradient(160deg,#111827_0%,#1f2937_100%)] dark:shadow-[2px_0_20px_rgba(0,0,0,0.35)] max-[992px]:relative max-[992px]:w-full max-[992px]:min-h-0 max-[992px]:rounded-b-[20px] max-[992px]:rounded-t-none">
        <div className="sidebar-brand mb-0.5 flex items-center gap-2.5 border-b border-slate-400/20 px-2.5 pb-4 pt-3.5">
          <div className="brand-mark portal-skeleton-square grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-2xl border border-blue-500/[0.18] bg-[linear-gradient(135deg,#f8fbff,#e6f0ff)] dark:border-blue-400/25 dark:bg-[linear-gradient(135deg,#151c2b,#273451)]">
            <SkeletonBlock className="portal-skeleton-fill w-full h-full rounded-[inherit]" />
          </div>
          <div className="portal-skeleton-copy grid flex-1 min-w-0 gap-2.5">
            <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
            <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          </div>
        </div>

        <div className="profile-section portal-skeleton-profile mx-0.5 mb-3 flex items-center gap-3 border-b border-slate-400/[0.24] px-3 pb-[18px] pt-4">
          <div className="profile-photo portal-skeleton-avatar grid h-[74px] w-[74px] flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_30%,#6a3f2c,#22130d_72%)]">
            <SkeletonBlock className="portal-skeleton-fill w-full h-full rounded-[inherit]" />
          </div>
          <div className="portal-skeleton-copy grid flex-1 min-w-0 gap-2.5">
            <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
            <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
          </div>
        </div>

        <div className="nav-links portal-skeleton-nav flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`nav-skeleton-${index}`}
              className={`nav-link portal-skeleton-nav-item flex items-center gap-3.5 rounded-2xl px-[18px] py-3.5 shadow-none ${
                index === 0 ? "active bg-[linear-gradient(135deg,rgba(77,152,219,0.2)_0%,rgba(45,126,210,0.18)_100%)]" : "bg-transparent"
              }`}
            >
              <span className="nav-icon portal-skeleton-icon inline-grid h-[22px] w-[22px] flex-shrink-0 place-items-center overflow-hidden rounded-lg">
                <SkeletonBlock className="portal-skeleton-fill w-full h-full rounded-[inherit]" />
              </span>
              <SkeletonBlock className={`h-[14px] rounded-full ${index === 0 ? "w-[56%]" : "w-[72%]"}`} />
            </div>
          ))}
        </div>

        <div className="sidebar-footer mt-auto">
          <div className="sidebar-footer-row portal-skeleton-footer flex items-center justify-between gap-3 border-t border-slate-400/[0.24] px-1 pb-0.5 pt-4">
            <SkeletonBlock className="portal-skeleton-logout w-[132px] h-12 rounded-2xl" />
            <SkeletonBlock className="portal-skeleton-toggle w-[66px] h-9 rounded-full" />
          </div>
        </div>
      </aside>

      <main className="portal-main portal-main-skeleton ml-[306px] w-[calc(100%-306px)] flex-1 p-[14px_18px_24px] max-[992px]:ml-0 max-[992px]:w-full">
        <header className="page-header portal-skeleton-header mb-5 flex items-start justify-between gap-4">
          <div className="page-heading portal-skeleton-heading flex items-center gap-3.5">
            <div>
              <SkeletonBlock className="skeleton-line portal-skeleton-page-title h-[14px] rounded-full w-[min(340px,42vw)] h-[30px] mb-2.5 max-[640px]:w-full" />
              <SkeletonBlock className="skeleton-line portal-skeleton-page-subtitle h-[14px] rounded-full w-[min(520px,56vw)] h-4 max-[640px]:w-full" />
            </div>
          </div>
          <SkeletonBlock className="portal-skeleton-header-action w-[146px] h-[42px] rounded-xl max-[640px]:w-full" />
        </header>

        <div className="portal-skeleton-dashboard grid gap-5 max-[640px]:gap-4">
          <div className="portal-skeleton-grid top grid grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] gap-5 max-[992px]:grid-cols-1">
            <div className="dashboard-skeleton-card portal-skeleton-card wide min-w-0 min-h-[322px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)] max-[640px]:min-h-0">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="portal-skeleton-timetable w-full min-h-[220px] rounded-[18px]" />
            </div>
            <div className="portal-skeleton-column grid gap-5">
              <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
                <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
                <SkeletonBlock className="portal-skeleton-hero-card w-full min-h-[96px] rounded-[18px]" />
              </div>
              <div className="portal-skeleton-grid compact grid grid-cols-2 gap-[18px]">
                <div className="dashboard-skeleton-card portal-skeleton-card compact min-w-0 min-h-[152px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)] max-[640px]:min-h-0">
                  <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
                  <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
                  <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
                </div>
                <div className="dashboard-skeleton-card portal-skeleton-card compact min-w-0 min-h-[152px] grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)] max-[640px]:min-h-0">
                  <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
                  <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
                  <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="portal-skeleton-grid middle grid grid-cols-2 gap-5 max-[992px]:grid-cols-1">
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-tall w-full h-[150px] rounded-2xl h-[250px]" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="skeleton-chart portal-skeleton-chart-medium w-full h-[150px] rounded-2xl h-[210px]" />
            </div>
          </div>

          <div className="portal-skeleton-grid bottom grid grid-cols-[1.05fr_0.8fr_1fr] gap-5 max-[992px]:grid-cols-1">
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="portal-skeleton-calendar w-full min-h-[180px] rounded-[18px]" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
              <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
              <SkeletonBlock className="skeleton-line skeleton-text short h-[14px] rounded-full w-[36%]" />
            </div>
            <div className="dashboard-skeleton-card portal-skeleton-card min-w-0 grid gap-3 rounded-[18px] border border-slate-400/[0.18] bg-ui-card p-[18px] shadow-[0_6px_20px_rgba(15,23,42,0.06)] dark:border-slate-600 dark:bg-ui-card-dark dark:shadow-[0_6px_20px_rgba(2,6,23,0.34)]">
              <SkeletonBlock className="skeleton-line skeleton-title short h-[14px] rounded-full h-5 w-[36%]" />
              <SkeletonBlock className="portal-skeleton-widget-bar w-full h-5 rounded-full" />
              <SkeletonBlock className="skeleton-line skeleton-text h-[14px] rounded-full w-[86%]" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { SkeletonBlock, TableSkeleton, FilterSkeleton, DashboardSkeleton, FullScreenPortalSkeleton };
```

- [ ] **Step 4: Verify manually**

Run `npm run dev`. To see skeleton states, throttle the network (devtools → Network → Slow 3G) and reload a page that uses `DashboardSkeleton`/`FullScreenPortalSkeleton` (e.g. log out and back in to trigger `AuthGate`'s "checking" state, or reload the faculty/student dashboard while the API call is pending). Check in both light and dark mode:
1. The shimmer animation plays smoothly across every skeleton block.
2. Skeleton card sizes/spacing match the real content layout underneath (no visible layout shift once real data loads).
3. `FullScreenPortalSkeleton` (the full-page loading state) matches the sidebar/topbar dimensions of the real `PageShell`.

Expected: no visible difference from the pre-Task-5 skeleton screens.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/styles/tailwind.css frontend/src/components/shared/Skeletons.jsx
git commit -m "feat: migrate skeleton components to Tailwind"
```

---

### Task 6: Final verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Confirm the diff is scoped as expected**

Run:
```bash
git diff main --stat
```
Expected: changes only under `frontend/src/components/`, `frontend/src/styles/tailwind.css`, `frontend/src/main.jsx`, `frontend/vite.config.js`, `frontend/package.json`, `frontend/package-lock.json`. No page file under `frontend/src/pages/` should appear.

- [ ] **Step 2: Full walkthrough**

Run `npm run dev`. For each of admin, faculty, and student roles:
1. Log in, confirm the sidebar/nav/topbar render correctly (`PageShell`).
2. Visit a page using `StatGrid` + `SectionCard` (e.g. `AdminDashboard`).
3. Visit a page using `SimpleTable` (e.g. `AdminTablePage`).
4. Visit a profile/settings page using `ProfileFields` + `FormGrid`.
5. Toggle dark mode on each page type; reload to confirm persistence.
6. Resize below 992px on each page type to confirm mobile sidebar/grid behavior.

Expected: every check passes with no visual regression versus the app's state before this plan started.

- [ ] **Step 3: Production build sanity check**

Run:
```bash
cd frontend && npm run build && npm run preview
```
Expected: build succeeds, preview server serves the app, spot-check the same walkthrough as Step 2 against the production build.
