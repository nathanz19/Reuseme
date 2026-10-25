/** A synthetic one-page resume PDF: no uploaded personal document is stored in the test suite. */
export function referencePdf() {
  const content = [
    'BT /F2 20 Tf 240 750 Td (Example Name) Tj ET',
    'BT /F1 10 Tf 210 730 Td (contact | location) Tj ET',
    '0.5 w 0.5 G 36 718 m 576 718 l S',
    'BT /F2 12 Tf 36 703 Td (EDUCATION) Tj ET',
    'BT /F2 10 Tf 36 686 Td (Example University) Tj ET',
    'BT /F1 10 Tf 36 672 Td (Degree and coursework) Tj ET',
    'BT /F1 10 Tf 36 658 Td (Academic achievements) Tj ET',
    '0.5 w 0.5 G 36 640 m 576 640 l S',
    'BT /F2 12 Tf 36 625 Td (WORK EXPERIENCE) Tj ET',
    'BT /F2 10 Tf 36 608 Td (Example Company) Tj ET',
    'BT /F1 10 Tf 36 594 Td (Example Role) Tj ET',
    'BT /F1 10 Tf 36 580 Td (Delivered useful work) Tj ET',
    'BT /F1 10 Tf 36 566 Td (Collaborated with a team) Tj ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf));
}
