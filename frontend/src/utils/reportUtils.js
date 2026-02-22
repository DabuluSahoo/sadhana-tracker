import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, startOfDay, endOfDay, isAfter } from 'date-fns';
import toast from 'react-hot-toast';

export const generateWeeklySadhanaReport = (username, logs) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)

    let targetStart, targetEnd;

    // Logic: If it's Sunday (0) or Monday (1), the user likely wants the RECENTLY COMPLETED week.
    // Otherwise, they likely want the CURRENT week (even if partial).
    if (dayOfWeek <= 1) {
        targetStart = startOfDay(startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 }));
        targetEnd = endOfDay(endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 }));
    } else {
        targetStart = startOfDay(startOfWeek(now, { weekStartsOn: 0 }));
        targetEnd = endOfDay(endOfWeek(now, { weekStartsOn: 0 }));
    }

    // Filter logs for that specific week
    const weeklyLogs = logs
        .filter(log => {
            const logDate = new Date(log.date);
            return isWithinInterval(logDate, {
                start: targetStart,
                end: targetEnd
            });
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Validations & Alerts
    if (weeklyLogs.length === 0) {
        toast.error(`No sadhana logs found for the week: ${format(targetStart, 'MMM d')} - ${format(targetEnd, 'MMM d')}`);
        return;
    }

    // Alert if week hasn't ended (Saturday is the last day)
    const isWeekComplete = isAfter(now, endOfDay(targetEnd));
    if (!isWeekComplete) {
        toast(`Progress Report: This week (${format(targetStart, 'MMM d')} - ${format(targetEnd, 'MMM d')}) is still in progress.`, {
            icon: 'ℹ️',
            duration: 4000
        });
    }

    const doc = jsPDF();

    // Header section
    doc.setFont('times', 'bold');
    doc.setTextColor(234, 88, 12); // Saffron 600
    doc.setFontSize(24);
    doc.text('HARE KRISHNA', 105, 20, { align: 'center' });

    doc.setTextColor(100);
    doc.setFont('times', 'normal');
    doc.setFontSize(16);
    doc.text('Sadhana Tracker - Weekly Report', 105, 30, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(60);
    doc.text(`Devotee: ${username}`, 20, 45);
    doc.text(`Generated: ${format(now, 'PPP p')}`, 20, 52);
    doc.text(`Week Range: ${format(targetStart, 'EEEE, MMM d')} to ${format(targetEnd, 'EEEE, MMM d, yyyy')}`, 20, 59);

    // Summary Box
    const totalRounds = weeklyLogs.reduce((sum, l) => sum + (l.rounds || 0), 0);
    const avgRounds = (totalRounds / weeklyLogs.length).toFixed(1);
    const totalStudy = weeklyLogs.reduce((sum, l) => sum + (l.study_time || 0), 0);
    const mangalaCount = weeklyLogs.filter(l => l.mangala_aarti).length;

    doc.setDrawColor(241, 140, 0);
    doc.setFillColor(255, 247, 237);
    doc.rect(20, 65, 170, 25, 'FD');

    doc.setTextColor(234, 88, 12);
    doc.setFontSize(10);
    doc.text('WEEKLY SUMMARY', 25, 72);

    doc.setTextColor(60);
    doc.text(`Avg Rounds: ${avgRounds}`, 30, 80);
    doc.text(`Total Study: ${totalStudy}m`, 80, 80);
    doc.text(`Mangala Aarti: ${mangalaCount}/${weeklyLogs.length}`, 140, 80);

    // Table
    const tableColumn = ["Date", "Rounds", "Reading", "Study", "Rest", "Mangala", "Comments"];
    const tableRows = weeklyLogs.map(log => [
        format(new Date(log.date), 'EEE, MMM d'),
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
        styles: { font: 'times' },
        columnStyles: {
            6: { cellWidth: 50 }, // Comments column
        }
    });

    // Footer
    const finalY = doc.previousAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Your spiritual progress is a gift to the world.', 105, 285, { align: 'center' });

    doc.save(`Weekly_Sadhana_${username}_${format(targetStart, 'MMM_d')}_To_${format(targetEnd, 'MMM_d')}.pdf`);
    toast.success('Weekly report downloaded!');
};
