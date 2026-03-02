import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate and download Schedule PDF
 */
export const generateSchedulePDF = ({
  staffName,
  selectedDate,
  selectedDateShifts,
  allShifts,
  stats,
  currentMonth,
  calendarDays,
  getShiftsForDate
}) => {
  const doc = new jsPDF("p", "mm", "a4");

  /* =====================
     PAGE CONSTANTS
  ====================== */
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const TOP_MARGIN = 18;
  const BOTTOM_MARGIN = 20;

  let y = TOP_MARGIN;

  /* =====================
     PAGE SAFETY
  ====================== */
  const ensureSpace = (required = 10) => {
    if (y + required > PAGE_HEIGHT - BOTTOM_MARGIN) {
      doc.addPage();
      y = TOP_MARGIN;
    }
  };

  const space = (amount = 6) => {
    ensureSpace(amount);
    y += amount;
  };

  /* =====================
     SECTION HEADER
  ====================== */
  const section = (title) => {
    ensureSpace(16);
    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 6, 182, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 16, y);
    y += 8;
  };

  /* =====================
     FIELD
  ====================== */
  const field = (label, value, xLabel = 14, xValue = 60) => {
    ensureSpace(6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, xLabel, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value ?? "N/A"), xValue, y);
    y += 6;
  };

  /* =====================
     HEADER
  ====================== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("STAFF SCHEDULE", 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Staff: ${staffName ?? "-"}`, 14, y);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 120, y);
  y += 12;

  /* =====================
     STATISTICS
  ====================== */
  section("Monthly Statistics");

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Shifts", stats.totalShifts],
      ["Total Hours", `${Math.round(stats.totalHours)}h`],
      ["Upcoming Shifts", stats.upcomingShifts],
      ["Completed Shifts", stats.completedShifts]
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [66, 133, 244] },
    margin: { top: TOP_MARGIN, bottom: BOTTOM_MARGIN, left: 14, right: 14 },
    pageBreak: "auto"
  });

  y = doc.lastAutoTable.finalY + 8;

  /* =====================
     MONTHLY CALENDAR
  ====================== */
  section(
    `Schedule for ${currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    })}`
  );

  const dayWidth = 24;
  const dayHeight = 15;
  const startX = 14;
  const calendarHeight =
    6 + Math.ceil(calendarDays.length / 7) * dayHeight;

  ensureSpace(calendarHeight + 10);

  const headers = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(h, startX + i * dayWidth + 2, y);
  });

  const startY = y;
  y += 6;

  calendarDays.forEach((date, index) => {
    const row = Math.floor(index / 7);
    const col = index % 7;

    const x = startX + col * dayWidth;
    const cellY = startY + 6 + row * dayHeight;

    doc.setDrawColor(200);
    doc.rect(x, cellY, dayWidth, dayHeight);

    const today = new Date();
    if (
      date.toDateString() === today.toDateString()
    ) {
      doc.setFillColor(220, 240, 255);
      doc.rect(x, cellY, dayWidth, dayHeight, "F");
    }

    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text(String(date.getDate()), x + 2, cellY + 5);

    const shifts = getShiftsForDate(date);
    if (shifts.length) {
      doc.setFontSize(7);
      doc.setTextColor(66, 133, 244);
      doc.text(`${shifts.length}`, x + dayWidth - 6, cellY + 5);
      doc.setTextColor(0);
    }
  });

  y = startY + calendarHeight + 12;

  /* =====================
     SELECTED DAY DETAILS
  ====================== */
  if (selectedDate) {
    section(`Detailed Schedule for ${formatDate(selectedDate)}`);

    if (!selectedDateShifts.length) {
      doc.setFont("helvetica", "italic");
      doc.text("No shifts scheduled for this day", 14, y);
      y += 10;
    } else {
      autoTable(doc, {
        startY: y,
        head: [["Start", "End", "Client", "Type", "Duration", "Status"]],
        body: selectedDateShifts.map(s => [
          formatTime(s.start_time),
          formatTime(s.end_time),
          s.client_name || "Unassigned",
          s.shift_type_name || "-",
          formatHours(
            parseTime(s.end_time) -
              parseTime(s.start_time) -
              (s.break_minutes || 0) / 60
          ),
          s.status
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [66, 133, 244] },
        margin: { top: TOP_MARGIN, bottom: BOTTOM_MARGIN, left: 14, right: 14 }
      });

      y = doc.lastAutoTable.finalY + 10;
    }
  }

  /* =====================
     INSTRUCTIONS
  ====================== */
  section("Clocking Instructions");

  [
    "1. Clock in up to 15 minutes before your shift",
    "2. Clock out at shift end",
    "3. Required photos may be requested",
    "4. Log incidents and progress notes",
    "5. Location tracking is required"
  ].forEach(line => {
    ensureSpace(6);
    doc.setFontSize(9);
    doc.text(line, 16, y);
    y += 5;
  });

  /* =====================
     FOOTER (ALL PAGES)
  ====================== */
  const addFooter = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(
        "CONFIDENTIAL – Staff schedule information",
        PAGE_WIDTH / 2,
        PAGE_HEIGHT - 10,
        { align: "center" }
      );
    }
  };

  addFooter();

  /* =====================
     DOWNLOAD
  ====================== */
  doc.save(
    `Schedule_${staffName?.replace(/\s+/g, "_")}_${currentMonth.getMonth() + 1
    }_${currentMonth.getFullYear()}.pdf`
  );
};

/* =====================
   HELPERS
====================== */
const formatDate = (date) =>
  date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

const formatTime = (time) => {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = +h;
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const parseTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};

const formatHours = (h) => {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (!hrs) return `${mins}m`;
  if (!mins) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};
