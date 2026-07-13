import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../utils/auth";

const DEFAULT_DRAFT = {
  title: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  repeat: "none",
};

function parseDateParts(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function toDateNumber(dateKey) {
  const parts = parseDateParts(dateKey);
  if (!parts) return Number.NaN;
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function toTimeSortValue(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatEventTime(eventItem) {
  const start = String(eventItem?.startTime || "").trim();
  const end = String(eventItem?.endTime || "").trim();
  if (!start && !end) return eventItem?.time || "No time";
  if (start && end) return `${start} - ${end}`;
  return start || end;
}

function getRepeatLabel(value) {
  switch (value) {
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Does not repeat";
  }
}

function normalizeStoredEvents(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        const dateKey = String(item?.dateKey || "").trim();
        if (!dateKey) return null;
        return {
          id: String(item.id || `evt_${Date.now()}_${index}`),
          dateKey,
          title: String(item.title || "").trim(),
          startTime: String(item.startTime || item.time || "").trim(),
          endTime: String(item.endTime || "").trim(),
          location: String(item.location || "").trim(),
          description: String(item.description || "").trim(),
          repeat: ["weekly", "monthly", "yearly"].includes(item.repeat) ? item.repeat : "none",
          createdAt: item.createdAt || new Date().toISOString(),
        };
      })
      .filter(Boolean);
  }

  if (!raw || typeof raw !== "object") {
    return [];
  }

  const migrated = [];
  Object.entries(raw).forEach(([dateKey, list]) => {
    if (!Array.isArray(list)) return;
    list.forEach((item, index) => {
      migrated.push({
        id: String(item?.id || `evt_${Date.now()}_${dateKey}_${index}`),
        dateKey,
        title: String(item?.title || "").trim(),
        startTime: String(item?.startTime || item?.time || "").trim(),
        endTime: String(item?.endTime || "").trim(),
        location: String(item?.location || "").trim(),
        description: String(item?.description || "").trim(),
        repeat: ["weekly", "monthly", "yearly"].includes(item?.repeat) ? item.repeat : "none",
        createdAt: item?.createdAt || new Date().toISOString(),
      });
    });
  });
  return migrated;
}

function eventOccursOnDate(eventItem, dateKey) {
  const eventDate = parseDateParts(eventItem?.dateKey);
  const targetDate = parseDateParts(dateKey);
  if (!eventDate || !targetDate) return false;

  const baseNumber = toDateNumber(eventItem.dateKey);
  const targetNumber = toDateNumber(dateKey);
  if (!Number.isFinite(baseNumber) || !Number.isFinite(targetNumber) || targetNumber < baseNumber) {
    return false;
  }

  const repeat = eventItem.repeat || "none";
  if (repeat === "none") {
    return eventItem.dateKey === dateKey;
  }

  if (repeat === "weekly") {
    const diffDays = Math.round((targetNumber - baseNumber) / 86400000);
    const baseWeekday = new Date(baseNumber).getUTCDay();
    const targetWeekday = new Date(targetNumber).getUTCDay();
    return baseWeekday === targetWeekday && diffDays % 7 === 0;
  }

  if (repeat === "monthly") {
    return eventDate.day === targetDate.day;
  }

  if (repeat === "yearly") {
    return eventDate.day === targetDate.day && eventDate.month === targetDate.month;
  }

  return false;
}

function MiniCalendarWidget({ sizeClass }) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [editingEventId, setEditingEventId] = useState(null);
  const [activeEventId, setActiveEventId] = useState(null);
  const [draft, setDraft] = useState(DEFAULT_DRAFT);
  const [events, setEvents] = useState([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarBusy, setCalendarBusy] = useState(false);

  async function loadCloudEvents() {
    try {
      const response = await fetch(apiUrl("/api/faculty/calendar/events"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        setCalendarError(payload.message || "Failed to load calendar events.");
        return;
      }
      setCalendarError("");
      setEvents(normalizeStoredEvents(payload.events || []));
    } catch {
      setCalendarError("Network error while loading calendar events.");
    }
  }

  useEffect(() => {
    loadCloudEvents();
  }, []);

  useEffect(() => {
    if (!isEditorOpen) return undefined;
    try {
      document.body.style.overflow = "hidden";
    } catch {
      // no-op
    }
    return () => {
      try {
        document.body.style.overflow = "";
      } catch {
        // no-op
      }
    };
  }, [isEditorOpen]);

  const monthLabel = viewDate.toLocaleString("en-US", { month: "short", year: "numeric" });
  const weekdayLabels = sizeClass === "tiny" ? ["S", "M", "T", "W", "T", "F", "S"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const padTail = (7 - ((firstWeekday + daysInMonth) % 7)) % 7;
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ...Array.from({ length: padTail }, () => null),
  ];

  const formatDateKey = (year, month, day) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  const eventsForDate = useMemo(() => {
    const cache = new Map();

    return (dateKey) => {
      if (!cache.has(dateKey)) {
        const matching = events
          .filter((item) => eventOccursOnDate(item, dateKey))
          .sort((first, second) => toTimeSortValue(first.startTime) - toTimeSortValue(second.startTime));
        cache.set(dateKey, matching);
      }
      return cache.get(dateKey) || [];
    };
  }, [events]);

  const isToday = (day) =>
    day === today.getDate() &&
    viewDate.getMonth() === today.getMonth() &&
    viewDate.getFullYear() === today.getFullYear();

  const openDayEditor = (day) => {
    const key = formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), day);
    setIsEditorOpen(true);
    setSelectedDateKey(key);
    setEditingEventId(null);
    setActiveEventId(null);
    setDraft(DEFAULT_DRAFT);
    setCalendarError("");
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setSelectedDateKey("");
    setEditingEventId(null);
    setActiveEventId(null);
    setDraft(DEFAULT_DRAFT);
  };

  useEffect(() => {
    if (!isEditorOpen) return undefined;
    const onEscape = (event) => {
      if (event.key === "Escape") {
        closeEditor();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isEditorOpen]);

  const selectedEvents = isEditorOpen && selectedDateKey ? eventsForDate(selectedDateKey) : [];
  const activeEvent = selectedEvents.find((item) => item.id === activeEventId) || null;

  const saveEvent = () => {
    if (!selectedDateKey || calendarBusy) return;
    const title = String(draft.title || "").trim();
    if (!title) return;

    const payload = {
      dateKey: selectedDateKey,
      title,
      startTime: String(draft.startTime || "").trim(),
      endTime: String(draft.endTime || "").trim(),
      location: String(draft.location || "").trim(),
      description: String(draft.description || "").trim(),
      repeat: draft.repeat || "none",
    };

    setCalendarBusy(true);
    setCalendarError("");
    (async () => {
      try {
        const response = await fetch(
          editingEventId ? apiUrl(`/api/faculty/calendar/events/${editingEventId}`) : apiUrl("/api/faculty/calendar/events"),
          {
            method: editingEventId ? "PUT" : "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          setCalendarError(result.message || "Unable to save event.");
          return;
        }

        await loadCloudEvents();
        setEditingEventId(null);
        setActiveEventId(null);
        setDraft(DEFAULT_DRAFT);
      } catch {
        setCalendarError("Network error while saving event.");
      } finally {
        setCalendarBusy(false);
      }
    })();
  };

  const startEdit = (eventItem) => {
    setEditingEventId(eventItem.id);
    setActiveEventId(eventItem.id);
    setDraft({
      title: eventItem.title || "",
      startTime: eventItem.startTime || "",
      endTime: eventItem.endTime || "",
      location: eventItem.location || "",
      description: eventItem.description || "",
      repeat: eventItem.repeat || "none",
    });
  };

  const removeEvent = (eventId) => {
    if (calendarBusy) return;
    setCalendarBusy(true);
    setCalendarError("");
    (async () => {
      try {
        const response = await fetch(apiUrl(`/api/faculty/calendar/events/${eventId}`), {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) {
          setCalendarError(result.message || "Unable to delete event.");
          return;
        }

        await loadCloudEvents();
        setActiveEventId((current) => (current === eventId ? null : current));
        if (editingEventId === eventId) {
          setEditingEventId(null);
          setDraft(DEFAULT_DRAFT);
        }
      } catch {
        setCalendarError("Network error while deleting event.");
      } finally {
        setCalendarBusy(false);
      }
    })();
  };

  const shiftMonth = (direction) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const selectedDateLabel = selectedDateKey
    ? new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={`calendar-card ${sizeClass} relative flex h-full min-h-0 min-w-0 flex-col`}>
      <div className="calendar-top mb-2 grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
        <span className="calendar-mini-icon text-[clamp(9px,0.9vw,11px)] text-slate-500 dark:text-sky-300">{sizeClass === "tiny" ? "C" : "Cal"}</span>
        <strong className="text-center text-[clamp(11px,1.1vw,14px)] text-blue-600 dark:text-sky-300">{monthLabel}</strong>
        <div className="calendar-top-actions flex items-center gap-2">
          <span className="today-chip inline-grid h-[clamp(20px,2vw,24px)] min-w-[clamp(20px,2vw,24px)] place-items-center rounded-md border border-blue-400 bg-blue-400/[0.08] text-[clamp(9px,0.9vw,12px)] text-blue-400 dark:border-sky-300/45 dark:bg-sky-400/[0.12] dark:text-sky-300">{today.getDate()}</span>
          <button
            type="button"
            className="calendar-arrow cursor-pointer border-0 bg-transparent p-[0_2px] text-[clamp(11px,1vw,14px)] text-blue-400 transition-[transform,color,opacity] duration-[160ms] hover:-translate-y-px hover:scale-[1.08] hover:text-blue-600 active:scale-[0.94] dark:text-sky-300"
            onClick={() => shiftMonth(-1)}
          >
            {"<"}
          </button>
          <button
            type="button"
            className="calendar-arrow cursor-pointer border-0 bg-transparent p-[0_2px] text-[clamp(11px,1vw,14px)] text-blue-400 transition-[transform,color,opacity] duration-[160ms] hover:-translate-y-px hover:scale-[1.08] hover:text-blue-600 active:scale-[0.94] dark:text-sky-300"
            onClick={() => shiftMonth(1)}
          >
            {">"}
          </button>
        </div>
      </div>
      <div className="mini-calendar relative grid flex-1 grid-cols-7 items-center gap-[10px_6px]">
        {weekdayLabels.map((day, index) => (
          <strong key={`day-${index}-${day}`} className="rounded-full p-[4px_0] text-center text-[clamp(8px,0.8vw,11px)] font-medium text-slate-500 dark:text-slate-400">{day}</strong>
        ))}
        {cells.map((day, index) =>
          day ? (
            (() => {
              const dateKey = formatDateKey(viewDate.getFullYear(), viewDate.getMonth(), day);
              const dayEvents = eventsForDate(dateKey);
              const firstEvent = dayEvents[0];
              const hoverText = firstEvent
                ? `${firstEvent.title}${dayEvents.length > 1 ? ` (+${dayEvents.length - 1} more)` : ""}`
                : "";
              const today_ = isToday(day);
              return (
                <button
                  key={`${dateKey}-${index}`}
                  type="button"
                  className={`calendar-day-btn${today_ ? " today" : ""}${dayEvents.length ? " has-event" : ""} group relative grid min-h-[clamp(24px,3vw,34px)] cursor-pointer place-items-center rounded-full border-0 bg-transparent p-[4px_0] text-[clamp(9px,1vw,13px)] text-slate-700 transition-[background,color,transform] duration-[180ms] hover:-translate-y-px hover:bg-blue-400/[0.16] dark:text-slate-300 dark:hover:bg-sky-400/[0.18] ${
                    today_ ? "!h-[clamp(28px,4vw,52px)] !w-[clamp(28px,4vw,52px)] justify-self-center !bg-[#53a7ff] !text-white dark:!bg-sky-400 dark:!text-[#062033]" : ""
                  } ${dayEvents.length ? "shadow-[inset_0_0_0_1px_rgba(77,160,255,0.4)] dark:shadow-[inset_0_0_0_1px_rgba(125,211,252,0.45)]" : ""}`}
                  onClick={() => openDayEditor(day)}
                >
                  <span>{day}</span>
                  {dayEvents.length ? (
                    <em className="calendar-event-pill absolute -right-1 -top-0.5 h-3.5 min-w-[14px] rounded-full bg-red-500 p-[0_4px] text-[9px] not-italic leading-[14px] text-white">{dayEvents.length}</em>
                  ) : null}
                  {hoverText ? (
                    <i className="calendar-hover-tip pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-10 min-w-[120px] max-w-[min(210px,70vw)] -translate-x-1/2 translate-y-1 rounded-lg border border-slate-400/[0.22] bg-slate-900/92 p-[6px_8px] text-left text-[11px] not-italic leading-[1.25] text-[#f8fafc] opacity-0 shadow-[0_10px_22px_rgba(2,6,23,0.28)] transition-[opacity,transform] duration-[140ms] group-hover:translate-y-0 group-hover:opacity-100 dark:border-slate-600/80 dark:bg-slate-950/95">
                      {hoverText}
                    </i>
                  ) : null}
                </button>
              );
            })()
          ) : (
            <span key={`blank-${index}`} className="calendar-day-empty rounded-full p-[4px_0] text-center opacity-25" />
          )
        )}
      </div>

      {isEditorOpen && selectedDateKey
        ? createPortal(
            <div
              className="calendar-event-overlay fixed inset-0 z-[3200] grid place-items-start justify-items-center bg-slate-950/50 p-[32px_14px_20px]"
              aria-hidden="true"
              onMouseDown={closeEditor}
            >
              <div
                className="calendar-event-modal flex max-h-[calc(100vh-64px)] w-[min(560px,calc(100vw-24px))] flex-col gap-3 overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white p-3.5 shadow-[0_20px_50px_rgba(15,23,42,0.24)] dark:border-slate-600 dark:bg-slate-900"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="calendar-event-head sticky top-0 z-[1] flex items-center justify-between gap-2.5 bg-inherit pb-0.5">
                  <h4 className="m-0 text-slate-900 dark:text-slate-200">{selectedDateLabel}</h4>
                  <button
                    type="button"
                    className="calendar-event-close h-[30px] w-[30px] cursor-pointer rounded-full border-0 bg-red-500/[0.16] text-red-700"
                    onClick={closeEditor}
                    aria-label="Close calendar popup"
                  >
                    x
                  </button>
                </div>

                <div className="calendar-event-form grid min-w-0 gap-2">
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Event title"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-slate-50 p-[11px_12px] text-slate-900 focus:border-blue-500/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-slate-200 dark:focus:border-sky-300/60 dark:focus:bg-[#0f172a] dark:focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)]"
                  />
                  <div className="calendar-event-time-row grid grid-cols-2 gap-2.5">
                    <label className="calendar-event-field grid gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-400">Start Time</span>
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                        className="w-full min-h-[46px] rounded-xl border border-[#cbd5e1] bg-slate-50 p-[11px_12px] font-semibold tracking-[0.02em] text-slate-900 [color-scheme:light] focus:border-blue-500/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-slate-200 dark:[color-scheme:dark] dark:focus:border-sky-300/60 dark:focus:bg-[#0f172a] dark:focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:brightness-125 dark:[&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </label>
                    <label className="calendar-event-field grid gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-400">End Time</span>
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                        className="w-full min-h-[46px] rounded-xl border border-[#cbd5e1] bg-slate-50 p-[11px_12px] font-semibold tracking-[0.02em] text-slate-900 [color-scheme:light] focus:border-blue-500/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-slate-200 dark:[color-scheme:dark] dark:focus:border-sky-300/60 dark:focus:bg-[#0f172a] dark:focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:brightness-125 dark:[&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </label>
                  </div>
                  <label className="calendar-event-field grid gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-400">Repeat</span>
                    <select
                      value={draft.repeat}
                      onChange={(event) => setDraft((current) => ({ ...current, repeat: event.target.value }))}
                      className="w-full appearance-none rounded-xl border border-[#cbd5e1] bg-slate-50 p-[11px_12px] pr-3 text-slate-900 [background-image:none] focus:border-blue-500/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-slate-200 dark:focus:border-sky-300/60 dark:focus:bg-[#0f172a] dark:focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)]"
                    >
                      <option value="none">Does not repeat</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>
                  <input
                    value={draft.location}
                    onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Location"
                    className="w-full rounded-xl border border-[#cbd5e1] bg-slate-50 p-[11px_12px] text-slate-900 focus:border-blue-500/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-slate-200 dark:focus:border-sky-300/60 dark:focus:bg-[#0f172a] dark:focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)]"
                  />
                  <textarea
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Description"
                    rows={3}
                    className="w-full rounded-xl border border-[#cbd5e1] bg-slate-50 p-[11px_12px] text-slate-900 focus:border-blue-500/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] focus:outline-none dark:border-slate-600 dark:bg-[#111827] dark:text-slate-200 dark:focus:border-sky-300/60 dark:focus:bg-[#0f172a] dark:focus:shadow-[0_0_0_4px_rgba(56,189,248,0.14)]"
                  />
                  <button
                    type="button"
                    className="calendar-save-btn cursor-pointer rounded-lg border-0 bg-[#0284c7] p-[10px_12px] font-bold text-white"
                    onClick={saveEvent}
                  >
                    {calendarBusy ? "Saving..." : editingEventId ? "Update Event" : "Add Event"}
                  </button>
                  {calendarError ? <p className="calendar-error-copy m-[2px_0_0] text-xs font-semibold text-red-700 dark:text-red-300">{calendarError}</p> : null}
                </div>

                <div className="calendar-event-list grid max-h-[210px] gap-2 overflow-auto pr-0.5">
                  {selectedEvents.length ? (
                    selectedEvents.map((eventItem) => (
                      <article
                        key={eventItem.id}
                        className={`calendar-event-item${activeEventId === eventItem.id ? " active" : ""} rounded-[10px] border border-[#dbe3ef] bg-[#f8fbff] p-2.5 dark:border-slate-600 dark:bg-[#111827] ${
                          activeEventId === eventItem.id ? "border-blue-400 shadow-[0_4px_12px_rgba(37,99,235,0.16)]" : ""
                        }`}
                      >
                        <header className="flex items-center justify-between gap-2.5">
                          <strong className="text-slate-900 dark:text-slate-200">{eventItem.title}</strong>
                          <div className="calendar-event-item-actions inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              className="rounded-[7px] border border-[#cbd5e1] bg-white p-[4px_8px] text-[11px] text-slate-700 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-300"
                              onClick={() => setActiveEventId((current) => (current === eventItem.id ? null : eventItem.id))}
                            >
                              {activeEventId === eventItem.id ? "Hide" : "View"}
                            </button>
                            <button
                              type="button"
                              className="rounded-[7px] border border-[#cbd5e1] bg-white p-[4px_8px] text-[11px] text-slate-700 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-300"
                              onClick={() => startEdit(eventItem)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-[7px] border border-[#cbd5e1] bg-white p-[4px_8px] text-[11px] text-slate-700 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-300"
                              onClick={() => removeEvent(eventItem.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </header>
                        <p className="m-[4px_0_0] text-xs text-slate-500 dark:text-slate-400">{formatEventTime(eventItem)}</p>
                        {eventItem.repeat && eventItem.repeat !== "none" ? (
                          <p className="calendar-repeat-copy">{getRepeatLabel(eventItem.repeat)}</p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="calendar-empty-state m-0 text-[13px] text-slate-500 dark:text-slate-400">No events yet for this day.</p>
                  )}
                </div>

                {activeEvent ? (
                  <div className="calendar-event-details min-w-0 rounded-[10px] border border-[#dbe3ef] bg-[#f8fbff] p-2.5 dark:border-slate-600 dark:bg-[#111827]">
                    <h5 className="m-[0_0_6px] text-slate-900 dark:text-slate-200">{activeEvent.title}</h5>
                    <p className="m-[3px_0] text-[13px] text-slate-700 dark:text-slate-400"><strong>Time:</strong> {formatEventTime(activeEvent)}</p>
                    <p className="m-[3px_0] text-[13px] text-slate-700 dark:text-slate-400"><strong>Repeat:</strong> {getRepeatLabel(activeEvent.repeat)}</p>
                    <p className="m-[3px_0] text-[13px] text-slate-700 dark:text-slate-400"><strong>Location:</strong> {activeEvent.location || "-"}</p>
                    <p className="m-[3px_0] text-[13px] text-slate-700 dark:text-slate-400"><strong>Description:</strong> {activeEvent.description || "-"}</p>
                    <button
                      type="button"
                      className="rounded-[7px] border border-[#cbd5e1] bg-white p-[4px_8px] text-[11px] text-slate-700 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-300"
                      onClick={() => startEdit(activeEvent)}
                    >
                      Edit
                    </button>
                  </div>
                ) : null}

                <div className="calendar-event-footer flex justify-end">
                  <button
                    type="button"
                    className="calendar-close-btn cursor-pointer rounded-lg border border-[#cbd5e1] bg-white p-[8px_12px] text-xs text-slate-700 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-300"
                    onClick={closeEditor}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export default MiniCalendarWidget;
