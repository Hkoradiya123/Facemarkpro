import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCamera,
  FaGear,
  FaArrowsRotate,
  FaPlay,
  FaStop,
  FaVideo,
  FaUpload,
  FaRepeat,
} from "react-icons/fa6";

import { apiUrl, useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell } from "../../components/Shared";

function FacultyAttendance() {
  const navigate = useNavigate();
  const profile = useSessionProfile("faculty");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const frameInFlightRef = useRef(false);

  const [classOptions, setClassOptions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [statusText, setStatusText] = useState("Ready. Select a class and start live attendance.");
  const [errorText, setErrorText] = useState("");
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [recognizedCount, setRecognizedCount] = useState(0);
  const [isMirrorOn, setIsMirrorOn] = useState(true);
  const [cameraFacingMode, setCameraFacingMode] = useState("user");

  const canStart = useMemo(() => Boolean(selectedClassId) && !isLive && !isStarting, [selectedClassId, isLive, isStarting]);

  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      setIsLoadingClasses(true);
      setErrorText("");
      try {
        const response = await fetch(apiUrl("/api/faculty/dashboard"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!mounted) return;

        if (!response.ok || !payload.success) {
          setErrorText("Unable to load classes for today.");
          setClassOptions([]);
          return;
        }

        const lectureMap = new Map();
        for (const lecture of payload.lectures || []) {
          if (!lecture?.branch || !lecture?.semester) continue;
          const classId = `${lecture.branch}_${lecture.semester}_${lecture.section || "A"}`;
          if (!lectureMap.has(classId)) {
            lectureMap.set(classId, {
              classId,
              label: `${lecture.subject || "Subject"} (${lecture.branch}-${lecture.semester}${lecture.section || ""})`,
              branch: lecture.branch,
              semester: lecture.semester,
              section: lecture.section || "",
              subject: lecture.subject || "",
            });
          }
        }

        const options = Array.from(lectureMap.values());
        setClassOptions(options);
        if (options.length) {
          setSelectedClassId(options[0].classId);
        }
      } catch {
        if (mounted) {
          setErrorText("Failed to load classes. Please try again.");
          setClassOptions([]);
        }
      } finally {
        if (mounted) {
          setIsLoadingClasses(false);
        }
      }
    }

    loadClasses();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      stopTimers();
    };
  }, []);

  function stopTimers() {
    if (captureTimerRef.current) {
      clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    frameInFlightRef.current = false;
  }

  function stopCamera() {
    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(facingMode = cameraFacingMode) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
    mediaStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }
  }

  async function processSingleFrame(currentSessionId) {
    if (!videoRef.current || !canvasRef.current || frameInFlightRef.current) return;
    if (videoRef.current.videoWidth <= 0 || videoRef.current.videoHeight <= 0) return;

    frameInFlightRef.current = true;
    try {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const frameData = canvas.toDataURL("image/jpeg", 0.72);
      const formData = new FormData();
      formData.append("session_id", currentSessionId);
      formData.append("frame", frameData);

      const response = await fetch(apiUrl("/attendance/process_frame"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (response.ok && payload.success) {
        if (typeof payload.total_recognized === "number") {
          setRecognizedCount(payload.total_recognized);
        }
        if (Array.isArray(payload.recognized_in_frame) && payload.recognized_in_frame.length) {
          setStatusText(`Live session running. New recognitions: ${payload.recognized_in_frame.join(", ")}`);
        }
      }
    } catch {
      // Keep session alive on intermittent frame errors.
    } finally {
      frameInFlightRef.current = false;
    }
  }

  async function pollSession(currentSessionId) {
    try {
      const url = new URL(apiUrl("/attendance/poll_session"), window.location.origin);
      url.searchParams.set("session_id", currentSessionId);

      const response = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) return;
      setRecognizedStudents(payload.recognized_students || []);
      setRecognizedCount(Number(payload.count || 0));
    } catch {
      // Ignore transient poll errors.
    }
  }

  async function handleStartLive() {
    if (!selectedClassId || isStarting || isLive) return;
    setIsStarting(true);
    setErrorText("");
    setStatusText("Starting live attendance session...");

    try {
      await startCamera(cameraFacingMode);

      const formData = new FormData();
      formData.append("class_id", selectedClassId);
      const response = await fetch(apiUrl("/attendance/start_session"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success || !payload.session_id) {
        stopCamera();
        setErrorText(payload.error || "Unable to start live attendance session.");
        setStatusText("Session failed to start.");
        return;
      }

      const nextSessionId = payload.session_id;
      setSessionId(nextSessionId);
      setIsLive(true);
      setRecognizedStudents([]);
      setRecognizedCount(0);
      setStatusText("Live session started. Detecting students...");

      captureTimerRef.current = setInterval(() => {
        processSingleFrame(nextSessionId);
      }, 900);

      pollTimerRef.current = setInterval(() => {
        pollSession(nextSessionId);
      }, 2000);
    } catch {
      stopCamera();
      setErrorText("Unable to access camera or start session.");
      setStatusText("Session failed to start.");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleSwitchCamera() {
    const nextFacingMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextFacingMode);

    if (!isLive) {
      setStatusText(`Camera set to ${nextFacingMode === "user" ? "Front" : "Rear"} for next session.`);
      return;
    }

    try {
      stopCamera();
      await startCamera(nextFacingMode);
      setStatusText(`Switched to ${nextFacingMode === "user" ? "Front" : "Rear"} camera.`);
    } catch {
      setErrorText("Unable to switch camera on this device/browser.");
      setStatusText("Camera switch failed.");
    }
  }

  async function handleStopLive() {
    if (!sessionId || isStopping) return;
    setIsStopping(true);
    setStatusText("Stopping and saving attendance...");
    setErrorText("");

    try {
      stopTimers();
      stopCamera();

      const formData = new FormData();
      formData.append("session_id", sessionId);
      const response = await fetch(apiUrl("/attendance/stop_session"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        setErrorText(payload.error || "Failed to stop and save attendance.");
        setStatusText("Session stop failed.");
        return;
      }

      const finalRecognized = payload.recognized_students || recognizedStudents;
      setRecognizedStudents(finalRecognized);
      setRecognizedCount(Number(payload.count || finalRecognized.length || 0));
      setStatusText("Session completed and attendance saved.");

      navigate("/faculty/attendance-result", {
        state: {
          presentStudents: finalRecognized,
          presentCount: Number(payload.count || finalRecognized.length || 0),
          classId: selectedClassId,
        },
      });
    } catch {
      setErrorText("An error occurred while stopping the session.");
      setStatusText("Session stop failed.");
    } finally {
      setIsLive(false);
      setSessionId("");
      setIsStopping(false);
    }
  }

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      profile={profile}
    >
      <div className="attendance-page">
        <section className="attendance-hero">
          <div className="attendance-hero-content">
            <div className="attendance-hero-icon">
              <FaCamera />
            </div>
            <div>
              <h2>Live Attendance</h2>
              <span>AI-Powered Recognition</span>
            </div>
          </div>
        </section>

        <div className="attendance-layout">
          <section className="attendance-panel left">
            <div className="attendance-panel-title">
              <FaGear />
              <span>Controls &amp; Status</span>
            </div>
            <div className="attendance-panel-body">
              <div className="attendance-control-card">
                <label className="attendance-label" htmlFor="attendance-class">
                  Select Class:
                </label>
                <select
                  id="attendance-class"
                  className="attendance-select"
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  disabled={isLoadingClasses || isLive}
                >
                  <option value="" disabled>
                    {isLoadingClasses ? "Loading classes..." : "Select a class"}
                  </option>
                  {classOptions.map((option) => (
                    <option key={option.classId} value={option.classId}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="attendance-upload-card">
                <button type="button" className="attendance-btn primary" onClick={handleStartLive} disabled={!canStart}>
                  <FaPlay />
                  <span>{isStarting ? "Starting..." : "Start Live"}</span>
                </button>
                <p>Prefer to upload a video file instead of live attendance?</p>
                <button type="button" className="attendance-btn secondary" disabled>
                  <FaUpload />
                  <span>Upload Video (Soon)</span>
                </button>
                {isLive ? (
                  <button type="button" className="attendance-btn danger" onClick={handleStopLive} disabled={isStopping}>
                    <FaStop />
                    <span>{isStopping ? "Stopping..." : "Stop & Mark Attendance"}</span>
                  </button>
                ) : null}
              </div>

              <div className="attendance-recognized-list">
                <strong>Detected Students</strong>
                {recognizedStudents.length ? (
                  <ul>
                    {recognizedStudents.map((studentId) => (
                      <li key={studentId}>{studentId}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No students recognized yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="attendance-panel right">
            <div className="attendance-panel-title">
              <FaVideo />
              <span>Live Session</span>
            </div>
            <div className="attendance-panel-body">
              <div className="attendance-live-controls">
                <button
                  type="button"
                  className="attendance-mini-btn"
                  onClick={handleSwitchCamera}
                  disabled={isStarting || isStopping}
                >
                  <FaArrowsRotate />
                  <span>Switch Cam</span>
                </button>
                <button
                  type="button"
                  className={`attendance-mini-btn ${isMirrorOn ? "active" : ""}`}
                  onClick={() => setIsMirrorOn((value) => !value)}
                >
                  <FaRepeat />
                  <span>{isMirrorOn ? "Mirror On" : "Mirror Off"}</span>
                </button>
              </div>
              <div className="attendance-status-card">
                <div className="attendance-status-main">{statusText}</div>
                {errorText ? <div className="attendance-status-error">{errorText}</div> : null}
                <div className="attendance-status-count">Recognized: {recognizedCount}</div>
              </div>
              <div className="attendance-live-stage">
                <video
                  ref={videoRef}
                  className={`attendance-live-video ${isMirrorOn ? "mirrored" : ""}`}
                  muted
                  playsInline
                  autoPlay
                />
                {!isLive ? <div className="attendance-live-placeholder">Camera feed will appear here once the session starts</div> : null}
              </div>
              <canvas ref={canvasRef} className="attendance-hidden-canvas" />
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export default FacultyAttendance;
