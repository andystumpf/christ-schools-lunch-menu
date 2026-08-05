'use strict';

var apl = require('./apl');

if (!apl.APL_ENABLED) {
    throw new Error('APL should be enabled');
}

if (apl.APL_VERSION !== '1.0') {
    throw new Error('Expected APL 1.0 minimal document');
}

var days = [
    { dayName: 'Monday', dateLabel: 'Aug 10', menu: '', hasMenu: false },
    { dayName: 'Tuesday', dateLabel: 'Aug 11', menu: '', hasMenu: false },
    { dayName: 'Wednesday', dateLabel: 'Aug 12', menu: '', hasMenu: false },
    { dayName: 'Thursday', dateLabel: 'Aug 13', menu: 'Chicken Tenders OR Sunbutter', hasMenu: true },
    { dayName: 'Friday', dateLabel: 'Aug 14', menu: 'Cheeseburger OR Sunbutter', hasMenu: true }
];

var weekPayload = apl.buildWeekPayload('Next week', days);
var directive = apl.buildRenderDirective(weekPayload, 'weekView');
var doc = directive.document;
var json = JSON.stringify(doc);

if (json.indexOf('${') !== -1) {
    throw new Error('Document must inline text; no data binding');
}
if (json.indexOf('ScrollView') !== -1) {
    throw new Error('Document must not use ScrollView');
}
if (json.indexOf('#FFFFFF') === -1) {
    throw new Error('Expected white background for render diagnostics');
}
if (directive.datasources) {
    throw new Error('Document must not use datasources');
}
if (doc.mainTemplate.parameters) {
    throw new Error('Document must omit mainTemplate.parameters');
}

var context = {
    attributes: { STATE: '_SEARCHMODE' },
    handler: {},
    event: {
        context: {
            Viewport: { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1280, pixelHeight: 800 },
            System: {
                device: {
                    supportedInterfaces: {
                        'Alexa.Presentation.APL': { runtime: { maxVersion: '2024.3' } }
                    }
                }
            }
        }
    },
    emit: function (eventName) {
        if (eventName !== ':responseReady') {
            throw new Error('Unexpected emit: ' + eventName);
        }
        var emitted = context.handler.response.response.directives[0];
        if (!emitted || emitted.type !== 'Alexa.Presentation.APL.RenderDocument') {
            throw new Error('Expected RenderDocument');
        }
        console.log('APL response OK');
    }
};

apl.emitResponse(context, {
    speech: 'test',
    reprompt: 'test',
    cardTitle: 'Christ Schools Menu',
    cardContent: 'test',
    directive: directive
});

console.log('Week APL payload OK');
console.log('All APL tests passed');
