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
    <div className={`calendar-card ${sizeClass}`}>
      <div className="calendar-top">
        <span className="calendar-mini-icon">{sizeClass === "tiny" ? "C" : "Cal"}</span>
        <strong>{monthLabel}</strong>
        <div className="calendar-top-actions">
          <span className="today-chip">{today.getDate()}</span>
          <button type="button" className="calendar-arrow" onClick={() => shiftMonth(-1)}>
            {"<"}
          </button>
          <button type="button" className="calendar-arrow" onClick={() => shiftMonth(1)}>
            {">"}
          </button>
        </div>
      </div>
      <div className="mini-calendar">
        {weekdayLabels.map((day, index) => (
          <strong key={`day-${index}-${day}`}>{day}</strong>
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
              return (
                <button
                  key={`${dateKey}-${index}`}
                  type="button"
                  className={`calendar-day-btn${isToday(day) ? " today" : ""}${dayEvents.length ? " has-event" : ""}`}
                  onClick={() => openDayEditor(day)}
                >
                  <span>{day}</span>
                  {dayEvents.length ? <em className="calendar-event-pill">{dayEvents.length}</em> : null}
                  {hoverText ? <i className="calendar-hover-tip">{hoverText}</i> : null}
                </button>
              );
            })()
          ) : (
            <span key={`blank-${index}`} className="calendar-day-empty" />
          )
        )}
      </div>

      {isEditorOpen && selectedDateKey
        ? createPortal(
            <div className="calendar-event-overlay" aria-hidden="true" onMouseDown={closeEditor}>
              <div className="calendar-event-modal" onMouseDown={(event) => event.stopPropagation()}>
                <div className="calendar-event-head">
                  <h4>{selectedDateLabel}</h4>
                  <button type="button" className="calendar-event-close" onClick={closeEditor} aria-label="Close calendar popup">
                    x
                  </button>
                </div>

                <div className="calendar-event-form">
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Event title"
                  />
                  <div className="calendar-event-time-row">
                    <label className="calendar-event-field">
                      <span>Start Time</span>
                      <input
                        type="time"
                        value={draft.startTime}
                        onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                      />
                    </label>
                    <label className="calendar-event-field">
                      <span>End Time</span>
                      <input
                        type="time"
                        value={draft.endTime}
                        onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="calendar-event-field">
                    <span>Repeat</span>
                    <select
                      value={draft.repeat}
                      onChange={(event) => setDraft((current) => ({ ...current, repeat: event.target.value }))}
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
                  />
                  <textarea
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Description"
                    rows={3}
                  />
                  <button type="button" className="calendar-save-btn" onClick={saveEvent}>
                    {calendarBusy ? "Saving..." : editingEventId ? "Update Event" : "Add Event"}
                  </button>
                  {calendarError ? <p className="calendar-error-copy">{calendarError}</p> : null}
                </div>

                <div className="calendar-event-list">
                  {selectedEvents.length ? (
                    selectedEvents.map((eventItem) => (
                      <article
                        key={eventItem.id}
                        className={`calendar-event-item${activeEventId === eventItem.id ? " active" : ""}`}
                      >
                        <header>
                          <strong>{eventItem.title}</strong>
                          <div className="calendar-event-item-actions">
                            <button type="button" onClick={() => setActiveEventId((current) => (current === eventItem.id ? null : eventItem.id))}>
                              {activeEventId === eventItem.id ? "Hide" : "View"}
                            </button>
                            <button type="button" onClick={() => startEdit(eventItem)}>Edit</button>
                            <button type="button" onClick={() => removeEvent(eventItem.id)}>Delete</button>
                          </div>
                        </header>
                        <p>{formatEventTime(eventItem)}</p>
                        {eventItem.repeat && eventItem.repeat !== "none" ? (
                          <p className="calendar-repeat-copy">{getRepeatLabel(eventItem.repeat)}</p>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p className="calendar-empty-state">No events yet for this day.</p>
                  )}
                </div>

                {activeEvent ? (
                  <div className="calendar-event-details">
                    <h5>{activeEvent.title}</h5>
                    <p><strong>Time:</strong> {formatEventTime(activeEvent)}</p>
                    <p><strong>Repeat:</strong> {getRepeatLabel(activeEvent.repeat)}</p>
                    <p><strong>Location:</strong> {activeEvent.location || "-"}</p>
                    <p><strong>Description:</strong> {activeEvent.description || "-"}</p>
                    <button type="button" onClick={() => startEdit(activeEvent)}>Edit</button>
                  </div>
                ) : null}

                <div className="calendar-event-footer">
                  <button type="button" className="calendar-close-btn" onClick={closeEditor}>Close</button>
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
