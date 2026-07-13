import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaArrowsRotate, FaCamera, FaCloudArrowUp, FaPlus, FaTrash, FaXmark } from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, SkeletonBlock } from "../../components/Shared";

const MODAL_OVERLAY_CLASS = "admin-modal-overlay fixed inset-0 z-[1600] grid place-items-center bg-slate-900/45 p-5";
const MODAL_HEADER_CLASS = "admin-modal-header flex items-center justify-between border-b border-slate-200 p-[14px_18px] dark:border-ui-border-dark";
const MODAL_CLOSE_CLASS = "admin-modal-close h-8 w-8 cursor-pointer rounded-lg border border-slate-300 bg-white text-base text-slate-600 dark:border-ui-border-dark dark:bg-[#111827] dark:text-ui-text-dark";
const MODAL_TITLE_CLASS = "m-0 text-[1.05rem] text-slate-800 dark:text-ui-text-dark";
const PAGINATION_BTN_CLASS =
  "pagination-btn rounded-md border border-ui-border bg-white px-4 py-2 font-medium text-slate-600 transition-[transform,background,border-color,color,box-shadow] duration-[160ms] hover:-translate-y-px hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-ui-border-dark dark:bg-ui-card-dark dark:text-ui-text-dark";
const PRIMARY_BTN_CLASS =
  "primary-btn inline-flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-[linear-gradient(135deg,#6366f1_0%,#8b5cf6_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(99,102,241,0.3)] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(99,102,241,0.4)] disabled:cursor-not-allowed disabled:opacity-70";
const ADMIN_FORM_LABEL_CLASS = "admin-form-label text-base font-medium text-zinc-700 dark:text-ui-text-dark";

function FaceRegistrationsSkeleton({ rows = 7 }) {
  return (
    <div className="table-wrap skeleton-table-wrap faces-table-skeleton-shell w-full max-w-full min-w-0 overflow-auto rounded-[14px]">
      <table className="admin-table faces-table-skeleton-table" aria-hidden="true">
        <thead>
          <tr>
            <th>Roll Number</th>
            <th>Name</th>
            <th>Class</th>
            <th>Section</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <tr key={`face-skeleton-row-${rowIndex}`}>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-roll h-3 w-[70%] rounded-full" />
              </td>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-name h-3 w-[85%] rounded-full" />
              </td>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-class h-3 w-[55%] rounded-full" />
              </td>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-section h-3 w-[40%] rounded-full" />
              </td>
              <td>
                <div className="faces-cell-actions flex items-center gap-2">
                  <SkeletonBlock className="skeleton-block faces-action-dot h-9 w-9 rounded-lg" />
                  <SkeletonBlock className="skeleton-block faces-action-dot h-9 w-9 rounded-lg" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminManageFaces() {
  const location = useLocation();
  const profile = useSessionProfile("admin");
  const fileInputRefs = useRef([]);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [faces, setFaces] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMode, setRegisterMode] = useState("create");
  const [deletingRoll, setDeletingRoll] = useState("");
  const [registerStudentRoll, setRegisterStudentRoll] = useState("");
  const [registerStudentSearch, setRegisterStudentSearch] = useState("");
  const [registerPhotos, setRegisterPhotos] = useState([null, null, null]);
  const [cameraState, setCameraState] = useState({ open: false, slotIndex: null, error: "", starting: false });
  const itemsPerPage = 10;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rollFromQuery = params.get("roll");
    const shouldOpenModal = params.get("open") === "1";
    const nextMode = params.get("mode") === "replace" ? "replace" : "create";
    if (rollFromQuery) {
      setSearchQuery(rollFromQuery);
    }
    if (shouldOpenModal) {
      openRegisterModal(rollFromQuery || "", nextMode);
    }
  }, [location.search]);

  useEffect(() => {
    loadFaces();
    loadStudents();
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  async function loadFaces() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/admin/faces"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.faces)) {
        setFaces(data.faces);
      } else {
        setError(data.message || "Failed to load registered faces.");
      }
    } catch (err) {
      console.error("Faces load error:", err);
      setError("Network error while loading faces.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents() {
    try {
      const res = await fetch(apiUrl("/api/admin/students"), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.students)) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Students load error:", err);
    }
  }

  const filteredFaces = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return faces.filter((f) =>
      (f.student_name || "").toLowerCase().includes(q) ||
      (f.student_roll || "").toLowerCase().includes(q) ||
      (f.branch || "").toLowerCase().includes(q) ||
      (f.class_file || "").toLowerCase().includes(q)
    );
  }, [faces, searchQuery]);

  const totalPages = Math.ceil(filteredFaces.length / itemsPerPage) || 1;
  const paginatedFaces = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredFaces.slice(start, start + itemsPerPage);
  }, [filteredFaces, currentPage]);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.roll_no || "") === String(registerStudentRoll || "")) || null,
    [students, registerStudentRoll]
  );

  useEffect(() => {
    if (!registerModalOpen || !selectedStudent) return;
    const currentSearch = String(registerStudentSearch || "").trim();
    const selectedLabel = `${selectedStudent.name} (${selectedStudent.roll_no}) - ${selectedStudent.branch}-${selectedStudent.semester}${selectedStudent.section}`;
    if (!currentSearch || currentSearch === String(selectedStudent.roll_no || "").trim()) {
      setRegisterStudentSearch(selectedLabel);
    }
  }, [registerModalOpen, registerStudentSearch, selectedStudent]);

  const filteredRegisterStudents = useMemo(() => {
    const query = String(registerStudentSearch || "").trim().toLowerCase();
    const orderedStudents = [...students].sort((first, second) => {
      const firstSelected = String(first.roll_no || "") === String(registerStudentRoll || "");
      const secondSelected = String(second.roll_no || "") === String(registerStudentRoll || "");
      if (firstSelected && !secondSelected) return -1;
      if (!firstSelected && secondSelected) return 1;
      return String(first.name || "").localeCompare(String(second.name || ""));
    });

    if (!query) {
      return orderedStudents.slice(0, 12);
    }

    return orderedStudents
      .filter((student) =>
        [
          student.name,
          student.roll_no,
          student.branch,
          student.semester,
          student.section,
        ].some((value) => String(value || "").toLowerCase().includes(query))
      )
      .slice(0, 12);
  }, [registerStudentRoll, registerStudentSearch, students]);

  function revokePhotoPreview(photo) {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
  }

  function openRegisterModal(prefillRoll = "", mode = "create") {
    setError("");
    setActionMessage("");
    setRegisterMode(mode);
    setRegisterStudentRoll(prefillRoll || "");
    setRegisterStudentSearch(prefillRoll || "");
    setRegisterPhotos((current) => {
      current.forEach((photo) => revokePhotoPreview(photo));
      return [null, null, null];
    });
    setRegisterModalOpen(true);
  }

  function stopCameraStream() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  function closeRegisterModal() {
    setRegisterModalOpen(false);
    setRegisterLoading(false);
    setRegisterMode("create");
    setRegisterStudentSearch("");
    setRegisterPhotos((current) => {
      current.forEach((photo) => revokePhotoPreview(photo));
      return [null, null, null];
    });
    stopCameraStream();
    setCameraState({ open: false, slotIndex: null, error: "", starting: false });
  }

  function setPhotoForSlot(slotIndex, file, source = "upload") {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setRegisterPhotos((current) =>
      current.map((item, index) => {
        if (index !== slotIndex) return item;
        revokePhotoPreview(item);
        return {
          file,
          previewUrl,
          source,
          name: file.name,
        };
      })
    );
  }

  function removePhotoForSlot(slotIndex) {
    setRegisterPhotos((current) =>
      current.map((item, index) => {
        if (index !== slotIndex) return item;
        revokePhotoPreview(item);
        return null;
      })
    );
  }

  function onChooseFile(slotIndex, event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoForSlot(slotIndex, file, "upload");
    event.target.value = "";
  }

  function onDropFile(slotIndex, event) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    setPhotoForSlot(slotIndex, file, "drop");
  }

  async function openCameraForSlot(slotIndex) {
    stopCameraStream();
    setCameraState({ open: true, slotIndex, error: "", starting: true });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => {});
      }
      setCameraState({ open: true, slotIndex, error: "", starting: false });
    } catch {
      setCameraState({ open: true, slotIndex, error: "Unable to access camera.", starting: false });
    }
  }

  async function captureCameraPhoto() {
    if (!cameraVideoRef.current || cameraState.slotIndex == null) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;

    const file = new File([blob], `face-slot-${cameraState.slotIndex + 1}.jpg`, { type: "image/jpeg" });
    setPhotoForSlot(cameraState.slotIndex, file, "camera");
    stopCameraStream();
    setCameraState({ open: false, slotIndex: null, error: "", starting: false });
  }

  async function registerFace() {
    if (registerLoading) return;
    if (!selectedStudent) {
      setError("Please select a student first.");
      return;
    }
    if (registerPhotos.some((item) => !item?.file)) {
      setError("Please provide 3 face photos before registering.");
      return;
    }

    setRegisterLoading(true);
    setError("");
    setActionMessage("");

    try {
      const formData = new FormData();
      formData.append("branch", String(selectedStudent.branch || ""));
      formData.append("semester", String(selectedStudent.semester || ""));
      formData.append("student_id", String(selectedStudent.roll_no || ""));
      if (registerMode === "replace") {
        formData.append("allow_replace", "1");
      }
      registerPhotos.forEach((photo, index) => {
        formData.append(`photo${index + 1}`, photo.file);
      });

      const response = await fetch(apiUrl("/register_student_face"), {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Face registration failed.");
      }

      if (registerMode === "replace") {
        const preserveClassFiles = [
          `${selectedStudent.branch}_${selectedStudent.semester}`,
          `${selectedStudent.branch}_${selectedStudent.semester}_${selectedStudent.section || "A"}`,
        ];
        const replaceResponse = await fetch(
          apiUrl(`/api/admin/faces/reregister/${encodeURIComponent(selectedStudent.roll_no || "")}`),
          {
            method: "POST",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ preserve_class_files: preserveClassFiles }),
          }
        );
        const replacePayload = await replaceResponse.json().catch(() => ({}));

        if (!replaceResponse.ok || !replacePayload.success) {
          throw new Error(replacePayload.message || "New face saved, but old face cleanup failed.");
        }

        setActionMessage(
          replacePayload.message || `Face re-registered for ${selectedStudent.name}. Old embeddings were replaced safely.`
        );
      } else {
        setActionMessage(payload.message || `Face registered for ${selectedStudent.name}.`);
      }

      closeRegisterModal();
      await loadFaces();
      await loadStudents();
    } catch (err) {
      setError(err.message || "Unable to register face.");
    } finally {
      setRegisterLoading(false);
    }
  }

  async function deleteFaceRegistration(faceRow) {
    const studentRoll = String(faceRow?.student_roll || "").trim();
    if (!studentRoll || deletingRoll) return;

    const confirmed = window.confirm(`Delete face data for ${studentRoll}? This will remove stored face embeddings.`);
    if (!confirmed) return;

    setDeletingRoll(studentRoll);
    setError("");
    setActionMessage("");

    try {
      const response = await fetch(apiUrl(`/api/admin/faces/reregister/${encodeURIComponent(studentRoll)}`), {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preserve_class_files: [] }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to delete face data.");
      }

      setActionMessage(`Face data deleted for ${studentRoll}.`);
      await loadFaces();
      await loadStudents();
    } catch (err) {
      setError(err.message || "Unable to delete face data.");
    } finally {
      setDeletingRoll("");
    }
  }

  return (
    <PageShell
      variant="admin"
      nav={adminNav}
      title="Manage Face Registrations"
      subtitle="All registered faces across classes."
      profile={profile}
    >
      <SectionCard title="Registered Faces">
        <div className="admin-table-toolbar mb-5 flex items-center gap-3">
          <input
            type="text"
            className="search-input flex-1 rounded-lg border border-slate-200 bg-white p-[10px_14px] text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] focus:outline-none dark:border-ui-border-dark dark:bg-[#0f172a] dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark"
            placeholder="Search by student, roll no, branch, or class..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button className={PAGINATION_BTN_CLASS} type="button" onClick={() => openRegisterModal("", "create")}>
            <FaCamera /> Open Register Face
          </button>
        </div>

        {actionMessage ? <p className="success-copy mb-3 rounded-md border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.08] p-3 text-sm text-emerald-700">{actionMessage}</p> : null}

        {loading ? (
          <FaceRegistrationsSkeleton rows={7} />
        ) : error ? (
          <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{error}</p>
        ) : paginatedFaces.length === 0 ? (
          <div className="empty-state-actions grid justify-items-start gap-3">
            <p className="muted-copy m-0 text-ui-text-muted dark:text-ui-text-muted-dark">No registered faces found.</p>
            <button className={PRIMARY_BTN_CLASS} type="button" onClick={() => openRegisterModal("", "create")}>
              <FaCamera /> Register First Face
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrap w-full max-w-full min-w-0 overflow-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFaces.map((f, idx) => (
                    <tr key={`${f.student_roll}-${f.class_file}-${idx}`}>
                      <td className="student-roll font-semibold text-slate-800"><strong>{f.student_roll || "-"}</strong></td>
                      <td className="student-name font-semibold text-slate-800">{f.student_name || "-"}</td>
                      <td>
                        <span className="semester-badge inline-block rounded-md bg-indigo-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3px] text-indigo-700">
                          {f.branch || "-"}-{f.semester || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="dept-badge inline-block rounded-md bg-slate-300 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.3px] text-slate-700">{f.section || "A"}</span>
                      </td>
                      <td>
                        <div className="admin-inline-actions inline-flex flex-wrap items-center gap-2">
                          <button
                            className="face-action-btn reregister inline-flex h-9 w-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-[13px] text-violet-700 transition-all duration-200 hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-55"
                            onClick={() => openRegisterModal(f.student_roll, "replace")}
                            title="Re-register Face"
                            aria-label="Re-register Face"
                            disabled={Boolean(deletingRoll)}
                          >
                            <FaArrowsRotate />
                          </button>
                          <button
                            className="face-action-btn delete inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-[13px] text-red-600 transition-all duration-200 hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-55"
                            onClick={() => deleteFaceRegistration(f)}
                            title={deletingRoll === String(f.student_roll || "").trim() ? "Deleting face data" : "Delete Face"}
                            aria-label={deletingRoll === String(f.student_roll || "").trim() ? "Deleting face data" : "Delete Face"}
                            disabled={deletingRoll === String(f.student_roll || "").trim()}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="pagination mt-6 flex items-center justify-center gap-4 pt-5">
                <button
                  className={PAGINATION_BTN_CLASS}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info min-w-[140px] text-center text-sm font-medium text-slate-500">Page {currentPage} of {totalPages}</span>
                <button
                  className={PAGINATION_BTN_CLASS}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </SectionCard>

      {registerModalOpen ? (
        <div className={MODAL_OVERLAY_CLASS} onClick={closeRegisterModal}>
          <div
            className="admin-modal admin-face-register-modal flex max-h-[calc(100dvh-24px)] w-[min(1040px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER_CLASS}>
              <h3 className={MODAL_TITLE_CLASS}>{registerMode === "replace" ? "Re-register Face" : "Add New Face"}</h3>
              <button className={MODAL_CLOSE_CLASS} onClick={closeRegisterModal}>
                <FaXmark />
              </button>
            </div>
            <div className="admin-modal-body admin-face-register-body grid gap-4 overflow-y-auto p-[16px_18px]">
              <div className="admin-student-picker grid gap-2.5">
                <label className={ADMIN_FORM_LABEL_CLASS} htmlFor="face-student-search">
                  <span>Select Student</span>
                </label>
                <input
                  id="face-student-search"
                  type="text"
                  className="admin-form-input admin-student-search w-full min-h-11 rounded-lg border border-[#cbd5e1] bg-white p-[10px_12px] text-base text-[#1f2937] focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] focus:outline-none dark:border-ui-border-dark dark:bg-[#0f172a] dark:text-ui-text-dark"
                  placeholder="Type name, roll number, branch, semester, or section"
                  value={registerStudentSearch}
                  onChange={(e) => setRegisterStudentSearch(e.target.value)}
                />
                <div className="admin-student-results grid max-h-[220px] gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-ui-border-dark dark:bg-ui-card-muted-dark" role="listbox" aria-label="Student search results">
                  {filteredRegisterStudents.length ? (
                    filteredRegisterStudents.map((student) => {
                      const isActive = String(student.roll_no || "") === String(registerStudentRoll || "");
                      return (
                        <button
                          key={student._id || student.roll_no}
                          type="button"
                          className={`admin-student-result${isActive ? " active" : ""} grid w-full cursor-pointer gap-1 rounded-xl border p-[12px_14px] text-left transition-[transform,border-color,background,box-shadow] duration-200 hover:-translate-y-px hover:border-blue-200 hover:shadow-[0_10px_18px_rgba(37,99,235,0.08)] ${
                            isActive ? "border-blue-400 bg-blue-50 dark:border-sky-300/72 dark:bg-slate-800/96" : "border-transparent bg-white text-slate-800 dark:bg-slate-900/96 dark:text-ui-text-dark"
                          }`}
                          onClick={() => {
                            setRegisterStudentRoll(String(student.roll_no || ""));
                            setRegisterStudentSearch(
                              `${student.name} (${student.roll_no}) - ${student.branch}-${student.semester}${student.section}`
                            );
                          }}
                        >
                          <strong className="text-[0.95rem] leading-[1.3]">{student.name} <span className="text-blue-600 dark:text-sky-300">({student.roll_no})</span></strong>
                          <small className="text-[0.84rem] text-slate-500 dark:text-ui-text-muted-dark">{student.branch}-{student.semester}{student.section}</small>
                        </button>
                      );
                    })
                  ) : (
                    <div className="admin-student-results-empty p-3.5 text-center text-sm text-slate-500 dark:text-ui-text-muted-dark">No matching students found.</div>
                  )}
                </div>
              </div>

              {selectedStudent ? (
                <div className="admin-info-row text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark">
                  <strong className="text-slate-900 dark:text-ui-text-dark">Selected:</strong> {selectedStudent.name} ({selectedStudent.roll_no}) / {selectedStudent.branch}-{selectedStudent.semester}{selectedStudent.section}
                </div>
              ) : null}

              {registerMode === "replace" ? (
                <p className="admin-confirm-message m-0 text-[0.96rem] text-slate-700 dark:text-ui-text-muted-dark">
                  Old face embeddings will only be removed after the new 3 photos are processed successfully.
                </p>
              ) : null}

              <div className="admin-face-slot-grid grid grid-cols-3 gap-3.5 max-[992px]:grid-cols-1">
                {registerPhotos.map((photo, index) => (
                  <div
                    key={`face-slot-${index}`}
                    className={`admin-face-slot${photo ? " filled" : ""} relative grid min-h-[260px] content-between gap-3 overflow-hidden rounded-[20px] border-2 border-dashed border-slate-400/45 bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_28%),linear-gradient(165deg,#ffffff_0%,#f8fafc_100%)] p-3.5 dark:bg-ui-card-dark ${
                      photo ? "border-solid border-blue-500/28" : ""
                    }`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropFile(index, e)}
                  >
                    <input
                      ref={(element) => {
                        fileInputRefs.current[index] = element;
                      }}
                      type="file"
                      accept="image/*"
                      className="admin-face-slot-input hidden"
                      onChange={(e) => onChooseFile(index, e)}
                    />
                    {photo ? (
                      <>
                        <img src={photo.previewUrl} alt={`Face slot ${index + 1}`} className="admin-face-slot-preview absolute inset-0 h-full w-full object-cover" />
                        <div className="admin-face-slot-overlay relative z-[1] grid w-fit gap-1 self-start rounded-2xl bg-slate-900/68 p-[10px_12px] text-white backdrop-blur-[8px]">
                          <strong className="text-[0.95rem]">Photo {index + 1}</strong>
                          <span className="text-[0.8rem] leading-[1.45]">{photo.source}</span>
                        </div>
                      </>
                    ) : (
                      <div className="admin-face-slot-empty relative z-[1] grid min-h-[150px] place-items-center gap-2 text-center text-slate-600">
                        <strong className="text-[0.95rem]">Photo {index + 1}</strong>
                        <span className="text-[0.8rem] leading-[1.45]">Upload, drag and drop, or use camera</span>
                      </div>
                    )}
                    <div className="admin-face-slot-actions relative z-[1] flex flex-wrap items-end gap-2 self-end">
                      <button type="button" className={`${PAGINATION_BTN_CLASS} inline-flex items-center gap-1.5`} onClick={() => fileInputRefs.current[index]?.click()}>
                        <FaCloudArrowUp /> Upload
                      </button>
                      <button type="button" className={`${PAGINATION_BTN_CLASS} inline-flex items-center gap-1.5`} onClick={() => openCameraForSlot(index)}>
                        <FaCamera /> Camera
                      </button>
                      {photo ? (
                        <button type="button" className={`${PAGINATION_BTN_CLASS} inline-flex items-center gap-1.5`} onClick={() => removePhotoForSlot(index)}>
                          <FaXmark /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-confirm-actions mt-3.5 flex justify-end gap-2.5">
                <button className={PAGINATION_BTN_CLASS} onClick={closeRegisterModal}>
                  Cancel
                </button>
                <button className={PRIMARY_BTN_CLASS} onClick={registerFace} disabled={registerLoading}>
                  <FaPlus /> {registerLoading ? (registerMode === "replace" ? "Re-registering..." : "Registering...") : (registerMode === "replace" ? "Re-register Face" : "Register Face")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cameraState.open ? (
        <div
          className={MODAL_OVERLAY_CLASS}
          onClick={() => {
            stopCameraStream();
            setCameraState({ open: false, slotIndex: null, error: "", starting: false });
          }}
        >
          <div
            className="admin-modal admin-face-camera-modal w-[min(620px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] dark:bg-ui-card-dark"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={MODAL_HEADER_CLASS}>
              <h3 className={MODAL_TITLE_CLASS}>Capture Face Photo</h3>
              <button
                className={MODAL_CLOSE_CLASS}
                onClick={() => {
                  stopCameraStream();
                  setCameraState({ open: false, slotIndex: null, error: "", starting: false });
                }}
              >
                <FaXmark />
              </button>
            </div>
            <div className="admin-modal-body admin-face-camera-body grid gap-4 p-[16px_18px]">
              <div className="admin-face-camera-frame relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-[#0f172a] [&>video]:h-full [&>video]:w-full [&>video]:object-cover">
                <video ref={cameraVideoRef} autoPlay playsInline muted />
                {cameraState.starting ? <span className="admin-face-camera-status absolute inset-[auto_14px_14px_14px] rounded-2xl bg-slate-900/72 px-3 py-2.5 text-center font-semibold text-white">Starting camera...</span> : null}
              </div>
              {cameraState.error ? <p className="error-copy rounded-md border-l-[3px] border-l-red-600 bg-red-600/5 p-3 text-sm text-red-600">{cameraState.error}</p> : null}
              <div className="admin-confirm-actions mt-3.5 flex justify-end gap-2.5">
                <button
                  className={PAGINATION_BTN_CLASS}
                  onClick={() => {
                    stopCameraStream();
                    setCameraState({ open: false, slotIndex: null, error: "", starting: false });
                  }}
                >
                  Cancel
                </button>
                <button className={PRIMARY_BTN_CLASS} onClick={captureCameraPhoto} disabled={cameraState.starting || Boolean(cameraState.error)}>
                  <FaCamera /> Capture
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default AdminManageFaces;
