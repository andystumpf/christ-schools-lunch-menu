'use strict';

var apl = require('./apl');

if (!apl.APL_ENABLED) {
    throw new Error('APL should be enabled so Hub/Show devices receive RenderDocument');
}

var days = [
    { dayName: 'Monday', dateLabel: 'Aug 10', menu: '', hasMenu: false },
    { dayName: 'Tuesday', dateLabel: 'Aug 11', menu: '', hasMenu: false },
    { dayName: 'Wednesday', dateLabel: 'Aug 12', menu: '', hasMenu: false },
    { dayName: 'Thursday', dateLabel: 'Aug 13', menu: 'Chicken Tenders OR Sunbutter', hasMenu: true },
    { dayName: 'Friday', dateLabel: 'Aug 14', menu: 'Cheeseburger OR Sunbutter', hasMenu: true }
];

var weekPayload = apl.buildWeekPayload('Next week', days);
if (weekPayload.bodyText.indexOf('MONDAY') === -1 || weekPayload.bodyText.indexOf('THURSDAY') === -1) {
    throw new Error('Week body text missing formatted weekday headers');
}
if (weekPayload.bodyText.indexOf('•') !== -1 || weekPayload.bodyText.indexOf('\u00B7') !== -1) {
    throw new Error('Display text should use ASCII punctuation only');
}

var directive = apl.buildRenderDirective(weekPayload, 'weekView');
if (directive.type !== 'Alexa.Presentation.APL.RenderDocument') {
    throw new Error('Expected RenderDocument directive');
}
if (!directive.document || directive.document.version !== '2023.3') {
    throw new Error('Expected APL 2023.3 document');
}
if (!directive.document.import || directive.document.import[0].name !== 'alexa-layouts') {
    throw new Error('Expected alexa-layouts import for responsive Hub rendering');
}
if (!directive.datasources || !directive.datasources.menu) {
    throw new Error('Expected menu datasource');
}
if (directive.datasources.menu.bodyText.indexOf('THURSDAY') === -1) {
    throw new Error('Datasource should include week body text');
}

var mediumViewport = { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 };
var largeViewport = { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1280, pixelHeight: 800 };

if (!apl.supportsApl({
    context: {
        Viewport: largeViewport,
        System: { device: { supportedInterfaces: { 'Alexa.Presentation.APL': {} } } }
    }
})) {
    throw new Error('Expected APL support whenever the device advertises the APL interface');
}

var context = {
    attributes: { STATE: '_SEARCHMODE' },
    handler: {},
    event: {
        context: {
            Viewport: mediumViewport,
            System: {
                device: {
                    supportedInterfaces: {
                        'Alexa.Presentation.APL': {}
                    }
                }
            }
        }
    },
    emit: function (eventName) {
        if (eventName !== ':responseReady') {
            throw new Error('Unexpected emit: ' + eventName);
        }
        var response = context.handler.response;
        var emitted = response.response.directives[0];
        if (!emitted || emitted.type !== 'Alexa.Presentation.APL.RenderDocument') {
            throw new Error('Expected APL RenderDocument directive');
        }
        if (!emitted.datasources || !emitted.datasources.menu) {
            throw new Error('Expected datasources on emitted directive');
        }
        console.log('APL response OK');
    }
};

apl.emitResponse(context, {
    speech: 'Christ Schools Menu lunch for August 13th is Chicken Tenders.',
    reprompt: 'Would you like to know more?',
    cardTitle: 'Christ Schools Menu',
    cardContent: 'Wednesday, August 13\n\n- Chicken Tenders\n- Sunbutter Uncrustable',
    directive: apl.buildRenderDirective(
        apl.buildSingleDayPayload('Wednesday, August 13', 'Chicken Tenders OR Sunbutter Uncrustable'),
        'singleDayView'
    )
});

console.log('Week APL payload OK');
console.log('All APL tests passed');
