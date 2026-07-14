import { useEffect } from "react";
import { Sparkles, Trophy, ChevronsUp, Info } from "lucide-react";
import { useHeal } from "../store/store";
import type { Toast } from "../store/types";

const ICON: Record<Toast["kind"], React.ReactNode> = {
  xp: <Sparkles size={18} color="var(--violet)" />,
  levelup: <ChevronsUp size={18} color="var(--warning)" />,
  achievement: <Trophy size={18} color="var(--success)" />,
  info: <Info size={18} color="var(--info)" />,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useHeal((s) => s.dismissToast);
  useEffect(() => {
    const ms = toast.kind === "xp" ? 3200 : 5200;
    const t = setTimeout(() => dismiss(toast.id), ms);
    return () => clearTimeout(t);
  }, [toast.id, toast.kind, dismiss]);

  return (
    <div
      className={`toast ${toast.kind === "levelup" ? "toast-levelup" : ""} ${toast.kind === "achievement" ? "toast-achievement" : ""}`}
      onClick={() => dismiss(toast.id)}
      role="status"
    >
      <div style={{ marginTop: 1 }}>{ICON[toast.kind]}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{toast.title}</div>
        {toast.detail && (
          <div className="small muted" style={{ marginTop: 2 }}>
            {toast.detail}
          </div>
        )}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useHeal((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
