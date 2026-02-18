import { format, isSameDay, addDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { VAISHNAVA_EVENTS } from '../data/vaishnavaCalendarData';

export const getVaishnavaEventForDate = (date) => {
    return VAISHNAVA_EVENTS.find(event => isSameDay(new Date(event.date), date));
};

export const getUpcomingEvents = (limit = 5) => {
    const today = startOfDay(new Date());
    return VAISHNAVA_EVENTS
        .filter(event => !isBefore(new Date(event.date), today))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, limit);
};

export const getNoticeForToday = () => {
    const today = new Date();
    const tomorrow = addDays(today, 1);

    const todayEvent = getVaishnavaEventForDate(today);
    const tomorrowEvent = getVaishnavaEventForDate(tomorrow);

    if (todayEvent) {
        return {
            status: 'today',
            name: todayEvent.name,
            type: todayEvent.type,
            description: todayEvent.description
        };
    }

    if (tomorrowEvent && tomorrowEvent.type === 'ekadashi') {
        return {
            status: 'tomorrow',
            name: tomorrowEvent.name,
            type: 'ekadashi-warning',
            description: "Preparing for Ekadashi tomorrow."
        };
    }

    return null;
};
