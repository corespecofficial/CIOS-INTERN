import { LibraryClient } from "./library-client";

export const metadata = {
  title: "Offline Library · Study Buddy",
  description: "Review saved study sessions without a network connection.",
};

export default function LibraryPage() {
  return <LibraryClient />;
}
