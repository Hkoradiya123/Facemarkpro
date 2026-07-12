import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getStoredAuthRole, getStoredAuthUser, hasAuthToken, apiUrl, clearAuth, persistAuth } from "../../utils/auth";
import { FullScreenPortalSkeleton } from "./Skeletons";

function AuthGate({ roles, children }) {
  const [status, setStatus] = useState("checking");
  const localRole = getStoredAuthRole();

  useEffect(() => {
    let mounted = true;

    async function verify() {
      const localRole = getStoredAuthRole();
      const localTokenPresent = hasAuthToken();
      const localAuthAllowed = localTokenPresent && localRole && roles.some(r => String(r).toLowerCase() === String(localRole).toLowerCase());

      if (!localTokenPresent || !localRole) {
        if (mounted) setStatus("denied");
        return;
      }

      try {
        const response = await fetch(apiUrl("/api/auth/whoami"), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));

        if (response.ok && payload.authenticated) {
          const role = payload.role;
          const isAllowed = roles.some(r => String(r).toLowerCase() === String(role || "").toLowerCase());

          if (!isAllowed) {
            console.warn(`AuthGate: Role "${role}" not in allowed list:`, roles);
            if (mounted) setStatus("denied");
            return;
          }

          persistAuth({ token: "session", role, user: payload.user || getStoredAuthUser() || {} });
          if (mounted) setStatus("allowed");
          return;
        }

        console.warn("AuthGate: Authenticated check failed", payload);
        clearAuth();
        if (mounted) setStatus("denied");
      } catch (err) {
        if (localAuthAllowed) {
          console.warn("AuthGate: whoami request failed, using cached auth state", err);
          if (mounted) setStatus("allowed");
          return;
        }

        console.error("AuthGate Exception:", err);
        clearAuth();
        if (mounted) setStatus("denied");
      }
    }

    verify();
    return () => {
      mounted = false;
    };
  }, [roles]);

  if (status === "checking") {
    const loadingVariant = String(localRole || "").toLowerCase() === "super_admin" ? "admin" : "faculty";
    return (
      <FullScreenPortalSkeleton variant={loadingVariant} />
    );
  }

  if (status === "denied") {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RequireFacultyAuth({ children }) {
  return <AuthGate roles={["teacher", "super_admin", "faculty"]}>{children}</AuthGate>;
}

function RequireAdminAuth({ children }) {
  return <AuthGate roles={["super_admin"]}>{children}</AuthGate>;
}

export { AuthGate, RequireFacultyAuth, RequireAdminAuth };
