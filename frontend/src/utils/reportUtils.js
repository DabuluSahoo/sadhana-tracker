import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays } from 'date-fns';
import toast from 'react-hot-toast';

// --- Group colours for PDF section headers ---
const GROUP_COLORS = {
    bhima:      [180, 100, 0],   // Amber dark
    arjun:      [200, 80,  10],  // Saffron
    nakul:      [0,   110, 100], // Teal
    sahadev:    [20,  120, 50],  // Emerald
    brahmacari: [100, 60,  180], // Purple
    unassigned: [100, 100, 100], // Gray
};

// ─────────────────────────────────────────────────────────────────────────────
// getTargetWeek: Returns { start, end, restrictionNote }
//   Logic:
//   - If IST time is Sunday before 14:00 → use the week BEFORE last (2 weeks ago)
//     and set restrictionNote explaining why
//   - Otherwise → use last completed Sun–Sat week
// ─────────────────────────────────────────────────────────────────────────────
export const getTargetWeek = () => {
    // Convert current time to IST (UTC+5:30)
    const nowUTC = new Date();
    const istOffset = 5.5 * 60; // minutes
    const nowIST = new Date(nowUTC.getTime() + istOffset * 60 * 1000);

    const dayIST  = nowIST.getUTCDay();    // 0=Sun
    const hourIST = nowIST.getUTCHours();
    const minIST  = nowIST.getUTCMinutes();
    const istMinutesInDay = hourIST * 60 + minIST;

    // Last completed week (always Sun–Sat)
    const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
    const lastWeekEnd   = endOfWeek(lastWeekStart, { weekStartsOn: 0 });

    // Week before last
    const twoWeeksStart = startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 0 });
    const twoWeeksEnd   = endOfWeek(twoWeeksStart, { weekStartsOn: 0 });

    const isSundayBefore2PM = dayIST === 0 && istMinutesInDay < 14 * 60;

    if (isSundayBefore2PM) {
        return {
            start: twoWeeksStart,
            end:   twoWeeksEnd,
            restrictionNote: `Downloading sadhana report from ${format(twoWeeksStart, 'MMM d')} to ${format(twoWeeksEnd, 'MMM d, yyyy')} because the most recent sadhana report (week ${format(lastWeekStart, 'MMM d')}–${format(lastWeekEnd, 'MMM d, yyyy')}) is restricted until Sunday 2:00 PM IST, to allow all devotees to fill Saturday's sadhana.`,
        };
    }

    return { start: lastWeekStart, end: lastWeekEnd, restrictionNote: null };
};

// ─────────────────────────────────────────────────────────────────────────────
// buildRows: given a list of 7 days and the user's logs, produce table rows
// ─────────────────────────────────────────────────────────────────────────────
const buildRows = (days, logs) =>
    days.map(day => {
        const log = logs.find(l => isSameDay(new Date(l.date), day));
        if (!log) return [format(day, 'EEE, MMM d'), '-', '-', '-', '-', '-', '-', '-', '-', 'NOT FILLED'];
        return [
            format(day, 'EEE, MMM d'),
            log.wakeup_time ? log.wakeup_time.slice(0, 5) : '-',
            log.sleep_time  ? log.sleep_time.slice(0, 5)  : '-',
            log.rounds        || 0,
            `${log.reading_time  || 0}m`,
            `${log.hearing_time  || 0}m`,
            `${log.study_time    || 0}m`,
            `${log.service_hours || 0}h`,
            log.mangala_aarti ? 'Yes' : 'No',
            log.comments || '',
        ];
    });

const TABLE_COLS = ['Date', 'Wake', 'Sleep', 'Rounds', 'Read', 'Hear', 'Study', 'Svc(h)', 'Mangala', 'Comments'];

// ─────────────────────────────────────────────────────────────────────────────
// addPDFHeader: standard Hare Krishna header for any PDF
// ─────────────────────────────────────────────────────────────────────────────
const addPDFHeader = (doc, title, subtitle) => {
    doc.setFont('times', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.setFontSize(22);
    doc.text('HARE KRISHNA', 148, 18, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setTextColor(80);
    doc.setFontSize(14);
    doc.text(title, 148, 26, { align: 'center' });

    if (subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text(subtitle, 148, 33, { align: 'center' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// generateWeeklySadhanaReport — single user, auto-resolved last week
// ─────────────────────────────────────────────────────────────────────────────
export const generateWeeklySadhanaReport = (username, logs) => {
    const { start, end, restrictionNote } = getTargetWeek();
    const days = eachDayOfInterval({ start, end });

    const doc = new jsPDF({ orientation: 'landscape' });
    addPDFHeader(doc, 'Sadhana Tracker – Weekly Report');

    let y = 38;
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Devotee: ${username}`, 20, y);
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 20, y + 7);
    doc.text(`Week: ${format(start, 'EEE, MMM d')} to ${format(end, 'EEE, MMM d, yyyy')}`, 20, y + 14);
    y += 22;

    if (restrictionNote) {
        doc.setFontSize(9);
        doc.setTextColor(180, 80, 0);
        const lines = doc.splitTextToSize(`⏳ ${restrictionNote}`, 256);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 4;
    }

    // Summary box
    const existing = days.map(d => logs.find(l => isSameDay(new Date(l.date), d))).filter(Boolean);
    const avgRounds = existing.length ? (existing.reduce((s, l) => s + (l.rounds || 0), 0) / existing.length).toFixed(1) : 0;
    const totalStudy = existing.reduce((s, l) => s + (l.study_time || 0), 0);
    const mangala = existing.filter(l => l.mangala_aarti).length;

    doc.setDrawColor(241, 140, 0);
    doc.setFillColor(255, 247, 237);
    doc.rect(20, y, 257, 18, 'FD');
    doc.setTextColor(234, 88, 12);
    doc.setFontSize(8.5);
    doc.text('WEEKLY SUMMARY', 25, y + 6);
    doc.setTextColor(60);
    doc.text(`Avg Rounds: ${avgRounds}`, 30, y + 13);
    doc.text(`Total Study: ${totalStudy}m`, 90, y + 13);
    doc.text(`Mangala Aarti: ${mangala}/${existing.length}`, 160, y + 13);
    doc.text(`Days Logged: ${existing.length}/7`, 230, y + 13);
    y += 22;

    autoTable(doc, {
        startY: y,
        head: [TABLE_COLS],
        body: buildRows(days, logs),
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 252, 240] },
        styles: { font: 'times' },
        columnStyles: { 9: { cellWidth: 50 } },
    });

    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text('Your spiritual progress is a gift to the world.', 148, 195, { align: 'center' });
    doc.save(`Weekly_Sadhana_${username}_${format(start, 'MMM_d')}.pdf`);
    toast.success('Weekly report downloaded!');
};

// ─────────────────────────────────────────────────────────────────────────────
// generateCustomRangeSadhanaReport — single user, custom date range
// ─────────────────────────────────────────────────────────────────────────────
export const generateCustomRangeSadhanaReport = (username, logs, startDate, endDate) => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');
    const days  = eachDayOfInterval({ start, end });

    const doc = new jsPDF({ orientation: 'landscape' });
    addPDFHeader(doc, 'Sadhana Tracker – Custom Range Report');

    let y = 38;
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(`Devotee: ${username}`, 20, y);
    doc.text(`Period: ${format(start, 'MMM d, yyyy')} to ${format(end, 'MMM d, yyyy')}`, 20, y + 7);
    doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 20, y + 14);
    y += 22;

    const filtered = logs.filter(l => {
        const d = new Date(l.date);
        return d >= start && d <= end;
    });

    autoTable(doc, {
        startY: y,
        head: [TABLE_COLS],
        body: buildRows(days, filtered),
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [255, 252, 240] },
        styles: { font: 'times' },
        columnStyles: { 9: { cellWidth: 50 } },
    });

    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text('Your spiritual progress is a gift to the world.', 148, 195, { align: 'center' });
    doc.save(`Custom_Sadhana_${username}_${startDate}_to_${endDate}.pdf`);
    toast.success('Custom range report downloaded!');
};

// ─────────────────────────────────────────────────────────────────────────────
// generateGroupReport — multi-user PDF
// Each devotee gets: colored banner + own column headers + data rows + gap
// Sorted group-wise: bhima → arjun → nakul → sahadev → others
// usersData = [{ username, group_name, logs: [] }]
// ─────────────────────────────────────────────────────────────────────────────
const GROUP_ORDER = ['bhima', 'arjun', 'nakul', 'sahadev'];
const GROUP_EMOJI_MAP = { bhima: '🏆', arjun: '🪷', nakul: '🌿', sahadev: '🌱', brahmacari: '🕉️', unassigned: '📋' };

export const generateGroupReport = (groupLabel, usersData, startDate, endDate, restrictionNote = null) => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');
    const days  = eachDayOfInterval({ start, end });

    // Sort users: bhima → arjun → nakul → sahadev → others (alphabetical within group)
    const sorted = [...usersData].sort((a, b) => {
        const ai = GROUP_ORDER.indexOf((a.group_name || '').toLowerCase());
        const bi = GROUP_ORDER.indexOf((b.group_name || '').toLowerCase());
        const aIdx = ai === -1 ? 99 : ai;
        const bIdx = bi === -1 ? 99 : bi;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.username.localeCompare(b.username);
    });

    const doc = new jsPDF({ orientation: 'landscape' });
    addPDFHeader(
        doc,
        `Sadhana Report – ${groupLabel}`,
        `${format(start, 'MMM d')} to ${format(end, 'MMM d, yyyy')} · Generated ${format(new Date(), 'PPP p')}`
    );

    let y = 38;

    if (restrictionNote) {
        doc.setFontSize(9);
        doc.setTextColor(180, 80, 0);
        const lines = doc.splitTextToSize(`⏳ ${restrictionNote}`, 256);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 6;
    }

    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();

    sorted.forEach(({ username, group_name, logs }, idx) => {
        const grpKey   = (group_name || 'unassigned').toLowerCase();
        const color    = GROUP_COLORS[grpKey] || GROUP_COLORS.unassigned;
        const emoji    = GROUP_EMOJI_MAP[grpKey] || '';
        const existing = days.map(d => logs.find(l => isSameDay(new Date(l.date), d))).filter(Boolean);
        const daysLogged = existing.length;
        const avgRounds  = daysLogged
            ? (existing.reduce((s, l) => s + (l.rounds || 0), 0) / daysLogged).toFixed(1)
            : 0;

        // ── Colored banner row ───────────────────────────────────────
        // Check if we need a new page for the banner + at least 2 data rows (~25pt)
        if (y + 30 > pageH - 15) {
            doc.addPage();
            y = 15;
        }

        doc.setFillColor(...color);
        doc.rect(14, y, pageW - 28, 9, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.text(
            `${emoji} ${grpKey.toUpperCase()} GROUP  ·  ${username}  ·  Days Logged: ${daysLogged}/${days.length}  ·  Avg Rounds: ${avgRounds}`,
            17, y + 6
        );
        y += 9;

        // ── Per-user table with column headers ───────────────────────
        autoTable(doc, {
            startY: y,
            head: [TABLE_COLS],
            body: buildRows(days, logs),
            theme: 'striped',
            headStyles: {
                fillColor: color.map(c => Math.min(255, c + 60)), // lighter version of group color
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
            },
            bodyStyles:          { fontSize: 7.5 },
            alternateRowStyles:  { fillColor: [255, 252, 245] },
            styles:              { font: 'times', cellPadding: 1.5 },
            columnStyles:        { 9: { cellWidth: 45 } },
            margin:              { left: 14, right: 14 },
        });

        // ── Gap after table (skip if last user) ──────────────────────
        y = (doc.lastAutoTable?.finalY ?? y) + (idx < sorted.length - 1 ? 10 : 6);
    });

    // Footer on last page
    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text('Your spiritual progress is a gift to the world. 🙏', pageW / 2, pageH - 8, { align: 'center' });

    doc.save(`Group_Sadhana_${groupLabel}_${startDate}_to_${endDate}.pdf`);
    toast.success(`Group report for ${groupLabel} downloaded!`);
};

