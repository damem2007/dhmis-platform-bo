export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="platform-toast" role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss}>×</button>
    </div>
  );
}
