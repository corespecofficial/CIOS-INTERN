"use client";

/**
 * Premium emoji icons rendered inline via the system emoji font.
 * Zero network requests — cannot fail, cannot reload, cannot flicker.
 * Every OS ships high-quality color emoji (Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji),
 * so each visitor sees the best emoji available on their device.
 */

const EMOJI: Record<string, string> = {
  rocket: "🚀", target: "🎯", eye: "👁️", globe: "🌍", handshake: "🤝",
  gem: "💎", trophy: "🏆",
  office: "🏢", briefcase: "💼", memo: "📝", calendar: "📅", chart: "📈",
  people: "👥", magnify: "🔎", shield: "🛡️", lightning: "⚡", money: "💸",
  palette: "🎨", video: "🎬", megaphone: "📣", laptop: "💻", mobile: "📱",
  lock: "🔒", robot: "🤖", brain: "🧠", sparkles: "✨", books: "📚", phone: "📞",
  envelope: "📩", chat: "💬",
};

const GRADIENT_BY_ICON: Record<string, [string, string]> = {
  rocket: ["#1E88E5", "#AB47BC"],
  target: ["#EF5350", "#FF7043"],
  eye: ["#26C6DA", "#1E88E5"],
  globe: ["#1E88E5", "#66BB6A"],
  handshake: ["#FFC107", "#FF7043"],
  gem: ["#AB47BC", "#1E88E5"],
  trophy: ["#FFC107", "#FF7043"],
  office: ["#1E88E5", "#1565C0"],
  briefcase: ["#8892A4", "#5A6478"],
  memo: ["#FFC107", "#FF7043"],
  calendar: ["#AB47BC", "#1E88E5"],
  chart: ["#66BB6A", "#26C6DA"],
  people: ["#AB47BC", "#7B1FA2"],
  magnify: ["#26C6DA", "#1E88E5"],
  shield: ["#1E88E5", "#1565C0"],
  lightning: ["#FFC107", "#FF9800"],
  money: ["#66BB6A", "#43A047"],
  palette: ["#AB47BC", "#E91E63"],
  video: ["#EF5350", "#AB47BC"],
  megaphone: ["#FF7043", "#FFC107"],
  laptop: ["#1E88E5", "#26C6DA"],
  mobile: ["#66BB6A", "#1E88E5"],
  lock: ["#8892A4", "#607D8B"],
  robot: ["#26C6DA", "#AB47BC"],
  brain: ["#AB47BC", "#EF5350"],
  sparkles: ["#FFC107", "#AB47BC"],
  books: ["#1E88E5", "#AB47BC"],
  phone: ["#66BB6A", "#26C6DA"],
  envelope: ["#1E88E5", "#1565C0"],
  chat: ["#26C6DA", "#1E88E5"],
};

export function Icon3D({
  name, size = 72, className, style,
}: {
  name: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  const emoji = EMOJI[name] || "✨";
  const [c1, c2] = GRADIENT_BY_ICON[name] || ["#1E88E5", "#AB47BC"];
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${c1}22, ${c2}11)`,
        border: `1px solid ${c1}33`,
        boxShadow: `0 8px 24px ${c1}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
        fontSize: size * 0.6,
        lineHeight: 1,
        // Emoji-first font stack: each OS renders its own native color emoji
        fontFamily: `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "EmojiOne Color", "Android Emoji", sans-serif`,
        animation: "cios-float 3.5s ease-in-out infinite",
        userSelect: "none",
        flexShrink: 0,
        ...style,
      }}
    >
      {emoji}
    </span>
  );
}
