import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { isNative } from './platform';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * CLEAN STRING: jsPDF's standard fonts only support WinAnsi (standard ASCII + some Western chars).
 */
const cleanStr = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/[^\x00-\x7F\xA0-\xFF]/g, '?');
};

/**
 * Helper to handle PDF output across platforms.
 */
const saveOrSharePDF = async (doc, filename) => {
    const safeFilename = filename.replace(/[^a-z0-9.]/gi, '_');
    if (isNative()) {
        try {
            const pdfBase64 = doc.output('datauristring').split(',')[1];
            const savedFile = await Filesystem.writeFile({
                path: safeFilename,
                data: pdfBase64,
                directory: Directory.Documents,
                recursive: true
            });
            toast.success('Report saved to Documents!');
            await Share.share({
                title: 'Sadhana Report',
                text: 'Hare Krishna! Here is the sadhana report.',
                url: savedFile.uri,
                dialogTitle: 'Share Sadhana Report'
            });
        } catch (err) {
            console.error('Mobile PDF error:', err);
            toast.error('Failed to save or share report. Please check if storage permissions are enabled.');
        }
    } else {
        doc.save(safeFilename);
        toast.success('Report downloaded!');
    }
};

// --- Group colours ---
const GROUP_COLORS = {
    bhima:      [180, 100, 0],
    arjun:      [200, 80,  10],
    nakul:      [0,   110, 100],
    yudhisthir: [255, 120, 0],
    other:      [140, 140, 140],
    brahmacari: [217, 119, 6],
    unassigned: [100, 100, 100],
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORING HELPERS
import { japaScore, wakeScore, restScore, sleepScore, fillingScore } from './scoring';
// ─────────────────────────────────────────────────────────────────────────────

/** Cap reading/hearing at quota daily target (default 30) */
const cappedRead = (v, quota = {}) => Math.min(parseInt(v) || 0, parseInt(quota.read_target) || 30);
const cappedHear = (v, quota = {}) => Math.min(parseInt(v) || 0, parseInt(quota.hear_target) || 30);
/** Cap NRCM at quota daily target (default 16) */
const cappedNrcm = (v, quota = {}) => Math.min(parseInt(v) || 0, parseInt(quota.nrcm_target) || 16);

/** Format score for display: null → '-', number → string */
const fmt = (v) => (v === null || v === undefined ? '-' : String(v));

// ─────────────────────────────────────────────────────────────────────────────
// getTargetWeek
// ─────────────────────────────────────────────────────────────────────────────
export const getTargetWeek = () => {
    const nowUTC  = new Date();
    const istOffset = 5.5 * 60;
    const nowIST  = new Date(nowUTC.getTime() + istOffset * 60 * 1000);
    const dayIST  = nowIST.getUTCDay();
    const hourIST = nowIST.getUTCHours();
    const minIST  = nowIST.getUTCMinutes();
    const istMinutesInDay = hourIST * 60 + minIST;

    const lastWeekStart  = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
    const lastWeekEnd    = endOfWeek(lastWeekStart, { weekStartsOn: 0 });
    const twoWeeksStart  = startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 0 });
    const twoWeeksEnd    = endOfWeek(twoWeeksStart, { weekStartsOn: 0 });

    const isSundayBefore2PM = dayIST === 0 && istMinutesInDay < 14 * 60;

    if (isSundayBefore2PM) {
        return {
            start: twoWeeksStart,
            end:   twoWeeksEnd,
            restrictionNote: `Report from ${format(twoWeeksStart, 'MMM d')} to ${format(twoWeeksEnd, 'MMM d, yyyy')} (most recent week restricted until Sunday 2:00 PM IST).`,
        };
    }
    return { start: lastWeekStart, end: lastWeekEnd, restrictionNote: null };
};

// ─────────────────────────────────────────────────────────────────────────────
// PDF HEADER
// ─────────────────────────────────────────────────────────────────────────────
const addPDFHeader = (doc, title, subtitle) => {
    doc.setFont('times', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.setFontSize(22);
    doc.text('HARE KRISHNA', 148, 18, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setTextColor(80);
    doc.setFontSize(14);
    doc.text(cleanStr(title), 148, 26, { align: 'center' });
    if (subtitle) {
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text(cleanStr(subtitle), 148, 33, { align: 'center' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// buildGridRows: produces the row-per-metric table body for the new PDF layout
// ─────────────────────────────────────────────────────────────────────────────
const buildGridRows = (days, logs, showPlacement = false, quota = {}) => {
    const dayLogs = days.map(d => logs.find(l => isSameDay(new Date(l.date), d)) || null);

    // ── SOUL calculations ──
    const japaCells  = dayLogs.map(l => l ? japaScore(l.japa_completed_time) : null);
    const readCap    = parseInt(quota.read_target) || 30;
    const hearCap    = parseInt(quota.hear_target) || 30;
    const nrcmCap    = parseInt(quota.nrcm_target) || 16;
    const readCells  = dayLogs.map(l => l ? (parseInt(l.reading_time) || 0) : null);
    const hearCells  = dayLogs.map(l => l ? (parseInt(l.hearing_time) || 0) : null);
    const nrcmCells  = dayLogs.map(l => l ? (parseInt(l.nrcm) || 0) : null);
    const sevaCells  = dayLogs.map(l => l ? (parseFloat(l.service_hours) || 0) : null);

    const japaFilled = japaCells.filter(v => v !== null);
    const japaTotal  = japaFilled.reduce((s, v) => s + v, 0);
    const japaMax    = japaFilled.length * 25;
    const japaAvg    = japaMax > 0 ? `${Math.round((japaTotal / japaMax) * 100)}%` : '-';

    const readTotal  = readCells.filter(v => v !== null).map(v => Math.min(v, readCap)).reduce((s, v) => s + v, 0);
    const readMax    = readCap * 7;
    const readAvg    = `${Math.round((readTotal / readMax) * 100)}%`;

    const hearTotal  = hearCells.filter(v => v !== null).map(v => Math.min(v, hearCap)).reduce((s, v) => s + v, 0);
    const hearMax    = hearCap * 7;
    const hearAvg    = `${Math.round((hearTotal / hearMax) * 100)}%`;

    const nrcmTotal  = nrcmCells.filter(v => v !== null).map(v => Math.min(v, nrcmCap)).reduce((s, v) => s + v, 0);
    const nrcmMax    = nrcmCap * 7;
    const nrcmAvg    = `${Math.round((nrcmTotal / nrcmMax) * 100)}%`;

    const sevaTotal  = sevaCells.filter(v => v !== null).reduce((s, v) => s + v, 0);

    // ── BODY calculations ──
    const wakeCells  = dayLogs.map(l => l ? wakeScore(l.wakeup_time)    : null);
    const studyCells = dayLogs.map(l => l ? (parseInt(l.study_time) || 0)      : null);
    const plcCells   = dayLogs.map(l => l ? (parseInt(l.placement_time) || 0)  : null);
    const restCells  = dayLogs.map(l => l ? restScore(l.dayrest_time)   : null);
    const sleepCells = dayLogs.map(l => l ? sleepScore(l.sleep_time)    : null);
    const fillCells  = dayLogs.map(l => l ? fillingScore(l)                    : null);

    const wakeFilled = wakeCells.filter(v => v !== null);
    const wakeTotal  = wakeFilled.reduce((s, v) => s + v, 0);
    const wakeMax    = wakeFilled.length * 25;
    const wakeAvg    = wakeMax > 0 ? `${Math.round((wakeTotal / wakeMax) * 100)}%` : '-';

    const studyTotal = studyCells.filter(v => v !== null).reduce((s, v) => s + v, 0);
    const studyMax   = parseInt(quota.study_target) || 0;
    const studyAvg   = studyMax > 0 ? `${Math.round((studyTotal / (studyMax * 7)) * 100)}%` : `${studyTotal}m`;

    const plcTotal   = plcCells.filter(v => v !== null).reduce((s, v) => s + v, 0);
    const plcMax     = parseInt(quota.placement_target) || 0;
    const plcAvg     = plcMax > 0 ? `${Math.round((plcTotal / (plcMax * 7)) * 100)}%` : `${plcTotal}m`;

    const restFilled = restCells.filter(v => v !== null);
    const restTotal  = restFilled.reduce((s, v) => s + v, 0);
    const restMax    = restFilled.length * 25;
    const restAvg    = restMax > 0 ? `${Math.round((restTotal / restMax) * 100)}%` : '-';

    const sleepFilled = sleepCells.filter(v => v !== null);
    const sleepTotal  = sleepFilled.reduce((s, v) => s + v, 0);
    const sleepMax    = sleepFilled.length * 25;
    const sleepAvg    = sleepMax > 0 ? `${Math.round((sleepTotal / sleepMax) * 100)}%` : '-';

    const fillTotal  = fillCells.filter(v => v !== null).reduce((s, v) => s + v, 0);

    const rows = [
        ['SOUL - Japa',     ...japaCells.map(fmt),                                                japaAvg],
        ['Reading (m)',      ...readCells.map(v => v !== null ? `${v}m` : '-'),                   readAvg],
        ['Hearing (m)',      ...hearCells.map(v => v !== null ? `${v}m` : '-'),                   hearAvg],
        ['NRCM',             ...nrcmCells.map(fmt),                                               nrcmAvg],
        ['Seva (hrs)',        ...sevaCells.map(v => v !== null ? `${v}h` : '-'),                  `${sevaTotal}h`],
        ['BODY - Wake Up',   ...wakeCells.map(fmt),                                               wakeAvg],
        ['Study (m)',         ...studyCells.map(v => v !== null ? `${v}m` : '-'),                studyAvg],
        ...(showPlacement ? [['Placement (m)', ...plcCells.map(v => v !== null ? `${v}m` : '-'), plcAvg]] : []),
        ['Day Rest',          ...restCells.map(fmt),                                              restAvg],
        ['To Bed',            ...sleepCells.map(fmt),                                             sleepAvg],
        ['Filling',           ...fillCells.map(v => v !== null ? (v > 0 ? `+${v}` : `${v}`) : '-'), `${fillTotal > 0 ? '+' : ''}${fillTotal}`],
    ];

    return rows;
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION COLORING for SOUL vs BODY rows
// ─────────────────────────────────────────────────────────────────────────────
const SOUL_ROWS = ['SOUL - Japa', 'Reading (m)', 'Hearing (m)', 'NRCM', 'Seva (hrs)'];
const BODY_ROWS = ['BODY - Wake Up', 'Study (m)', 'Placement (m)', 'Day Rest', 'To Bed', 'Filling'];

const getRowColor = (label) => {
    if (SOUL_ROWS.some(r => label.startsWith(r.split(' ')[0] + (label.startsWith('SOUL') ? ' -' : '')))) {
        if (label.startsWith('SOUL')) return [255, 243, 220]; // amber header
        return [255, 252, 240]; // light amber
    }
    if (label.startsWith('BODY')) return [220, 238, 255]; // blue header
    return [240, 248, 255]; // light blue
};

// ─────────────────────────────────────────────────────────────────────────────
// renderGridPDF: shared grid PDF renderer used by all report types
// ─────────────────────────────────────────────────────────────────────────────
const renderGridPDF = (doc, days, logs, username, groupName, start, end, yStart, quota = {}) => {
    const showPlacement = ['arjun', 'bhima'].includes((groupName || '').toLowerCase());
    const dayHeaders    = days.map(d => format(d, 'EEE\ndd/MM'));
    const dateRangeStr  = `${format(start, 'dd-MM')} to ${format(end, 'dd-MM')}`;

    const head = [[dateRangeStr, ...dayHeaders, 'Avg %']];
    const body = buildGridRows(days, logs, showPlacement, quota);

    autoTable(doc, {
        startY: yStart,
        head,
        body,
        theme: 'grid',
        headStyles: {
            fillColor: [234, 88, 12],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
        },
        bodyStyles: {
            fontSize: 8.5,
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold', cellWidth: 28, fillColor: [245, 245, 245] },
            8: { cellWidth: 18 }, // Avg % column (last)
        },
        styles: { font: 'times', lineColor: [180, 180, 180], lineWidth: 0.3 },
        margin: { left: 14, right: 14 },
        willDrawCell: (data) => {
            if (data.section !== 'body') return;
            const label = String(data.row.raw[0]);
            // SOUL header row
            if (label.startsWith('SOUL')) {
                data.cell.styles.fillColor = [253, 186, 45]; // amber
                data.cell.styles.textColor = [80, 40, 0];
                data.cell.styles.fontStyle = 'bold';
            }
            // BODY header row
            else if (label.startsWith('BODY')) {
                data.cell.styles.fillColor = [59, 130, 246]; // blue
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fontStyle = 'bold';
            }
            // Soul data rows
            else if (['Reading (m)', 'Hearing (m)', 'NRCM', 'Seva (hrs)'].includes(label)) {
                data.cell.styles.fillColor = [255, 252, 240];
            }
            // Body data rows
            else {
                data.cell.styles.fillColor = [240, 248, 255];
            }
            // Color negative marks red
            const val = String(data.cell.raw);
            if (val.startsWith('-') && val !== '-') {
                data.cell.styles.textColor = [220, 38, 38];
            }
        },
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// generateWeeklySadhanaReport — single user, auto-resolved last week
// ─────────────────────────────────────────────────────────────────────────────
export const generateWeeklySadhanaReport = async (username, logs, groupName = '', quota = {}) => {
    try {
        const { start, end, restrictionNote } = getTargetWeek();
        const days = eachDayOfInterval({ start, end });

        const doc = new jsPDF({ orientation: 'landscape' });
        addPDFHeader(doc, 'Sadhana Tracker - Weekly Report');

        let y = 38;
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Devotee: ${cleanStr(username)}`, 20, y);
        doc.text(`Week: ${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}`, 20, y + 7);
        doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 20, y + 14);
        y += 22;

        if (restrictionNote) {
            doc.setFontSize(9);
            doc.setTextColor(180, 80, 0);
            const lines = doc.splitTextToSize(cleanStr(restrictionNote), 256);
            doc.text(lines, 20, y);
            y += lines.length * 5 + 4;
        }

        renderGridPDF(doc, days, logs, username, groupName, start, end, y, quota);

        doc.setFontSize(9);
        doc.setTextColor(160);
        const pageH = doc.internal.pageSize.getHeight();
        doc.text('Your spiritual progress is a gift to the world.', 148, pageH - 8, { align: 'center' });

        const fileName = `Weekly_Sadhana_${username}_${format(start, 'MMM_d')}.pdf`;
        await saveOrSharePDF(doc, fileName);
    } catch (err) {
        console.error('Weekly report generation crash:', err);
        toast.error('Report failed. Please check if your record contains special symbols or emojis.');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// generateCustomRangeSadhanaReport — single user, custom date range
// ─────────────────────────────────────────────────────────────────────────────
export const generateCustomRangeSadhanaReport = async (username, logs, startDate, endDate, groupName = '', quota = {}) => {
    try {
        const start = new Date(startDate + 'T00:00:00');
        const end   = new Date(endDate   + 'T23:59:59');
        const days  = eachDayOfInterval({ start, end });

        const doc = new jsPDF({ orientation: 'landscape' });
        addPDFHeader(doc, 'Sadhana Tracker - Custom Range Report');

        let y = 38;
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text(`Devotee: ${cleanStr(username)}`, 20, y);
        doc.text(`Period: ${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')}`, 20, y + 7);
        doc.text(`Generated: ${format(new Date(), 'PPP p')}`, 20, y + 14);
        y += 22;

        const filtered = logs.filter(l => {
            const d = new Date(l.date);
            return d >= start && d <= end;
        });

        renderGridPDF(doc, days, filtered, username, groupName, start, end, y, quota);

        doc.setFontSize(9);
        doc.setTextColor(160);
        const pageH = doc.internal.pageSize.getHeight();
        doc.text('Your spiritual progress is a gift to the world.', 148, pageH - 8, { align: 'center' });

        const fileName = `Custom_Sadhana_${username}_${startDate}_to_${endDate}.pdf`;
        await saveOrSharePDF(doc, fileName);
    } catch (err) {
        console.error('Custom report generation crash:', err);
        toast.error(`Custom PDF Crash: ${err.message}`);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// generateGroupReport — multi-user PDF
// ─────────────────────────────────────────────────────────────────────────────
const GROUP_ORDER = ['yudhisthir', 'bhima', 'arjun', 'nakul', 'sahadev', 'other'];

export const generateGroupReport = async (groupLabel, usersData, startDate, endDate, restrictionNote = null) => {
    const start = new Date(startDate + 'T00:00:00');
    const end   = new Date(endDate   + 'T23:59:59');
    const days  = eachDayOfInterval({ start, end });

    const sorted = [...usersData]
        .filter(u => (u.group_name || '').toLowerCase() !== 'brahmacari')
        .sort((a, b) => {
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
        `Sadhana Report - ${groupLabel}`,
        `${format(start, 'dd/MM/yyyy')} to ${format(end, 'dd/MM/yyyy')} · Generated ${format(new Date(), 'PPP p')}`
    );

    let y = 38;
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();

    if (restrictionNote) {
        doc.setFontSize(9);
        doc.setTextColor(180, 80, 0);
        const lines = doc.splitTextToSize(cleanStr(restrictionNote), 256);
        doc.text(lines, 20, y);
        y += lines.length * 5 + 6;
    }

    sorted.forEach(({ username, group_name, logs }, idx) => {
        const grpKey = (group_name || 'unassigned').toLowerCase();
        const color  = GROUP_COLORS[grpKey] || GROUP_COLORS.unassigned;

        if (y + 30 > pageH - 15) { doc.addPage(); y = 15; }

        // Colored banner
        doc.setFillColor(...color);
        doc.rect(14, y, pageW - 28, 11, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        const existing = days.map(d => logs.find(l => isSameDay(new Date(l.date), d))).filter(Boolean);
        doc.text(
            `${grpKey.toUpperCase()}  -  ${cleanStr(username)}  |  Days Logged: ${existing.length}/${days.length}`,
            17, y + 7.5
        );
        y += 11;

        renderGridPDF(doc, days, logs, username, group_name, start, end, y, quota || {});

        y = (doc.lastAutoTable?.finalY ?? y) + (idx < sorted.length - 1 ? 10 : 6);
    });

    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text('Your spiritual progress is a gift to the world.', pageW / 2, pageH - 8, { align: 'center' });

    const fileName = `Group_Sadhana_${groupLabel}_${startDate}_to_${endDate}.pdf`;
    await saveOrSharePDF(doc, fileName);
};
