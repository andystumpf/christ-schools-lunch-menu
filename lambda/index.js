var Alexa = require('alexa-sdk');
var ical = require('ical');
var https = require('https');
var utils = require('util');
var moment = require('moment');
var apl = require('./apl');

var states = {
    SEARCHMODE: '_SEARCHMODE',
    DESCRIPTION: '_DESKMODE'
};

var alexa;
var APP_ID = undefined;

var CALENDAR_URL = 'https://calendar.google.com/calendar/ical/christschools.org_f2uc72cd4bn3mgglvl1j49a7sk%40group.calendar.google.com/public/basic.ics';
var CALENDAR_TIMEZONE = 'America/Chicago';
var skillName = 'christ schools menu';
var welcomeMessage = "Welcome to Christ Schools Menu. Ask what's for lunch today, tomorrow, on a date like August seventeenth, next Tuesday, this coming Wednesday, or say show me the menu for this week or next week. What would you like? ";
var HelpMessage = "Here are things you can say. What's for lunch today? What's for lunch tomorrow? What's for lunch on August seventeenth? What's for lunch on Friday? What's for lunch next Tuesday? What's for lunch this coming Wednesday? Show me the menu for this week. Show me the menu for next week. Say stop when you're done.";
var CalendarErrorMessage = 'Sorry, I had trouble loading the lunch calendar. Please try again in a moment.';
var shutdownMessage = 'Ok see you again soon.';
var haveEventsReprompt = 'Would you like to know more';
var killSkillMessage = 'Ok, great, see you next time.';
var cardTitle = 'Christ Schools Menu';

var output = '';
var relevantEvent = {};

var dayMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};

var weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

var newSessionHandlers = {
    LaunchRequest: function () {
        this.handler.state = states.SEARCHMODE;
        var speech = skillName + ' ' + welcomeMessage;
        emitMenuResponse(this, {
            speech: speech,
            reprompt: welcomeMessage,
            cardTitle: cardTitle,
            cardContent: 'Ask what is for lunch today, tomorrow, on a date, or for the whole week.',
            directive: apl.buildRenderDirective(
                apl.buildWelcomePayload(),
                'welcomeView'
            )
        });
    },
    searchIntent: function () {
        this.handler.state = states.SEARCHMODE;
        this.emitWithState('searchIntent');
    },
    weekMenuIntent: function () {
        this.handler.state = states.SEARCHMODE;
        this.emitWithState('weekMenuIntent');
    },
    Unhandled: function () {
        this.emit(':ask', HelpMessage, HelpMessage);
    }
};

function formatDisplayDateLabel(target) {
    if (!target || !target.key) {
        return 'Today';
    }

    var formattedDate = moment(target.key + 'T12:00:00').format('dddd, MMMM D');
    var label = (target.label || '').toLowerCase();

    if (label === 'today' || label === 'tonight') {
        return 'Today · ' + formattedDate;
    }

    if (label === 'tomorrow') {
        return 'Tomorrow · ' + formattedDate;
    }

    if (label === 'yesterday') {
        return 'Yesterday · ' + formattedDate;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(target.key)) {
        return formattedDate;
    }

    return formattedDate;
}

function getMenuDetails(event) {
    return event.description || event.summary || 'menu details unavailable';
}

function buildWeekDisplayDays(weekReference, events) {
    var dayKeys = getWeekDayKeys(weekReference);
    var days = [];

    for (var i = 0; i < dayKeys.length; i += 1) {
        var dayKey = dayKeys[i];
        var calendarEvent = getEventOnDate(dayKey, events);
        var menu = calendarEvent ? (calendarEvent.summary || calendarEvent.description || 'menu listed') : '';

        days.push({
            dayName: weekdayNames[moment(dayKey, 'YYYY-MM-DD').day()],
            dateLabel: moment(dayKey + 'T12:00:00').format('MMM D'),
            menu: menu,
            hasMenu: !!calendarEvent
        });
    }

    return days;
}

function formatWeekCardContent(weekReference, days) {
    return days.map(function (day) {
        return day.dayName + ': ' + (day.hasMenu ? day.menu : 'No lunch planned');
    }).join('\n');
}

function formatWeekLabel(weekReference) {
    var reference = (weekReference || 'next week').toLowerCase();
    return reference.charAt(0).toUpperCase() + reference.slice(1);
}

function emitMenuResponse(context, options) {
    apl.emitResponse(context, options);
}

function removeTags(str) {
    if (str) {
        return str.replace(/<(?:.|\n)*?>/gm, '');
    }
    return '';
}

function formatMenuText(text) {
    return removeTags(text).replace(/\\n/g, ', ').replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
}

function fetchCalendar(callback) {
    https.get(CALENDAR_URL, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchCalendarFromUrl(res.headers.location, callback);
            return;
        }

        if (res.statusCode !== 200) {
            callback(new Error('Calendar request failed with status ' + res.statusCode));
            return;
        }

        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            try {
                callback(null, ical.parseICS(body));
            } catch (error) {
                callback(error);
            }
        });
    }).on('error', callback);
}

function fetchCalendarFromUrl(url, callback) {
    https.get(url, function (res) {
        if (res.statusCode !== 200) {
            callback(new Error('Calendar redirect request failed with status ' + res.statusCode));
            return;
        }

        var body = '';
        res.on('data', function (chunk) {
            body += chunk;
        });
        res.on('end', function () {
            try {
                callback(null, ical.parseICS(body));
            } catch (error) {
                callback(error);
            }
        });
    }).on('error', callback);
}

function buildEventList(data) {
    var eventList = [];

    for (var k in data) {
        if (!data.hasOwnProperty(k) || data[k].type !== 'VEVENT') {
            continue;
        }

        var ev = data[k];
        eventList.push({
            summary: formatMenuText(ev.summary),
            description: formatMenuText(ev.description),
            start: ev.start,
            end: ev.end
        });
    }

    return eventList;
}

function getEventMessage(day, event) {
    var menuDetails = event.description || event.summary || 'menu details unavailable';
    var summaryLower = (event.summary || '').toLowerCase();
    var isPlural = summaryLower.includes('and') || summaryLower.includes('leftovers');
    var pluralPresent = isPlural ? 'are' : 'is';
    var pluralPast = isPlural ? 'were' : 'was';
    var plural = (day === 'yesterday') ? pluralPast : pluralPresent;

    return utils.format('Christ Schools Menu lunch for %s %s... %s', day, plural, menuDetails);
}

function getChicagoNow() {
    var todayKey = new Date().toLocaleDateString('en-CA', { timeZone: CALENDAR_TIMEZONE });
    return moment(todayKey, 'YYYY-MM-DD');
}

function getEventDayKey(date) {
    var year = date.getUTCFullYear();
    var month = String(date.getUTCMonth() + 1).padStart(2, '0');
    var day = String(date.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function getDaysUntilNextMonday(from) {
    var daysUntil = (8 - from.day()) % 7;
    return daysUntil === 0 ? 7 : daysUntil;
}

function getWeekdayKeyFromName(weekdayName, modifier) {
    var targetDow = dayMap[weekdayName.toLowerCase()];
    if (targetDow === undefined) {
        return null;
    }

    var now = getChicagoNow();
    var normalizedModifier = (modifier || '').toLowerCase();

    if (normalizedModifier === 'next') {
        var nextMonday = now.clone().add(getDaysUntilNextMonday(now), 'd');
        return nextMonday.clone().add(targetDow - 1, 'd').format('YYYY-MM-DD');
    }

    var daysAhead = targetDow - now.day();
    if (daysAhead < 0) {
        daysAhead += 7;
    }

    return now.clone().add(daysAhead, 'd').format('YYYY-MM-DD');
}

function getWeekDayKeys(weekReference) {
    var now = getChicagoNow();
    var reference = (weekReference || 'next week').toLowerCase();
    var monday;

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

    var keys = [];
    for (var i = 0; i < 5; i += 1) {
        keys.push(monday.clone().add(i, 'd').format('YYYY-MM-DD'));
    }

    return keys;
}

function getTargetDayKeyFromSlots(slots) {
    if (!slots) {
        return { key: getChicagoNow().format('YYYY-MM-DD'), label: 'today' };
    }

    if (slots.weekday && slots.weekday.value) {
        var weekday = slots.weekday.value.toLowerCase();
        var modifier = slots.modifier && slots.modifier.value ? slots.modifier.value : '';
        var weekdayKey = getWeekdayKeyFromName(weekday, modifier);

        if (!weekdayKey) {
            return null;
        }

        var weekdayLabel = weekdayNames[dayMap[weekday]];
        if (modifier) {
            weekdayLabel = modifier + ' ' + weekdayLabel;
        }

        return {
            key: weekdayKey,
            label: weekdayLabel
        };
    }

    if (slots.day && slots.day.value) {
        var value = slots.day.value;

        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return {
                key: value,
                label: moment(value + 'T12:00:00').format('MMMM Do')
            };
        }

        var relativeKey = getWeekdayKeyFromName(value, '');
        if (relativeKey) {
            return {
                key: relativeKey,
                label: value.toLowerCase()
            };
        }

        switch (value.toLowerCase()) {
            case 'today':
            case 'tonight':
                return { key: getChicagoNow().format('YYYY-MM-DD'), label: 'today' };
            case 'tomorrow':
                return {
                    key: getChicagoNow().clone().add(1, 'd').format('YYYY-MM-DD'),
                    label: 'tomorrow'
                };
            case 'yesterday':
                return {
                    key: getChicagoNow().clone().add(-1, 'd').format('YYYY-MM-DD'),
                    label: 'yesterday'
                };
            default:
                return null;
        }
    }

    return { key: getChicagoNow().format('YYYY-MM-DD'), label: 'today' };
}

function getEventOnDate(targetDayKey, events) {
    for (var i = 0; i < events.length; i += 1) {
        var startDay = getEventDayKey(events[i].start);
        var endDay = getEventDayKey(events[i].end);

        if (targetDayKey >= startDay && targetDayKey < endDay) {
            return events[i];
        }
    }

    return null;
}

function getNoDataMessage(dayLabel) {
    return utils.format('Sorry, Christ Schools Menu does not have lunch information for %s.', dayLabel);
}

function getWeekMenuMessage(weekReference, events) {
    var dayKeys = getWeekDayKeys(weekReference);
    var referenceLabel = (weekReference || 'next week').toLowerCase();
    var parts = [];
    var foundAny = false;

    for (var i = 0; i < dayKeys.length; i += 1) {
        var dayKey = dayKeys[i];
        var dayName = weekdayNames[moment(dayKey, 'YYYY-MM-DD').day()];
        var event = getEventOnDate(dayKey, events);
        var menu = event ? (event.summary || event.description || 'menu listed') : 'no lunch planned';

        if (event) {
            foundAny = true;
        }

        parts.push(dayName + ', ' + menu);
    }

    if (!foundAny) {
        return utils.format('Sorry, Christ Schools Menu does not have lunch information for %s.', referenceLabel);
    }

    return utils.format('Christ Schools Menu for %s: %s.', referenceLabel, parts.join('. '));
}

function getWeekReferenceFromSlot(slots) {
    var weekSlot = slots && slots.week;
    if (!weekSlot) {
        return null;
    }

    if (weekSlot.value) {
        return weekSlot.value.toLowerCase();
    }

    if (weekSlot.slotValue && weekSlot.slotValue.value) {
        return String(weekSlot.slotValue.value).toLowerCase();
    }

    if (weekSlot.resolutions && weekSlot.resolutions.resolutionsPerAuthority) {
        for (var i = 0; i < weekSlot.resolutions.resolutionsPerAuthority.length; i += 1) {
            var match = weekSlot.resolutions.resolutionsPerAuthority[i];
            if (match.status &&
                match.status.code === 'ER_SUCCESS_MATCH' &&
                match.values &&
                match.values.length > 0) {
                return match.values[0].value.name.toLowerCase();
            }
        }
    }

    return null;
}

function handleWeekMenuRequest(parent, weekReference) {
    handleCalendarLookup(parent, function (eventList) {
        output = getWeekMenuMessage(weekReference, eventList);
        var weekDays = buildWeekDisplayDays(weekReference, eventList);
        var weekLabel = formatWeekLabel(weekReference);
        emitMenuResponse(parent, {
            speech: output,
            reprompt: haveEventsReprompt,
            cardTitle: cardTitle,
            cardContent: weekLabel + '\n\n' + formatWeekCardContent(weekReference, weekDays),
            directive: apl.buildRenderDirective(
                apl.buildWeekPayload(weekLabel, weekDays),
                'weekView'
            )
        });
    });
}

function handleCalendarLookup(parent, buildResponse) {
    fetchCalendar(function (err, data) {
        if (err) {
            console.error('Calendar fetch failed:', err);
            output = CalendarErrorMessage;
            parent.emit(':ask', output, HelpMessage);
            return;
        }

        var eventList = buildEventList(data);
        if (eventList.length === 0) {
            output = 'Sorry, Christ Schools Menu could not find any lunch calendar entries.';
            parent.emit(':ask', output, output);
            return;
        }

        buildResponse(eventList);
    });
}

var startSearchHandlers = Alexa.CreateStateHandler(states.SEARCHMODE, {
    'AMAZON.YesIntent': function () {
        output = welcomeMessage;
        this.emit(':ask', output, welcomeMessage);
    },

    'AMAZON.NoIntent': function () {
        this.emit(':tell', shutdownMessage);
    },

    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', output, HelpMessage);
    },

    searchIntent: function () {
        var parent = this;
        var slots = this.event.request.intent.slots;
        var target = getTargetDayKeyFromSlots(slots);

        if (!target) {
            output = getNoDataMessage('that day');
            this.emit(':ask', output, output);
            return;
        }

        handleCalendarLookup(parent, function (eventList) {
            var relevant = getEventOnDate(target.key, eventList);
            if (!relevant) {
                output = getNoDataMessage(target.label);
                emitMenuResponse(parent, {
                    speech: output,
                    reprompt: output,
                    cardTitle: cardTitle,
                    cardContent: output,
                    directive: apl.buildRenderDirective(
                        apl.buildSingleDayPayload(formatDisplayDateLabel(target), '', 'message', output),
                        'noMenuView'
                    )
                });
                return;
            }

            parent.handler.state = states.DESCRIPTION;
            var menuDetails = getMenuDetails(relevant);
            output = getEventMessage(target.label, relevant);
            emitMenuResponse(parent, {
                speech: output,
                reprompt: haveEventsReprompt,
                cardTitle: cardTitle,
                cardContent: formatDisplayDateLabel(target) + '\n\n' + apl.formatCardMenu(menuDetails),
                directive: apl.buildRenderDirective(
                    apl.buildSingleDayPayload(formatDisplayDateLabel(target), menuDetails),
                    'singleDayView'
                )
            });
        });
    },

    weekMenuIntent: function () {
        var weekReference = getWeekReferenceFromSlot(this.event.request.intent.slots) || 'next week';
        handleWeekMenuRequest(this, weekReference);
    },

    'AMAZON.HelpIntent': function () {
        output = HelpMessage;
        this.emit(':ask', output, output);
    },

    'AMAZON.StopIntent': function () {
        this.emit(':tell', killSkillMessage);
    },

    'AMAZON.CancelIntent': function () {
        this.emit(':tell', killSkillMessage);
    },

    SessionEndedRequest: function () {
        this.emit('AMAZON.StopIntent');
    },

    Unhandled: function () {
        this.emit(':ask', HelpMessage, HelpMessage);
    }
});

exports.handler = function (event, context) {
    context.callbackWaitsForEmptyEventLoop = true;
    alexa = Alexa.handler(event, context);
    alexa.appId = APP_ID;
    alexa.registerHandlers(newSessionHandlers, startSearchHandlers);
    alexa.execute();
};
