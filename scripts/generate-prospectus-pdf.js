// Script to generate a valid, standalone PDF prospectus for GFMS
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'docs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'GFMS_School_Prospectus.pdf');

// Helper to escape PDF text
function escapePdfText(str) {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Generate simple, robust, standards-compliant PDF 1.4
function createProspectusPdf() {
  const objects = [];
  let objCount = 0;

  function addObject(content) {
    objCount++;
    objects.push({ id: objCount, content });
    return objCount;
  }

  // Page 1: Cover & Leadership
  // Page 2: Academics & Facilities & Admissions
  
  // Font objects
  const f1 = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const f2 = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const f3 = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');

  // Page 1 stream content
  const page1StreamText = `
0.05 0.12 0.25 rg
0 0 595 842 re
f
0.96 0.77 0.19 rg
0 812 595 30 re
f
0.05 0.12 0.25 rg
BT
/F2 12 Tf
40 822 Td
(GREAT-FAVOUR MONTESSORI SCHOOL - OFFICIAL PROSPECTUS) Tj
ET
1 1 1 rg
BT
/F2 26 Tf
40 740 Td
(GREAT-FAVOUR MONTESSORI SCHOOL) Tj
ET
0.96 0.77 0.19 rg
BT
/F2 14 Tf
40 715 Td
(2026/2027 ACADEMIC SESSION PROSPECTUS) Tj
ET
0.8 0.85 0.9 rg
BT
/F3 11 Tf
40 685 Td
("Building Honest, Confident Leaders Grounded in Moral Character & Academic Brilliance") Tj
ET
0.96 0.77 0.19 rg
40 670 515 2 re
f
1 1 1 rg
BT
/F2 14 Tf
40 635 Td
(1. WELCOME FROM THE DIRECTOR'S DESK) Tj
ET
0.9 0.9 0.9 rg
BT
/F1 10 Tf
40 610 Td
(Dear Prospective Parents & Guardians,) Tj
0 -16 Td
(Welcome to Great-Favour Montessori School (GFMS). Since our founding in September 2014,) Tj
0 -14 Td
(we have dedicated ourselves to fostering intellectual rigor, godly character, and modern technological) Tj
0 -14 Td
(skills in every child entrusted to our care. Our holistic learning environment equips pupils to excel) Tj
0 -14 Td
(in both national curricula and competitive global examinations.) Tj
0 -18 Td
(Director: Dr. (Mrs.) Favour E. O. | Head of School: Mr. Samuel K. Adebayo) Tj
ET
1 1 1 rg
BT
/F2 14 Tf
40 480 Td
(2. ACADEMIC DIVISIONS & SPECIALIZATIONS) Tj
ET
0.9 0.9 0.9 rg
BT
/F2 11 Tf
40 455 Td
([A] Early Childhood & Montessori Creche (Ages 3m - 5 yrs)) Tj
/F1 9.5 Tf
0 -14 Td
(- Sensory development, phonics, practical life exercises, and safe, loving nurturing.) Tj
0 -18 Td
/F2 11 Tf
( [B] Primary Leadership Academy (Basic 1 - 6)) Tj
/F1 9.5 Tf
0 -14 Td
(- Accelerated numeracy, literacy, French, coding, science discovery, and continuous assessment.) Tj
0 -18 Td
/F2 11 Tf
( [C] Secondary College (JSS 1 - SS 3)) Tj
/F1 9.5 Tf
0 -14 Td
(- Comprehensive Science, Arts, and Commercial tracks preparing pupils for BECE, WAEC, NECO & JAMB.) Tj
ET
1 1 1 rg
BT
/F2 14 Tf
40 280 Td
(3. INNOVATIVE CBT & STEM ENVIRONMENT) Tj
ET
0.9 0.9 0.9 rg
BT
/F1 10 Tf
40 255 Td
(- Fully air-conditioned Computer-Based Testing (CBT) laboratories with solar backup power.) Tj
0 -15 Td
(- Advanced digital question bank with instant automated scoring and formula formatting.) Tj
0 -15 Td
(- Hands-on robotic kits, science practical labs, and coding bootcamps for senior grades.) Tj
0 -15 Td
(- Termly digital result portals accessible securely by parents with biometric verification.) Tj
ET
0.96 0.77 0.19 rg
40 160 515 2 re
f
1 1 1 rg
BT
/F2 11 Tf
40 135 Td
(CAMPUS & REGISTRATION CONTACT) Tj
ET
0.8 0.85 0.9 rg
BT
/F1 9 Tf
40 115 Td
(Campus: 12 Excellence Avenue, GRA, Lagos / Ogun State Corridor) Tj
0 -13 Td
(Admissions Hotline: +234 803 123 4567 | WhatsApp Desk: +234 812 987 6543) Tj
0 -13 Td
(Email: admissions@greatfavourmontessori.edu.ng | Web: www.greatfavourmontessori.edu.ng) Tj
0 -13 Td
(Accreditation: Ministry of Education Approved | WAEC & NECO Certified Examination Centre) Tj
ET
`;

  const p1Stream = addObject(`<< /Length ${Buffer.byteLength(page1StreamText)} >>\nstream\n${page1StreamText.trim()}\nendstream`);

  // Page 2 stream content
  const page2StreamText = `
0.05 0.12 0.25 rg
0 0 595 842 re
f
0.96 0.77 0.19 rg
0 812 595 30 re
f
0.05 0.12 0.25 rg
BT
/F2 12 Tf
40 822 Td
(GREAT-FAVOUR MONTESSORI SCHOOL - ADMISSIONS GUIDE & POLICIES) Tj
ET
1 1 1 rg
BT
/F2 18 Tf
40 755 Td
(ADMISSIONS PROCEDURE & ENROLLMENT GUIDELINES) Tj
ET
0.96 0.77 0.19 rg
40 740 515 2 re
f
1 1 1 rg
BT
/F2 13 Tf
40 705 Td
(STEP 1: APPLICATION SUBMISSION) Tj
ET
0.85 0.9 0.95 rg
BT
/F1 10 Tf
40 685 Td
(Parents complete the official GFMS Admission Form online via the school portal or at the administrative) Tj
0 -14 Td
(registry. Documents required include birth certificate, recent passport photographs, and previous academic records.) Tj
ET
1 1 1 rg
BT
/F2 13 Tf
40 625 Td
(STEP 2: DIAGNOSTIC & PLACEMENT ASSESSMENT) Tj
ET
0.85 0.9 0.95 rg
BT
/F1 10 Tf
40 605 Td
(Prospective students sit for our computerized diagnostic assessment covering Mathematics, English Literacy,) Tj
0 -14 Td
(and General Aptitude to determine baseline mastery and customized learning recommendations.) Tj
ET
1 1 1 rg
BT
/F2 13 Tf
40 545 Td
(STEP 3: PARENT & CANDIDATE INTERACTION) Tj
ET
0.85 0.9 0.95 rg
BT
/F1 10 Tf
40 525 Td
(An interactive session with the school leadership to discuss student potential, individual development plans,) Tj
0 -14 Td
(and parental partnership expectations in accordance with school values.) Tj
ET
1 1 1 rg
BT
/F2 13 Tf
40 465 Td
(STEP 4: ADMISSION OFFER & ENROLLMENT CONFIRMATION) Tj
ET
0.85 0.9 0.95 rg
BT
/F1 10 Tf
40 445 Td
(Successful applicants receive their official Admission Letter, schedule of tuition and fees, uniform details,) Tj
0 -14 Td
(and academic calendar orientation pack.) Tj
ET
1 1 1 rg
BT
/F2 14 Tf
40 380 Td
(CORE VALUES & CODE OF CONDUCT) Tj
ET
0.96 0.77 0.19 rg
40 370 515 1.5 re
f
0.85 0.9 0.95 rg
BT
/F1 10 Tf
40 345 Td
(- INTEGRITY: Truthfulness, honor, and accountability in speech, academics, and actions.) Tj
0 -16 Td
(- EXCELLENCE: Commitment to highest personal effort and academic achievement.) Tj
0 -16 Td
(- DISCIPLINE: Punctuality, neatness, respect for staff, peers, and institutional environment.) Tj
0 -16 Td
(- EMPATHY & COMMUNITY: Fostering kindness, collaboration, leadership, and public service.) Tj
ET
1 1 1 rg
BT
/F2 14 Tf
40 220 Td
(TUITION & FINANCIAL TERMS SUMMARY) Tj
ET
0.96 0.77 0.19 rg
40 210 515 1.5 re
f
0.85 0.9 0.95 rg
BT
/F1 10 Tf
40 185 Td
(- Tuition is payable termly prior to resumption via designated school bank accounts.) Tj
0 -15 Td
(- School fees include instructional materials, digital CBT portal access, and laboratory use.) Tj
0 -15 Td
(- Discounts are available for families enrolling three or more siblings concurrently.) Tj
0 -15 Td
(- Official receipts are generated instantly upon confirmation by the school bursar desk.) Tj
ET
0.96 0.77 0.19 rg
BT
/F3 9.5 Tf
40 60 Td
(Great-Favour Montessori School (c) 2026. All rights reserved. Registered under Nigerian Corporate & Educational Laws.) Tj
ET
`;

  const p2Stream = addObject(`<< /Length ${Buffer.byteLength(page2StreamText)} >>\nstream\n${page2StreamText.trim()}\nendstream`);

  // Resources dictionary
  const resourcesObj = addObject(`<<
  /Font <<
    /F1 ${f1} 0 R
    /F2 ${f2} 0 R
    /F3 ${f3} 0 R
  >>
>>`);

  // Page objects
  const page1 = addObject(`<<
  /Type /Page
  /Parent 0 0 R
  /MediaBox [0 0 595 842]
  /Contents ${p1Stream} 0 R
  /Resources ${resourcesObj} 0 R
>>`);

  const page2 = addObject(`<<
  /Type /Page
  /Parent 0 0 R
  /MediaBox [0 0 595 842]
  /Contents ${p2Stream} 0 R
  /Resources ${resourcesObj} 0 R
>>`);

  // Pages parent
  const pagesObj = addObject(`<<
  /Type /Pages
  /Kids [${page1} 0 R ${page2} 0 R]
  /Count 2
>>`);

  // Catalog
  const catalog = addObject(`<<
  /Type /Catalog
  /Pages ${pagesObj} 0 R
>>`);

  // Fix parent references in pages
  objects.find(o => o.id === page1).content = objects.find(o => o.id === page1).content.replace('/Parent 0 0 R', `/Parent ${pagesObj} 0 R`);
  objects.find(o => o.id === page2).content = objects.find(o => o.id === page2).content.replace('/Parent 0 0 R', `/Parent ${pagesObj} 0 R`);

  // Build final buffer
  let pdf = '%PDF-1.4\n';
  const xref = [];
  xref.push('0000000000 65535 f ');

  for (const obj of objects) {
    const offset = Buffer.byteLength(pdf);
    xref.push(String(offset).padStart(10, '0') + ' 00000 n ');
    pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  for (const entry of xref) {
    pdf += `${entry}\n`;
  }
  pdf += `trailer\n<<\n  /Size ${objects.length + 1}\n  /Root ${catalog} 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(outputPath, pdf, 'utf-8');
  console.log(`[SUCCESS] Prospectus PDF written to ${outputPath} (${Buffer.byteLength(pdf)} bytes)`);
}

createProspectusPdf();
