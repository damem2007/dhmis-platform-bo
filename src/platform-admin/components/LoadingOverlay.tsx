import { BrandLoader } from "./BrandLoader";

type LoadingOverlayProps = {
  label: string;
  detail?: string;
};

/** A blocking, branded loading state for long-running control-plane actions. */
export function LoadingOverlay({ label, detail }: LoadingOverlayProps) {
  return (
    <div className="platform-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="platform-loading-overlay-card">
        <BrandLoader size={48} />
        <strong>{label}</strong>
        {detail && <span className="platform-loading-overlay-detail">{detail}</span>}
      </div>
    </div>
  );
}
