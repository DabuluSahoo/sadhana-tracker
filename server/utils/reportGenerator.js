const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const { format, isSameDay } = require('date-fns');

// Group colors (cloned from frontend reportUtils.js)
const GROUP_COLORS = {
    bhima:      [180, 100, 0],   // Amber dark
    arjun:      [200, 80,  10],  // Saffron
    nakul:      [0,   110, 100], // Teal
    yudhisthir: [255, 120, 0],   // Bright Orange
    other:      [140, 140, 140], // Medium Gray
    brahmacari: [217, 119, 6],   // Amber medium
};

const TABLE_COLS = ['Date', 'Wake', 'Sleep', 'Rounds', 'NRCM', 'Read', 'Hear', 'Study', 'Svc(h)', 'Mangala', 'Comments'];

const buildRows = (days, logs) =>
    days.map(day => {
        const log = logs.find(l => isSameDay(new Date(l.date), day));
        if (!log) return [format(day, 'EEE, MMM d'), '-', '-', '-', '-', '-', '-', '-', '-', '-', 'NOT FILLED'];
        return [
            format(day, 'EEE, MMM d'),
            log.wakeup_time ? log.wakeup_time.slice(0, 5) : '-',
            log.sleep_time  ? log.sleep_time.slice(0, 5)  : '-',
            log.rounds        || 0,
            log.nrcm          || 0,
            `${log.reading_time  || 0}m`,
            `${log.hearing_time  || 0}m`,
            `${log.study_time    || 0}m`,
            `${log.service_hours || 0}h`,
            log.mangala_aarti ? 'Yes' : 'No',
            log.comments || '',
        ];
    });

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

/**
 * Generates a weekly group report PDF as a Base64 string.
 * @param {string} groupName 
 * @param {Array} usersData - [{ username, logs: [] }]
 * @param {Date} start 
 * @param {Date} end 
 * @param {Array} days - Generated days of the week
 */
exports.generateGroupReportBase64 = (groupName, usersData, start, end, days) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    addPDFHeader(
        doc,
        `Weekly Group Sadhana Report – ${groupName.toUpperCase()}`,
        `${format(start, 'MMM d')} to ${format(end, 'MMM d, yyyy')}`
    );

    let y = 38;
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();

    usersData.forEach(({ username, logs }, idx) => {
        const color = GROUP_COLORS[groupName.toLowerCase()] || [100, 100, 100];
        const existing = days.map(d => logs.find(l => isSameDay(new Date(l.date), d))).filter(Boolean);
        const daysLogged = existing.length;
        const avgRounds = daysLogged
            ? (existing.reduce((s, l) => s + (l.rounds || 0), 0) / daysLogged).toFixed(1)
            : 0;
        const avgNrcm = daysLogged
            ? (existing.reduce((s, l) => s + (l.nrcm || 0), 0) / daysLogged).toFixed(1)
            : 0;

        // Banner check
        if (y + 35 > pageH - 15) {
            doc.addPage();
            y = 15;
        }

        doc.setFillColor(...color);
        doc.rect(14, y, pageW - 28, 11, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.text(
            `${groupName.toUpperCase()} GROUP  -  ${username}  |  Days Logged: ${daysLogged}/${days.length}  |  Avg Rounds: ${avgRounds}  |  Avg NRCM: ${avgNrcm}`,
            17, y + 7.5
        );
        y += 11;

        autoTable(doc, {
            startY: y,
            head: [TABLE_COLS],
            body: buildRows(days, logs),
            theme: 'striped',
            headStyles: {
                fillColor: color.map(c => Math.min(255, c + 60)),
                textColor: [255, 255, 255],
                fontSize: 9.5,
                fontStyle: 'bold',
            },
            bodyStyles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [255, 252, 245] },
            styles: { font: 'times', cellPadding: 1.5 },
            columnStyles: { 10: { cellWidth: 45 } },
            margin: { left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + (idx < usersData.length - 1 ? 10 : 6);
    });

    doc.setFontSize(9);
    doc.setTextColor(160);
    doc.text('Your spiritual progress is a gift to the world. 🙏', pageW / 2, pageH - 8, { align: 'center' });

    // Output Base64 string for Resend attachment
    return doc.output('datauristring').split(',')[1];
};
/**
 * Generates a consolidated weekly report PDF for all groups.
 * @param {Array} groupsData - [{ groupName, usersData: [{ username, logs: [] }] }]
 * @param {Date} start 
 * @param {Date} end 
 * @param {Array} days 
 */
exports.generateConsolidatedReportBase64 = (groupsData, start, end, days) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageH = doc.internal.pageSize.getHeight();
    const pageW = doc.internal.pageSize.getWidth();

    groupsData.forEach((groupObj, gIdx) => {
        const { groupName, usersData } = groupObj;
        
        // Add a new page for each group after the first
        if (gIdx > 0) doc.addPage();

        addPDFHeader(
            doc,
            `Weekly Consolidated Sadhana Report – ${groupName.toUpperCase()} Group`,
            `${format(start, 'MMM d')} to ${format(end, 'MMM d, yyyy')}`
        );

        let y = 38;

        usersData.forEach(({ username, logs }, idx) => {
            const color = GROUP_COLORS[groupName.toLowerCase()] || [100, 100, 100];
            const existing = days.map(d => logs.find(l => isSameDay(new Date(l.date), d))).filter(Boolean);
            const daysLogged = existing.length;
            const avgRounds = daysLogged
                ? (existing.reduce((s, l) => s + (l.rounds || 0), 0) / daysLogged).toFixed(1)
                : 0;
            const avgNrcm = daysLogged
                ? (existing.reduce((s, l) => s + (l.nrcm || 0), 0) / daysLogged).toFixed(1)
                : 0;

            // Banner + Table height check
            if (y + 40 > pageH - 15) {
                doc.addPage();
                y = 15;
            }

            doc.setFillColor(...color);
            doc.rect(14, y, pageW - 28, 11, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('times', 'bold');
            doc.setFontSize(11);
            doc.text(
                `${groupName.toUpperCase()} GROUP  -  ${username}  |  Days Logged: ${daysLogged}/${days.length}  |  Avg Rounds: ${avgRounds}  |  Avg NRCM: ${avgNrcm}`,
                17, y + 7.5
            );
            y += 11;

            autoTable(doc, {
                startY: y,
                head: [TABLE_COLS],
                body: buildRows(days, logs),
                theme: 'striped',
                headStyles: {
                    fillColor: color.map(c => Math.min(255, c + 60)),
                    textColor: [255, 255, 255],
                    fontSize: 9.5,
                    fontStyle: 'bold',
                },
                bodyStyles: { fontSize: 9 },
                alternateRowStyles: { fillColor: [255, 252, 245] },
                styles: { font: 'times', cellPadding: 1.5 },
                columnStyles: { 10: { cellWidth: 45 } },
                margin: { left: 14, right: 14 },
            });

            y = doc.lastAutoTable.finalY + (idx < usersData.length - 1 ? 10 : 6);
        });

        doc.setFontSize(9);
        doc.setTextColor(160);
        doc.text('Your spiritual progress is a gift to the world. 🙏', pageW / 2, pageH - 8, { align: 'center' });
    });

    return doc.output('datauristring').split(',')[1];
};
