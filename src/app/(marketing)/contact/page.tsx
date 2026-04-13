import type { Metadata } from "next";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = { title: "Contact · CIOS", description: "Apply for recruiter access to CIOS." };

export default function ContactPage() {
  return <ContactClient />;
}
