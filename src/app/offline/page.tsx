/* eslint-disable @next/next/no-img-element */

export default function OfflinePage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0E1A",
      color: "#E8EDF5",
      fontFamily: "'Nunito', system-ui, sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 460 }}>
        <img
          src="https://res.cloudinary.com/detsk6uql/image/upload/w_120,h_120,c_fill,r_max,f_png/v1775646964/Adobe_Express_-_file_lydnbc.png"
          alt="CIOS"
          style={{ width: 80, height: 80, borderRadius: "50%", marginBottom: 20, opacity: 0.6 }}
        />
        <div style={{ display: "inline-block", padding: "4px 14px", background: "rgba(255,193,7,0.12)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 12 }}>
          OFFLINE
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px 0" }}>You&apos;re offline</h1>
        <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.7, marginBottom: 22 }}>
          No internet connection detected. Anything you do will sync automatically when you&apos;re back online.
        </p>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>Still available</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "#E8EDF5" }}>
            <li>📝 Notes (offline editor)</li>
            <li>📋 Tasks &amp; Productivity Hub (local)</li>
            <li>💬 Cached messages</li>
            <li>⏰ Alarms &amp; reminders</li>
            <li>📚 Any course page you&apos;ve visited</li>
          </ul>
        </div>
        <a href="/dashboard" style={{ background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", textDecoration: "none", padding: "12px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "inline-block" }}>
          ↻ Try again
        </a>
      </div>
    </div>
  );
}
