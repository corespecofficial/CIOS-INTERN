import { redirect } from "next/navigation";

/**
 * /startups — alias for /investors which is the canonical public discovery
 * surface. Keeps the sitemap clean and lets founders link to /startups
 * idiomatically while we keep one page to maintain.
 */
export default function StartupsIndexPage() {
  redirect("/investors");
}
