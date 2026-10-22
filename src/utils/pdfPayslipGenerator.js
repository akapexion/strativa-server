import PDFDocument from "pdfkit";

// Helper to convert numbers to Pakistani Rupee text format
export const convertNumberToWords = (num) => {
  const a = [
    "",
    "One ",
    "Two ",
    "Three ",
    "Four ",
    "Five ",
    "Six ",
    "Seven ",
    "Eight ",
    "Nine ",
    "Ten ",
    "Eleven ",
    "Twelve ",
    "Thirteen ",
    "Fourteen ",
    "Fifteen ",
    "Sixteen ",
    "Seventeen ",
    "Eighteen ",
    "Nineteen ",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return "overflow";
    let nArr = ("000000000" + n)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!nArr) return "";
    let str = "";
    str +=
      nArr[1] != 0
        ? (a[Number(nArr[1])] || b[nArr[1][0]] + " " + a[nArr[1][1]]) + "Crore "
        : "";
    str +=
      nArr[2] != 0
        ? (a[Number(nArr[2])] || b[nArr[2][0]] + " " + a[nArr[2][1]]) + "Lakh "
        : "";
    str +=
      nArr[3] != 0
        ? (a[Number(nArr[3])] || b[nArr[3][0]] + " " + a[nArr[3][1]]) +
          "Thousand "
        : "";
    str +=
      nArr[4] != 0
        ? (a[Number(nArr[4])] || b[nArr[4][0]] + " " + a[nArr[4][1]]) +
          "Hundred "
        : "";
    str +=
      nArr[5] != 0
        ? (str != "" ? "and " : "") +
          (a[Number(nArr[5])] || b[nArr[5][0]] + " " + a[nArr[5][1]])
        : "";
    return str;
  };

  const words = inWords(Math.round(num));
  return words ? `${words.trim()} Rupees Only` : "Zero Rupees";
};

/**
 * Generate a PDF Payslip stream using PDFKit
 */
export const buildPayslipPdf = (payroll, firm, stream) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  doc.pipe(stream);

  const primaryColor = "#312e81";
  const darkTextColor = "#0f172a";
  const mutedTextColor = "#64748b";
  const lightBgColor = "#f8fafc";
  const borderColor = "#e2e8f0";

  // 1. Header Banner
  doc.rect(40, 40, 515, 60).fill("#1e1b4b");

  doc
    .fillColor("#ffffff")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(firm.firm_name || "STRATIVA ENTERPRISE ERP", 55, 52, { width: 350 });

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#c7d2fe")
    .text(firm.firm_address || "Corporate Headquarters", 55, 75);

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor("#38bdf8")
    .text("SALARY PAYSLIP", 390, 52, { align: "right", width: 150 });

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#ffffff")
    .text(`Period: ${payroll.month_name} ${payroll.year}`, 390, 75, {
      align: "right",
      width: 150,
    });

  // 2. Employee & Employment Information Box
  let y = 115;
  doc.rect(40, y, 515, 80).fill(lightBgColor).stroke(borderColor);

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(primaryColor)
    .text("EMPLOYEE DETAILS", 55, y + 10);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(darkTextColor)
    .text(`Employee Name:`, 55, y + 28)
    .font("Helvetica-Bold")
    .text(`${payroll.employee_name}`, 145, y + 28)
    .font("Helvetica")
    .text(`Employee Code:`, 55, y + 44)
    .font("Helvetica-Bold")
    .text(`${payroll.employee_code}`, 145, y + 44)
    .font("Helvetica")
    .text(`Department:`, 55, y + 60)
    .font("Helvetica-Bold")
    .text(`${payroll.employee_department || "General"}`, 145, y + 60);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(darkTextColor)
    .text(`Designation:`, 310, y + 28)
    .font("Helvetica-Bold")
    .text(`${payroll.employee_designation || "Staff"}`, 395, y + 28)
    .font("Helvetica")
    .text(`Salary Basis:`, 310, y + 44)
    .font("Helvetica-Bold")
    .text(`${payroll.salary_basis || "Monthly"}`, 395, y + 44)
    .font("Helvetica")
    .text(`Status:`, 310, y + 60)
    .font("Helvetica-Bold")
    .fillColor(payroll.status === "finalized" ? "#059669" : "#d97706")
    .text(`${payroll.status.toUpperCase()}`, 395, y + 60);

  // 3. Attendance & Hours Metric Bar
  y = 205;
  doc.rect(40, y, 515, 45).fill("#eff6ff").stroke("#bfdbfe");

  const metrics = [
    { label: "Expected Hours", val: `${payroll.expected_hours} hrs` },
    { label: "Worked Hours", val: `${payroll.worked_hours} hrs` },
    { label: "Present Days", val: `${payroll.present_days}` },
    { label: "Paid Leaves", val: `${payroll.paid_leave_days}` },
    { label: "Absent / LOP", val: `${payroll.absent_days}` },
  ];

  const colWidth = 515 / metrics.length;
  metrics.forEach((m, idx) => {
    const xPos = 40 + idx * colWidth;
    doc
      .fontSize(7.5)
      .font("Helvetica-Bold")
      .fillColor("#1e40af")
      .text(m.label.toUpperCase(), xPos + 5, y + 10, {
        align: "center",
        width: colWidth - 10,
      });

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#1e3a8a")
      .text(m.val, xPos + 5, y + 24, {
        align: "center",
        width: colWidth - 10,
      });
  });

  // 4. Earnings and Deductions Tables
  y = 265;
  const tableWidth = 250;

  // Earnings Table Header
  doc.rect(40, y, tableWidth, 22).fill("#312e81");
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("EARNINGS", 50, y + 6)
    .text("AMOUNT (PKR)", 40 + tableWidth - 90, y + 6, {
      align: "right",
      width: 80,
    });

  // Deductions Table Header
  doc.rect(305, y, tableWidth, 22).fill("#e11d48");
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .text("DEDUCTIONS", 315, y + 6)
    .text("AMOUNT (PKR)", 305 + tableWidth - 90, y + 6, {
      align: "right",
      width: 80,
    });

  const earningsRows = [
    ["Basic Salary", payroll.base_salary],
    ["House Rent Allowance (HRA)", payroll.hra],
    ["Medical Allowance", payroll.medical_allowance],
    ["Special Allowance", payroll.special_allowance],
  ];

  const deductionsRows = [
    ["Income Tax", payroll.income_tax],
    ["Provident Fund (PF)", payroll.provident_fund],
    ["Unpaid Leaves / LOP", payroll.unpaid_leave_deduction],
    ["Other Deductions", payroll.other_deductions],
  ];

  let currentY = y + 22;
  const rowHeight = 22;

  for (let i = 0; i < Math.max(earningsRows.length, deductionsRows.length); i++) {
    const e = earningsRows[i];
    const d = deductionsRows[i];

    // Background zebra stripe
    if (i % 2 === 1) {
      doc.rect(40, currentY, tableWidth, rowHeight).fill("#f8fafc");
      doc.rect(305, currentY, tableWidth, rowHeight).fill("#f8fafc");
    }

    // Earnings cell
    if (e) {
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor(darkTextColor)
        .text(e[0], 50, currentY + 6);
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .text(Number(e[1] || 0).toLocaleString(), 40 + tableWidth - 90, currentY + 6, {
          align: "right",
          width: 80,
        });
    }

    // Deductions cell
    if (d) {
      doc
        .fontSize(8.5)
        .font("Helvetica")
        .fillColor(darkTextColor)
        .text(d[0], 315, currentY + 6);
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor("#e11d48")
        .text(Number(d[1] || 0).toLocaleString(), 305 + tableWidth - 90, currentY + 6, {
          align: "right",
          width: 80,
        });
    }

    currentY += rowHeight;
  }

  // Subtotals
  doc.rect(40, currentY, tableWidth, 24).fill("#f1f5f9").stroke(borderColor);
  doc.rect(305, currentY, tableWidth, 24).fill("#f1f5f9").stroke(borderColor);

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(darkTextColor)
    .text("Total Gross Earnings", 50, currentY + 7);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(Number(payroll.gross_earnings).toLocaleString(), 40 + tableWidth - 90, currentY + 7, {
      align: "right",
      width: 80,
    });

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor("#e11d48")
    .text("Total Deductions", 315, currentY + 7);
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(Number(payroll.total_deductions).toLocaleString(), 305 + tableWidth - 90, currentY + 7, {
      align: "right",
      width: 80,
    });

  // 5. Net Salary Highlight Banner
  y = currentY + 40;
  doc.rect(40, y, 515, 60).fill("#f0fdf4").stroke("#bbf7d0");

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#166534")
    .text("NET SALARY PAYABLE", 55, y + 14);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor("#15803d")
    .text(`PKR ${Number(payroll.net_salary).toLocaleString()}`, 350, y + 12, {
      align: "right",
      width: 190,
    });

  const inWords = payroll.net_salary_in_words || convertNumberToWords(payroll.net_salary);
  doc
    .fontSize(8.5)
    .font("Helvetica-Oblique")
    .fillColor("#166534")
    .text(`In Words: ${inWords}`, 55, y + 36, { width: 480 });

  // 6. Signatures and Audit Footer
  y = y + 85;
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(mutedTextColor)
    .text("Employee Signature", 60, y + 40)
    .text("Authorized HR Signatory", 380, y + 40);

  doc.moveTo(50, y + 35).lineTo(180, y + 35).stroke(mutedTextColor);
  doc.moveTo(370, y + 35).lineTo(500, y + 35).stroke(mutedTextColor);

  doc
    .fontSize(7.5)
    .font("Helvetica")
    .fillColor("#94a3b8")
    .text(
      `Confidential &bull; Generated electronically via Strativa ERP on ${new Date().toLocaleString()} &bull; Audit Ref: ${payroll._id}`,
      40,
      740,
      { align: "center", width: 515 }
    );

  doc.end();
};
