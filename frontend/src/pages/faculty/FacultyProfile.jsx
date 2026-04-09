import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCamera,
  FaCloudArrowUp,
  FaCropSimple,
  FaEnvelope,
  FaFloppyDisk,
  FaIdBadge,
  FaLocationDot,
  FaPenToSquare,
  FaPhone,
  FaRotateLeft,
  FaUserGear,
  FaUser,
  FaXmark,
  FaBuilding,
  FaCalendarDays,
  FaGraduationCap,
} from "react-icons/fa6";

import { apiUrl, getStoredAuthRole, persistAuth, useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell } from "../../components/Shared";

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

      const response = await fetch(apiUrl("/faculty/profile/photo"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Photo upload failed");
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
        setDetails({
          name: user.name || details.name,
          email: user.email || details.email,
          department: user.department || details.department,
          role: user.role || details.role,
          photoPath: user.photo_path || details.photoPath,
        });
      } else {
        setDetails((current) => ({ ...current, photoPath: imageSource }));
      }

      setActionMessage("Profile photo updated successfully.");
      closeEditor();
    } catch {
      setEditorError("Could not save the new profile photo. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

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
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      }
    : undefined;

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
      subtitle="Personal details and profile photo settings."
      profile={profile}
    >
      <section className="faculty-profile-shell">
        <div className="faculty-profile-hero">
          <div className="faculty-profile-photo-card">
            <div className="faculty-profile-photo-frame">
              {details.photoPath ? (
                <img src={details.photoPath} alt={details.name} className="faculty-profile-photo-image" />
              ) : (
                <span>{(details.name || "F").slice(0, 1)}</span>
              )}
            </div>
            <div className="faculty-profile-photo-actions">
              <button type="button" className="primary-btn" onClick={() => openEditor("upload")}>
                <FaCloudArrowUp /> Upload New Photo
              </button>
              <button type="button" className="pagination-btn" onClick={() => openEditor("camera")}>
                <FaCamera /> Use Camera
              </button>
            </div>
          </div>

          <div className="faculty-profile-hero-copy">
            <span className="faculty-profile-kicker">Faculty Profile</span>
            <h2>{details.name}</h2>
            <p>Keep your profile polished with a clear photo, better framing, and a faculty page that matches the rest of the dashboard.</p>
            {actionMessage ? <div className="faculty-profile-success">{actionMessage}</div> : null}
            <div className="faculty-profile-meta-grid">
              {isProfileLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <article key={`profile-skeleton-${index}`} className="faculty-profile-meta-card is-loading">
                      <span className="skeleton-line skeleton-label" />
                      <strong className="skeleton-line skeleton-text" />
                    </article>
                  ))
                : infoCards.map((item) => {
                    const Icon = item.icon;

                    return (
                      <article key={item.label} className={`faculty-profile-meta-card${item.wide ? " wide" : ""}`}>
                        <span>
                          {Icon ? <Icon /> : null}
                          {item.label}
                        </span>
                        <strong>{item.value}</strong>
                      </article>
                    );
                  })}
            </div>
            <div className="faculty-profile-inline-actions">
              <button type="button" className="primary-btn" onClick={() => setIsEditingInfo(true)}>
                <FaPenToSquare /> Edit Information
              </button>
            </div>
          </div>
        </div>
      </section>

      {editorOpen ? (
        <div className="photo-cropper-overlay" onMouseUp={handlePointerUp} onTouchEnd={handlePointerUp}>
          <div className="photo-cropper-modal" onClick={(event) => event.stopPropagation()}>
            <div className="photo-cropper-header">
              <div>
                <h3>Edit Profile Photo</h3>
                <p>Upload or capture an image, then drag and zoom to crop it.</p>
              </div>
              <button type="button" className="photo-cropper-close" onClick={closeEditor}>
                <FaXmark />
              </button>
            </div>

            <div className="photo-cropper-toolbar">
              <button type="button" className={`photo-source-btn${editorMode === "upload" ? " active" : ""}`} onClick={() => resetEditorState("upload")}>
                <FaCloudArrowUp /> Upload
              </button>
              <button type="button" className={`photo-source-btn${editorMode === "camera" ? " active" : ""}`} onClick={() => resetEditorState("camera")}>
                <FaCamera /> Camera
              </button>
            </div>

            <div className="photo-cropper-body">
              <div className="photo-cropper-stage-panel">
                {!imageSource && editorMode === "upload" ? (
                  <label className="photo-dropzone">
                    <input type="file" accept="image/*" onChange={handleFileSelect} />
                    <FaCloudArrowUp />
                    <strong>Select a photo</strong>
                    <span>PNG, JPG, JPEG, WEBP and more</span>
                  </label>
                ) : null}

                {!imageSource && editorMode === "camera" ? (
                  <div className="photo-camera-panel">
                    <div className="photo-camera-frame">
                      <video ref={videoRef} muted playsInline autoPlay />
                      {isStartingCamera ? <div className="photo-camera-status">Starting camera...</div> : null}
                    </div>
                    <button type="button" className="primary-btn" onClick={captureFromCamera} disabled={isStartingCamera}>
                      <FaCamera /> Capture Photo
                    </button>
                  </div>
                ) : null}

                {imageSource ? (
                  <div
                    ref={stageRef}
                    className="photo-crop-stage"
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseLeave={handlePointerUp}
                    onTouchStart={handlePointerDown}
                    onTouchMove={handlePointerMove}
                  >
                    <img src={imageSource} alt="Crop preview" className="photo-crop-image" style={cropStyle} />
                    <div className="photo-crop-mask" />
                  </div>
                ) : null}
              </div>

              <div className="photo-cropper-controls">
                <div className="photo-cropper-card">
                  <div className="photo-cropper-card-head">
                    <FaCropSimple />
                    <strong>Crop Controls</strong>
                  </div>
                  <label className="photo-slider-group">
                    <span>Zoom</span>
                    <input type="range" min="1" max="2.6" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} disabled={!imageSource} />
                  </label>
                  <div className="photo-cropper-actions">
                    <button type="button" className="pagination-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} disabled={!imageSource}>
                      <FaRotateLeft /> Reset Crop
                    </button>
                    <button type="button" className="pagination-btn" onClick={() => resetEditorState(editorMode)}>
                      Choose Again
                    </button>
                  </div>
                  {editorError ? <p className="error-copy">{editorError}</p> : null}
                </div>

                <div className="photo-cropper-card">
                  <div className="photo-cropper-card-head">
                    <FaUser />
                    <strong>Preview Guidance</strong>
                  </div>
                  <ul className="plain-list profile-plain-list">
                    <li>Center your face inside the square crop area.</li>
                    <li>Use a little zoom so the face is clearly visible.</li>
                    <li>Camera capture and file upload both support the same crop flow.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="photo-cropper-footer">
              <button type="button" className="pagination-btn" onClick={closeEditor}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={saveCroppedPhoto} disabled={!imageSource || isSaving}>
                <FaFloppyDisk /> {isSaving ? "Saving..." : "Save Photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEditingInfo ? (
        <div className="photo-cropper-overlay">
          <div className="photo-cropper-modal profile-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="photo-cropper-header">
              <div>
                <h3>Edit Profile Information</h3>
                <p>Update the faculty details shown on your profile page.</p>
              </div>
              <button type="button" className="photo-cropper-close" onClick={() => setIsEditingInfo(false)}>
                <FaXmark />
              </button>
            </div>

            <div className="faculty-profile-form-grid">
              <label className="field-label">
                <span>Full Name</span>
                <input value={infoForm.name} onChange={(event) => setInfoForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field-label">
                <span>Phone</span>
                <input value={infoForm.phone} onChange={(event) => setInfoForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="field-label">
                <span>Qualification</span>
                <input value={infoForm.qualification} onChange={(event) => setInfoForm((current) => ({ ...current, qualification: event.target.value }))} />
              </label>
              <label className="field-label faculty-profile-form-wide">
                <span>Address</span>
                <textarea rows={4} value={infoForm.address} onChange={(event) => setInfoForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
            </div>

            <div className="photo-cropper-footer">
              <button type="button" className="pagination-btn" onClick={() => setIsEditingInfo(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn" onClick={saveProfileInfo} disabled={isSavingInfo}>
                <FaFloppyDisk /> {isSavingInfo ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default FacultyProfile;
