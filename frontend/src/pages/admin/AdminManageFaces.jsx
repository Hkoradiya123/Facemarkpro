import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FaArrowsRotate, FaCamera, FaCloudArrowUp, FaPlus, FaTrash, FaXmark } from "react-icons/fa6";
import { apiUrl, useSessionProfile } from "../../utils/auth";
import { adminNav } from "../../utils/constants";
import { PageShell, SectionCard, SkeletonBlock } from "../../components/Shared";

function FaceRegistrationsSkeleton({ rows = 7 }) {
  return (
    <div className="table-wrap skeleton-table-wrap faces-table-skeleton-shell">
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
                <SkeletonBlock className="skeleton-line faces-cell-roll" />
              </td>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-name" />
              </td>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-class" />
              </td>
              <td>
                <SkeletonBlock className="skeleton-line faces-cell-section" />
              </td>
              <td>
                <div className="faces-cell-actions">
                  <SkeletonBlock className="skeleton-block faces-action-dot" />
                  <SkeletonBlock className="skeleton-block faces-action-dot" />
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
        <div className="admin-table-toolbar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by student, roll no, branch, or class..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <button className="pagination-btn" type="button" onClick={() => openRegisterModal("", "create")}>
            <FaCamera /> Open Register Face
          </button>
        </div>

        {actionMessage ? <p className="success-copy">{actionMessage}</p> : null}

        {loading ? (
          <FaceRegistrationsSkeleton rows={7} />
        ) : error ? (
          <p className="error-copy">{error}</p>
        ) : paginatedFaces.length === 0 ? (
          <div className="empty-state-actions">
            <p className="muted-copy">No registered faces found.</p>
            <button className="primary-btn" type="button" onClick={() => openRegisterModal("", "create")}>
              <FaCamera /> Register First Face
            </button>
          </div>
        ) : (
          <>
            <div className="table-wrap">
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
                      <td className="student-roll"><strong>{f.student_roll || "-"}</strong></td>
                      <td className="student-name">{f.student_name || "-"}</td>
                      <td>
                        <span className="semester-badge">
                          {f.branch || "-"}-{f.semester || "-"}
                        </span>
                      </td>
                      <td>
                        <span className="dept-badge">{f.section || "A"}</span>
                      </td>
                      <td>
                        <div className="admin-inline-actions">
                          <button
                            className="face-action-btn reregister"
                            onClick={() => openRegisterModal(f.student_roll, "replace")}
                            title="Re-register Face"
                            aria-label="Re-register Face"
                            disabled={Boolean(deletingRoll)}
                          >
                            <FaArrowsRotate />
                          </button>
                          <button
                            className="face-action-btn delete"
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
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">Page {currentPage} of {totalPages}</span>
                <button
                  className="pagination-btn"
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
        <div className="admin-modal-overlay" onClick={closeRegisterModal}>
          <div className="admin-modal admin-face-register-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{registerMode === "replace" ? "Re-register Face" : "Add New Face"}</h3>
              <button className="admin-modal-close" onClick={closeRegisterModal}>
                <FaXmark />
              </button>
            </div>
            <div className="admin-modal-body admin-face-register-body">
              <div className="admin-student-picker">
                <label className="admin-form-label" htmlFor="face-student-search">
                  <span>Select Student</span>
                </label>
                <input
                  id="face-student-search"
                  type="text"
                  className="admin-form-input admin-student-search"
                  placeholder="Type name, roll number, branch, semester, or section"
                  value={registerStudentSearch}
                  onChange={(e) => setRegisterStudentSearch(e.target.value)}
                />
                <div className="admin-student-results" role="listbox" aria-label="Student search results">
                  {filteredRegisterStudents.length ? (
                    filteredRegisterStudents.map((student) => {
                      const isActive = String(student.roll_no || "") === String(registerStudentRoll || "");
                      return (
                        <button
                          key={student._id || student.roll_no}
                          type="button"
                          className={`admin-student-result${isActive ? " active" : ""}`}
                          onClick={() => {
                            setRegisterStudentRoll(String(student.roll_no || ""));
                            setRegisterStudentSearch(
                              `${student.name} (${student.roll_no}) - ${student.branch}-${student.semester}${student.section}`
                            );
                          }}
                        >
                          <strong>{student.name} <span>({student.roll_no})</span></strong>
                          <small>{student.branch}-{student.semester}{student.section}</small>
                        </button>
                      );
                    })
                  ) : (
                    <div className="admin-student-results-empty">No matching students found.</div>
                  )}
                </div>
              </div>

              {selectedStudent ? (
                <div className="admin-info-row">
                  <strong>Selected:</strong> {selectedStudent.name} ({selectedStudent.roll_no}) / {selectedStudent.branch}-{selectedStudent.semester}{selectedStudent.section}
                </div>
              ) : null}

              {registerMode === "replace" ? (
                <p className="admin-confirm-message">
                  Old face embeddings will only be removed after the new 3 photos are processed successfully.
                </p>
              ) : null}

              <div className="admin-face-slot-grid">
                {registerPhotos.map((photo, index) => (
                  <div
                    key={`face-slot-${index}`}
                    className={`admin-face-slot${photo ? " filled" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropFile(index, e)}
                  >
                    <input
                      ref={(element) => {
                        fileInputRefs.current[index] = element;
                      }}
                      type="file"
                      accept="image/*"
                      className="admin-face-slot-input"
                      onChange={(e) => onChooseFile(index, e)}
                    />
                    {photo ? (
                      <>
                        <img src={photo.previewUrl} alt={`Face slot ${index + 1}`} className="admin-face-slot-preview" />
                        <div className="admin-face-slot-overlay">
                          <strong>Photo {index + 1}</strong>
                          <span>{photo.source}</span>
                        </div>
                      </>
                    ) : (
                      <div className="admin-face-slot-empty">
                        <strong>Photo {index + 1}</strong>
                        <span>Upload, drag and drop, or use camera</span>
                      </div>
                    )}
                    <div className="admin-face-slot-actions">
                      <button type="button" className="pagination-btn" onClick={() => fileInputRefs.current[index]?.click()}>
                        <FaCloudArrowUp /> Upload
                      </button>
                      <button type="button" className="pagination-btn" onClick={() => openCameraForSlot(index)}>
                        <FaCamera /> Camera
                      </button>
                      {photo ? (
                        <button type="button" className="pagination-btn" onClick={() => removePhotoForSlot(index)}>
                          <FaXmark /> Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-confirm-actions">
                <button className="pagination-btn" onClick={closeRegisterModal}>
                  Cancel
                </button>
                <button className="primary-btn" onClick={registerFace} disabled={registerLoading}>
                  <FaPlus /> {registerLoading ? (registerMode === "replace" ? "Re-registering..." : "Registering...") : (registerMode === "replace" ? "Re-register Face" : "Register Face")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cameraState.open ? (
        <div
          className="admin-modal-overlay"
          onClick={() => {
            stopCameraStream();
            setCameraState({ open: false, slotIndex: null, error: "", starting: false });
          }}
        >
          <div className="admin-modal admin-face-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Capture Face Photo</h3>
              <button
                className="admin-modal-close"
                onClick={() => {
                  stopCameraStream();
                  setCameraState({ open: false, slotIndex: null, error: "", starting: false });
                }}
              >
                <FaXmark />
              </button>
            </div>
            <div className="admin-modal-body admin-face-camera-body">
              <div className="admin-face-camera-frame">
                <video ref={cameraVideoRef} autoPlay playsInline muted />
                {cameraState.starting ? <span className="admin-face-camera-status">Starting camera...</span> : null}
              </div>
              {cameraState.error ? <p className="error-copy">{cameraState.error}</p> : null}
              <div className="admin-confirm-actions">
                <button
                  className="pagination-btn"
                  onClick={() => {
                    stopCameraStream();
                    setCameraState({ open: false, slotIndex: null, error: "", starting: false });
                  }}
                >
                  Cancel
                </button>
                <button className="primary-btn" onClick={captureCameraPhoto} disabled={cameraState.starting || Boolean(cameraState.error)}>
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
