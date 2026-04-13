export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0E1A",
      color: "#E8EDF5",
      fontFamily: "'Nunito', sans-serif",
    }}>
      {children}
    </div>
  );
}
