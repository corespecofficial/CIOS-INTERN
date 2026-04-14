"use client";

/**
 * Notes layout — desktop is untouched.
 *
 * On mobile (≤900px) we hide the CIOS app shell chrome (top header with
 * its own search/bell/avatar, and bottom nav) so the notes-specific UI
 * doesn't duplicate them. Desktop keeps the full CIOS navigation because
 * it's spacious enough to host both.
 */
export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <style>{`
        @media (max-width: 900px) {
          /* Hide the mobile bottom nav (our notes bottom nav replaces it) */
          .bottom-nav-mobile { display: none !important; }

          /* Hide the main CIOS header on mobile — duplicate search/bell/avatar */
          .main-content-area > header { display: none !important; }

          /* Kill the main-content-area padding so notes fill the viewport */
          .main-content-area > main { padding: 0 !important; }
        }
      `}</style>
    </>
  );
}
