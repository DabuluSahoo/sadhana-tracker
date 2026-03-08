const { generateGroupReportBase64 } = require('./utils/reportGenerator');
const { startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } = require('date-fns');

const test = () => {
    try {
        console.log('Testing generateGroupReportBase64...');
        
        const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 0 });
        const lastWeekEnd   = endOfWeek(lastWeekStart, { weekStartsOn: 0 });
        const days = eachDayOfInterval({ start: lastWeekStart, end: lastWeekEnd });

        const usersData = [
            {
                username: 'Test User',
                logs: [
                    { date: lastWeekStart, rounds: 16, wakeup_time: '04:30:00' }
                ]
            }
        ];

        const base64 = generateGroupReportBase64('bhima', usersData, lastWeekStart, lastWeekEnd, days);
        
        if (base64 && base64.length > 500) {
            console.log('✅ PDF Generation successful (Base64 length:', base64.length, ')');
        } else {
            console.error('❌ PDF Generation failed: Result too short or empty');
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ PDF Generation failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
};

test();
