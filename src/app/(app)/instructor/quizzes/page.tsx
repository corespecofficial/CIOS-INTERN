import { redirect } from "next/navigation";

export default function QuizzesPage() {
  // Quiz content is authored inline per-lesson in the course builder.
  redirect("/instructor");
}
