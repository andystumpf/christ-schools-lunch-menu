'use strict';

var apl = require('./apl');

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

var singlePayload = apl.buildSingleDayPayload(
    'Wednesday, August 13',
    'Chicken Tenders OR Sunbutter Uncrustable'
);
if (singlePayload.bodyText.indexOf('• Chicken Tenders') === -1) {
    throw new Error('Single-day payload should format OR options as bullets');
}

if (apl.APL_ENABLED) {
    throw new Error('APL must stay disabled until RenderDocument works on physical Hub/Show devices');
}

var mediumViewport = { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 };
var largeViewport = { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1280, pixelHeight: 800 };

if (!apl.viewportMatchesManifest(largeViewport)) {
    throw new Error('Echo Show 8 viewport should match target manifest');
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
        if (response.response.directives && response.response.directives.length) {
            throw new Error('APL disabled builds must not send RenderDocument directives');
        }
        if (!response.response.card || response.response.card.type !== 'Simple') {
            throw new Error('Expected Simple card fallback for screen devices');
        }
        if (response.response.card.content.indexOf('Chicken Tenders') === -1) {
            throw new Error('Card should include menu text');
        }
        console.log('Card fallback OK');
    }
};

apl.emitResponse(context, {
    speech: 'Christ Schools Menu lunch for August 13th is Chicken Tenders.',
    reprompt: 'Would you like to know more?',
    cardTitle: 'Christ Schools Menu',
    cardContent: 'Wednesday, August 13\n\n• Chicken Tenders\n• Sunbutter Uncrustable',
    directive: apl.buildRenderDirective(singlePayload, 'singleDayView')
});

console.log('Week APL payload OK');
console.log('All APL tests passed');
