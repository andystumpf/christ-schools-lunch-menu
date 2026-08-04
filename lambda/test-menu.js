/**
 * Local smoke test for the lunch menu calendar lookup.
 * Run: npm test   (from lambda/)
 */

const ical = require('ical');
const https = require('https');
const moment = require('moment');

const CALENDAR_URL = 'https://calendar.google.com/calendar/ical/christschools.org_f2uc72cd4bn3mgglvl1j49a7sk%40group.calendar.google.com/public/basic.ics';
const CALENDAR_TIMEZONE = 'America/Chicago';

const dayMap = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
};

const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getChicagoNow() {
    const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: CALENDAR_TIMEZONE });
    return moment(todayKey, 'YYYY-MM-DD');
}

function getEventDayKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDaysUntilNextMonday(from) {
    const daysUntil = (8 - from.day()) % 7;
    return daysUntil === 0 ? 7 : daysUntil;
}

function getWeekdayKeyFromName(weekdayName, modifier) {
    const targetDow = dayMap[weekdayName.toLowerCase()];
    if (targetDow === undefined) {
        return null;
    }

    const now = getChicagoNow();
    const normalizedModifier = (modifier || '').toLowerCase();

    if (normalizedModifier === 'next') {
        const nextMonday = now.clone().add(getDaysUntilNextMonday(now), 'd');
        return nextMonday.clone().add(targetDow - 1, 'd').format('YYYY-MM-DD');
    }

    let daysAhead = targetDow - now.day();
    if (daysAhead < 0) {
        daysAhead += 7;
    }

    return now.clone().add(daysAhead, 'd').format('YYYY-MM-DD');
}

function getWeekDayKeys(weekReference) {
    const now = getChicagoNow();
    const reference = (weekReference || 'next week').toLowerCase();
    let monday;

    if (reference === 'this week') {
        if (now.day() === 0) {
            monday = now.clone().add(1, 'd');
        } else if (now.day() === 6) {
            monday = now.clone().add(2, 'd');
        } else {
            monday = now.clone().subtract(now.day() - 1, 'd');
        }
    } else {
        monday = now.clone().add(getDaysUntilNextMonday(now), 'd');
    }

    const keys = [];
    for (let i = 0; i < 5; i += 1) {
        keys.push(monday.clone().add(i, 'd').format('YYYY-MM-DD'));
    }

    return keys;
}

function getTargetDayKey(value, modifier) {
    if (!value) {
        return getChicagoNow().format('YYYY-MM-DD');
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const weekdayKey = getWeekdayKeyFromName(value, modifier);
    if (weekdayKey) {
        return weekdayKey;
    }
    return null;
}

function getEventOnDate(targetDayKey, events) {
    for (const event of events) {
        const startDay = getEventDayKey(event.start);
        const endDay = getEventDayKey(event.end);
        if (targetDayKey >= startDay && targetDayKey < endDay) {
            return event;
        }
    }
    return null;
}

function fetchCalendar() {
    return new Promise((resolve, reject) => {
        https.get(CALENDAR_URL, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => resolve(ical.parseICS(body)));
        }).on('error', reject);
    });
}

function buildEventList(data) {
    const eventList = [];
    for (const k in data) {
        if (data[k].type === 'VEVENT') {
            eventList.push({
                summary: data[k].summary,
                description: data[k].description,
                start: data[k].start,
                end: data[k].end
            });
        }
    }
    return eventList;
}

async function main() {
    const data = await fetchCalendar();
    const events = buildEventList(data);
    console.log(`Loaded ${events.length} lunch events from Google Calendar\n`);

    const queries = [
        ['today', ''],
        ['tomorrow', ''],
        ['2026-08-13', ''],
        ['2026-08-17', ''],
        ['tuesday', 'next'],
        ['wednesday', 'this coming']
    ];

    for (const [q, modifier] of queries) {
        const key = getTargetDayKey(q, modifier);
        const event = key ? getEventOnDate(key, events) : null;
        const label = modifier ? `${modifier} ${q}` : q;
        console.log(`${label} (${key}): ${event ? event.summary : 'No lunch planned'}`);
    }

    console.log('\nNext week:');
    for (const key of getWeekDayKeys('next week')) {
        const event = getEventOnDate(key, events);
        const dayName = weekdayNames[moment(key, 'YYYY-MM-DD').day()];
        console.log(`  ${dayName} (${key}): ${event ? event.summary : 'No lunch planned'}`);
    }
}

main().catch((err) => {
    console.error('Test failed:', err.message);
    process.exit(1);
});
