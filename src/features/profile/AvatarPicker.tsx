import { useHeal } from "../../store/store";
import { Modal } from "../../components/ui";

const AVATARS = [
  "⚡", "🔥", "💎", "🐉", "🦁", "🐺", "🦅",
  "🌊", "🌙", "☀️", "⭐", "🗡️", "🛡️", "👑",
  "🧠", "💪", "🏹", "🎯", "🚀", "🌌", "🧿",
  "🪐", "🏔️", "🌳", "🦈", "🐯", "🔱", "🃏",
];

export default function AvatarPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const avatar = useHeal((s) => s.settings.avatar);
  const updateSettings = useHeal((s) => s.updateSettings);

  const pick = (emoji: string) => {
    updateSettings({ avatar: emoji });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose your avatar">
      <p className="small muted" style={{ marginBottom: 14 }}>
        Every hunter needs a sigil. Pick the one that feels like you.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))",
          gap: 10,
        }}
      >
        {AVATARS.map((emoji) => {
          const active = emoji === avatar;
          return (
            <button
              key={emoji}
              onClick={() => pick(emoji)}
              aria-label={`Select avatar ${emoji}`}
              aria-pressed={active}
              style={{
                fontSize: 26,
                lineHeight: 1,
                padding: "13px 0",
                borderRadius: "var(--radius-md)",
                background: active
                  ? "color-mix(in srgb, var(--violet) 18%, transparent)"
                  : "var(--glass)",
                border: active
                  ? "1px solid var(--violet)"
                  : "1px solid var(--glass-border)",
                boxShadow: active ? "var(--glow-violet)" : "none",
                transition: "transform var(--t-fast), border-color var(--t-fast), box-shadow var(--t-fast)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
