// Registry of every tool inside CIOS Documents.
// Used by the hub dashboard + the shared tool shell route.

export type ToolStatus = "live" | "beta" | "soon";

export type ToolCategory =
  | "ai-create"
  | "organize"
  | "optimize"
  | "convert-to-pdf"
  | "convert-from-pdf"
  | "edit"
  | "secure"
  | "intelligence";

export interface DocTool {
  id: string;
  name: string;
  blurb: string;
  emoji: string;
  category: ToolCategory;
  status: ToolStatus;
  /** Accent hex for the tile + shell CTA. */
  accent: string;
  /** Override the default /documents/app/t/:id route. */
  customHref?: string;
}

export interface ToolCategoryMeta {
  id: ToolCategory;
  label: string;
  eyebrow: string;
}

export const CATEGORIES: ToolCategoryMeta[] = [
  { id: "ai-create",        label: "Create with AI",   eyebrow: "CREATE" },
  { id: "organize",         label: "Organize PDF",     eyebrow: "ORGANIZE" },
  { id: "optimize",         label: "Optimize PDF",     eyebrow: "OPTIMIZE" },
  { id: "convert-to-pdf",   label: "Convert to PDF",   eyebrow: "TO PDF" },
  { id: "convert-from-pdf", label: "Convert from PDF", eyebrow: "FROM PDF" },
  { id: "edit",             label: "Edit PDF",         eyebrow: "EDIT" },
  { id: "secure",           label: "PDF Security",     eyebrow: "SECURITY" },
  { id: "intelligence",     label: "PDF Intelligence", eyebrow: "AI" },
];

// Colour palette per category — each uses a distinct accent but the page as a
// whole keeps the pink Documents identity.
const C = {
  pink:   "#EC4899",
  violet: "#8B5CF6",
  blue:   "#3B82F6",
  green:  "#10B981",
  amber:  "#F59E0B",
  red:    "#EF4444",
  cyan:   "#06B6D4",
  slate:  "#64748B",
};

export const TOOLS: DocTool[] = [
  // AI Create — uses existing CIOS doc generators
  { id: "cv",                 name: "CV",                  blurb: "Region-aware builder — Nigerian, US, UK, Europass and more.", emoji: "📄", category: "ai-create", status: "live", accent: C.pink, customHref: "/documents/app/cv" },
  { id: "cover-letter",       name: "Cover letter",        blurb: "Tailored to a specific job posting in seconds",         emoji: "✍️", category: "ai-create", status: "live", accent: C.pink   },
  { id: "linkedin-optimizer", name: "LinkedIn rewrite",    blurb: "Headline, About, and bullets rewritten for impact",     emoji: "💼", category: "ai-create", status: "live", accent: C.violet },
  { id: "portfolio",          name: "Portfolio one-pager", blurb: "Public link summarising your best CIOS work",            emoji: "🎨", category: "ai-create", status: "live", accent: C.violet },
  { id: "pitch-deck",         name: "Pitch deck",          blurb: "10-slide investor deck from your startup pitch",        emoji: "📊", category: "ai-create", status: "live", accent: C.violet },
  { id: "business-plan",      name: "Business plan",       blurb: "Full investor-ready business plan PDF",                  emoji: "📘", category: "ai-create", status: "live", accent: C.violet },
  { id: "sop",                name: "Statement of Purpose",blurb: "Scholarship / grad-school SOP, tailored to programme",   emoji: "🎓", category: "ai-create", status: "live", accent: C.violet },

  // Organize
  { id: "merge-pdf",          name: "Merge PDF",           blurb: "Combine multiple PDFs into one document.",              emoji: "🔗", category: "organize", status: "beta", accent: C.pink   },
  { id: "split-pdf",          name: "Split PDF",           blurb: "Separate one PDF into multiple files.",                 emoji: "✂️", category: "organize", status: "beta", accent: C.pink   },
  { id: "remove-pages",       name: "Remove pages",        blurb: "Delete pages from a PDF.",                              emoji: "🗑️", category: "organize", status: "beta", accent: C.red    },
  { id: "extract-pages",      name: "Extract pages",       blurb: "Pull selected pages into a new PDF.",                   emoji: "📤", category: "organize", status: "beta", accent: C.pink   },
  { id: "organize-pdf",       name: "Organize PDF",        blurb: "Reorder, rotate, and delete pages visually.",           emoji: "🧩", category: "organize", status: "beta", accent: C.pink   },
  { id: "scan-to-pdf",        name: "Scan to PDF",         blurb: "Capture with your camera and save as a searchable PDF.", emoji: "📷", category: "organize", status: "soon", accent: C.pink   },

  // Optimize
  { id: "compress-pdf",       name: "Compress PDF",        blurb: "Reduce file size while keeping quality.",               emoji: "🗜️", category: "optimize", status: "beta", accent: C.green  },
  { id: "repair-pdf",         name: "Repair PDF",          blurb: "Recover data from a damaged PDF.",                      emoji: "🛠️", category: "optimize", status: "soon", accent: C.green  },
  { id: "ocr-pdf",            name: "OCR PDF",             blurb: "Make scanned PDFs searchable and selectable.",          emoji: "🔎", category: "optimize", status: "soon", accent: C.green  },

  // Convert to PDF
  { id: "jpg-to-pdf",         name: "JPG to PDF",          blurb: "Bundle images into a single PDF.",                      emoji: "🖼️", category: "convert-to-pdf", status: "beta", accent: C.amber },
  { id: "word-to-pdf",        name: "Word to PDF",         blurb: "Convert .docx files to polished PDFs.",                  emoji: "📘", category: "convert-to-pdf", status: "beta", accent: C.blue  },
  { id: "powerpoint-to-pdf",  name: "PowerPoint to PDF",   blurb: "Turn a .pptx deck into PDF slides.",                     emoji: "📽️", category: "convert-to-pdf", status: "beta", accent: C.amber },
  { id: "excel-to-pdf",       name: "Excel to PDF",        blurb: "Export spreadsheets as clean PDFs.",                     emoji: "📊", category: "convert-to-pdf", status: "beta", accent: C.green },
  { id: "html-to-pdf",        name: "HTML to PDF",         blurb: "Paste HTML or a URL → PDF.",                             emoji: "🌐", category: "convert-to-pdf", status: "beta", accent: C.cyan  },

  // Convert from PDF
  { id: "pdf-to-jpg",         name: "PDF to JPG",          blurb: "Export every page as a high-res JPG.",                  emoji: "🖼️", category: "convert-from-pdf", status: "beta", accent: C.amber },
  { id: "pdf-to-word",        name: "PDF to Word",         blurb: "Editable .docx from any PDF.",                           emoji: "📘", category: "convert-from-pdf", status: "beta", accent: C.blue  },
  { id: "pdf-to-powerpoint",  name: "PDF to PowerPoint",   blurb: "Convert a PDF into editable slides.",                    emoji: "📽️", category: "convert-from-pdf", status: "beta", accent: C.amber },
  { id: "pdf-to-excel",       name: "PDF to Excel",        blurb: "Extract tables into a spreadsheet.",                     emoji: "📊", category: "convert-from-pdf", status: "beta", accent: C.green },
  { id: "pdf-to-pdfa",        name: "PDF to PDF/A",        blurb: "Archive-ready long-term PDF/A format.",                  emoji: "🗄️", category: "convert-from-pdf", status: "soon", accent: C.slate },

  // Edit
  { id: "rotate-pdf",         name: "Rotate PDF",          blurb: "Rotate pages individually or in bulk.",                 emoji: "🔄", category: "edit", status: "beta", accent: C.violet },
  { id: "page-numbers",       name: "Add page numbers",    blurb: "Insert page numbers on any PDF.",                        emoji: "🔢", category: "edit", status: "beta", accent: C.violet },
  { id: "watermark",          name: "Add watermark",       blurb: "Overlay text or image watermark.",                       emoji: "💧", category: "edit", status: "beta", accent: C.violet },
  { id: "crop-pdf",           name: "Crop PDF",            blurb: "Trim page margins cleanly.",                             emoji: "🪚", category: "edit", status: "beta", accent: C.violet },
  { id: "edit-pdf",           name: "Edit PDF",            blurb: "Edit text and images directly in the PDF.",              emoji: "✏️", category: "edit", status: "soon", accent: C.violet },

  // Secure
  { id: "unlock-pdf",         name: "Unlock PDF",          blurb: "Remove password protection you own.",                   emoji: "🔓", category: "secure", status: "beta", accent: C.blue   },
  { id: "protect-pdf",        name: "Protect PDF",         blurb: "Add a password to a PDF.",                               emoji: "🔐", category: "secure", status: "beta", accent: C.blue   },
  { id: "sign-pdf",           name: "Sign PDF",            blurb: "Draw, upload, or type your signature.",                  emoji: "✒️", category: "secure", status: "beta", accent: C.pink   },
  { id: "redact-pdf",         name: "Redact PDF",          blurb: "Permanently black out sensitive content.",               emoji: "⬛", category: "secure", status: "soon", accent: C.red    },
  { id: "compare-pdf",        name: "Compare PDF",         blurb: "Diff two versions of the same PDF.",                     emoji: "🆚", category: "secure", status: "soon", accent: C.cyan   },

  // Intelligence
  { id: "summarize",          name: "AI Summarizer",       blurb: "Executive summary from a long document.",               emoji: "🧠", category: "intelligence", status: "live", accent: C.violet },
  { id: "translate",          name: "Translate document",  blurb: "Translate text or .txt files into 14 languages.",        emoji: "🈶", category: "intelligence", status: "live", accent: C.violet },
];

export function getTool(id: string): DocTool | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function toolsByCategory(category: ToolCategory): DocTool[] {
  return TOOLS.filter((t) => t.category === category);
}

export const STATUS_LABEL: Record<ToolStatus, string> = {
  live: "Live",
  beta: "Beta",
  soon: "Coming soon",
};

export const STATUS_COLOR: Record<ToolStatus, string> = {
  live: "#10B981",
  beta: "#F59E0B",
  soon: "#64748B",
};
