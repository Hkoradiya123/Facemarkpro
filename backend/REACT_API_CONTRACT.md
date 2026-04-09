# React API Contract (Session Auth, DB-safe Migration)

This document defines the initial API contract for the Flask template to React migration.
All endpoints below return JSON (except explicit file downloads), use structured status codes, and are safe to consume from React.

## Auth

### POST /api/auth/login/faculty
- Auth: Public
- Request:
```json
{
  "email": "faculty@college.edu",
  "password": "secret"
}
```
- Success 200:
```json
{
  "success": true,
  "user": {
    "email": "faculty@college.edu",
    "name": "Faculty Name",
    "role": "teacher"
  },
  "role": "teacher",
  "redirectPath": "/faculty/dashboard",
  "errors": []
}
```
- Error 400/401/500:
```json
{
  "success": false,
  "message": "Invalid email or password",
  "errors": ["Invalid email or password"]
}
```

### POST /api/auth/login/student
- Auth: Public
- Request:
```json
{
  "roll_no": "22CS101",
  "password": "secret"
}
```
- Success 200:
```json
{
  "success": true,
  "user": {
    "roll_no": "22CS101",
    "name": "Student Name",
    "role": "student"
  },
  "role": "student",
  "redirectPath": "/student/dashboard",
  "errors": []
}
```
- Error 400/401/500: same shape as faculty login

### POST /api/auth/logout
- Auth: Session user
- Success 200:
```json
{
  "success": true,
  "message": "Logged out"
}
```

### GET /api/auth/whoami
- Auth: Optional
- Success 200 (authenticated):
```json
{
  "success": true,
  "authenticated": true,
  "role": "teacher",
  "user": {
    "email": "faculty@college.edu",
    "name": "Faculty Name"
  }
}
```
- Success 200 (anonymous):
```json
{
  "success": true,
  "authenticated": false,
  "role": null,
  "user": null
}
```

## Role Guard Example

### GET /api/admin/ping
- Auth: Session user
- Role: super_admin
- Success 200:
```json
{
  "success": true,
  "message": "admin-ok"
}
```
- Error 401:
```json
{
  "success": false,
  "message": "Unauthenticated",
  "errors": ["Unauthenticated"]
}
```
- Error 403:
```json
{
  "success": false,
  "message": "Forbidden",
  "errors": ["Forbidden"]
}
```

## Existing Routes with JSON Compatibility

The following legacy routes now also return JSON when `Accept: application/json` or `X-Requested-With: XMLHttpRequest` is present:
- `POST /login`
- `POST /student/login`
- `GET|POST /student/logout`
- `GET /multilogin` (status signal)
- `GET /logout`

## Status Code Policy

- `200`: Success
- `400`: Validation error
- `401`: Unauthenticated / bad credentials
- `403`: Unauthorized role
- `404`: Missing resource
- `500`: Internal server error

## Notes

- Session-based auth is intentionally preserved for low-risk migration.
- No schema migration is required for these endpoints.
- File download report endpoints (CSV/PDF) remain file responses and are React-compatible via download links.
