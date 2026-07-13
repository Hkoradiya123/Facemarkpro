flowchart TB
  subgraph Entry[Startup]
    RUN[run.py] --> APP[create_app()]
    APP --> CFG[Load env, CORS, Session, Mongo, Cache]
    CFG --> BP[Register blueprints]
    BP --> SR[student_routes]
    BP --> FR[faculty_routes]
    BP --> AR[attendance_routes]
    BP --> MR[mobile_api]
    BP --> AP[api_routes]
    BP --> AD[admin_routes]
    APP --> SPA[Serve React dist / SPA fallback]
    APP --> HEALTH[/health]
  end

  subgraph Infra[Shared Infrastructure]
    MONGO[(MongoDB collections)]
    FS[(Filesystem: dataset / encodings / split_encodings / attendance_logs / flask_session)]
    CACHE[(Cache: Redis or SimpleCache)]
    CLOUD[(Cloudinary raw encodings)]
    INFER[(Remote Inference Service)]
    CSV[timetable.csv]
  end

  subgraph Services[Service Layer]
    FACE[FaceRecognitionService]
    ATT[AttendanceService]
    TIME[TimetableService]
    REP[report_utils]
    FILE[file_utils]
    CAM[camera_utils]
    INF[inference_client]
  end

  subgraph Auth[Auth / Dashboards]
    FLOGIN[/api/auth/login/faculty/]
    SLOGIN[/api/auth/login/student/]
    LOGOUT[/api/auth/logout/]
    WHO[/api/auth/whoami/]
    FDASH[/faculty/dashboard/ + /api/faculty/dashboard/]
    ADASH[/admin/dashboard/]
    FP[Faculty profile + timetable + calendar]
    SP[Student profile + dashboard + attendance]
  end

  subgraph Attend[Attendance Flows]
    ATTLIVE[/attendance/live_frame, /attendance/process_frame, /attendance/start_session, /attendance/stop_session/]
    ATTUPLOAD[/attendance/upload/]
    ATTMAN[/attendance/manual_attendance + select_students + submit/]
    ATTAPI[/api/faculty/manual-attendance/students + submit/]
    ATTMARK[/attendance/mark_attendance + /api/faculty/dashboard/]
  end

  subgraph Faces[Face Registration Flows]
    ADMINFACES[/admin/faces, /admin/faces/register, /admin/faces/delete, /admin/faces/cleanup_duplicates/]
    APIFACES[/api/admin/faces, /api/admin/faces/reregister/:roll/]
    STUDFACE[/register_student_face, /check_existing_registration, /face_registrations_summary, /delete_student_face, /edit_student_face/]
  end

  subgraph Reports[Reports / Setup]
    FREP[/faculty/reports + /api/faculty/reports + export/]
    AREP[/admin/reports + /api/admin/reports + export/]
    SETUP[/api/admin/academic-setup + CRUD]
  end

  subgraph Mobile[Mobile API]
    MHEALTH[/api/mobile/health/]
    MMETA[/api/mobile/meta/]
    MLOGIN[/api/mobile/auth/faculty/login + auth/student/login/]
    MCLASS[/api/mobile/faculty/classes/]
    MSTART[/api/mobile/attendance/start/]
    MFRAME[/api/mobile/attendance/frame/]
    MSTOP[/api/mobile/attendance/stop/]
    MDASH[/api/mobile/student/dashboard/]
  end

  FLOGIN --> MONGO
  SLOGIN --> MONGO
  LOGOUT --> FS
  WHO --> MONGO
  FDASH --> MONGO
  FDASH --> CACHE
  ADASH --> MONGO
  FP --> MONGO
  FP --> TIME
  SP --> MONGO
  SP --> ATT

  ATTLIVE --> FACE
  ATTLIVE --> ATT
  ATTLIVE --> MONGO
  ATTLIVE --> FS
  ATTUPLOAD --> FILE
  ATTUPLOAD --> FACE
  ATTMAN --> ATT
  ATTMAN --> TIME
  ATTAPI --> ATT
  ATTMARK --> ATT
  ATTMARK --> MONGO

  ADMINFACES --> FACE
  ADMINFACES --> CLOUD
  ADMINFACES --> FS
  APIFACES --> FACE
  APIFACES --> CLOUD
  STUDFACE --> FACE
  STUDFACE --> CLOUD
  STUDFACE --> MONGO
  STUDFACE --> FS

  FREP --> REP
  FREP --> MONGO
  AREP --> REP
  AREP --> MONGO
  SETUP --> MONGO

  MCLASS --> TIME
  MSTART --> FACE
  MSTART --> ATT
  MFRAME --> FACE
  MFRAME --> ATT
  MSTOP --> ATT
  MLOGIN --> MONGO
  MDASH --> MONGO

  FACE --> INF
  FACE --> INFER
  FACE --> FS
  FACE --> CLOUD
  ATT --> MONGO
  ATT --> TIME
  ATT --> FACE
  TIME --> CSV
  TIME --> MONGO
  REP --> MONGO
  FILE --> FS
  CAM --> FACE
  INF --> INFER

  MONGO --> FACCOL[(faculty)]
  MONGO --> STUCOL[(students)]
  MONGO --> ATTCOL[(attendance)]
  MONGO --> TIMET[(timetable)]
  MONGO --> LAYOUT[(faculty_layouts)]
  MONGO --> CAL[(faculty_calendar_events)]
  MONGO --> BRC[(academic_branches/classes/classrooms/subjects/assignments)]