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
      <div className="attendance-page grid gap-4">
        <section className="attendance-hero relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#4a90e2_0%,#2563eb_100%)] p-[22px_26px] text-white shadow-[0_6px_18px_rgba(37,99,235,0.18)] before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)] before:content-['']">
          <div className="attendance-hero-content relative z-[1] flex items-center justify-center gap-4">
            <div className="attendance-hero-icon grid h-[52px] w-[52px] place-items-center rounded-[14px] border border-white/30 bg-white/20 text-[22px]">
              <FaCamera />
            </div>
            <div>
              <h2 className="m-0 text-left text-[1.65rem] font-extrabold">Live Attendance</h2>
              <span className="mt-1.5 block text-[0.95rem] font-semibold opacity-[0.92]">AI-Powered Recognition</span>
            </div>
          </div>
        </section>

        <div className="attendance-layout grid min-h-[540px] grid-cols-[35%_65%] gap-4 max-[992px]:grid-cols-1">
          <section className="attendance-panel left flex flex-col overflow-hidden rounded-2xl border border-white/32 bg-white/32 backdrop-blur-md">
            <div className="attendance-panel-title flex items-center gap-2.5 p-[18px_22px_0] text-[1.05rem] font-bold text-[#3c4757] [&>svg]:text-[#4a90e2]">
              <FaGear />
              <span>Controls &amp; Status</span>
            </div>
            <div className="attendance-panel-body flex flex-1 flex-col gap-[18px] p-[18px_22px_22px]">
              <div className="attendance-control-card rounded-2xl border border-white/35 bg-white/28 p-[18px]">
                <label className="attendance-label mb-2.5 block text-[0.95rem] font-semibold text-[#3c4757]" htmlFor="attendance-class">
                  Select Class:
                </label>
                <select
                  id="attendance-class"
                  className="attendance-select w-full rounded-[10px] border-[3px] border-[#4a90e2]/75 bg-white/55 p-[14px_16px] text-[0.95rem] text-[#374151] outline-none focus:shadow-[0_0_0_3px_rgba(74,144,226,0.18)]"
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

              <div className="attendance-upload-card rounded-2xl border border-white/35 bg-white/28 p-[18px]">
                <button
                  type="button"
                  className="attendance-btn primary flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border-0 bg-[linear-gradient(135deg,#4a90e2_0%,#2563eb_100%)] p-[14px_18px] text-base font-bold text-white"
                  onClick={handleStartLive}
                  disabled={!canStart}
                >
                  <FaPlay />
                  <span>{isStarting ? "Starting..." : "Start Live"}</span>
                </button>
                <p className="my-3 mb-3.5 text-[0.92rem] text-[#5f6b7b]">Prefer to upload a video file instead of live attendance?</p>
                <button
                  type="button"
                  className="attendance-btn secondary flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border-0 bg-[linear-gradient(135deg,#10b981_0%,#059669_100%)] p-[14px_18px] text-base font-bold text-white"
                  disabled
                >
                  <FaUpload />
                  <span>Upload Video (Soon)</span>
                </button>
                {isLive ? (
                  <button
                    type="button"
                    className="attendance-btn danger mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-[10px] border-0 bg-[linear-gradient(135deg,#ef4444_0%,#dc2626_100%)] p-[14px_18px] text-base font-bold text-white"
                    onClick={handleStopLive}
                    disabled={isStopping}
                  >
                    <FaStop />
                    <span>{isStopping ? "Stopping..." : "Stop & Mark Attendance"}</span>
                  </button>
                ) : null}
              </div>

              <div className="attendance-recognized-list mt-3 rounded-xl border border-white/30 bg-white/24 p-[10px_12px] dark:border-slate-400/25 dark:bg-slate-900/50">
                <strong className="mb-2 block text-[0.92rem] text-[#334155] dark:text-ui-text-muted-dark">Detected Students</strong>
                {recognizedStudents.length ? (
                  <ul className="m-0 max-h-[140px] overflow-auto pl-[18px]">
                    {recognizedStudents.map((studentId) => (
                      <li key={studentId}>{studentId}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[0.9rem] text-[#64748b] dark:text-ui-text-muted-dark">No students recognized yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="attendance-panel right flex flex-col overflow-hidden rounded-2xl border border-white/32 bg-white/32 backdrop-blur-md">
            <div className="attendance-panel-title flex items-center gap-2.5 p-[18px_22px_0] text-[1.05rem] font-bold text-[#3c4757] [&>svg]:text-[#4a90e2]">
              <FaVideo />
              <span>Live Session</span>
            </div>
            <div className="attendance-panel-body flex flex-1 flex-col gap-[18px] p-[18px_22px_22px]">
              <div className="attendance-live-controls flex gap-2.5">
                <button
                  type="button"
                  className="attendance-mini-btn inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#4a90e2]/45 bg-white/68 px-3 py-2 text-[0.86rem] font-bold text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSwitchCamera}
                  disabled={isStarting || isStopping}
                >
                  <FaArrowsRotate />
                  <span>Switch Cam</span>
                </button>
                <button
                  type="button"
                  className={`attendance-mini-btn inline-flex cursor-pointer items-center gap-2 rounded-[10px] border px-3 py-2 text-[0.86rem] font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                    isMirrorOn ? "active border-blue-500/55 bg-blue-500/[0.18] text-[#1e3a8a]" : "border-[#4a90e2]/45 bg-white/68 text-[#1e3a8a]"
                  }`}
                  onClick={() => setIsMirrorOn((value) => !value)}
                >
                  <FaRepeat />
                  <span>{isMirrorOn ? "Mirror On" : "Mirror Off"}</span>
                </button>
              </div>
              <div className="attendance-status-card min-h-[34px] rounded-2xl border border-white/35 bg-white/28 p-4">
                <div className="attendance-status-main text-[0.95rem] font-semibold text-[#334155] dark:text-ui-text-muted-dark">{statusText}</div>
                {errorText ? <div className="attendance-status-error mt-2 text-[0.9rem] font-semibold text-red-700">{errorText}</div> : null}
                <div className="attendance-status-count mt-2 text-[0.92rem] font-bold text-teal-700">Recognized: {recognizedCount}</div>
              </div>
              <div className="attendance-live-stage relative flex min-h-[360px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/16">
                <video
                  ref={videoRef}
                  className={`attendance-live-video h-full w-full rounded-2xl object-cover ${isMirrorOn ? "mirrored -scale-x-100" : ""}`}
                  muted
                  playsInline
                  autoPlay
                />
                {!isLive ? (
                  <div className="attendance-live-placeholder absolute inset-0 grid place-items-center bg-slate-100/60 text-[0.95rem] text-[#7c8798] dark:bg-slate-900/65 dark:text-slate-300">
                    Camera feed will appear here once the session starts
                  </div>
                ) : null}
              </div>
              <canvas ref={canvasRef} className="attendance-hidden-canvas hidden" />
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export default FacultyAttendance;
