import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export const generateWeeklySadhanaReport = (username, logs) => {
    const doc = jsPDF();
    const now = new Date();
    const lastWeek = subDays(now, 7);

    // Filter last 7 days of logs
    const weeklyLogs = logs
        .filter(log => {
            const logDate = new Date(log.date);
            return isWithinInterval(logDate, {
                start: startOfDay(lastWeek),
                end: endOfDay(now)
            });
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Header section
    doc.setFont('serif');
    doc.setTextColor(234, 88, 12); // Saffron 600
    doc.setFontSize(24);
    doc.text('HARE KRISHNA', 105, 20, { align: 'center' });

    doc.setTextColor(100);
    doc.setFontSize(16);
    doc.text('Sadhana Tracker - Weekly Report', 105, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text(`Devotee: ${username}`, 20, 45);
    doc.text(`Generated: ${format(now, 'PPP')}`, 20, 52);
    doc.text(`Period: ${format(lastWeek, 'MMM d')} - ${format(now, 'MMM d, yyyy')}`, 20, 59);

    // Summary Box
    if (weeklyLogs.length > 0) {
        const totalRounds = weeklyLogs.reduce((sum, l) => sum + (l.rounds || 0), 0);
        const avgRounds = (totalRounds / weeklyLogs.length).toFixed(1);
        const totalStudy = weeklyLogs.reduce((sum, l) => sum + (l.study_time || 0), 0);
        const mangalaCount = weeklyLogs.filter(l => l.mangala_aarti).length;

        doc.setDrawColor(241, 140, 0);
        doc.setFillColor(255, 247, 237);
        doc.rect(20, 65, 170, 25, 'FD');

        doc.setTextColor(234, 88, 12);
        doc.setFontSize(10);
        doc.text('SUMMARY', 25, 72);

        doc.setTextColor(60);
        doc.text(`Avg Rounds: ${avgRounds}`, 30, 80);
        doc.text(`Total Study: ${totalStudy}m`, 80, 80);
        doc.text(`Mangala Aarti: ${mangalaCount}/${weeklyLogs.length}`, 140, 80);
    }

    // Table
    const tableColumn = ["Date", "Rounds", "Reading", "Study", "Rest", "Mangala", "Comments"];
    const tableRows = weeklyLogs.map(log => [
        format(new Date(log.date), 'MMM d'),
        log.rounds || 0,
        `${log.reading_time || 0}m`,
        `${log.study_time || 0}m`,
        `${log.dayrest_time || 0}m`,
        log.mangala_aarti ? "Yes" : "No",
        log.comments || ""
    ]);

    doc.autoTable({
        startY: 95,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12] },
        alternateRowStyles: { fillColor: [255, 252, 240] },
        columnStyles: {
            6: { cellWidth: 50 }, // Comments column
        }
    });

    // Footer
    const finalY = doc.previousAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Your spiritual progress is a gift to the world.', 105, finalY + 10, { align: 'center' });

    doc.save(`Sadhana_Report_${username}_${format(now, 'yyyy_MM_dd')}.pdf`);
};
