/**
 * Generates a plain-English, non-technical executive pitch PDF
 * describing every feature of the Great-Favour Montessori School (GFMS) Digital Platform.
 * Output: c:\Users\HP\Great\GFMS_Platform_Feature_Pitch.pdf
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const outPdf = path.join(rootDir, "GFMS_Platform_Feature_Pitch.pdf");
const tempHtml = path.join(__dirname, "_pitch_temp.html");
const logoPath = path.join(rootDir, "public", "logo.jpg");

let logoDataUri = "";
if (fs.existsSync(logoPath)) {
  const b64 = fs.readFileSync(logoPath).toString("base64");
  logoDataUri = `data:image/jpeg;base64,${b64}`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>GFMS Digital Campus &amp; Academic Platform — Executive Pitch</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10.5mm 13mm 11mm 13mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 9.2pt;
      line-height: 1.38;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-tag,
    h2 {
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Header / Cover Banner */
    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 65%, #1d4ed8 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 15px 20px;
      border-bottom: 4px solid #f59e0b;
      margin-bottom: 12px;
    }
    .hero-top {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8px;
    }
    .crest {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: #ffffff;
      padding: 2px;
      object-fit: cover;
      border: 2px solid #f59e0b;
      flex-shrink: 0;
    }
    .eyebrow {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #fbbf24;
      margin-bottom: 2px;
    }
    h1 {
      margin: 0;
      font-size: 16.5pt;
      line-height: 1.18;
      font-weight: 800;
      color: #ffffff;
    }
    .hero-sub {
      margin: 4px 0 0 0;
      font-size: 9pt;
      color: #e2e8f0;
    }

    /* Section Headings */
    .section-tag {
      display: inline-block;
      font-size: 7.4pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #1e40af;
      background: #dbeafe;
      padding: 2px 8px;
      border-radius: 999px;
      margin-bottom: 4px;
    }
    h2 {
      margin: 0 0 6px 0;
      font-size: 12pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
    }
    h3 {
      margin: 0 0 3px 0;
      font-size: 9.8pt;
      font-weight: 800;
      color: #1e3a8a;
    }
    p {
      margin: 0 0 6px 0;
    }

    /* Cards & Grids */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-bottom: 11px;
    }
    .card {
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      padding: 9px 11px;
      background: #f8fafc;
    }
    .card-accent {
      border-left: 4px solid #1e40af;
      background: #f8fafc;
    }
    .card-gold {
      border-left: 4px solid #d97706;
      background: #fffbeb;
    }
    .card-green {
      border-left: 4px solid #15803d;
      background: #f0fdf4;
    }
    .card-indigo {
      border-left: 4px solid #4338ca;
      background: #eef2ff;
    }

    ul.clean {
      margin: 3px 0 0 0;
      padding-left: 15px;
    }
    ul.clean li {
      margin-bottom: 3px;
      color: #334155;
    }
    ul.clean li strong {
      color: #0f172a;
    }

    /* Callout Banner */
    .callout {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-left: 4px solid #2563eb;
      border-radius: 8px;
      padding: 8px 11px;
      margin: 8px 0 11px 0;
      font-size: 8.8pt;
      color: #1e3a8a;
    }

    /* Comparison / Q&A Table */
    table.pitch-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
      margin-bottom: 12px;
      font-size: 8.8pt;
    }
    table.pitch-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    table.pitch-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }
    table.pitch-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Pill Badges */
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin: 4px 0 7px 0;
    }
    .pill {
      font-size: 7.7pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #1e3a8a;
    }

    /* Footer */
    .doc-footer {
      margin-top: 12px;
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      font-size: 8.2pt;
      color: #475569;
    }
    .nowrap {
      white-space: nowrap;
    }
  </style>
</head>
<body>

  <!-- ======================== PAGE 1: COVER & OVERVIEW ======================== -->
  <div class="hero">
    <div class="hero-top">
      ${logoDataUri ? `<img src="${logoDataUri}" alt="GFMS Crest" class="crest" />` : ""}
      <div>
        <div class="eyebrow">Great-Favour Montessori School &bull; Leadership Academy (Est. Sept 2014)</div>
        <h1>All-in-One Digital School Website, CBT Exam &amp; Online Result System</h1>
      </div>
    </div>
    <p class="hero-sub">
      A plain-English overview for Proprietors, Parents, Teachers, and School Administrators &mdash; showing how every part of the platform saves hours of manual work, eliminates result errors, modernizes examinations, and elevates the school&apos;s reputation.
    </p>
  </div>

  <div class="section-tag">1. Why This System Exists</div>
  <h2>Replacing Paper Bottlenecks with One Simple Digital Home</h2>
  <p>
    Running a growing school involves daily coordination between parents seeking admission, teachers setting test questions and recording marks, students writing exams, and management issuing accurate report cards. Previously, much of this depended on slow paper files, manual grade calculations, and parents queuing at the bursar&apos;s office to collect printed sheets.
  </p>
  <p>
    This platform brings <strong>everything together in one place</strong> that works smoothly on phones, tablets, and school computers&mdash;even on modest Nigerian mobile data connections&mdash;without requiring any technical training to operate.
  </p>

  <div class="grid-2 avoid-break">
    <div class="card card-accent">
      <h3>1. Inspires Parent Confidence &amp; Admissions</h3>
      <p style="margin-bottom:0;">
        First-time parents get a trustworthy, modern website showcasing your Creche, Nursery, Primary, and Secondary programs, verified external exam approvals (<strong>FLSC, BECE, WASSCE, NECO &amp; JAMB</strong>), leadership team, campus tours, and real parent compliments.
      </p>
    </div>
    <div class="card card-gold">
      <h3>2. Fair, Modern Computer-Based Exams (CBT)</h3>
      <p style="margin-bottom:0;">
        Students take timed exams on school computers or authorized devices with instant automatic objective marking, randomized question order to discourage copying, and built-in protection against power outages or accidental clicks.
      </p>
    </div>
    <div class="card card-green">
      <h3>3. Instant Online Report Cards with PIN Security</h3>
      <p style="margin-bottom:0;">
        Parents check and print official, beautifully formatted A4 terminal report sheets from home using a school-issued <strong>Scratch Card PIN</strong>&mdash;reducing office queues while keeping every child&apos;s grades private and protected.
      </p>
    </div>
    <div class="card card-indigo">
      <h3>4. Zero-Stress Admin &amp; Teacher Workflows</h3>
      <p style="margin-bottom:0;">
        Teachers submit exam questions, record CA &amp; Exam scores, and view student attempts from their phones or laptops. The Super Admin can upload <strong>1,000+ results in minutes</strong>, auto-rank class positions, and customize report card remarks.
      </p>
    </div>
  </div>

  <div class="callout avoid-break">
    <strong>Accredited Learning Continuity Highlighted Throughout:</strong> Creche &amp; Toddler (3m&ndash;2y) &bull; Montessori Nursery (2&ndash;5y) &bull; Basic Primary (Basic 1&ndash;5/6, FLSC) &bull; Junior Secondary (JSS 1&ndash;3, BECE) &bull; Senior Secondary Science, Art &amp; Commercial Streams (SS 1&ndash;3, WAEC/NECO/JAMB).
  </div>

  <div class="section-tag">2. Built for Everyone</div>
  <h2>Four Dedicated Spaces &mdash; Each Person Sees Only What They Need</h2>
  <table class="pitch-table avoid-break">
    <thead>
      <tr>
        <th style="width:24%;">Space / Portal</th>
        <th style="width:22%;">Who Uses It</th>
        <th style="width:54%;">What They Can Do in Everyday Terms</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Public School Website</strong></td>
        <td>Prospective Parents, Visitors &amp; Families</td>
        <td>Explore classes, meet teachers, tour buildings, read parent testimonials, view Facebook community updates, download the School Prospectus, or message Admissions on WhatsApp.</td>
      </tr>
      <tr>
        <td><strong>Online Result Portal</strong></td>
        <td>Parents &amp; Guardians</td>
        <td>Enter Admission No, Session, Term &amp; Scratch Card PIN to view and print the student&apos;s official A4 Terminal Report Sheet anytime.</td>
      </tr>
      <tr>
        <td><strong>Student CBT Portal</strong></td>
        <td>Secondary Candidates (SS 1 &ndash; SS 3)</td>
        <td>Log in with Admission Number, see only active exams for their exact class &amp; stream, write timed CBT tests, and view objective score right after submission.</td>
      </tr>
      <tr>
        <td><strong>Staff / Teacher &amp; Super Admin Desks</strong></td>
        <td>Subject Teachers, HODs, Director &amp; Principal</td>
        <td>Create &amp; review exam questions, resolve student-flagged questions, score theory scripts, upload CA/Exam scores, generate Scratch Cards, manage student RegNos, and publish results.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================== PAGE 2: PUBLIC WEBSITE & STUDENT CBT ======================== -->
  <div class="page-break"></div>

  <div class="section-tag">3. Public Website &amp; Digital Campus</div>
  <h2>Turn Website Visitors Into Enrolled Families</h2>
  <div class="grid-2 avoid-break">
    <div class="card">
      <h3>Home &amp; Institutional Story</h3>
      <ul class="clean">
        <li><strong>Hero Image Slider:</strong> Welcoming full-width banners highlighting campus life, academic distinction, and character.</li>
        <li><strong>Academic Divisions Overview:</strong> Clear path from Creche through SS 3 graduation.</li>
        <li><strong>Live Campus Events &amp; Facebook Timeline:</strong> Sliding event highlights plus the school&apos;s official Facebook page updates embedded directly on the homepage.</li>
        <li><strong>Parent Compliments Slider:</strong> Smooth rotating feedback cards from real GFMS parents sharing why they trust the school.</li>
        <li><strong>Digital Campus Gateway:</strong> One-tap buttons to enter Student CBT Exams, Online Result Checker, or Teacher Desk.</li>
      </ul>
    </div>
    <div class="card">
      <h3>Admissions, Faculty, Facilities &amp; Speed</h3>
      <ul class="clean">
        <li><strong>Age &amp; Class Placement Finder:</strong> Parents tap their child&apos;s age group to see the right class arm, assessment format, and admission documents required.</li>
        <li><strong>Campus Tour Booking &amp; WhatsApp Help:</strong> Direct tour booking section plus floating WhatsApp &amp; live chat support.</li>
        <li><strong>Staff Directory with Filters:</strong> Filter leadership and teachers by Nursery, Primary, STEM, Counseling, Exams, Bursary, or Operations.</li>
        <li><strong>Campus Tour Slider &amp; Prospectus PDF:</strong> Interactive facility showcase plus downloadable school prospectus.</li>
        <li><strong>Built for Nigerian Mobile Data:</strong> Compressed fast photos and clean loading skeletons keep pages smooth on 3G/4G.</li>
      </ul>
    </div>
  </div>

  <div class="section-tag">4. Student CBT Examination System</div>
  <h2>Stress-Free Digital Exams with Built-In Fairness &amp; Power-Outage Safety</h2>
  <p>
    Whether conducting terminal exams or JAMB/WAEC practice drills, the CBT Exam Room feels calm, straightforward, and reliable for every student.
  </p>

  <div class="grid-2 avoid-break">
    <div class="card card-accent">
      <h3>Inside the Student Exam Room</h3>
      <ul class="clean">
        <li><strong>Simple Sign-In:</strong> Students enter their Admission Number (e.g. <code>GFMS/2026/001</code>) with no forgotten passwords.</li>
        <li><strong>Right Paper for the Right Student:</strong> Science students don&apos;t accidentally see Art papers&mdash;class &amp; stream matching is automatic.</li>
        <li><strong>Clean Split Workspace:</strong> Objective questions appear clearly one at a time alongside a Question Palette showing Answered, Unanswered, and Flagged numbers.</li>
        <li><strong>Handy Student Tools:</strong> Built-in pop-up Calculator, Click-to-Zoom on Chemistry/Physics/Biology diagrams, keyboard shortcuts (<code>A&ndash;D</code>, <code>F</code> to flag), and clear Math equations.</li>
        <li><strong>Section B Theory Prompt View:</strong> Students can switch tabs to read essay/theory prompts clearly while writing into their physical answer booklets.</li>
      </ul>
    </div>
    <div class="card card-gold">
      <h3>Fairness, Flagging &amp; Emergency Recovery</h3>
      <ul class="clean">
        <li><strong>Anti-Cheating Safeguards:</strong> Randomized question order makes copying from neighbors ineffective. Leaving or switching browser tabs triggers warnings, automatically submitting after 3 strikes.</li>
        <li><strong>Flag Questions for Teacher Review:</strong> If a student spots a confusing question or wants to double-check one, bookmarking it saves the flag straight through submission so Teachers &amp; Admin see it.</li>
        <li><strong>Zero Lost Work on Power Failure:</strong> Progress and remaining exam seconds auto-save continuously. If a computer shuts off, logging back in resumes right where the student stopped&mdash;or Admin/Teachers can grant extra minutes or grade saved answers in 1 click.</li>
      </ul>
    </div>
  </div>

  <!-- ======================== PAGE 3: TEACHER DESK & SUPER ADMIN ======================== -->
  <div class="page-break"></div>

  <div class="section-tag">5. Teacher &amp; Staff Portal</div>
  <h2>Empowering Teachers Without Overwhelming Them</h2>
  <div class="grid-2 avoid-break">
    <div class="card card-green">
      <h3>Private Subject Workspaces</h3>
      <ul class="clean">
        <li><strong>Your Courses Only:</strong> Every teacher sees only their own subject papers, uploaded drafts, and student attempts&mdash;protecting staff and departmental privacy.</li>
        <li><strong>Easy Question Builder (with Symbols):</strong> Type objective or theory questions manually with a built-in <strong>Math &amp; Science Keyboard</strong> (<code>x&sup2;, H&#8322;O, &radic;, &pi;, &theta;</code>), attach diagrams, or upload PDF/image papers for Admin review.</li>
        <li><strong>Auto-Saved Drafts:</strong> Teachers never lose half-typed exam papers if their browser refreshes.</li>
      </ul>
    </div>
    <div class="card card-indigo">
      <h3>Theory Grading, Flag Review &amp; CA Upload</h3>
      <ul class="clean">
        <li><strong>Review Flagged Questions:</strong> Instantly filter attempts where students flagged a question, inspect what option each candidate chose versus the key, and fix any typo directly.</li>
        <li><strong>Touch-Friendly Theory Scoring:</strong> Enter physical theory booklet marks (with quick <code>+1 / +5 / +10</code> buttons on mobile), see <strong>Awaiting Theory</strong> badges clearly, and click <strong>Save &amp; Transmit</strong> straight to Super Admin.</li>
        <li><strong>Subject CA &amp; Exam Uploader:</strong> Enter CA1 (15), CA2 (15), and Exam (70) scores by class&mdash;or pull CBT objective marks automatically&mdash;and save drafts safely.</li>
      </ul>
    </div>
  </div>

  <div class="section-tag">6. Super Admin Command Center</div>
  <h2>Complete Oversight of Exams, Staff, Students &amp; Terminal Results</h2>
  <table class="pitch-table avoid-break">
    <thead>
      <tr>
        <th style="width:27%;">Command Desk Tab</th>
        <th style="width:73%;">What Management Can Accomplish in Seconds</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Exams &amp; Question Uploader</strong></td>
        <td>Create or edit CBT exams, switch papers Active/Inactive, adjust exam time anytime, bulk-upload questions, manage custom subjects, and safely archive finished exams while keeping all student scores intact.</td>
      </tr>
      <tr>
        <td><strong>2. Teacher Submissions Inbox</strong></td>
        <td>Review questions submitted by teachers, edit prompts or time limits if needed, approve them straight into live CBT exams with 1 click, or return feedback.</td>
      </tr>
      <tr>
        <td><strong>3. Physical Grading &amp; Flag Alerts</strong></td>
        <td>View all candidate CBT scores, see amber alerts for every question flagged by students across courses, jump straight to edit flawed questions, resume interrupted exams (+Extra Time), and download printable <strong>A4 PDF Score Sheets</strong>.</td>
      </tr>
      <tr>
        <td><strong>4. Student Registry &amp; RegNos</strong></td>
        <td>Register students individually or generate Admission Numbers for a whole class arm in bulk, edit profiles/arms, copy RegNos, and print Student Login Slips.</td>
      </tr>
      <tr>
        <td><strong>5. Staff &amp; Teacher Accounts</strong></td>
        <td>Create teacher accounts, assign specific subjects, classes, and HOD/Teacher permissions, and manage access securely.</td>
      </tr>
      <tr>
        <td><strong>6. Terminal Result Preparation</strong></td>
        <td>Compile complete report cards manually, import teacher subject scores, or upload <strong>1,000+ students at once from Excel/CSV</strong>. Includes custom <strong>Grading Standards</strong> (GFMS, WAEC 9-Point, Montessori Honors), automatic <strong>3rd-Term Cumulative Averages</strong>, automatic <strong>1st / 2nd / 3rd Class Position Ranking</strong>, and <strong>Editable Performance Remark Templates</strong> (<em>Excellent Result, Very Good, Good, Fair, Pass</em>).</td>
      </tr>
      <tr>
        <td><strong>7. Scratch Card PIN Generator</strong></td>
        <td>Generate batches of secure Result Checker PINs (10, 50, 100+ at a time), enforce a <strong>3-Check Maximum</strong> per card, print neat cut-out PIN slips for distribution, inspect which student used a PIN, or reset/delete cards.</td>
      </tr>
    </tbody>
  </table>

  <!-- ======================== PAGE 4: RESULT CARDS, REMARKS & RELIABILITY ======================== -->
  <div class="page-break"></div>

  <div class="section-tag">7. Online Report Cards &amp; Smart Remarks</div>
  <h2>Authentic School Report Sheets + Customizable Performance Remarks</h2>
  <div class="grid-2 avoid-break">
    <div class="card card-accent">
      <h3>What Parents See on Every Terminal Report Sheet</h3>
      <ul class="clean">
        <li><strong>Official Crest, Motto &amp; Student Photo:</strong> Displays Admission Number, Class &amp; Arm, Attendance (Days Opened/Present/Absent), Position in Class, and Class Average.</li>
        <li><strong>Subject Performance Breakdown:</strong> Shows CA1 (15), CA2 (15), Exam (70), Term Total (100), Letter Grade (<code>A&ndash;F</code>), and Subject Remark. In <strong>Third Term</strong>, automatically includes 1st Term, 2nd Term, and Annual Cumulative % plus Promotion Decision.</li>
        <li><strong>Character &amp; Skills Appraisal:</strong> 1&ndash;5 ratings for Psychomotor Skills (handwriting, sports, lab work, craft) &amp; Affective Traits (punctuality, neatness, honesty, responsibility).</li>
        <li><strong>Print-Perfect 1-Page A4 Layout:</strong> Parents can print cleanly on A4 paper or save as a PDF straight from any browser.</li>
      </ul>
    </div>
    <div class="card card-gold">
      <h3>Editable 5-Tier Remark Templates</h3>
      <p>
        Admins no longer have to type repetitive remarks student by student&mdash;or settle for fixed sentences:
      </p>
      <div class="pill-row">
        <span class="pill">Excellent Result (75&ndash;100%)</span>
        <span class="pill">Very Good (65&ndash;74%)</span>
        <span class="pill">Good (55&ndash;64%)</span>
        <span class="pill">Fair (45&ndash;54%)</span>
        <span class="pill">Pass (0&ndash;44%)</span>
      </div>
      <ul class="clean">
        <li><strong>Automatic Performance Matching:</strong> As scores are uploaded (single, class roster, or bulk CSV), both Class Teacher and Director/Principal remarks fill automatically to match the student&apos;s tier.</li>
        <li><strong>Fully Editable Content:</strong> Admin can rewrite any template tier&apos;s wording or score cutoff globally, switch presets in 1 click, or edit any student&apos;s personal remark directly before saving.</li>
      </ul>
    </div>
  </div>

  <div class="section-tag">8. Everyday Peace of Mind</div>
  <h2>Common Non-Technical Questions Answered</h2>
  <table class="pitch-table avoid-break">
    <thead>
      <tr>
        <th style="width:36%;">Common School Question</th>
        <th style="width:64%;">How This Platform Handles It Automatically</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>What if light/power goes out mid-exam?</strong></td>
        <td>Answers and remaining seconds are continuously backed up. Students simply log back in to continue&mdash;or Teachers/Admin can grant extra time or finalize saved marks without a single lost answer.</td>
      </tr>
      <tr>
        <td><strong>Can teachers share exams or see each other&apos;s questions?</strong></td>
        <td>No. Teacher portals are securely isolated to each teacher&apos;s assigned subject, class, or created papers.</td>
      </tr>
      <tr>
        <td><strong>How do we stop one Scratch Card PIN from being shared with 50 people?</strong></td>
        <td>Each Scratch Card locks to its first verified student Admission Number and expires automatically after <strong>3 result checks</strong> (with full tracking &amp; reset control for Admin).</td>
      </tr>
      <tr>
        <td><strong>What if a parent checks results before teachers finish uploading?</strong></td>
        <td>Instead of a broken error page, the portal checks available uploaded terms and displays a polite, clear status message guiding parents or showing terms already published.</td>
      </tr>
      <tr>
        <td><strong>Do we need expensive high-speed fiber internet to use it?</strong></td>
        <td>No. Images are lightweight WebP, exam questions load once per sitting, and clean loading skeletons keep every portal responsive on standard 3G/4G connections.</td>
      </tr>
    </tbody>
  </table>

  <div class="doc-footer avoid-break">
    <div>
      <strong>Great-Favour Montessori School &bull; Leadership Academy</strong><br />
      Great-Favour Montessori Street, Issele-Azagba, Aniocha North L.G.A, Delta State, Nigeria
    </div>
    <div style="text-align:right;" class="nowrap">
      Tel: 0905 894 3474 / 0814 336 8320<br />
      WhatsApp: +234 803 312 6400 &bull; Email: greatfavourmontessorischool@gmail.com
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(tempHtml, html, "utf-8");

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browserExe = fs.existsSync(edgePath) ? edgePath : fs.existsSync(chromePath) ? chromePath : null;

if (!browserExe) {
  console.error("Neither Microsoft Edge nor Chrome found for HTML->PDF export.");
  process.exit(1);
}

try {
  execFileSync(
    browserExe,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${outPdf}`,
      tempHtml,
    ],
    { stdio: "inherit" }
  );

  if (fs.existsSync(tempHtml)) {
    fs.unlinkSync(tempHtml);
  }

  const stat = fs.statSync(outPdf);
  console.log(`Generated ${outPdf} (${(stat.size / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error("Failed to generate pitch PDF:", err);
  process.exit(1);
}
