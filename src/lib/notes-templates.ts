/**
 * Editable document templates for the notes editor.
 *
 * Every template is defined as plain HTML so it works directly in the
 * current textarea-based editor (which stores markup in `notes.html`)
 * and will also work unchanged when we swap in a rich-text editor later.
 *
 * Content patterns are based on common public-domain document formats
 * (business letters follow the Gregg Reference Manual layout, resumes
 * follow the common chronological/functional patterns taught in most
 * university career centres). Nothing here is copyrighted — they're
 * generic, editable starter documents.
 */

export type TemplateCategory = "Letters" | "Resumes" | "Education" | "Business";
export type TemplateDocType = "doc" | "slides" | "table" | "pdf";

export interface NoteTemplate {
  id: string;
  name: string;
  category: TemplateCategory | string;  // category is free-form for slides/table/pdf
  docType: TemplateDocType;
  accent: string;
  html: string;           // document body (editable). Shape depends on docType:
                          // - doc   → full rich HTML
                          // - slides→ JSON: { slides: [{title, subtitle, body}] }
                          // - table → JSON: { sheets: [{name, rows: [[cell]]}] }
                          // - pdf   → JSON: { style, size, orientation, pages: [html] }
}

const LETTER_COVER = `<div style="font-family:Georgia,serif;color:#111;line-height:1.6;padding:48px;">
  <div style="text-align:right;font-size:13px;color:#555;">
    Your Name<br>Your Address<br>your.email@example.com<br>+234 000 000 0000
  </div>
  <div style="margin-top:32px;font-size:13px;">[Today's date]</div>
  <div style="margin-top:28px;font-size:13px;">
    Hiring Manager<br>Company Name<br>Company Address
  </div>
  <p style="margin-top:28px;"><strong>Dear Hiring Manager,</strong></p>
  <p>I am writing to apply for the <strong>[Role]</strong> position advertised on [where you saw it]. With a background in [field] and hands-on experience in [key skill], I believe I can contribute meaningfully to your team.</p>
  <p>In my most recent role at [Previous Company], I [accomplishment with a number or outcome]. I'm particularly drawn to [Company] because [specific reason].</p>
  <p>I've attached my CV for your review and would welcome the opportunity to discuss how my experience aligns with your needs.</p>
  <p>Warm regards,</p>
  <p style="margin-top:24px;"><strong>Your Name</strong></p>
</div>`;

const LETTER_BUSINESS = `<div style="font-family:Arial,sans-serif;color:#111;line-height:1.55;padding:48px;">
  <div style="border-bottom:2px solid #1E88E5;padding-bottom:12px;margin-bottom:24px;">
    <div style="font-size:18px;font-weight:700;color:#1E88E5;">Your Company</div>
    <div style="font-size:11px;color:#666;">Address • Phone • Email</div>
  </div>
  <p><strong>Subject:</strong> [Subject of this letter]</p>
  <p>Dear [Recipient Name],</p>
  <p>[Opening paragraph — state the purpose of the letter clearly in one or two sentences.]</p>
  <p>[Body paragraph — provide the supporting details, data, or context that justify your message.]</p>
  <p>[Closing paragraph — restate the action you'd like the reader to take, or how you plan to follow up.]</p>
  <p style="margin-top:24px;">Sincerely,</p>
  <p><strong>Your Name</strong><br><span style="font-size:12px;color:#666;">Your Title</span></p>
</div>`;

const LETTER_THANKS = `<div style="font-family:'Georgia',serif;color:#1b1b1b;line-height:1.7;padding:56px;">
  <h1 style="font-size:28px;color:#4CAF50;margin:0 0 18px;">Thank you</h1>
  <p>Dear [Name],</p>
  <p>I wanted to take a moment to thank you for [what they did — be specific]. It genuinely made a difference, and I noticed [the effect it had].</p>
  <p>I'm grateful for the time and thought you put in. If there's ever anything I can do to return the favour, please don't hesitate to ask.</p>
  <p style="margin-top:28px;">With appreciation,</p>
  <p><strong>Your Name</strong></p>
</div>`;

const RESUME_MODERN = `<div style="font-family:'Helvetica',sans-serif;color:#111;padding:40px;">
  <div style="background:#1E88E5;color:#fff;padding:24px;border-radius:10px;">
    <div style="font-size:28px;font-weight:800;">Your Name</div>
    <div style="font-size:13px;opacity:0.9;">Your Headline — e.g. Product Designer</div>
    <div style="font-size:11px;margin-top:8px;opacity:0.85;">email@example.com • +234 000 000 0000 • linkedin.com/in/you</div>
  </div>
  <h2 style="font-size:14px;color:#1E88E5;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:22px;">Summary</h2>
  <p style="font-size:13px;line-height:1.6;">[One-paragraph summary of who you are and what you bring. Lead with years of experience and top specialty.]</p>
  <h2 style="font-size:14px;color:#1E88E5;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:18px;">Experience</h2>
  <div style="font-size:13px;line-height:1.55;">
    <div><strong>Role Title</strong> — Company, City <span style="float:right;color:#666;">MMM YYYY – Present</span></div>
    <ul><li>Impact-driven bullet with a number, e.g. "Grew X by 40%."</li><li>Responsibility that highlights scope.</li><li>Win that relates to the role you're applying for.</li></ul>
    <div style="margin-top:10px;"><strong>Previous Role</strong> — Previous Company <span style="float:right;color:#666;">MMM YYYY – MMM YYYY</span></div>
    <ul><li>Key achievement with metric.</li></ul>
  </div>
  <h2 style="font-size:14px;color:#1E88E5;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:18px;">Education</h2>
  <p style="font-size:13px;"><strong>Degree</strong>, University — Year</p>
  <h2 style="font-size:14px;color:#1E88E5;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:18px;">Skills</h2>
  <p style="font-size:13px;">Skill 1 • Skill 2 • Skill 3 • Skill 4 • Skill 5</p>
</div>`;

const RESUME_CLASSIC = `<div style="font-family:'Times New Roman',serif;color:#000;padding:40px;">
  <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:10px;">
    <div style="font-size:24px;font-weight:700;letter-spacing:2px;">YOUR NAME</div>
    <div style="font-size:11px;">Address • Phone • Email • LinkedIn</div>
  </div>
  <h2 style="font-size:13px;letter-spacing:2px;margin-top:18px;">OBJECTIVE</h2>
  <p style="font-size:12px;line-height:1.55;">[Concise statement of the role you seek and what you'll contribute.]</p>
  <h2 style="font-size:13px;letter-spacing:2px;margin-top:14px;">EXPERIENCE</h2>
  <div style="font-size:12px;line-height:1.55;">
    <div><strong>Role Title, Company</strong> — City <em style="float:right;">YYYY – Present</em></div>
    <ul><li>Achievement with measurable outcome.</li><li>Responsibility demonstrating ownership.</li></ul>
  </div>
  <h2 style="font-size:13px;letter-spacing:2px;margin-top:14px;">EDUCATION</h2>
  <p style="font-size:12px;"><strong>Degree</strong>, University, Year</p>
  <h2 style="font-size:13px;letter-spacing:2px;margin-top:14px;">SKILLS</h2>
  <p style="font-size:12px;">List your relevant technical and soft skills, comma-separated.</p>
</div>`;

const RESUME_MINIMAL = `<div style="font-family:'Inter','Helvetica',sans-serif;color:#222;padding:48px;">
  <div style="font-size:32px;font-weight:300;letter-spacing:-1px;">Your Name</div>
  <div style="font-size:12px;color:#777;margin-top:4px;">email@example.com · +234 000 0000 · linkedin.com/in/you</div>
  <hr style="margin:22px 0;border:none;border-top:1px solid #eee;">
  <div style="display:grid;grid-template-columns:120px 1fr;gap:18px;font-size:13px;">
    <div style="color:#999;text-transform:uppercase;letter-spacing:1px;font-size:10px;font-weight:700;">About</div>
    <div>One sentence that captures who you are and the value you add.</div>
    <div style="color:#999;text-transform:uppercase;letter-spacing:1px;font-size:10px;font-weight:700;">Experience</div>
    <div>
      <div><strong>Role</strong> at Company · YYYY–Present</div>
      <div style="color:#555;margin:4px 0 10px;">What you did and the outcome.</div>
      <div><strong>Previous Role</strong> at Company · YYYY–YYYY</div>
      <div style="color:#555;margin-top:4px;">Key wins and scope.</div>
    </div>
    <div style="color:#999;text-transform:uppercase;letter-spacing:1px;font-size:10px;font-weight:700;">Education</div>
    <div>Degree, University (Year)</div>
    <div style="color:#999;text-transform:uppercase;letter-spacing:1px;font-size:10px;font-weight:700;">Skills</div>
    <div>Skill 1, Skill 2, Skill 3, Skill 4</div>
  </div>
</div>`;

const EDU_STUDY_NOTES = `<div style="font-family:'Nunito',sans-serif;color:#222;padding:40px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #AB47BC;padding-bottom:8px;">
    <div>
      <div style="font-size:12px;color:#AB47BC;font-weight:700;letter-spacing:2px;">STUDY NOTES</div>
      <div style="font-size:22px;font-weight:800;">[Topic / Chapter title]</div>
    </div>
    <div style="font-size:11px;color:#777;">[Course] • [Date]</div>
  </div>
  <h2 style="color:#AB47BC;font-size:15px;margin-top:18px;">Key concepts</h2>
  <ul style="font-size:13px;line-height:1.7;"><li><strong>Concept 1:</strong> [short definition]</li><li><strong>Concept 2:</strong> [short definition]</li><li><strong>Concept 3:</strong> [short definition]</li></ul>
  <h2 style="color:#AB47BC;font-size:15px;margin-top:14px;">Questions to test yourself</h2>
  <ol style="font-size:13px;line-height:1.7;"><li>[Question]</li><li>[Question]</li><li>[Question]</li></ol>
  <h2 style="color:#AB47BC;font-size:15px;margin-top:14px;">Summary</h2>
  <p style="font-size:13px;line-height:1.7;">[In 3–4 sentences, re-explain the topic as if teaching it.]</p>
</div>`;

const EDU_LECTURE = `<div style="font-family:'Nunito',sans-serif;color:#222;padding:40px;">
  <div style="font-size:26px;font-weight:800;color:#1E88E5;">Lecture: [Title]</div>
  <div style="font-size:12px;color:#777;">[Course Code] · Lecturer: [Name] · Date: [DD/MM/YYYY]</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;">
    <div>
      <h3 style="font-size:13px;color:#1E88E5;">Main points</h3>
      <ul style="font-size:12px;line-height:1.6;"><li>Point 1…</li><li>Point 2…</li><li>Point 3…</li></ul>
    </div>
    <div>
      <h3 style="font-size:13px;color:#1E88E5;">Cornell questions</h3>
      <p style="font-size:12px;color:#555;">Write questions here that you'll answer from the main points.</p>
    </div>
  </div>
  <div style="background:#F4F6FA;border-left:4px solid #1E88E5;padding:12px;font-size:12px;margin-top:12px;">
    <strong>Summary:</strong> One paragraph rewording the lecture in your own words.
  </div>
</div>`;

const EDU_RESEARCH = `<div style="font-family:'Georgia',serif;color:#1b1b1b;padding:44px;">
  <div style="font-size:10px;letter-spacing:3px;color:#888;">RESEARCH SUMMARY</div>
  <div style="font-size:26px;font-weight:700;margin-top:4px;">[Paper title]</div>
  <div style="font-size:11px;color:#666;margin-top:4px;">Author(s) · Year · Source</div>
  <h2 style="font-size:14px;margin-top:18px;">Problem</h2>
  <p style="font-size:13px;line-height:1.6;">[What gap does this paper address?]</p>
  <h2 style="font-size:14px;margin-top:12px;">Method</h2>
  <p style="font-size:13px;line-height:1.6;">[How did they approach it? Sample, setup, technique.]</p>
  <h2 style="font-size:14px;margin-top:12px;">Findings</h2>
  <p style="font-size:13px;line-height:1.6;">[What did they discover? Numbers if any.]</p>
  <h2 style="font-size:14px;margin-top:12px;">My take</h2>
  <p style="font-size:13px;line-height:1.6;">[Strengths, weaknesses, how this connects to your own work.]</p>
</div>`;

const BIZ_MEETING = `<div style="font-family:'Nunito',sans-serif;color:#1b1b1b;padding:40px;">
  <div style="font-size:10px;letter-spacing:2px;color:#EF5350;font-weight:800;">MEETING MINUTES</div>
  <div style="font-size:24px;font-weight:800;">[Meeting topic]</div>
  <div style="font-size:12px;color:#777;">[Date] · [Time] · [Location / link]</div>
  <h3 style="font-size:13px;margin-top:16px;">Attendees</h3>
  <p style="font-size:12px;">Name 1, Name 2, Name 3</p>
  <h3 style="font-size:13px;margin-top:12px;">Agenda</h3>
  <ol style="font-size:12px;line-height:1.7;"><li>Topic 1</li><li>Topic 2</li><li>Topic 3</li></ol>
  <h3 style="font-size:13px;margin-top:12px;">Decisions</h3>
  <ul style="font-size:12px;line-height:1.7;"><li>[Decision 1 — who's responsible]</li><li>[Decision 2 — who's responsible]</li></ul>
  <h3 style="font-size:13px;margin-top:12px;">Action items</h3>
  <table style="font-size:11px;width:100%;border-collapse:collapse;margin-top:4px;"><thead><tr style="background:#F4F6FA;"><th style="text-align:left;padding:6px;">Task</th><th style="text-align:left;padding:6px;">Owner</th><th style="text-align:left;padding:6px;">Due</th></tr></thead><tbody><tr><td style="padding:6px;border-top:1px solid #eee;">[task]</td><td style="padding:6px;border-top:1px solid #eee;">[name]</td><td style="padding:6px;border-top:1px solid #eee;">[date]</td></tr></tbody></table>
</div>`;

const BIZ_PROPOSAL = `<div style="font-family:'Nunito',sans-serif;color:#1b1b1b;padding:44px;">
  <div style="background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;padding:28px;border-radius:12px;">
    <div style="font-size:10px;letter-spacing:3px;opacity:0.8;">PROJECT PROPOSAL</div>
    <div style="font-size:28px;font-weight:800;">[Project name]</div>
    <div style="font-size:12px;opacity:0.9;margin-top:4px;">Prepared by [Your name] for [Client] · [Date]</div>
  </div>
  <h2 style="color:#1E88E5;font-size:15px;margin-top:18px;">Background</h2>
  <p style="font-size:13px;line-height:1.6;">[What problem are we solving and for whom?]</p>
  <h2 style="color:#1E88E5;font-size:15px;margin-top:14px;">Objectives</h2>
  <ul style="font-size:13px;line-height:1.6;"><li>Objective 1</li><li>Objective 2</li><li>Objective 3</li></ul>
  <h2 style="color:#1E88E5;font-size:15px;margin-top:14px;">Scope</h2>
  <p style="font-size:13px;line-height:1.6;">[What's in scope. What's explicitly not in scope.]</p>
  <h2 style="color:#1E88E5;font-size:15px;margin-top:14px;">Timeline</h2>
  <p style="font-size:13px;line-height:1.6;">Phase 1 (week 1–2): [activity]<br>Phase 2 (week 3–4): [activity]<br>Phase 3 (week 5+): [activity]</p>
  <h2 style="color:#1E88E5;font-size:15px;margin-top:14px;">Investment</h2>
  <p style="font-size:13px;line-height:1.6;">[Budget or pricing]</p>
</div>`;

const BIZ_INVOICE = `<div style="font-family:'Nunito',sans-serif;color:#1b1b1b;padding:40px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div><div style="font-size:22px;font-weight:800;color:#107C41;">INVOICE</div><div style="font-size:11px;color:#666;">Invoice #[0001]</div></div>
    <div style="text-align:right;font-size:12px;color:#666;">Your Company<br>Address · Email · Phone</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px;font-size:12px;">
    <div><strong>Bill to</strong><br>Client name<br>Client address<br>Client email</div>
    <div style="text-align:right;"><strong>Issued:</strong> [date]<br><strong>Due:</strong> [date]</div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:18px;font-size:12px;"><thead><tr style="background:#F4F6FA;"><th style="text-align:left;padding:8px;">Description</th><th style="text-align:right;padding:8px;">Qty</th><th style="text-align:right;padding:8px;">Rate</th><th style="text-align:right;padding:8px;">Amount</th></tr></thead><tbody><tr><td style="padding:8px;border-top:1px solid #eee;">[Service 1]</td><td style="padding:8px;border-top:1px solid #eee;text-align:right;">1</td><td style="padding:8px;border-top:1px solid #eee;text-align:right;">₦0.00</td><td style="padding:8px;border-top:1px solid #eee;text-align:right;">₦0.00</td></tr><tr><td style="padding:8px;border-top:1px solid #eee;">[Service 2]</td><td style="padding:8px;border-top:1px solid #eee;text-align:right;">1</td><td style="padding:8px;border-top:1px solid #eee;text-align:right;">₦0.00</td><td style="padding:8px;border-top:1px solid #eee;text-align:right;">₦0.00</td></tr></tbody><tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:700;">Total</td><td style="padding:8px;text-align:right;font-weight:800;color:#107C41;">₦0.00</td></tr></tfoot></table>
  <div style="font-size:11px;color:#666;margin-top:16px;">Payable to [bank name], account [number]. Thank you for your business.</div>
</div>`;

/* ────────────────────────────────────────────────────────────
   SLIDES templates — richly styled, inline-HTML bodies with per-
   template design language. Shape:
     { bg?, titleColor?, slides: [{title, subtitle?, body, bg?}] }
   ──────────────────────────────────────────────────────────── */

const SLIDES_PITCH = JSON.stringify({
  bg: "linear-gradient(135deg,#0D47A1,#1E88E5)", titleColor: "#fff",
  slides: [
    { title: "Your Startup", subtitle: "Seed pitch deck — 2026", body: `<p style="opacity:0.8;">Founder names · Company · Date</p>` },
    { title: "The Problem", body: `<ul style="font-size:1.1em;line-height:1.7;"><li>What struggle do users face today?</li><li>How big is the pain — how often, how costly?</li><li>Why hasn't it been solved yet?</li></ul>` },
    { title: "Our Solution", body: `<p style="font-size:1.3em;font-weight:600;">One sentence on what we do.</p><p>Then three bullets on how it works — stay concrete.</p>` },
    { title: "Product", body: `<p>Screenshot or demo shot goes here.</p><p style="color:#555;">Caption explaining what we're looking at.</p>` },
    { title: "Market", body: `<p style="font-size:1.1em;">TAM $X B · SAM $Y B · SOM $Z M</p><p>Back each number up with a reputable source.</p>` },
    { title: "Business Model", body: `<ul><li>How we charge</li><li>Unit economics (ARPU, gross margin)</li><li>Sales motion</li></ul>` },
    { title: "Traction", body: `<p style="font-size:1.3em;color:#1E88E5;font-weight:800;">↑ 3× QoQ growth</p><p>Users · Revenue · Retention curve</p>` },
    { title: "Competition", body: `<p>2×2 matrix positioning us against incumbents.</p>` },
    { title: "Team", body: `<p>Founders, key hires, and the unfair advantage each brings.</p>` },
    { title: "The Ask", body: `<p style="font-size:1.3em;font-weight:800;">Raising $X on $Y cap.</p><ul><li>12 months runway</li><li>Hires: 3 engineers, 1 designer</li><li>Milestones: …</li></ul>` },
  ],
});

const SLIDES_INVESTOR_UPDATE = JSON.stringify({
  bg: "linear-gradient(135deg,#1B1F2B,#263238)", titleColor: "#fff",
  slides: [
    { title: "Monthly Investor Update", subtitle: "[Month YYYY]", body: `<p style="opacity:0.8;">From: [Founder] · To: [Investors]</p>` },
    { title: "TL;DR", body: `<p style="font-size:1.1em;line-height:1.7;">Three-line summary of the month. Wins, losses, the ask.</p>` },
    { title: "Metrics", body: `<table style="width:100%;border-collapse:collapse;font-size:0.95em;"><tr style="border-bottom:2px solid #ddd;"><th style="text-align:left;padding:8px;">Metric</th><th style="padding:8px;">Last</th><th style="padding:8px;">This</th><th style="padding:8px;">Δ</th></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">MRR</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;color:#43A047;">+%</td></tr><tr style="border-bottom:1px solid #eee;"><td style="padding:8px;">Users</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;color:#43A047;">+%</td></tr></table>` },
    { title: "Wins", body: `<ul><li>Shipped [feature]</li><li>Signed [customer]</li><li>Hired [role]</li></ul>` },
    { title: "Challenges", body: `<ul><li>Where we're behind</li><li>What's blocking</li><li>What we're trying next</li></ul>` },
    { title: "The Ask", body: `<p>Introductions, hires, advice — be specific.</p>` },
  ],
});

const SLIDES_PRODUCT_LAUNCH = JSON.stringify({
  bg: "linear-gradient(135deg,#6A1B9A,#E91E63)", titleColor: "#fff",
  slides: [
    { title: "Introducing [Product]", subtitle: "Launching [Month Year]", body: `<p style="opacity:0.9;font-size:1.1em;">The tagline that makes a busy person care.</p>` },
    { title: "Why Now", body: `<p>The shift in the world that makes this the right moment.</p>` },
    { title: "The Magic Moment", body: `<p>Screenshot or 15-second demo.</p><p style="font-style:italic;color:#666;">"I can't believe this is possible."</p>` },
    { title: "Key Features", body: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;font-size:0.95em;"><div><strong>🚀 Fast</strong><br>One-line benefit</div><div><strong>🎯 Focused</strong><br>One-line benefit</div><div><strong>💎 Premium</strong><br>One-line benefit</div></div>` },
    { title: "Pricing", body: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;"><div style="border:1px solid #ddd;padding:14px;border-radius:8px;"><strong>Free</strong><br><span style="font-size:1.4em;">$0</span></div><div style="border:2px solid #AB47BC;padding:14px;border-radius:8px;background:rgba(171,71,188,0.05);"><strong>Pro</strong><br><span style="font-size:1.4em;">$X/mo</span></div><div style="border:1px solid #ddd;padding:14px;border-radius:8px;"><strong>Team</strong><br><span style="font-size:1.4em;">$Y/mo</span></div></div>` },
    { title: "Get Started", body: `<p style="font-size:1.4em;font-weight:800;color:#E91E63;">yoursite.com/launch</p><p>Early-access code: <strong>LAUNCH2026</strong></p>` },
  ],
});

const SLIDES_SALES = JSON.stringify({
  bg: "#fff", titleColor: "#1E3C6E",
  slides: [
    { title: "A proposal for [Client]", subtitle: "[Your Company] · [Date]", body: `<p>Prepared by: [Your name], [Your role]</p>` },
    { title: "Your challenge", body: `<ul><li>Pain point 1 — in their own words</li><li>Pain point 2</li><li>Pain point 3</li></ul><p style="color:#666;font-style:italic;">Listen more than you talk here.</p>` },
    { title: "Our approach", body: `<p>Three-step approach to solve it. Keep it simple.</p><ol><li>Discovery</li><li>Design</li><li>Deliver</li></ol>` },
    { title: "What you'll get", body: `<ul><li>Deliverable 1 (by week 2)</li><li>Deliverable 2 (by week 4)</li><li>Deliverable 3 (by week 6)</li></ul>` },
    { title: "Case study", body: `<p><strong>[Similar client]</strong> saw [concrete outcome] in [timeframe].</p>` },
    { title: "Investment", body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;"><div style="padding:14px;background:#F4F6FA;border-radius:8px;"><strong>Option A — Essentials</strong><br><span style="font-size:1.3em;color:#1E88E5;">$X</span></div><div style="padding:14px;background:#1E88E5;color:#fff;border-radius:8px;"><strong>Option B — Full</strong><br><span style="font-size:1.3em;">$Y</span></div></div>` },
    { title: "Next steps", body: `<ol><li>Sign-off by [date]</li><li>Kick-off call [date]</li><li>First check-in [date]</li></ol>` },
  ],
});

const SLIDES_QUARTERLY = JSON.stringify({
  bg: "#fff", titleColor: "#263238",
  slides: [
    { title: "Q[X] Business Review", subtitle: "[Year] · [Team / Department]", body: `<p>Presented by: [Name]</p>` },
    { title: "Objectives vs results", body: `<table style="width:100%;border-collapse:collapse;"><tr style="background:#F4F6FA;"><th style="padding:8px;text-align:left;">Objective</th><th style="padding:8px;">Target</th><th style="padding:8px;">Actual</th><th style="padding:8px;">Status</th></tr><tr><td style="padding:8px;border-top:1px solid #eee;">Objective 1</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;">🟢 Hit</td></tr><tr><td style="padding:8px;border-top:1px solid #eee;">Objective 2</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;">—</td><td style="padding:8px;text-align:center;">🟡 Partial</td></tr></table>` },
    { title: "Wins", body: `<ul><li>Big launch</li><li>Customer wins</li><li>Team hires</li></ul>` },
    { title: "Misses", body: `<ul><li>What didn't land and why</li><li>What we're changing</li></ul>` },
    { title: "Next quarter", body: `<p>3–5 objectives with measurable outcomes.</p>` },
  ],
});

const SLIDES_MARKETING_PLAN = JSON.stringify({
  bg: "linear-gradient(135deg,#FF6F00,#FFC107)", titleColor: "#fff",
  slides: [
    { title: "Marketing Plan", subtitle: "[Campaign / Quarter]", body: `<p style="opacity:0.9;">Owner: [Name] · Budget: $[X]</p>` },
    { title: "Goal", body: `<p style="font-size:1.3em;font-weight:700;">Specific, measurable outcome in one sentence.</p>` },
    { title: "Audience", body: `<ul><li>Who they are (persona)</li><li>Where they hang out</li><li>What moves them</li></ul>` },
    { title: "Channels", body: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div>📱 Social · <em>organic + paid</em></div><div>📧 Email · <em>newsletter + drips</em></div><div>🤝 Partnerships</div><div>📣 PR / influencers</div></div>` },
    { title: "Timeline", body: `<p>Week 1–2: …<br>Week 3–4: …<br>Week 5+: …</p>` },
    { title: "Budget", body: `<p>Total $X split across channels. Attribution method: …</p>` },
  ],
});

const SLIDES_CONFERENCE_TALK = JSON.stringify({
  bg: "#0A0E1A", titleColor: "#fff",
  slides: [
    { title: "[Talk title]", subtitle: "[Conference] · [Date]", body: `<p style="opacity:0.7;">[Your name], [Role] at [Company]<br>@yourhandle</p>` },
    { title: "Why I'm here", body: `<p>30-second story of why this talk matters to you.</p>` },
    { title: "What you'll leave with", body: `<ol><li>Takeaway 1</li><li>Takeaway 2</li><li>Takeaway 3</li></ol>` },
    { title: "The problem", body: `<p style="font-size:1.2em;">Paint the picture — concrete, vivid.</p>` },
    { title: "Insight #1", body: `<p style="font-size:1.5em;font-weight:800;text-align:center;padding:20px 0;">A quotable one-liner.</p><p>Evidence / example below.</p>` },
    { title: "Insight #2", body: `<p style="font-size:1.5em;font-weight:800;text-align:center;padding:20px 0;">Another sharp claim.</p>` },
    { title: "Applying it tomorrow", body: `<ul><li>Concrete action 1</li><li>Concrete action 2</li><li>Concrete action 3</li></ul>` },
    { title: "Thank you", body: `<p style="font-size:1.4em;">Questions? Find me at @yourhandle or [email].</p>` },
  ],
});

const SLIDES_LESSON = JSON.stringify({
  bg: "linear-gradient(135deg,#AB47BC,#6A1B9A)", titleColor: "#fff",
  slides: [
    { title: "[Lesson title]", subtitle: "[Course code] · [Date]", body: `<p style="opacity:0.9;">Instructor: [Name]</p>` },
    { title: "Learning objectives", body: `<ol style="font-size:1.1em;line-height:1.8;"><li>By the end you'll be able to …</li><li>By the end you'll be able to …</li><li>By the end you'll be able to …</li></ol>` },
    { title: "Warm-up", body: `<p>A 2-minute reflection or quick question to prime thinking.</p>` },
    { title: "Key concept 1", body: `<p><strong>Definition.</strong> Short explanation.</p><p><em>Example:</em> …</p>` },
    { title: "Key concept 2", body: `<p><strong>Definition.</strong> Short explanation.</p><p><em>Example:</em> …</p>` },
    { title: "Practice", body: `<ol><li>Try this problem</li><li>Try this problem</li><li>Try this problem</li></ol>` },
    { title: "Summary", body: `<ul><li>Main point 1</li><li>Main point 2</li><li>Main point 3</li></ul>` },
    { title: "Homework", body: `<p>Read: …<br>Do: …<br>Submit by: …</p>` },
  ],
});

const SLIDES_THESIS = JSON.stringify({
  bg: "#fff", titleColor: "#1B3A57",
  slides: [
    { title: "[Thesis title]", subtitle: "Thesis defence — [Name], [Year]", body: `<p>Advisor: [Prof Name]</p>` },
    { title: "Research question", body: `<p style="font-size:1.2em;font-style:italic;">"State the question clearly in one sentence."</p>` },
    { title: "Background & motivation", body: `<p>Why this matters. What the literature has and hasn't addressed.</p>` },
    { title: "Methodology", body: `<ul><li>Data / sample</li><li>Analysis technique</li><li>Validity checks</li></ul>` },
    { title: "Findings", body: `<p>3–4 main findings, each with a chart or quote.</p>` },
    { title: "Discussion", body: `<p>How findings fit with (or challenge) existing theory.</p>` },
    { title: "Limitations & future work", body: `<ul><li>Limitation 1</li><li>Limitation 2</li><li>Follow-up study ideas</li></ul>` },
    { title: "Thank you", body: `<p>Ready for questions.</p>` },
  ],
});

const SLIDES_WEEKLY_REPORT = JSON.stringify({
  bg: "linear-gradient(135deg,#1E88E5,#1565C0)", titleColor: "#fff",
  slides: [
    { title: "Weekly update", subtitle: "[Team] · week of [Date]", body: `<p style="opacity:0.9;">Posted by [Name]</p>` },
    { title: "🏆 Wins", body: `<ul style="font-size:1.1em;line-height:1.8;"><li>Win 1</li><li>Win 2</li><li>Win 3</li></ul>` },
    { title: "🚧 In progress", body: `<ul><li>Item — owner — ETA</li><li>Item — owner — ETA</li></ul>` },
    { title: "🔴 Blockers", body: `<ul><li>What's slowing us down — and what we need to unblock it</li></ul>` },
    { title: "📅 Next week", body: `<ul><li>Commitment 1</li><li>Commitment 2</li><li>Commitment 3</li></ul>` },
  ],
});

const SLIDES_PORTFOLIO = JSON.stringify({
  bg: "linear-gradient(135deg,#FF7043,#EF5350)", titleColor: "#fff",
  slides: [
    { title: "Your Name", subtitle: "Designer / Developer / Creator · Portfolio 2026", body: `<p style="opacity:0.9;">yourdomain.com · @yourhandle</p>` },
    { title: "Selected work", body: `<ul><li>Project 1 — one-line description</li><li>Project 2 — one-line description</li><li>Project 3 — one-line description</li></ul>` },
    { title: "Case study 1", body: `<p><strong>Client:</strong> …<br><strong>Brief:</strong> …<br><strong>Outcome:</strong> …</p>` },
    { title: "Case study 2", body: `<p><strong>Client:</strong> …<br><strong>Brief:</strong> …<br><strong>Outcome:</strong> …</p>` },
    { title: "Services", body: `<ul><li>What I offer</li><li>Who I work with</li><li>How I work</li></ul>` },
    { title: "Let's talk", body: `<p style="font-size:1.4em;font-weight:800;">hello@yourdomain.com</p>` },
  ],
});

const SLIDES_RESUME_DECK = JSON.stringify({
  bg: "#fff", titleColor: "#263238",
  slides: [
    { title: "Your Name", subtitle: "Role · Location · Year", body: `<p style="color:#666;">email · phone · linkedin</p>` },
    { title: "At a glance", body: `<p style="font-size:1.2em;">One-sentence elevator pitch.</p><p>Three words that capture you.</p>` },
    { title: "Experience", body: `<ul><li><strong>Role</strong> at Company — YYYY–Present</li><li><strong>Role</strong> at Company — YYYY–YYYY</li></ul>` },
    { title: "Highlights", body: `<ul><li>Measurable win 1</li><li>Measurable win 2</li><li>Measurable win 3</li></ul>` },
    { title: "Skills", body: `<p>Skill 1 · Skill 2 · Skill 3 · Skill 4 · Skill 5</p>` },
    { title: "Education", body: `<p>Degree — University — Year</p>` },
  ],
});

const SLIDES_WEDDING = JSON.stringify({
  bg: "linear-gradient(135deg,#FCE4EC,#F8BBD0)", titleColor: "#4A148C",
  slides: [
    { title: "[Couple names]", subtitle: "Save the date · [Date]", body: `<p style="font-style:italic;color:#880E4F;">Because together is our favourite place to be.</p>` },
    { title: "The story", body: `<p>A short paragraph about how you met, what brought you here.</p>` },
    { title: "The day", body: `<p><strong>Ceremony</strong> 3:00 pm · [Venue]<br><strong>Reception</strong> 5:00 pm · [Venue]</p>` },
    { title: "Travel & stay", body: `<p>Recommended hotels, airports, local tips.</p>` },
    { title: "RSVP", body: `<p style="font-size:1.3em;font-weight:700;">yoursite.com/rsvp by [Date]</p>` },
  ],
});

const SLIDES_PHOTO_STORY = JSON.stringify({
  bg: "#1B1B1B", titleColor: "#fff",
  slides: [
    { title: "[Title]", subtitle: "A photo story by [Name]", body: `<p style="opacity:0.75;">[Date / location]</p>` },
    { title: "Chapter 1", body: `<p>Caption for the first chapter. Drop images via the Image button in the toolbar.</p>` },
    { title: "Chapter 2", body: `<p>Short text to bridge the images.</p>` },
    { title: "Chapter 3", body: `<p>Let the images do the talking.</p>` },
    { title: "Thank you", body: `<p>Credits, links, the next project.</p>` },
  ],
});

const SLIDES_WORKSHOP = JSON.stringify({
  bg: "linear-gradient(135deg,#00897B,#004D40)", titleColor: "#fff",
  slides: [
    { title: "[Workshop title]", subtitle: "Hands-on · [Duration]", body: `<p style="opacity:0.9;">Facilitator: [Name]</p>` },
    { title: "Agenda", body: `<ol><li>Welcome (5 min)</li><li>Theory (15 min)</li><li>Hands-on (60 min)</li><li>Review (10 min)</li></ol>` },
    { title: "What you'll need", body: `<ul><li>Laptop + browser</li><li>Pen + notepad</li><li>A specific challenge from your work</li></ul>` },
    { title: "Step-by-step", body: `<ol><li>Step 1 — do this</li><li>Step 2 — then this</li><li>Step 3 — now try this</li></ol>` },
    { title: "Common pitfalls", body: `<ul><li>Mistake 1 and how to avoid it</li><li>Mistake 2 and how to avoid it</li></ul>` },
    { title: "Resources", body: `<p>Links, tools, recommended reading.</p>` },
    { title: "Your next step", body: `<p>One thing to do in the next 7 days.</p>` },
  ],
});

/* ────────────────────────────────────────────────────────────
   TABLE templates — stored as JSON { sheets: [{name, rows}] }
   ──────────────────────────────────────────────────────────── */

const TABLE_BUDGET = JSON.stringify({
  sheets: [{
    name: "Budget",
    rows: [
      ["Category", "Planned", "Actual", "Diff"],
      ["Rent",    "0", "0", "0"],
      ["Food",    "0", "0", "0"],
      ["Transit", "0", "0", "0"],
      ["Savings", "0", "0", "0"],
      ["Total",   "0", "0", "0"],
    ],
  }],
});
const TABLE_ROSTER = JSON.stringify({
  sheets: [{
    name: "Roster",
    rows: [
      ["#", "Name", "Role", "Email", "Status"],
      ["1", "", "", "", ""],
      ["2", "", "", "", ""],
      ["3", "", "", "", ""],
    ],
  }],
});
const TABLE_SCHEDULE = JSON.stringify({
  sheets: [{
    name: "Schedule",
    rows: [
      ["Time", "Mon", "Tue", "Wed", "Thu", "Fri"],
      ["9-10", "", "", "", "", ""],
      ["10-11","", "", "", "", ""],
      ["11-12","", "", "", "", ""],
      ["12-1", "", "", "", "", ""],
      ["1-2",  "", "", "", "", ""],
    ],
  }],
});
const TABLE_INVOICE = JSON.stringify({
  sheets: [{
    name: "Invoice",
    rows: [
      ["Invoice #", "Date", "Due", ""],
      ["[0001]",    "",     "",    ""],
      ["", "", "", ""],
      ["Description", "Qty", "Rate", "Amount"],
      ["",           "",    "",     ""],
      ["",           "",    "",     ""],
      ["",           "",    "Total", "₦0.00"],
    ],
  }],
});

/* ────────────────────────────────────────────────────────────
   PDF templates — stored as JSON { style, pages: [html] }
   style: "blank" | "lined" | "grid" | "staff"
   ──────────────────────────────────────────────────────────── */

const PDF_BLANK = JSON.stringify({ style: "blank", size: "A4", orientation: "portrait", color: "#ffffff", pages: [""] });
const PDF_LINED = JSON.stringify({ style: "lined", size: "A4", orientation: "portrait", color: "#ffffff", pages: [""] });
const PDF_GRID  = JSON.stringify({ style: "grid",  size: "A4", orientation: "portrait", color: "#ffffff", pages: [""] });
const PDF_STAFF = JSON.stringify({ style: "staff", size: "A4", orientation: "portrait", color: "#ffffff", pages: [""] });

export const NOTE_TEMPLATES: NoteTemplate[] = [
  { id: "letter-cover",    name: "Cover Letter",       category: "Letters", docType: "doc", accent: "#4CAF50", html: LETTER_COVER },
  { id: "letter-business", name: "Business Letter",    category: "Letters", docType: "doc", accent: "#1E88E5", html: LETTER_BUSINESS },
  { id: "letter-thanks",   name: "Thank-You Letter",   category: "Letters", docType: "doc", accent: "#26C6DA", html: LETTER_THANKS },

  { id: "resume-modern",   name: "Modern Resume",      category: "Resumes", docType: "doc", accent: "#1E88E5", html: RESUME_MODERN },
  { id: "resume-classic",  name: "Classic Resume",     category: "Resumes", docType: "doc", accent: "#263238", html: RESUME_CLASSIC },
  { id: "resume-minimal",  name: "Minimal Resume",     category: "Resumes", docType: "doc", accent: "#999999", html: RESUME_MINIMAL },

  { id: "edu-study",       name: "Study Notes",        category: "Education", docType: "doc", accent: "#AB47BC", html: EDU_STUDY_NOTES },
  { id: "edu-lecture",     name: "Lecture Notes",      category: "Education", docType: "doc", accent: "#1E88E5", html: EDU_LECTURE },
  { id: "edu-research",    name: "Research Summary",   category: "Education", docType: "doc", accent: "#6A1B9A", html: EDU_RESEARCH },

  { id: "biz-meeting",     name: "Meeting Minutes",    category: "Business", docType: "doc", accent: "#EF5350", html: BIZ_MEETING },
  { id: "biz-proposal",    name: "Project Proposal",   category: "Business", docType: "doc", accent: "#1E88E5", html: BIZ_PROPOSAL },
  { id: "biz-invoice",     name: "Invoice",            category: "Business", docType: "doc", accent: "#107C41", html: BIZ_INVOICE },

  // ── Slides (15 templates across 6 categories) ──
  { id: "slides-pitch",          name: "Seed Pitch Deck",      category: "Business",     docType: "slides", accent: "#1E88E5", html: SLIDES_PITCH },
  { id: "slides-investor",       name: "Investor Update",      category: "Business",     docType: "slides", accent: "#263238", html: SLIDES_INVESTOR_UPDATE },
  { id: "slides-quarterly",      name: "Quarterly Review",     category: "Business",     docType: "slides", accent: "#1B3A57", html: SLIDES_QUARTERLY },
  { id: "slides-weekly",         name: "Weekly Update",        category: "Business",     docType: "slides", accent: "#1E88E5", html: SLIDES_WEEKLY_REPORT },

  { id: "slides-product-launch", name: "Product Launch",       category: "Marketing",    docType: "slides", accent: "#E91E63", html: SLIDES_PRODUCT_LAUNCH },
  { id: "slides-sales-pitch",    name: "Client Proposal",      category: "Marketing",    docType: "slides", accent: "#1E88E5", html: SLIDES_SALES },
  { id: "slides-marketing-plan", name: "Marketing Plan",       category: "Marketing",    docType: "slides", accent: "#FF6F00", html: SLIDES_MARKETING_PLAN },

  { id: "slides-lesson",         name: "Lesson Slides",        category: "Education",    docType: "slides", accent: "#AB47BC", html: SLIDES_LESSON },
  { id: "slides-thesis",         name: "Thesis Defence",       category: "Education",    docType: "slides", accent: "#1B3A57", html: SLIDES_THESIS },
  { id: "slides-workshop",       name: "Workshop Deck",        category: "Education",    docType: "slides", accent: "#00897B", html: SLIDES_WORKSHOP },
  { id: "slides-conf-talk",      name: "Conference Talk",      category: "Education",    docType: "slides", accent: "#0A0E1A", html: SLIDES_CONFERENCE_TALK },

  { id: "slides-portfolio",      name: "Creative Portfolio",   category: "Creative",     docType: "slides", accent: "#FF7043", html: SLIDES_PORTFOLIO },
  { id: "slides-photo-story",    name: "Photo Story",          category: "Creative",     docType: "slides", accent: "#1B1B1B", html: SLIDES_PHOTO_STORY },

  { id: "slides-resume-deck",    name: "Resume Deck",          category: "Personal",     docType: "slides", accent: "#263238", html: SLIDES_RESUME_DECK },
  { id: "slides-wedding",        name: "Wedding Invite",       category: "Personal",     docType: "slides", accent: "#C2185B", html: SLIDES_WEDDING },

  // ── Tables ──
  { id: "tbl-budget",     name: "Monthly budget",    category: "Financial Management", docType: "table", accent: "#107C41", html: TABLE_BUDGET },
  { id: "tbl-roster",     name: "Class roster",      category: "Education",    docType: "table", accent: "#1E88E5", html: TABLE_ROSTER },
  { id: "tbl-schedule",   name: "Weekly schedule",   category: "Education",    docType: "table", accent: "#66BB6A", html: TABLE_SCHEDULE },
  { id: "tbl-invoice",    name: "Simple invoice",    category: "Invoice",      docType: "table", accent: "#107C41", html: TABLE_INVOICE },

  // ── PDFs ──
  { id: "pdf-blank",      name: "Blank",             category: "Styles",       docType: "pdf", accent: "#8892A4", html: PDF_BLANK },
  { id: "pdf-lined",      name: "Lined",             category: "Styles",       docType: "pdf", accent: "#1E88E5", html: PDF_LINED },
  { id: "pdf-grid",       name: "Grid",              category: "Styles",       docType: "pdf", accent: "#66BB6A", html: PDF_GRID },
  { id: "pdf-staff",      name: "Music staff",       category: "Styles",       docType: "pdf", accent: "#AB47BC", html: PDF_STAFF },
];

export function templateById(id: string | null): NoteTemplate | null {
  if (!id) return null;
  return NOTE_TEMPLATES.find((t) => t.id === id) || null;
}
