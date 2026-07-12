import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaBuilding,
  FaCalendarDays,
  FaCamera,
  FaCloudArrowUp,
  FaCropSimple,
  FaEnvelope,
  FaFloppyDisk,
  FaGraduationCap,
  FaIdBadge,
  FaLocationDot,
  FaPenToSquare,
  FaPhone,
  FaPlus,
  FaRotateLeft,
  FaTrash,
  FaUser,
  FaUserGear,
  FaXmark,
} from "react-icons/fa6";

import { apiUrl, getStoredAuthRole, persistAuth, useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell } from "../../components/Shared";

const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_TIMETABLE_ROWS = [
  { start_time: "09:00", end_time: "10:00" },
  { start_time: "10:00", end_time: "11:00" },
  { start_time: "11:00", end_time: "12:00" },
  { start_time: "13:00", end_time: "14:00" },
  { start_time: "14:00", end_time: "15:00" },
];
const TIMETABLE_TIME_OPTIONS = Array.from({ length: 29 }, (_, index) => {
  const totalMinutes = (7 * 60) + (index * 30);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
});

function timeToMinutes(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return (hours * 60) + minutes;
}

const createEmptyTimetableForm = (details = {}) => ({
  id: "",
  day: "Monday",
  start_time: "09:00",
  end_time: "10:00",
  subject: "",
  subject_code: "",
  subject_value: "",
  classroom: "",
  branch: details.department || "",
  semester: "",
  section: "A",
  class_value: "",
});

function sortTimetableSlots(slots) {
  return [...(slots || [])].sort((first, second) => {
    const dayDiff = TIMETABLE_DAYS.indexOf(first.day) - TIMETABLE_DAYS.indexOf(second.day);
    if (dayDiff !== 0) return dayDiff;
    const startDiff = timeToMinutes(first.start_time) - timeToMinutes(second.start_time);
    if (startDiff !== 0) return startDiff;
    const endDiff = timeToMinutes(first.end_time) - timeToMinutes(second.end_time);
    if (endDiff !== 0) return endDiff;
    return String(first.subject || "").localeCompare(String(second.subject || ""));
  });
}

const TIMETABLE_FIELD_LABEL_CLASS =
  "field-label text-ui-text dark:text-ui-text-dark [&>select]:w-full [&>select]:rounded-2xl [&>select]:border [&>select]:border-slate-400/26 [&>select]:bg-slate-50/92 [&>select]:p-[14px_16px] [&>select]:text-slate-900 [&>select]:focus:border-blue-500/56 [&>select]:focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] [&>select]:focus:bg-white [&>select]:focus:outline-none dark:[&>select]:border-slate-600/80 dark:[&>select]:bg-slate-900/85 dark:[&>select]:text-ui-text-dark [&>span]:text-xs [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.06em] [&>span]:text-ui-text-muted dark:[&>span]:text-ui-text-muted-dark";

function FacultyProfile() {
  const profile = useSessionProfile("faculty");
  const [details, setDetails] = useState(() => ({
    name: profile.name || "Faculty",
    email: profile.meta || "",
    department: "",
    role: "Faculty",
    photoPath: profile.photoPath || "",
  }));
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("upload");
  const [imageSource, setImageSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editorError, setEditorError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({
    name: "",
    phone: "",
    qualification: "",
    address: "",
  });
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [timetableDays, setTimetableDays] = useState(TIMETABLE_DAYS);
  const [timetableOptions, setTimetableOptions] = useState({
    branches: [],
    classes: [],
    classrooms: [],
    subjects: [],
    assigned_classes: [],
  });
  const [isTimetableLoading, setIsTimetableLoading] = useState(true);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [isSavingTimetable, setIsSavingTimetable] = useState(false);
  const [isDeletingTimetable, setIsDeletingTimetable] = useState("");
  const [timetableError, setTimetableError] = useState("");
  const [timetableForm, setTimetableForm] = useState(createEmptyTimetableForm());

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const streamRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function hydrateProfile() {
      try {
        const response = await fetch(apiUrl("/api/faculty/profile"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success || !mounted) return;

        const data = payload.profile || {};
        setDetails({
          name: data.name || "Faculty",
          email: data.email || "",
          department: data.department || "",
          role: data.role || "Faculty",
          photoPath: data.photo_path || "",
          faculty_id: data.faculty_id || "",
          phone: data.phone || "",
          joined_date: data.joined_date || "",
          qualification: data.qualification || "",
          address: data.address || "",
        });
        setInfoForm({
          name: data.name || "",
          phone: data.phone || "",
          qualification: data.qualification || "",
          address: data.address || "",
        });
        setTimetableForm((current) => ({
          ...current,
          branch: current.branch || data.department || "",
        }));
        persistAuth({
          token: "session",
          role: data.role || getStoredAuthRole() || "faculty",
          user: {
            name: data.name || "Faculty",
            email: data.email || "",
            role: data.role || "faculty",
            department: data.department || "",
            photo_path: data.photo_path || "",
          },
        });
      } catch {
        // keep session profile fallback
      } finally {
        if (mounted) setIsProfileLoading(false);
      }
    }

    hydrateProfile();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTimetableOptions() {
      try {
        const response = await fetch(apiUrl("/api/faculty/profile/timetable/options"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!mounted || !response.ok || !payload.success) return;
        setTimetableOptions({
          branches: Array.isArray(payload.branches) ? payload.branches : [],
          assigned_classes: Array.isArray(payload.assigned_classes) ? payload.assigned_classes : [],
          classes: Array.isArray(payload.classes) ? payload.classes : [],
          classrooms: Array.isArray(payload.classrooms) ? payload.classrooms : [],
          subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
        });
      } catch {
        // keep empty fallback options
      }
    }

    async function loadTimetable() {
      try {
        const response = await fetch(apiUrl("/api/faculty/profile/timetable"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!mounted) return;
        if (!response.ok || !payload.success) {
          setTimetableError(payload.error || payload.message || "Could not load your timetable.");
          return;
        }
        setTimetableSlots(sortTimetableSlots(payload.timetable || []));
        setTimetableDays(Array.isArray(payload.days) && payload.days.length ? payload.days : TIMETABLE_DAYS);
      } catch {
        if (mounted) setTimetableError("Could not load your timetable.");
      } finally {
        if (mounted) setIsTimetableLoading(false);
      }
    }

    loadTimetableOptions();
    loadTimetable();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editorOpen || editorMode !== "camera" || imageSource) return undefined;

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEditorError("Camera is not supported on this device/browser.");
        return;
      }

      setIsStartingCamera(true);
      setEditorError("");
      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setEditorError("Unable to access camera. You can still upload a photo.");
      } finally {
        if (!cancelled) setIsStartingCamera(false);
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      if (!imageSource) stopStream();
    };
  }, [editorOpen, editorMode, imageSource]);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function resetEditorState(nextMode = editorMode) {
    setEditorMode(nextMode);
    setImageSource("");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setEditorError("");
  }

  function openEditor(mode = "upload") {
    setEditorOpen(true);
    resetEditorState(mode);
    setActionMessage("");
  }

  function closeEditor() {
    setEditorOpen(false);
    stopStream();
    resetEditorState("upload");
    setIsStartingCamera(false);
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSource(String(reader.result || ""));
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setEditorError("");
      stopStream();
    };
    reader.readAsDataURL(file);
  }

  function captureFromCamera() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImageSource(canvas.toDataURL("image/jpeg", 0.92));
    setZoom(1);
    setPan({ x: 0, y: 0 });
    stopStream();
  }

  function handlePointerDown(event) {
    if (!imageSource) return;
    const point = event.touches?.[0] || event;
    dragRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    const point = event.touches?.[0] || event;
    const deltaX = point.clientX - dragRef.current.startX;
    const deltaY = point.clientY - dragRef.current.startY;
    setPan({
      x: dragRef.current.originX + deltaX,
      y: dragRef.current.originY + deltaY,
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function saveCroppedPhoto() {
    if (!imageSource || isSaving) return;
    setIsSaving(true);
    setEditorError("");

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = imageSource;
      });

      const stageSize = Math.max(240, Math.round(stageRef.current?.getBoundingClientRect().width || 320));
      const outputSize = 640;
      const baseScale = Math.max(stageSize / image.width, stageSize / image.height);
      const finalScale = baseScale * zoom;
      const drawWidth = image.width * finalScale;
      const drawHeight = image.height * finalScale;
      const scaleRatio = outputSize / stageSize;

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas not available");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outputSize, outputSize);

      const dx = ((stageSize - drawWidth) / 2 + pan.x) * scaleRatio;
      const dy = ((stageSize - drawHeight) / 2 + pan.y) * scaleRatio;
      context.drawImage(image, dx, dy, drawWidth * scaleRatio, drawHeight * scaleRatio);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Unable to prepare cropped image");

      const formData = new FormData();
      formData.append("photo", blob, "faculty-profile.jpg");

      const response = await fetch(apiUrl("/profile/photo"), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: formData,
      });

      const uploadPayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(uploadPayload.message || "Photo upload failed");
      }

      const whoami = await fetch(apiUrl("/api/auth/whoami"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await whoami.json().catch(() => ({}));
      if (whoami.ok && payload.authenticated) {
        const user = payload.user || {};
        persistAuth({ token: "session", role: payload.role || getStoredAuthRole(), user });
        setDetails((current) => ({
          ...current,
          name: user.name || current.name,
          email: user.email || current.email,
          department: user.department || current.department,
          role: user.role || current.role,
          photoPath: user.photo_path || current.photoPath,
        }));
      } else {
        setDetails((current) => ({ ...current, photoPath: imageSource }));
      }

      setActionMessage("Profile photo updated successfully.");
      closeEditor();
    } catch (error) {
      setEditorError(error?.message || "Could not save the new profile photo. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function openTimetableEditor(slot) {
    setTimetableError("");
    setActionMessage("");
    if (slot) {
      const selectedSubject = (timetableOptions.subjects || []).find(
        (item) =>
          String(item.subject_code || item.value || "").trim().toUpperCase() === String(slot.subject_code || "").trim().toUpperCase() ||
          String(item.subject_name || "").trim().toLowerCase() === String(slot.subject || "").trim().toLowerCase()
      );
      setTimetableForm({
        id: slot.id || "",
        day: slot.day || "Monday",
        start_time: slot.start_time || "09:00",
        end_time: slot.end_time || "10:00",
        subject: selectedSubject?.subject_name || slot.subject || "",
        subject_code: selectedSubject?.subject_code || slot.subject_code || "",
        subject_value: selectedSubject?.value || "",
        classroom: slot.classroom || "",
        branch: slot.branch || details.department || "",
        semester: String(slot.semester ?? ""),
        section: slot.section || "A",
        class_value: slot.branch && slot.semester && slot.section ? `${slot.branch}|${slot.semester}|${slot.section}` : "",
      });
    } else {
      setTimetableForm(createEmptyTimetableForm(details));
    }
    setIsEditingTimetable(true);
  }

  function closeTimetableEditor() {
    setIsEditingTimetable(false);
    setIsSavingTimetable(false);
    setTimetableError("");
    setTimetableForm(createEmptyTimetableForm(details));
  }

  async function saveTimetableSlot(event) {
    event.preventDefault();
    if (isSavingTimetable) return;
    setIsSavingTimetable(true);
    setTimetableError("");
    setActionMessage("");

    try {
      const response = await fetch(apiUrl("/api/faculty/profile/timetable"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...timetableForm,
          branch: String(timetableForm.branch || "").trim().toUpperCase(),
          section: String(timetableForm.section || "").trim().toUpperCase(),
          semester: String(timetableForm.semester || "").trim(),
          subject: String(timetableForm.subject || "").trim(),
          subject_code: String(timetableForm.subject_code || "").trim().toUpperCase(),
          class_value: selectedClassValue,
          start_time: String(timetableForm.start_time || "").trim(),
          end_time: String(timetableForm.end_time || "").trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || payload.message || "Could not save timetable slot.");
      }

      setTimetableSlots((current) => {
        const next = current.filter((slot) => slot.id !== payload.slot?.id);
        if (payload.slot) next.push(payload.slot);
        return sortTimetableSlots(next);
      });
      setActionMessage(payload.message || "Timetable updated successfully.");
      closeTimetableEditor();
    } catch (error) {
      setTimetableError(error.message || "Could not save timetable slot.");
    } finally {
      setIsSavingTimetable(false);
    }
  }

  async function deleteTimetableSlot(slot) {
    if (!slot?.id || isDeletingTimetable) return;
    const confirmed = window.confirm(`Delete ${slot.subject || "this slot"} on ${slot.day}?`);
    if (!confirmed) return;

    setIsDeletingTimetable(slot.id);
    setTimetableError("");
    setActionMessage("");

    try {
      const response = await fetch(apiUrl(`/api/faculty/profile/timetable/${slot.id}`), {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || payload.message || "Could not delete timetable slot.");
      }

      setTimetableSlots((current) => current.filter((item) => item.id !== slot.id));
      setActionMessage(payload.message || "Timetable slot deleted.");
      if (timetableForm.id === slot.id) {
        closeTimetableEditor();
      }
    } catch (error) {
      setTimetableError(error.message || "Could not delete timetable slot.");
    } finally {
      setIsDeletingTimetable("");
    }
  }

  const filteredClassOptions = useMemo(() => {
    const mergedClassMap = new Map();
    for (const item of timetableOptions.assigned_classes || []) {
      if (item?.value) {
        mergedClassMap.set(item.value, item);
      }
    }
    for (const item of timetableOptions.classes || []) {
      if (item?.value) {
        mergedClassMap.set(item.value, item);
      }
    }
    for (const slot of timetableSlots) {
      const branch = String(slot.branch || "").trim().toUpperCase();
      const semester = String(slot.semester ?? "").trim();
      const section = String(slot.section || "").trim().toUpperCase();
      if (!branch || !semester || !section) continue;
      const value = `${branch}|${semester}|${section}`;
      if (!mergedClassMap.has(value)) {
        mergedClassMap.set(value, {
          branch,
          semester: Number(slot.semester),
          section,
          value,
          label: `${branch} / ${semester} / ${section}`,
        });
      }
    }

    const allClassOptions = Array.from(mergedClassMap.values()).sort((first, second) =>
      String(first.label || "").localeCompare(String(second.label || ""))
    );
    const activeBranch = String(timetableForm.branch || "").trim().toUpperCase();
    const matches = allClassOptions.filter((item) => {
      if (!activeBranch) return true;
      return String(item.branch || "").trim().toUpperCase() === activeBranch;
    });
    return matches.length ? matches : allClassOptions;
  }, [timetableForm.branch, timetableForm.section, timetableForm.semester, timetableOptions.assigned_classes, timetableOptions.classes, timetableSlots]);

  const subjectOptions = useMemo(() => {
    const mergedSubjectMap = new Map();
    for (const item of timetableOptions.subjects || []) {
      const key = String(item.value || item.subject_code || item.subject_name || "").trim();
      if (key) {
        mergedSubjectMap.set(key, item);
      }
    }
    for (const slot of timetableSlots) {
      const key = String(slot.subject_code || slot.subject || "").trim().toUpperCase();
      if (!key || mergedSubjectMap.has(key)) continue;
      mergedSubjectMap.set(key, {
        branch: String(slot.branch || "").trim().toUpperCase(),
        semester: String(slot.semester ?? "").trim(),
        section: String(slot.section || "").trim().toUpperCase(),
        subject_code: String(slot.subject_code || "").trim().toUpperCase(),
        subject_name: String(slot.subject || "").trim(),
        value: `${String(slot.subject_code || slot.subject || "").trim().toUpperCase()}|${String(slot.branch || "").trim().toUpperCase()}|${String(slot.semester ?? "").trim()}|${String(slot.section || "").trim().toUpperCase()}`,
        label: `${String(slot.subject || "").trim()} (${String(slot.subject_code || "").trim().toUpperCase() || "NA"}) - ${String(slot.branch || "").trim().toUpperCase()} / ${String(slot.semester ?? "").trim()} / ${String(slot.section || "").trim().toUpperCase()}`,
      });
    }
    const allSubjects = Array.from(mergedSubjectMap.values()).sort((first, second) => {
      const branchDiff = String(first.branch || "").localeCompare(String(second.branch || ""));
      if (branchDiff !== 0) return branchDiff;
      const semesterDiff = Number(first.semester || 0) - Number(second.semester || 0);
      if (semesterDiff !== 0) return semesterDiff;
      const sectionDiff = String(first.section || "").localeCompare(String(second.section || ""));
      if (sectionDiff !== 0) return sectionDiff;
      return String(first.label || first.subject_name || "").localeCompare(String(second.label || second.subject_name || ""));
    });
    return allSubjects;
  }, [timetableOptions.subjects, timetableSlots]);

  const availableBranches = useMemo(() => {
    const branchSet = new Set((timetableOptions.branches || []).map((item) => String(item || "").trim().toUpperCase()).filter(Boolean));
    for (const classOption of filteredClassOptions) {
      const branch = String(classOption.branch || "").trim().toUpperCase();
      if (branch) branchSet.add(branch);
    }
    const currentBranch = String(timetableForm.branch || "").trim().toUpperCase();
    if (currentBranch) branchSet.add(currentBranch);
    return Array.from(branchSet).sort();
  }, [filteredClassOptions, timetableForm.branch, timetableOptions.branches]);

  const availableSemesters = useMemo(() => {
    const branch = String(timetableForm.branch || "").trim().toUpperCase();
    const semesterSet = new Set();
    for (const classOption of filteredClassOptions) {
      const classBranch = String(classOption.branch || "").trim().toUpperCase();
      if (branch && classBranch !== branch) continue;
      if (classOption.semester !== undefined && classOption.semester !== null && String(classOption.semester).trim() !== "") {
        semesterSet.add(String(classOption.semester));
      }
    }
    return Array.from(semesterSet).sort((first, second) => Number(first) - Number(second));
  }, [filteredClassOptions, timetableForm.branch]);

  const availableSections = useMemo(() => {
    const branch = String(timetableForm.branch || "").trim().toUpperCase();
    const semester = String(timetableForm.semester || "").trim();
    const sectionSet = new Set();
    for (const classOption of filteredClassOptions) {
      const classBranch = String(classOption.branch || "").trim().toUpperCase();
      const classSemester = String(classOption.semester ?? "").trim();
      if (branch && classBranch !== branch) continue;
      if (semester && classSemester !== semester) continue;
      if (classOption.section) sectionSet.add(String(classOption.section).trim().toUpperCase());
    }
    return Array.from(sectionSet).sort();
  }, [filteredClassOptions, timetableForm.branch, timetableForm.semester]);

  const selectedClassValue = useMemo(() => {
    const branch = String(timetableForm.branch || "").trim().toUpperCase();
    const semester = String(timetableForm.semester || "").trim();
    const section = String(timetableForm.section || "").trim().toUpperCase();
    if (!branch || !semester || !section) return "";
    const matchingClass = filteredClassOptions.find(
      (item) =>
        String(item.branch || "").trim().toUpperCase() === branch &&
        String(item.semester ?? "").trim() === semester &&
        String(item.section || "").trim().toUpperCase() === section
    );
    return matchingClass?.value || `${branch}|${semester}|${section}`;
  }, [filteredClassOptions, timetableForm.branch, timetableForm.section, timetableForm.semester]);

  useEffect(() => {
    if (!isEditingTimetable) return;
    const selectedValue = String(timetableForm.subject_value || "").trim();
    if (!selectedValue) return;
    const stillValid = subjectOptions.some((item) => String(item.value || "").trim() === selectedValue);
    if (!stillValid) {
      setTimetableForm((current) => ({
        ...current,
        subject: "",
        subject_code: "",
        subject_value: "",
      }));
    }
  }, [isEditingTimetable, subjectOptions, timetableForm.subject_value]);

  const infoCards = useMemo(
    () => [
      { label: "Full Name", value: details.name || "Not available", icon: FaUser },
      { label: "Email Address", value: details.email || "Not available", icon: FaEnvelope },
      { label: "Role", value: details.role || "Faculty", icon: FaUserGear },
      { label: "Department", value: details.department || "Not assigned", icon: FaBuilding },
      { label: "Faculty ID", value: details.faculty_id || "N/A", icon: FaIdBadge },
      { label: "Phone", value: details.phone || "N/A", icon: FaPhone },
      { label: "Joined Date", value: details.joined_date || "N/A", icon: FaCalendarDays },
      { label: "Qualification", value: details.qualification || "N/A", icon: FaGraduationCap },
      { label: "Address", value: details.address || "N/A", icon: FaLocationDot, wide: true },
    ],
    [details]
  );

  const cropStyle = imageSource
    ? {
        transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
      }
    : undefined;

  const timetableRows = useMemo(() => {
    const rowMap = new Map();
    for (const slot of timetableSlots) {
      const key = `${slot.start_time || ""}|${slot.end_time || ""}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          start_time: slot.start_time || "",
          end_time: slot.end_time || "",
        });
      }
    }

    const rows = rowMap.size ? Array.from(rowMap.values()) : DEFAULT_TIMETABLE_ROWS;
    return [...rows].sort((first, second) => {
      const startDiff = timeToMinutes(first.start_time) - timeToMinutes(second.start_time);
      if (startDiff !== 0) return startDiff;
      return timeToMinutes(first.end_time) - timeToMinutes(second.end_time);
    });
  }, [timetableSlots]);

  const timetableGridMap = useMemo(() => {
    const map = {};
    for (const slot of timetableSlots) {
      map[`${slot.day}|${slot.start_time}|${slot.end_time}`] = slot;
    }
    return map;
  }, [timetableSlots]);

  const timetableSummary = useMemo(() => {
    const activeDays = new Set(timetableSlots.map((slot) => slot.day).filter(Boolean)).size;
    const firstSlot = timetableSlots[0];
    return {
      total: timetableSlots.length,
      activeDays,
      firstSlot: firstSlot ? `${firstSlot.day}, ${firstSlot.start_time}` : "No slots yet",
    };
  }, [timetableSlots]);

  async function saveProfileInfo() {
    if (isSavingInfo) return;
    setIsSavingInfo(true);
    setActionMessage("");

    try {
      const response = await fetch(apiUrl("/api/faculty/profile"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(infoForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error("Profile update failed");
      }

      const next = payload.profile || {};
      setDetails((current) => ({
        ...current,
        ...next,
        photoPath: next.photo_path || current.photoPath,
      }));
      setInfoForm({
        name: next.name || "",
        phone: next.phone || "",
        qualification: next.qualification || "",
        address: next.address || "",
      });
      persistAuth({
        token: "session",
        role: next.role || getStoredAuthRole() || "faculty",
        user: {
          name: next.name || details.name,
          email: next.email || details.email,
          role: next.role || details.role,
          department: next.department || details.department,
          photo_path: next.photo_path || details.photoPath,
        },
      });
      setTimetableForm((current) => ({
        ...current,
        branch: current.branch || next.department || "",
      }));
      setActionMessage("Profile information updated successfully.");
      setIsEditingInfo(false);
    } catch {
      setActionMessage("Could not update profile information.");
    } finally {
      setIsSavingInfo(false);
    }
  }

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      title="Faculty Profile"
      subtitle="Personal details, profile photo settings, and your own timetable."
      profile={profile}
    >
      <section className="faculty-profile-shell grid gap-6">
        <div className="faculty-profile-hero grid grid-cols-[minmax(280px,340px)_minmax(0,1fr)] items-stretch gap-6 max-[992px]:grid-cols-1">
          <div className="faculty-profile-photo-card flex flex-col gap-4 rounded-3xl border border-slate-400/[0.16] bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_42%),linear-gradient(145deg,#ffffff_0%,#f6fbff_100%)] p-[22px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-ui-border-dark dark:bg-ui-card-dark">
            <div className="faculty-profile-photo-frame grid aspect-square w-full place-items-center overflow-hidden rounded-[28px] border border-blue-500/[0.18] bg-[radial-gradient(circle_at_30%_25%,rgba(125,211,252,0.4),rgba(59,130,246,0.1)_48%,transparent_70%),linear-gradient(145deg,#dbeafe_0%,#eff6ff_100%)] text-[88px] font-extrabold text-blue-700 dark:bg-[radial-gradient(circle_at_30%_25%,rgba(56,189,248,0.18),rgba(14,116,144,0.14)_48%,transparent_70%),linear-gradient(145deg,#1e293b_0%,#0f172a_100%)] dark:text-sky-300">
              {details.photoPath ? (
                <img src={details.photoPath} alt={details.name} className="faculty-profile-photo-image h-full w-full object-cover" />
              ) : (
                <span>{(details.name || "F").slice(0, 1)}</span>
              )}
            </div>
            <div className="faculty-profile-photo-actions grid gap-2.5">
              <button
                type="button"
                className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                onClick={() => openEditor("upload")}
              >
                <FaCloudArrowUp /> Upload New Photo
              </button>
              <button
                type="button"
                className="pagination-btn inline-flex items-center justify-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                onClick={() => openEditor("camera")}
              >
                <FaCamera /> Use Camera
              </button>
            </div>
          </div>

          <div className="faculty-profile-hero-copy rounded-3xl border border-slate-400/[0.16] bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.1),transparent_28%),linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-7 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-ui-border-dark dark:bg-ui-card-dark">
            <span className="faculty-profile-kicker inline-flex rounded-full bg-blue-600/[0.12] px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-blue-700">Faculty Profile</span>
            <h2 className="m-[14px_0_10px] text-[clamp(2rem,3vw,3rem)] leading-[1.02] tracking-[-0.04em] text-slate-900 dark:text-ui-text-dark">{details.name}</h2>
            <p className="m-0 max-w-[62ch] leading-[1.65] text-slate-600 dark:text-ui-text-muted-dark">Keep your profile polished with a clear photo, updated details, and a timetable you can manage yourself whenever lectures change.</p>
            {actionMessage ? <div className="faculty-profile-success mt-4 rounded-2xl border border-emerald-500/[0.18] bg-emerald-500/[0.12] px-3.5 py-3 font-semibold text-emerald-800">{actionMessage}</div> : null}
            <div className="faculty-profile-meta-grid mt-[22px] grid grid-cols-2 gap-3.5">
              {isProfileLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <article key={`profile-skeleton-${index}`} className="faculty-profile-meta-card is-loading grid min-h-[108px] content-start gap-2 rounded-2xl border border-slate-400/[0.16] bg-white/88 p-[16px_18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] pointer-events-none dark:border-ui-border-dark dark:bg-ui-card-dark">
                      <span className="skeleton-line skeleton-label h-3 w-[42%] rounded-full" />
                      <strong className="skeleton-line skeleton-text h-3.5 w-[86%] rounded-full" />
                    </article>
                  ))
                : infoCards.map((item) => {
                    const Icon = item.icon;
                    return (
                      <article
                        key={item.label}
                        className={`faculty-profile-meta-card${item.wide ? " wide col-span-2" : ""} grid min-h-[108px] content-start gap-2 rounded-2xl border border-slate-400/[0.16] bg-white/88 p-[16px_18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-ui-border-dark dark:bg-ui-card-dark`}
                      >
                        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500 [&>svg]:flex-shrink-0 [&>svg]:text-[13px] [&>svg]:text-blue-500">
                          {Icon ? <Icon /> : null}
                          {item.label}
                        </span>
                        <strong className="break-words text-base leading-[1.35] text-slate-900 dark:text-ui-text-dark">{item.value}</strong>
                      </article>
                    );
                  })}
            </div>
            <div className="faculty-profile-inline-actions mt-[18px] flex justify-start">
              <button
                type="button"
                className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                onClick={() => setIsEditingInfo(true)}
              >
                <FaPenToSquare /> Edit Information
              </button>
            </div>
          </div>
        </div>

        <section className="faculty-timetable-panel grid gap-5 rounded-3xl border border-slate-400/[0.16] bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_32%),linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-[26px] shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-ui-border-dark dark:bg-ui-card-dark">
          <div className="faculty-timetable-header flex items-start justify-between gap-[18px] max-[992px]:flex-col">
            <div>
              <span className="faculty-profile-kicker inline-flex rounded-full bg-blue-600/[0.12] px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-blue-700">My Timetable</span>
              <h3 className="m-[12px_0_8px] text-[clamp(1.4rem,2vw,1.9rem)] text-slate-900 dark:text-ui-text-dark">Manage your lecture slots</h3>
              <p className="m-0 max-w-[70ch] leading-[1.6] text-slate-600 dark:text-ui-text-muted-dark">Add, update, or remove your own timetable entries here. Dashboard widgets and attendance flows will pick up the same data.</p>
            </div>
            <button
              type="button"
              className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
              onClick={() => openTimetableEditor()}
            >
              <FaPlus /> Add Slot
            </button>
          </div>

          <div className="faculty-timetable-summary grid grid-cols-3 gap-3.5 max-[640px]:grid-cols-1">
            <article className="faculty-timetable-summary-card grid gap-2 rounded-[20px] border border-slate-400/[0.16] bg-white/88 p-[16px_18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-ui-border-dark dark:bg-ui-card-dark">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">Total Slots</span>
              <strong className="text-[1.2rem] text-slate-900 dark:text-ui-text-dark">{timetableSummary.total}</strong>
            </article>
            <article className="faculty-timetable-summary-card grid gap-2 rounded-[20px] border border-slate-400/[0.16] bg-white/88 p-[16px_18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-ui-border-dark dark:bg-ui-card-dark">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">Active Days</span>
              <strong className="text-[1.2rem] text-slate-900 dark:text-ui-text-dark">{timetableSummary.activeDays}</strong>
            </article>
            <article className="faculty-timetable-summary-card grid gap-2 rounded-[20px] border border-slate-400/[0.16] bg-white/88 p-[16px_18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-ui-border-dark dark:bg-ui-card-dark">
              <span className="text-xs font-bold uppercase tracking-[0.06em] text-slate-500">First Slot</span>
              <strong className="text-[1.2rem] text-slate-900 dark:text-ui-text-dark">{timetableSummary.firstSlot}</strong>
            </article>
          </div>

          {timetableError && !isEditingTimetable ? <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{timetableError}</p> : null}

          <div className="faculty-timetable-matrix-shell overflow-hidden rounded-[22px] border border-slate-400/[0.16] bg-white/78 dark:border-ui-border-dark dark:bg-ui-card-dark">
            {isTimetableLoading ? (
              <div className="faculty-timetable-matrix-loading grid gap-3 p-5">
                <div className="skeleton-line skeleton-label h-3 w-[42%] rounded-full bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite]" />
                <div className="skeleton-line skeleton-text h-3.5 w-[86%] rounded-full bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite]" />
                <div className="skeleton-line skeleton-text h-3.5 w-[86%] rounded-full bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite]" />
                <div className="skeleton-line skeleton-text h-3.5 w-[86%] rounded-full bg-[linear-gradient(90deg,#e9eef6_0%,#f7f9fc_50%,#e9eef6_100%)] bg-[length:200%_100%] [animation:skeleton-shimmer_1.3s_linear_infinite]" />
              </div>
            ) : (
              <div className="faculty-timetable-matrix-wrap overflow-auto">
                <table className="faculty-timetable-matrix w-full min-w-[760px] border-collapse [&_td]:border [&_td]:border-slate-400/[0.16] [&_td]:p-0 [&_th]:border [&_th]:border-slate-400/[0.16] [&_th]:p-0">
                  <thead>
                    <tr>
                      <th className="bg-slate-50/92 p-[14px_10px] text-center text-[0.8rem] font-bold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">Time</th>
                      {timetableDays.map((day) => (
                        <th key={day} className="bg-slate-50/92 p-[14px_10px] text-center text-[0.8rem] font-bold uppercase tracking-[0.08em] text-slate-700 dark:bg-slate-800/70 dark:text-slate-300">{day.slice(0, 3)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timetableRows.map((row) => (
                      <tr key={`${row.start_time}-${row.end_time}`}>
                        <th className="w-[92px] min-w-[92px] bg-slate-50/72 p-[12px_10px] text-center text-slate-900 dark:bg-slate-900/78 dark:text-ui-text-dark">
                          <span className="block font-bold">{row.start_time}</span>
                          <small className="mt-1 block text-[0.76rem] text-slate-500">{row.end_time}</small>
                        </th>
                        {timetableDays.map((day) => {
                          const slot = timetableGridMap[`${day}|${row.start_time}|${row.end_time}`];
                          return (
                            <td key={`${day}-${row.start_time}-${row.end_time}`}>
                              <button
                                type="button"
                                className={`faculty-timetable-cell${slot ? " filled" : " empty"} grid min-h-[92px] w-full cursor-pointer place-content-center gap-1.5 border-0 bg-transparent p-[12px_10px] text-center transition-[background-color,transform,box-shadow] duration-[160ms] [&>strong]:block [&>strong]:overflow-hidden [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap [&>strong]:text-[0.95rem] [&>strong]:text-slate-900 [&>span]:block [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap [&>span]:text-[0.86rem] [&>span]:text-slate-600 [&>small]:block [&>small]:overflow-hidden [&>small]:text-ellipsis [&>small]:whitespace-nowrap [&>small]:text-[0.76rem] [&>small]:text-slate-500 ${
                                  slot
                                    ? "hover:-translate-y-px hover:bg-[linear-gradient(180deg,#dbeeff_0%,#cde5fa_100%)] hover:shadow-[inset_0_0_0_1px_rgba(93,157,214,0.35)]"
                                    : "bg-slate-50/58 hover:bg-blue-100/92 hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.24)] [&>strong]:text-blue-600"
                                }`}
                                onClick={() =>
                                  openTimetableEditor(
                                    slot || {
                                      day,
                                      start_time: row.start_time,
                                      end_time: row.end_time,
                                      branch: details.department || "",
                                      section: "A",
                                    }
                                  )
                                }
                              >
                                {slot ? (
                                  <>
                                    <strong>{slot.subject || "Untitled"}</strong>
                                    <span>{slot.classroom || slot.class_label || "Class not set"}</span>
                                    <small>{slot.class_label || "Class not set"}</small>
                                  </>
                                ) : (
                                  <>
                                    <strong>+ Add</strong>
                                    <span>{day}</span>
                                    <small>Click to add lecture</small>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </section>

      {editorOpen ? (
        <div
          className="photo-cropper-overlay fixed inset-0 z-[1700] grid place-items-center bg-slate-900/56 p-[18px] backdrop-blur-md"
          onMouseUp={handlePointerUp}
          onTouchEnd={handlePointerUp}
        >
          <div
            className="photo-cropper-modal max-h-[calc(100vh-24px)] w-[min(1080px,calc(100vw-24px))] overflow-auto rounded-[28px] bg-ui-card p-6 shadow-[0_28px_80px_rgba(15,23,42,0.32)] dark:bg-ui-card-dark dark:text-ui-text-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="photo-cropper-header flex items-center justify-between gap-4">
              <div>
                <h3 className="m-[0_0_6px] text-[1.6rem]">Edit Profile Photo</h3>
                <p className="m-0 text-ui-text-muted dark:text-ui-text-muted-dark">Upload or capture an image, then drag and zoom to crop it.</p>
              </div>
              <button
                type="button"
                className="photo-cropper-close h-[42px] w-[42px] cursor-pointer rounded-full border border-ui-border bg-ui-card-muted text-ui-text dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark"
                onClick={closeEditor}
              >
                <FaXmark />
              </button>
            </div>

            <div className="photo-cropper-toolbar my-[18px] flex items-center gap-3">
              <button
                type="button"
                className={`photo-source-btn${editorMode === "upload" ? " active" : ""} inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2.5 ${
                  editorMode === "upload"
                    ? "border-blue-600/24 bg-blue-600/[0.12] text-blue-700"
                    : "border-ui-border bg-ui-card-muted text-ui-text dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark"
                }`}
                onClick={() => resetEditorState("upload")}
              >
                <FaCloudArrowUp /> Upload
              </button>
              <button
                type="button"
                className={`photo-source-btn${editorMode === "camera" ? " active" : ""} inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2.5 ${
                  editorMode === "camera"
                    ? "border-blue-600/24 bg-blue-600/[0.12] text-blue-700"
                    : "border-ui-border bg-ui-card-muted text-ui-text dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark"
                }`}
                onClick={() => resetEditorState("camera")}
              >
                <FaCamera /> Camera
              </button>
            </div>

            <div className="photo-cropper-body grid grid-cols-[minmax(0,1.2fr)_minmax(280px,360px)] gap-5 max-[992px]:grid-cols-1">
              <div className="photo-cropper-stage-panel grid min-h-[520px] place-items-center rounded-3xl border border-slate-400/[0.18] bg-[linear-gradient(135deg,rgba(96,165,250,0.08),rgba(236,72,153,0.08)),linear-gradient(0deg,#f8fafc,#f8fafc)] p-6 dark:border-ui-border-dark dark:bg-[linear-gradient(135deg,rgba(96,165,250,0.08),rgba(236,72,153,0.08)),linear-gradient(0deg,#1f2937,#1f2937)]">
                {!imageSource && editorMode === "upload" ? (
                  <label className="photo-dropzone grid min-h-[320px] w-[min(100%,420px)] cursor-pointer place-items-center gap-2.5 rounded-3xl border-2 border-dashed border-blue-500/34 bg-white/60 p-6 text-center text-blue-600 [&>input]:hidden [&>svg]:text-[30px]">
                    <input type="file" accept="image/*" onChange={handleFileSelect} />
                    <FaCloudArrowUp />
                    <strong>Select a photo</strong>
                    <span>PNG, JPG, JPEG, WEBP and more</span>
                  </label>
                ) : null}

                {!imageSource && editorMode === "camera" ? (
                  <div className="photo-camera-panel grid w-full justify-items-center gap-3.5">
                    <div className="photo-camera-frame relative aspect-square w-[min(100%,420px)] overflow-hidden rounded-[28px] bg-blue-100 dark:border dark:border-ui-border-dark dark:bg-ui-card-dark [&>video]:h-full [&>video]:w-full [&>video]:object-cover">
                      <video ref={videoRef} muted playsInline autoPlay />
                      {isStartingCamera ? (
                        <div className="photo-camera-status absolute inset-[auto_14px_14px_14px] rounded-2xl bg-slate-900/72 px-3 py-2.5 text-center font-semibold text-white">
                          Starting camera...
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                      onClick={captureFromCamera}
                      disabled={isStartingCamera}
                    >
                      <FaCamera /> Capture Photo
                    </button>
                  </div>
                ) : null}

                {imageSource ? (
                  <div
                    ref={stageRef}
                    className="photo-crop-stage relative aspect-square w-[min(100%,420px)] cursor-grab touch-none select-none overflow-hidden rounded-[28px] bg-blue-100 active:cursor-grabbing dark:border dark:border-ui-border-dark dark:bg-ui-card-dark"
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                  >
                    <img
                      src={imageSource}
                      alt="Crop preview"
                      className="photo-crop-image absolute left-1/2 top-1/2 h-full w-full origin-center -translate-x-1/2 -translate-y-1/2 object-cover"
                      style={cropStyle}
                    />
                    <div className="photo-crop-mask pointer-events-none absolute inset-0 rounded-[28px] border-2 border-white/92 shadow-[inset_0_0_0_999px_rgba(15,23,42,0.2)]" />
                  </div>
                ) : null}
              </div>

              <div className="photo-cropper-controls grid gap-4">
                <div className="photo-cropper-card grid gap-4 rounded-3xl border border-slate-400/[0.18] bg-ui-card-muted p-[18px] dark:border-ui-border-dark dark:bg-ui-card-muted-dark">
                  <div className="photo-cropper-card-head flex items-center gap-2.5 text-slate-900 dark:text-ui-text-dark">
                    <FaCropSimple />
                    <strong>Crop Controls</strong>
                  </div>
                  <label className="photo-slider-group grid gap-2">
                    <span className="font-semibold text-slate-600 dark:text-ui-text-muted-dark">Zoom</span>
                    <input
                      type="range"
                      min="1"
                      max="2.6"
                      step="0.01"
                      value={zoom}
                      onChange={(event) => setZoom(Number(event.target.value))}
                      disabled={!imageSource}
                      className="w-full"
                    />
                  </label>
                  <div className="photo-cropper-actions flex items-center">
                    <button
                      type="button"
                      className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                      disabled={!imageSource}
                    >
                      <FaRotateLeft /> Reset Crop
                    </button>
                    <button
                      type="button"
                      className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                      onClick={() => resetEditorState(editorMode)}
                    >
                      Choose Again
                    </button>
                  </div>
                  {editorError ? <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{editorError}</p> : null}
                </div>

                <div className="photo-cropper-card grid gap-4 rounded-3xl border border-slate-400/[0.18] bg-ui-card-muted p-[18px] dark:border-ui-border-dark dark:bg-ui-card-muted-dark">
                  <div className="photo-cropper-card-head flex items-center gap-2.5 text-slate-900 dark:text-ui-text-dark">
                    <FaUser />
                    <strong>Preview Guidance</strong>
                  </div>
                  <ul className="plain-list profile-plain-list m-0 flex flex-col gap-2.5 pl-[18px]">
                    <li>Center your face inside the square crop area.</li>
                    <li>Use a little zoom so the face is clearly visible.</li>
                    <li>Camera capture and file upload both support the same crop flow.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="photo-cropper-footer flex items-center justify-between gap-4">
              <button
                type="button"
                className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                onClick={closeEditor}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                onClick={saveCroppedPhoto}
                disabled={!imageSource || isSaving}
              >
                <FaFloppyDisk /> {isSaving ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEditingInfo ? (
        <div className="photo-cropper-overlay fixed inset-0 z-[1700] grid place-items-center bg-slate-900/56 p-[18px] backdrop-blur-md">
          <div
            className="photo-cropper-modal profile-edit-modal w-[min(760px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-auto rounded-[28px] bg-ui-card p-6 shadow-[0_28px_80px_rgba(15,23,42,0.32)] dark:bg-ui-card-dark dark:text-ui-text-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="photo-cropper-header flex items-center justify-between gap-4">
              <div>
                <h3 className="m-[0_0_6px] text-[1.6rem]">Edit Profile Information</h3>
                <p className="m-0 text-ui-text-muted dark:text-ui-text-muted-dark">Update the faculty details shown on your profile page.</p>
              </div>
              <button
                type="button"
                className="photo-cropper-close h-[42px] w-[42px] cursor-pointer rounded-full border border-ui-border bg-ui-card-muted text-ui-text dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark"
                onClick={() => setIsEditingInfo(false)}
              >
                <FaXmark />
              </button>
            </div>

            <div className="faculty-profile-form-grid mt-5 grid grid-cols-2 gap-4">
              <label className="field-label text-ui-text dark:text-ui-text-dark [&>input]:w-full [&>input]:rounded-2xl [&>input]:border [&>input]:border-slate-400/26 [&>input]:bg-slate-50/92 [&>input]:p-[14px_16px] [&>input]:text-slate-900 [&>input]:focus:border-blue-500/56 [&>input]:focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] [&>input]:focus:bg-white [&>input]:focus:outline-none dark:[&>input]:border-slate-600/80 dark:[&>input]:bg-slate-900/85 dark:[&>input]:text-ui-text-dark [&>span]:text-xs [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.06em] [&>span]:text-ui-text-muted dark:[&>span]:text-ui-text-muted-dark">
                <span>Full Name</span>
                <input value={infoForm.name} onChange={(event) => setInfoForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field-label text-ui-text dark:text-ui-text-dark [&>input]:w-full [&>input]:rounded-2xl [&>input]:border [&>input]:border-slate-400/26 [&>input]:bg-slate-50/92 [&>input]:p-[14px_16px] [&>input]:text-slate-900 [&>input]:focus:border-blue-500/56 [&>input]:focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] [&>input]:focus:bg-white [&>input]:focus:outline-none dark:[&>input]:border-slate-600/80 dark:[&>input]:bg-slate-900/85 dark:[&>input]:text-ui-text-dark [&>span]:text-xs [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.06em] [&>span]:text-ui-text-muted dark:[&>span]:text-ui-text-muted-dark">
                <span>Phone</span>
                <input value={infoForm.phone} onChange={(event) => setInfoForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="field-label text-ui-text dark:text-ui-text-dark [&>input]:w-full [&>input]:rounded-2xl [&>input]:border [&>input]:border-slate-400/26 [&>input]:bg-slate-50/92 [&>input]:p-[14px_16px] [&>input]:text-slate-900 [&>input]:focus:border-blue-500/56 [&>input]:focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] [&>input]:focus:bg-white [&>input]:focus:outline-none dark:[&>input]:border-slate-600/80 dark:[&>input]:bg-slate-900/85 dark:[&>input]:text-ui-text-dark [&>span]:text-xs [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.06em] [&>span]:text-ui-text-muted dark:[&>span]:text-ui-text-muted-dark">
                <span>Qualification</span>
                <input value={infoForm.qualification} onChange={(event) => setInfoForm((current) => ({ ...current, qualification: event.target.value }))} />
              </label>
              <label className="field-label faculty-profile-form-wide col-span-2 text-ui-text dark:text-ui-text-dark [&>textarea]:w-full [&>textarea]:min-h-[120px] [&>textarea]:resize-y [&>textarea]:rounded-2xl [&>textarea]:border [&>textarea]:border-slate-400/26 [&>textarea]:bg-slate-50/92 [&>textarea]:p-[14px_16px] [&>textarea]:text-slate-900 [&>textarea]:focus:border-blue-500/56 [&>textarea]:focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] [&>textarea]:focus:bg-white [&>textarea]:focus:outline-none dark:[&>textarea]:border-slate-600/80 dark:[&>textarea]:bg-slate-900/85 dark:[&>textarea]:text-ui-text-dark [&>span]:text-xs [&>span]:font-bold [&>span]:uppercase [&>span]:tracking-[0.06em] [&>span]:text-ui-text-muted dark:[&>span]:text-ui-text-muted-dark">
                <span>Address</span>
                <textarea rows={4} value={infoForm.address} onChange={(event) => setInfoForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
            </div>

            <div className="photo-cropper-footer flex items-center justify-between gap-4">
              <button
                type="button"
                className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                onClick={() => setIsEditingInfo(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                onClick={saveProfileInfo}
                disabled={isSavingInfo}
              >
                <FaFloppyDisk /> {isSavingInfo ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEditingTimetable ? (
        <div className="photo-cropper-overlay fixed inset-0 z-[1700] grid place-items-center bg-slate-900/56 p-[18px] backdrop-blur-md">
          <div
            className="photo-cropper-modal profile-edit-modal faculty-timetable-modal w-[min(860px,calc(100vw-24px))] max-h-[calc(100vh-24px)] overflow-auto rounded-[28px] bg-ui-card p-6 shadow-[0_28px_80px_rgba(15,23,42,0.32)] dark:bg-ui-card-dark dark:text-ui-text-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <form onSubmit={saveTimetableSlot}>
              <div className="photo-cropper-header flex items-center justify-between gap-4">
                <div>
                  <h3 className="m-[0_0_6px] text-[1.6rem]">{timetableForm.id ? "Edit Timetable Slot" : "Add Timetable Slot"}</h3>
                  <p className="m-0 text-ui-text-muted dark:text-ui-text-muted-dark">Set the day, time, class, and room for one lecture slot. Overlapping times for the same day are blocked automatically.</p>
                </div>
                <button type="button" className="photo-cropper-close h-[42px] w-[42px] cursor-pointer rounded-full border border-ui-border bg-ui-card-muted text-ui-text dark:border-ui-border-dark dark:bg-ui-card-muted-dark dark:text-ui-text-dark" onClick={closeTimetableEditor}>
                  <FaXmark />
                </button>
              </div>

              <div className="faculty-timetable-form-grid mt-5 grid grid-cols-3 gap-4 max-[992px]:grid-cols-1">
                <label className={TIMETABLE_FIELD_LABEL_CLASS}>
                  <span>Day</span>
                  <select value={timetableForm.day} onChange={(event) => setTimetableForm((current) => ({ ...current, day: event.target.value }))}>
                    {TIMETABLE_DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={TIMETABLE_FIELD_LABEL_CLASS}>
                  <span>Start Time</span>
                  <select value={timetableForm.start_time} onChange={(event) => setTimetableForm((current) => ({ ...current, start_time: event.target.value }))}>
                    {TIMETABLE_TIME_OPTIONS.map((time) => (
                      <option key={`start-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={TIMETABLE_FIELD_LABEL_CLASS}>
                  <span>End Time</span>
                  <select value={timetableForm.end_time} onChange={(event) => setTimetableForm((current) => ({ ...current, end_time: event.target.value }))}>
                    {TIMETABLE_TIME_OPTIONS.map((time) => (
                      <option key={`end-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${TIMETABLE_FIELD_LABEL_CLASS} faculty-profile-form-wide col-span-3 max-[992px]:col-span-1`}>
                  <span>Subject</span>
                  <select
                    value={timetableForm.subject_value}
                    onChange={(event) => {
                      const selectedSubject = subjectOptions.find((item) => String(item.value || "").trim() === String(event.target.value || "").trim());
                      setTimetableForm((current) => ({
                        ...current,
                        subject_value: event.target.value,
                        subject_code: selectedSubject?.subject_code || "",
                        subject: selectedSubject?.subject_name || selectedSubject?.label || "",
                        branch: String(selectedSubject?.branch || current.branch || "").trim().toUpperCase(),
                        semester: selectedSubject?.semester !== undefined && selectedSubject?.semester !== null ? String(selectedSubject.semester) : current.semester,
                        section: String(selectedSubject?.section || current.section || "A").trim().toUpperCase(),
                        class_value: selectedSubject ? `${String(selectedSubject.branch || "").trim().toUpperCase()}|${String(selectedSubject.semester ?? "").trim()}|${String(selectedSubject.section || "").trim().toUpperCase()}` : current.class_value,
                        classroom: selectedSubject?.classroom || current.classroom,
                      }));
                    }}
                    disabled={!subjectOptions.length}
                  >
                    <option value="">{subjectOptions.length ? "Select subject" : "No subjects assigned"}</option>
                    {subjectOptions.map((subject) => {
                      const value = String(subject.value || "").trim();
                      const label = subject.label || subject.subject_name || value;
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className={TIMETABLE_FIELD_LABEL_CLASS}>
                  <span>Branch</span>
                  <select
                    value={timetableForm.branch}
                    onChange={(event) =>
                      setTimetableForm((current) => {
                        const nextBranch = event.target.value;
                        const currentClass = (filteredClassOptions || []).find((item) => item.value === current.class_value);
                        const keepCurrentClass = currentClass && currentClass.branch === nextBranch;
                        return {
                          ...current,
                          branch: nextBranch,
                          class_value: keepCurrentClass ? current.class_value : "",
                          semester: keepCurrentClass ? current.semester : "",
                          section: keepCurrentClass ? current.section : "A",
                          subject: keepCurrentClass ? current.subject : "",
                          subject_code: keepCurrentClass ? current.subject_code : "",
                          subject_value: keepCurrentClass ? current.subject_value : "",
                        };
                      })
                    }
                    disabled={Boolean(timetableForm.subject_value)}
                  >
                    <option value="">Select branch</option>
                    {availableBranches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={TIMETABLE_FIELD_LABEL_CLASS}>
                  <span>Semester</span>
                  <select
                    value={timetableForm.semester}
                    onChange={(event) =>
                      setTimetableForm((current) => ({
                        ...current,
                        semester: event.target.value,
                        class_value: "",
                        section: availableSections.includes(String(current.section || "").trim().toUpperCase()) ? current.section : "A",
                        subject: "",
                        subject_code: "",
                        subject_value: "",
                      }))
                    }
                    disabled={!availableSemesters.length || Boolean(timetableForm.subject_value)}
                  >
                    <option value="">{availableSemesters.length ? "Select semester" : "No semesters found"}</option>
                    {availableSemesters.map((semester) => (
                      <option key={semester} value={semester}>
                        {semester}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={TIMETABLE_FIELD_LABEL_CLASS}>
                  <span>Section</span>
                  <select
                    value={timetableForm.section}
                    onChange={(event) =>
                      setTimetableForm((current) => ({
                        ...current,
                        section: event.target.value,
                        class_value: "",
                        subject: "",
                        subject_code: "",
                        subject_value: "",
                      }))
                    }
                    disabled={!availableSections.length || Boolean(timetableForm.subject_value)}
                  >
                    <option value="">{availableSections.length ? "Select section" : "No sections found"}</option>
                    {availableSections.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={`${TIMETABLE_FIELD_LABEL_CLASS} faculty-profile-form-wide col-span-3 max-[992px]:col-span-1`}>
                  <span>Classroom</span>
                  <select value={timetableForm.classroom} onChange={(event) => setTimetableForm((current) => ({ ...current, classroom: event.target.value }))}>
                    <option value="">Select classroom</option>
                    {(timetableOptions.classrooms || []).map((classroom) => (
                      <option key={classroom} value={classroom}>
                        {classroom}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {timetableError ? <p className="error-copy faculty-timetable-error mt-4 rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{timetableError}</p> : null}

              <div className="photo-cropper-footer flex items-center justify-between gap-4">
                <div className="faculty-timetable-modal-actions inline-flex items-center gap-3">
                  {timetableForm.id ? (
                    <button
                      type="button"
                      className="pagination-btn danger-btn inline-flex items-center gap-1.5 rounded-md border border-red-400/26 bg-red-50/95 px-4 py-2 font-medium text-red-600 transition-[background,border-color,color,box-shadow] duration-[160ms]"
                      onClick={() => deleteTimetableSlot({ id: timetableForm.id, subject: timetableForm.subject, day: timetableForm.day })}
                      disabled={isDeletingTimetable === timetableForm.id}
                    >
                      <FaTrash /> {isDeletingTimetable === timetableForm.id ? "Deleting..." : "Delete Slot"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="pagination-btn inline-flex items-center gap-1.5 rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[background,border-color,color,box-shadow] duration-[160ms] hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark"
                    onClick={closeTimetableEditor}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  type="submit"
                  className="primary-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                  disabled={isSavingTimetable}
                >
                  <FaFloppyDisk /> {isSavingTimetable ? "Saving..." : timetableForm.id ? "Update Slot" : "Add Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default FacultyProfile;
