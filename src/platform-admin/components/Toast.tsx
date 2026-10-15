import { useEffect, useState } from "react";

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [apiError, setApiError] = useState("");
  useEffect(() => {
    const handle = (event: Event) => {
      const candidate = (event as CustomEvent<{ message?: string }>).detail?.message?.trim();
      setApiError(candidate || "Request failed");
    };
    window.addEventListener("dhmis:api-error", handle);
    return () => window.removeEventListener("dhmis:api-error", handle);
  }, []);
  const text = (apiError || message || "").trim();
  // A toast is feedback, not a loading surface. Never mount an empty toast:
  // an empty success notice used to leave a blank, non-dismissible panel on
  // the platform shell when an action cleared its message.
  if (!text) return null;
  return (
    <div className={`platform-toast ${apiError ? "platform-toast-error" : "platform-toast-success"}`} role={apiError ? "alert" : "status"} aria-live="polite">
      <span>{text}</span>
      <button type="button" aria-label="Dismiss notification" onClick={() => { setApiError(""); onDismiss(); }}>×</button>
    </div>
  );
}
