import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaBook, FaCheck, FaClock, FaUserCheck, FaUsers } from "react-icons/fa6";

import { apiUrl, useSessionProfile } from "../../utils/auth";
import { facultyNav } from "../../utils/constants";
import { PageShell } from "../../components/Shared";

function ManualAttendance() {
  const navigate = useNavigate();
  const profile = useSessionProfile("faculty");
  const [lectures, setLectures] = useState([]);
  const [selectedLectureKey, setSelectedLectureKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorText, setErrorText] = useState("");

  const selectedLecture = useMemo(
    () => lectures.find((lecture) => lecture.key === selectedLectureKey) || null,
    [lectures, selectedLectureKey]
  );

  useEffect(() => {
    let mounted = true;

    async function loadLectures() {
      setIsLoading(true);
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
          setLectures([]);
          setErrorText("Unable to load today classes.");
          return;
        }

        const nowDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
        const rows = (payload.lectures || [])
          .filter((lecture) => lecture.day === nowDay)
          .map((lecture, index) => ({
            key: `${lecture.branch}-${lecture.semester}-${lecture.section}-${lecture.subject}-${lecture.start_time}-${index}`,
            subject: lecture.subject || "Subject",
            branch: lecture.branch,
            semester: Number(lecture.semester || 0),
            section: lecture.section || "",
            classroom: lecture.classroom || "",
            start_time: lecture.start_time || "",
            end_time: lecture.end_time || "",
          }));

        setLectures(rows);
        if (rows.length) {
          setSelectedLectureKey(rows[0].key);
        }
      } catch {
        if (mounted) {
          setLectures([]);
          setErrorText("Failed to load classes.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadLectures();
    return () => {
      mounted = false;
    };
  }, []);

  function handleProceed() {
    if (!selectedLecture) return;
    setShowConfirm(true);
  }

  function handleConfirmProceed() {
    if (!selectedLecture) return;
    navigate("/faculty/manual-attendance/mark", {
      state: { lecture: selectedLecture },
    });
  }

  return (
    <PageShell
      variant="faculty"
      nav={facultyNav}
      profile={profile}
    >
      <div className="manual-attendance-page grid gap-4">
        <section className="manual-attendance-hero rounded-[18px] border border-gray-200 bg-white p-[22px_24px] text-center dark:border-ui-border-dark dark:bg-ui-card-dark">
          <h2 className="m-0 inline-flex items-center gap-2.5 text-[2rem] font-extrabold text-gray-700 dark:text-ui-text-dark">
            <FaUserCheck /> Manual Attendance
          </h2>
          <p className="mt-2 font-semibold text-gray-500 dark:text-ui-text-muted-dark">Select a lecture to mark attendance manually</p>
        </section>

        <section className="manual-attendance-table-wrap overflow-auto rounded-[18px] border border-gray-200 bg-white dark:border-ui-border-dark dark:bg-ui-card-dark">
          <table className="manual-attendance-table w-full border-collapse dark:text-ui-text-dark">
            <thead>
              <tr>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300">Select</th>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300"><FaBook /> Subject</th>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300"><FaUsers /> Class</th>
                <th className="border-b border-gray-200 bg-slate-300 p-[14px_16px] text-center font-extrabold text-gray-700 dark:border-ui-border-dark dark:bg-slate-800 dark:text-slate-300"><FaClock /> Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">Loading classes...</td>
                </tr>
              ) : lectures.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">{errorText || "No classes found for today."}</td>
                </tr>
              ) : (
                lectures.map((lecture) => {
                  const active = selectedLectureKey === lecture.key;
                  return (
                    <tr
                      key={lecture.key}
                      className={`cursor-pointer${active ? " active bg-[#bcd4f6]" : ""}`}
                      onClick={() => setSelectedLectureKey(lecture.key)}
                    >
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">
                        <input
                          type="radio"
                          name="manual-lecture"
                          checked={active}
                          onChange={() => setSelectedLectureKey(lecture.key)}
                        />
                      </td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">{lecture.subject}</td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">{`${lecture.branch}-${lecture.semester}${lecture.section}`}</td>
                      <td className="border-b border-gray-200 p-[14px_16px] text-center dark:border-ui-border-dark">{`${lecture.start_time} - ${lecture.end_time}`}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        <div className="manual-attendance-actions flex justify-center">
          <button
            type="button"
            className="primary-btn cursor-pointer rounded-xl border-0 bg-[linear-gradient(135deg,#4facfe,#00c6fb)] px-[18px] py-3 text-white shadow-[0_10px_24px_rgba(79,172,254,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleProceed}
            disabled={!selectedLecture}
          >
            <FaArrowRight /> Proceed to Mark Attendance
          </button>
        </div>
      </div>

      {showConfirm && selectedLecture ? (
        <div
          className="manual-modal-overlay fixed inset-0 z-[1600] grid place-items-center bg-slate-900/45"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="manual-modal w-[min(560px,calc(100vw-32px))] rounded-2xl bg-white p-[22px] text-center shadow-[0_14px_40px_rgba(15,23,42,0.25)] dark:bg-ui-card-dark"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="m-[0_0_10px] text-[2rem] text-gray-700 dark:text-ui-text-dark">Confirm Selection</h3>
            <p className="m-0 text-[1.1rem] leading-normal text-gray-600 dark:text-ui-text-muted-dark">
              Are you sure you want to proceed with marking attendance for
              <strong>{` ${selectedLecture.subject}`}</strong>,
              <strong>{` Class ${selectedLecture.branch}-${selectedLecture.semester}${selectedLecture.section}`}</strong>,
              <strong>{` Time ${selectedLecture.start_time} - ${selectedLecture.end_time}`}</strong>?
            </p>
            <div className="manual-modal-actions mt-[18px] flex justify-center gap-3.5">
              <button
                type="button"
                className="modal-cancel-btn cursor-pointer rounded-xl border-0 bg-gray-500 px-5 py-3 font-bold text-white dark:bg-[#111827] dark:text-ui-text-dark"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-confirm-btn inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 bg-blue-500 px-5 py-3 font-bold text-white"
                onClick={handleConfirmProceed}
              >
                <FaCheck /> Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

export default ManualAttendance;
