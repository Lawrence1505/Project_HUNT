import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Database, Download, TriangleAlert, Upload } from "lucide-react";
import { useHeal } from "../../store/store";
import { todayISO } from "../../lib/dates";

export default function DataCard() {
  const exportJSON = useHeal((s) => s.exportJSON);
  const importJSON = useHeal((s) => s.importJSON);
  const resetAll = useHeal((s) => s.resetAll);
  const pushToast = useHeal((s) => s.pushToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const filename = `heal-backup-${todayISO()}.json`;
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast({ kind: "info", title: "Backup exported", detail: filename });
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const ok = importJSON(text);
      pushToast(
        ok
          ? { kind: "info", title: "Backup restored", detail: "Your journey has been reloaded." }
          : { kind: "info", title: "Import failed", detail: "That file is not a valid HEAL backup." }
      );
    } catch {
      pushToast({ kind: "info", title: "Import failed", detail: "Could not read that file." });
    }
  };

  const handleReset = () => {
    if (
      !confirm(
        "Reset EVERYTHING? All XP, levels, missions, habits, journal entries and settings will be permanently wiped."
      )
    )
      return;
    if (!confirm("Last chance — this cannot be undone. Really erase all data?")) return;
    resetAll();
    pushToast({ kind: "info", title: "Fresh start", detail: "All data has been reset. Level 1 awaits." });
  };

  return (
    <div className="card">
      <div className="card-title">
        <Database size={16} style={{ color: "var(--blue)" }} />
        Data
      </div>
      <p className="small muted" style={{ marginBottom: 14 }}>
        Your progress lives only in this browser. Back it up regularly.
      </p>

      <div className="row wrap" style={{ gap: 10 }}>
        <button className="btn btn-primary" onClick={handleExport}>
          <Download size={16} />
          Export Backup
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          <Upload size={16} />
          Import Backup
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: "none" }}
        onChange={handleImportFile}
        aria-hidden="true"
        tabIndex={-1}
      />

      <hr className="divider" />

      <div className="row-between wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8, color: "var(--danger)" }}>
          <TriangleAlert size={15} />
          <span className="small" style={{ color: "var(--text-3)" }}>
            Danger zone — wipes every stat, quest and setting.
          </span>
        </div>
        <button className="btn btn-danger btn-sm" onClick={handleReset}>
          Reset Everything
        </button>
      </div>
    </div>
  );
}
