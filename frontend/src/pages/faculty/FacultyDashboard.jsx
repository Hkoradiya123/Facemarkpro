import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaEye, FaEyeSlash, FaGear, FaHouse, FaLock, FaLockOpen, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay, FaRotateLeft
} from "react-icons/fa6";

import { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, persistAuth, useSessionProfile, isFacultyRole } from "../../utils/auth";
import { adminNav, facultyNav, studentNav, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, defaultFacultyWidgets, facultyWidgetCatalog, FACULTY_KEY, STUDENT_KEY, SIDEBAR_LOGO_URL, ResponsiveGridLayout } from "../../utils/constants";
import { normalizeFacultyLayout, getWidgetSizeClass } from "../../utils/constants";
import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid, DashboardSkeleton } from "../../components/Shared";
import FacultyWidgetCard from "./FacultyWidgetCard";

function FacultyDashboard() {
  const MOBILE_DASHBOARD_LOCK_KEY = "faculty_mobile_dashboard_locked";
  const profile = useSessionProfile("faculty");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [activeBreakpoint, setActiveBreakpoint] = useState("lg");
  const [isMobileLayoutLocked, setIsMobileLayoutLocked] = useState(() => {
    const stored = localStorage.getItem(MOBILE_DASHBOARD_LOCK_KEY);
    if (stored == null) return true;
    return stored !== "false";
  });
  const [dashboardData, setDashboardData] = useState({
    lectures: [],
    attendance_stats: { Present: 0, Absent: 0 },
    monthly_labels: [],
    monthly_data: [],
    subject_attendance: [],
    heatmap: { classrooms: [], rows: [] },
    students_list: [],
  });
  const dragSnapshotRef = useRef(null);

  const [widgets, setWidgets] = useState(() => {
    const saved = localStorage.getItem(FACULTY_DASHBOARD_KEY);
    if (!saved) return normalizeFacultyLayout(defaultFacultyWidgets);
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return normalizeFacultyLayout(parsed);
      if (parsed && Array.isArray(parsed.lg)) return normalizeFacultyLayout(parsed.lg);
      return normalizeFacultyLayout(defaultFacultyWidgets);
    } catch {
      return normalizeFacultyLayout(defaultFacultyWidgets);
    }
  });

  const [mobileWidgets, setMobileWidgets] = useState(() => {
    const saved = localStorage.getItem(FACULTY_DASHBOARD_KEY);
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.sm)) return normalizeFacultyLayout(parsed.sm);
      return [];
    } catch {
      return [];
    }
  });

  function buildMobileLayoutFromDesktop(layout) {
    const ordered = [...(layout || [])].sort((a, b) => {
      const rowDiff = Number(a.y || 0) - Number(b.y || 0);
      if (rowDiff !== 0) return rowDiff;
      return Number(a.x || 0) - Number(b.x || 0);
    });

    let nextY = 0;
    return ordered.map((item) => {
      const mobileItem = {
        i: item.i,
        x: 0,
        y: nextY,
        w: 6,
        minW: 6,
        maxW: 6,
        h: Math.max(2, Number(item.h || 3)),
        minH: Math.max(2, Number(item.minH || 2)),
      };
      nextY += mobileItem.h;
      return mobileItem;
    });
  }

  function normalizeMobileStack(layout) {
    const ordered = normalizeFacultyLayout(layout || []).sort((first, second) => {
      const rowDiff = Number(first.y || 0) - Number(second.y || 0);
      if (rowDiff !== 0) return rowDiff;
      return Number(first.x || 0) - Number(second.x || 0);
    });

    let nextY = 0;
    return ordered.map((item) => {
      const nextItem = {
        ...item,
        x: 0,
        y: nextY,
        w: 6,
        minW: 6,
        maxW: 6,
        h: Math.max(2, Number(item.h || 3)),
        minH: Math.max(2, Number(item.minH || 2)),
      };
      nextY += nextItem.h;
      return nextItem;
    });
  }
  function rectanglesOverlap(first, second) {
    return !(
      first.x + first.w <= second.x ||
      second.x + second.w <= first.x ||
      first.y + first.h <= second.y ||
      second.y + second.h <= first.y
    );
  }

  function buildOccupancyMap(layout) {
    const occupied = new Set();

    for (const item of normalizeFacultyLayout(layout || [])) {
      const startX = Math.max(0, Number(item.x || 0));
      const startY = Math.max(0, Number(item.y || 0));
      const width = Math.max(1, Number(item.w || 1));
      const height = Math.max(1, Number(item.h || 1));

      for (let y = startY; y < startY + height; y += 1) {
        for (let x = startX; x < startX + width; x += 1) {
          occupied.add(`${x}:${y}`);
        }
      }
    }

    return occupied;
  }

  function canPlaceAt(occupancy, candidate, cols = FACULTY_GRID_COLS) {
    const width = Math.max(1, Number(candidate.w || 1));
    const height = Math.max(1, Number(candidate.h || 1));
    const startX = Math.max(0, Number(candidate.x || 0));
    const startY = Math.max(0, Number(candidate.y || 0));

    if (startX + width > cols) return false;

    for (let y = startY; y < startY + height; y += 1) {
      for (let x = startX; x < startX + width; x += 1) {
        if (occupancy.has(`${x}:${y}`)) {
          return false;
        }
      }
    }

    return true;
  }

  function markOccupied(occupancy, item) {
    const startX = Math.max(0, Number(item.x || 0));
    const startY = Math.max(0, Number(item.y || 0));
    const width = Math.max(1, Number(item.w || 1));
    const height = Math.max(1, Number(item.h || 1));

    for (let y = startY; y < startY + height; y += 1) {
      for (let x = startX; x < startX + width; x += 1) {
        occupancy.add(`${x}:${y}`);
      }
    }
  }

  function buildSearchCandidates(preferred, width, height, cols, maxY) {
    const candidates = [];
    const seen = new Set();
    const normalizedWidth = Math.max(1, Math.min(Number(width || 1), cols));

    const pushCandidate = (x, y) => {
      const nextX = Math.max(0, Math.min(Number(x || 0), cols - normalizedWidth));
      const nextY = Math.max(0, Number(y || 0));
      const key = `${nextX}:${nextY}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ x: nextX, y: nextY });
    };

    for (const anchor of preferred || []) {
      if (!anchor) continue;
      const anchorX = Number(anchor.x || 0);
      const anchorY = Number(anchor.y || 0);

      pushCandidate(anchorX, anchorY);

      for (let dy = 0; dy <= 8; dy += 1) {
        for (let dx = 0; dx <= cols; dx += 1) {
          pushCandidate(anchorX - dx, anchorY + dy);
          pushCandidate(anchorX + dx, anchorY + dy);
          if (dy > 0) {
            pushCandidate(anchorX - dx, anchorY - dy);
            pushCandidate(anchorX + dx, anchorY - dy);
          }
        }
      }
    }

    for (let y = 0; y <= maxY + Math.max(8, Number(height || 1)); y += 1) {
      for (let x = 0; x <= cols - normalizedWidth; x += 1) {
        pushCandidate(x, y);
      }
    }

    return candidates;
  }

  function findFirstAvailablePosition(layout, width, height, cols = FACULTY_GRID_COLS, options = {}) {
    const normalizedWidth = Math.max(1, Math.min(Number(width || 1), cols));
    const normalizedHeight = Math.max(1, Number(height || 1));
    const occupied = normalizeFacultyLayout(layout || []);
    const maxY = occupied.reduce((max, item) => Math.max(max, Number(item.y || 0) + Number(item.h || 0)), 0);
    const occupancy = buildOccupancyMap(occupied);
    const candidates = buildSearchCandidates(options.preferred, normalizedWidth, normalizedHeight, cols, maxY);

    for (const point of candidates) {
      const candidate = { x: point.x, y: point.y, w: normalizedWidth, h: normalizedHeight };
      if (canPlaceAt(occupancy, candidate, cols)) {
        return { x: point.x, y: point.y };
      }
    }

    return { x: 0, y: maxY };
  }

  function compactVertically(layout, cols = FACULTY_GRID_COLS) {
    const ordered = normalizeFacultyLayout(layout || []).sort((first, second) => {
      const rowDiff = Number(first.y || 0) - Number(second.y || 0);
      if (rowDiff !== 0) return rowDiff;
      return Number(first.x || 0) - Number(second.x || 0);
    });
    const occupancy = new Set();
    const compacted = [];

    for (const item of ordered) {
      const normalized = {
        ...item,
        x: Math.max(0, Math.min(Number(item.x || 0), cols - Number(item.w || 1))),
        y: Math.max(0, Number(item.y || 0)),
      };

      let bestY = normalized.y;
      for (let nextY = 0; nextY <= normalized.y; nextY += 1) {
        const candidate = { ...normalized, y: nextY };
        if (canPlaceAt(occupancy, candidate, cols)) {
          bestY = nextY;
          break;
        }
      }

      const placed = { ...normalized, y: bestY };
      compacted.push(placed);
      markOccupied(occupancy, placed);
    }

    return normalizeFacultyLayout(compacted);
  }

  function restoreLayoutAroundMovedWidget(previousLayout, movedWidget, cols = FACULTY_GRID_COLS) {
    const prior = normalizeFacultyLayout(previousLayout || []);
    const moved = prior.find((item) => item.i === movedWidget?.i);
    if (!movedWidget || !moved) {
      return normalizeFacultyLayout(previousLayout || []);
    }

    const nextMoved = {
      ...moved,
      ...movedWidget,
      x: Math.max(0, Math.min(Number(movedWidget.x || 0), cols - Number(movedWidget.w || moved.w || 1))),
      y: Math.max(0, Number(movedWidget.y || 0)),
    };

    const occupied = [nextMoved];
    const remaining = prior
      .filter((item) => item.i !== nextMoved.i)
      .sort((first, second) => {
        const rowDiff = Number(first.y || 0) - Number(second.y || 0);
        if (rowDiff !== 0) return rowDiff;
        return Number(first.x || 0) - Number(second.x || 0);
      });

    for (const item of remaining) {
      const original = {
        ...item,
        x: Math.max(0, Math.min(Number(item.x || 0), cols - Number(item.w || 1))),
        y: Math.max(0, Number(item.y || 0)),
      };
      const collidesAtOriginal = occupied.some((placed) => rectanglesOverlap(original, placed));

      if (!collidesAtOriginal) {
        occupied.push(original);
        continue;
      }

      const fallback = findFirstAvailablePosition(
        occupied,
        Number(original.w || 1),
        Number(original.h || 1),
        cols,
        {
          preferred: [
            { x: original.x, y: original.y },
            { x: nextMoved.x, y: original.y },
            { x: original.x, y: nextMoved.y + nextMoved.h },
          ],
        }
      );
      occupied.push({
        ...original,
        x: fallback.x,
        y: fallback.y,
      });
    }

    return compactVertically(occupied, cols);
  }

  useEffect(() => {
    if (!mobileWidgets.length && widgets.length) {
      setMobileWidgets(buildMobileLayoutFromDesktop(widgets));
    }
  }, [widgets]);

  useEffect(() => {
    const payload = {
      lg: widgets,
      sm: mobileWidgets,
    };
    localStorage.setItem(FACULTY_DASHBOARD_KEY, JSON.stringify(payload));
  }, [widgets, mobileWidgets]);

  useEffect(() => {
    localStorage.setItem(MOBILE_DASHBOARD_LOCK_KEY, isMobileLayoutLocked ? "true" : "false");
  }, [isMobileLayoutLocked]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const [dashboardResponse, layoutResponse] = await Promise.all([
          fetch(apiUrl("/api/faculty/dashboard"), {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
          fetch(apiUrl("/api/faculty/dashboard/layout"), {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
        ]);

        const payload = await dashboardResponse.json().catch(() => ({}));
        const layoutPayload = await layoutResponse.json().catch(() => ({}));
        if (!mounted) return;

        if (layoutResponse.ok && layoutPayload.success) {
          const desktop = normalizeFacultyLayout(layoutPayload.desktop_layout || []);
          const mobile = normalizeFacultyLayout(layoutPayload.mobile_layout || []);

          if (desktop.length) {
            setWidgets(desktop);
            setMobileWidgets(mobile.length ? mobile : buildMobileLayoutFromDesktop(desktop));
          }
        }

        if (!dashboardResponse.ok || !payload.success) {
          setLayoutReady(true);
          return;
        }

        setDashboardData({
          lectures: payload.lectures || [],
          attendance_stats: payload.attendance_stats || { Present: 0, Absent: 0 },
          monthly_labels: payload.monthly_labels || [],
          monthly_data: payload.monthly_data || [],
          subject_attendance: payload.subject_attendance || [],
          heatmap: payload.heatmap || { classrooms: [], rows: [] },
          students_list: payload.students_list || [],
        });
        setLayoutReady(true);
      } catch {
        setLayoutReady(true);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const availableWidgets = facultyWidgetCatalog.filter(
    (widget) => !widgets.some((activeWidget) => activeWidget.i === widget.id)
  );

  const handleAddWidget = (widget) => {
    const nextDesktopPosition = findFirstAvailablePosition(widgets, widget.size.w, widget.size.h, FACULTY_GRID_COLS, {
      preferred: [{ x: 0, y: 0 }],
    });
    const nextMobileY = mobileWidgets.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    const nextDesktop = [
      ...widgets,
      {
        i: widget.id,
        x: nextDesktopPosition.x,
        y: nextDesktopPosition.y,
        w: widget.size.w,
        minW: Number(widget.minSize?.w || 1),
        minH: Number(widget.minSize?.h || 1),
        h: widget.size.h,
      },
    ];

    const nextMobile = [
      ...mobileWidgets,
      {
        i: widget.id,
        x: 0,
        y: nextMobileY,
        w: 6,
        minW: 6,
        maxW: 6,
        minH: Math.max(2, Number(widget.minSize?.h || widget.size.h || 3)),
        h: Math.max(2, Number(widget.size.h || 3)),
      },
    ];

    setWidgets(compactVertically(nextDesktop, FACULTY_GRID_COLS));
    setMobileWidgets(normalizeMobileStack(nextMobile));
    setIsPickerOpen(false);
  };

  const handleRemoveWidget = (widgetId) => {
    setWidgets((current) => compactVertically(current.filter((widget) => widget.i !== widgetId), FACULTY_GRID_COLS));
    setMobileWidgets((current) => normalizeMobileStack(current.filter((widget) => widget.i !== widgetId)));
  };

  const handleResetLayout = () => {
    const defaultDesktop = normalizeFacultyLayout(defaultFacultyWidgets);
    const defaultMobile = buildMobileLayoutFromDesktop(defaultDesktop);
    setWidgets(defaultDesktop);
    setMobileWidgets(defaultMobile);
    setIsPickerOpen(false);
  };

  const isMobileBreakpoint = activeBreakpoint === "sm" || activeBreakpoint === "xs" || activeBreakpoint === "xxs";

  const orderedMobileWidgetIds = useMemo(
    () => normalizeMobileStack(mobileWidgets).map((item) => item.i),
    [mobileWidgets]
  );

  const mobileOrderIndexMap = useMemo(() => {
    const map = new Map();
    orderedMobileWidgetIds.forEach((id, index) => {
      map.set(id, index);
    });
    return map;
  }, [orderedMobileWidgetIds]);

  const gridClassName =
    "faculty-widget-grid" + (isMobileBreakpoint && !isMobileLayoutLocked ? " mobile-unlocked" : " mobile-locked");

  const moveMobileWidget = (widgetId, direction) => {
    const ordered = normalizeMobileStack(mobileWidgets);
    const fromIndex = ordered.findIndex((item) => item.i === widgetId);
    if (fromIndex < 0) return;

    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= ordered.length) return;

    const next = [...ordered];
    const [moving] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moving);
    setMobileWidgets(normalizeMobileStack(next));
  };

  useEffect(() => {
    if (!layoutReady) return;

    const timer = setTimeout(async () => {
      try {
        await fetch(apiUrl("/api/faculty/dashboard/layout"), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            desktop_layout: widgets,
            mobile_layout: mobileWidgets,
          }),
        });
      } catch {
        // keep local fallback when API is unavailable
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [widgets, mobileWidgets, layoutReady]);

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title="Faculty Dashboard"
      subtitle="React version of the faculty dashboard shell and its core widgets."
      profile={profile}
      actions={
        <Fragment>
          <button
            className="pagination-btn"
            type="button"
            onClick={() => setIsMobileLayoutLocked((current) => !current)}
          >
            {isMobileLayoutLocked ? <FaLock /> : <FaLockOpen />} {isMobileLayoutLocked ? "Locked" : "Unlocked"}
          </button>
          <button className="pagination-btn" type="button" onClick={handleResetLayout}>
            <FaRotateLeft /> Reset Layout
          </button>
        </Fragment>
      }
      sidebarAction={
        <button className="widget-add-trigger" type="button" onClick={() => setIsPickerOpen(true)}>
          <FaPlus />
        </button>
      }
    >
      {!layoutReady ? <DashboardSkeleton /> : null}
      <ResponsiveGridLayout
        className={gridClassName}
        layouts={{ lg: widgets, sm: mobileWidgets }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 560, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 6, xxs: 6 }}
        rowHeight={68}
        margin={[18, 18]}
        containerPadding={[0, 0]}
        draggableHandle={isMobileBreakpoint ? ".faculty-widget-card" : ".widget-drag-handle"}
        draggableCancel=".widget-remove-btn, .widget-add-trigger, button, input, textarea, select, a, .calendar-day-btn, .calendar-arrow"
        isDraggable={!isMobileBreakpoint || !isMobileLayoutLocked}
        isResizable={!isMobileBreakpoint || !isMobileLayoutLocked}
        resizeHandles={isMobileBreakpoint ? ["s"] : ["se"]}
        onDragStart={(_layout, oldItem) => {
          dragSnapshotRef.current = {
            desktop: normalizeFacultyLayout(widgets),
            mobile: normalizeFacultyLayout(mobileWidgets),
            widgetId: oldItem?.i || "",
          };
        }}
        onBreakpointChange={(breakpoint) => {
          setActiveBreakpoint(breakpoint || "lg");
        }}
        onDragStop={(currentLayout, _oldItem, newItem) => {
          const snapshot = dragSnapshotRef.current;

          if (!snapshot) {
            dragSnapshotRef.current = null;
            return;
          }

          const isDesktop = activeBreakpoint === "lg" || activeBreakpoint === "md";
          const movedItem =
            normalizeFacultyLayout(currentLayout || []).find((item) => item.i === snapshot.widgetId) ||
            newItem ||
            (isDesktop ? widgets : mobileWidgets).find((item) => item.i === snapshot.widgetId);

          if (!movedItem?.i) {
            dragSnapshotRef.current = null;
            return;
          }

          if (isDesktop) {
            const restoredDesktop = restoreLayoutAroundMovedWidget(snapshot.desktop, movedItem, FACULTY_GRID_COLS);
            setWidgets(restoredDesktop);
            setMobileWidgets((current) => (current.length ? normalizeMobileStack(current) : buildMobileLayoutFromDesktop(restoredDesktop)));
          } else {
            // Mobile UX: keep other cards stable while dragging, then reorder/stack cleanly on drop.
            const dropped = normalizeFacultyLayout(currentLayout || []).find((item) => item.i === snapshot.widgetId) || movedItem;
            const merged = (snapshot.mobile || []).map((item) =>
              item.i === snapshot.widgetId
                ? {
                    ...item,
                    ...dropped,
                    x: 0,
                    w: 6,
                    minW: 6,
                    maxW: 6,
                    h: Math.max(2, Number((dropped && dropped.h) || item.h || 3)),
                  }
                : { ...item, x: 0, w: 6, minW: 6, maxW: 6 }
            );
            setMobileWidgets(normalizeMobileStack(merged));
          }

          dragSnapshotRef.current = null;
        }}
        onLayoutChange={(layout, allLayouts) => {
          if (dragSnapshotRef.current) {
            return;
          }
          const desktop = normalizeFacultyLayout((allLayouts && allLayouts.lg) || widgets);
          const mobile = normalizeFacultyLayout(
            (allLayouts && (allLayouts.sm || allLayouts.xs || allLayouts.xxs)) || mobileWidgets
          );

          setWidgets(compactVertically(desktop, FACULTY_GRID_COLS));
          setMobileWidgets(mobile.length ? normalizeMobileStack(mobile) : buildMobileLayoutFromDesktop(desktop));
        }}
        compactType={null}
        preventCollision={false}
      >
        {widgets.map((widget) => (
          <div
            key={widget.i}
            style={!layoutReady ? { display: "none" } : undefined}
            className={isMobileBreakpoint && isMobileLayoutLocked ? "mobile-locked-item" : undefined}
          >
            <FacultyWidgetCard
              widget={widget}
              onRemove={handleRemoveWidget}
              data={dashboardData}
              showMoveControls={isMobileBreakpoint && isMobileLayoutLocked}
              canMoveUp={(mobileOrderIndexMap.get(widget.i) ?? 0) > 0}
              canMoveDown={(mobileOrderIndexMap.get(widget.i) ?? -1) >= 0 && (mobileOrderIndexMap.get(widget.i) ?? -1) < orderedMobileWidgetIds.length - 1}
              onMoveUp={() => moveMobileWidget(widget.i, "up")}
              onMoveDown={() => moveMobileWidget(widget.i, "down")}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {isPickerOpen ? (
        <div className="widget-picker-overlay" onClick={() => setIsPickerOpen(false)} aria-hidden="true">
          <div className="widget-picker-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Add Widgets</h2>
            <p>Select widgets to add to your dashboard</p>
            <div className="widget-picker-grid">
              {facultyWidgetCatalog.map((widget) => {
                const isAdded = !availableWidgets.some((available) => available.id === widget.id);
                return (
                  <button
                    key={widget.id}
                    type="button"
                    className={`widget-picker-item${isAdded ? " disabled" : ""}`}
                    onClick={() => !isAdded && handleAddWidget(widget)}
                    disabled={isAdded}
                  >
                    <span className="widget-picker-icon">{widget.icon}</span>
                    <strong>{widget.title}</strong>
                  </button>
                );
              })}
            </div>
            <button className="widget-picker-close" type="button" onClick={() => setIsPickerOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default FacultyDashboard;
