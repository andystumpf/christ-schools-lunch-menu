'use strict';

var apl = require('./apl');

if (!apl.APL_ENABLED) {
    throw new Error('APL should be enabled for certification builds');
}

var days = [
    { dayName: 'Monday', dateLabel: 'Aug 10', menu: '', hasMenu: false },
    { dayName: 'Thursday', dateLabel: 'Aug 13', menu: 'Chicken Tenders OR Sunbutter', hasMenu: true }
];

var weekPayload = apl.buildWeekPayload('Next week', days);
if (weekPayload.bodyText.indexOf('MONDAY') === -1 || weekPayload.bodyText.indexOf('THURSDAY') === -1) {
    throw new Error('Week body text missing formatted weekday headers');
}

var document = apl.buildDisplayDocument(
    apl.buildSingleDayPayload('Wednesday, August 13', 'Chicken Tenders OR Sunbutter Uncrustable')
);
if (document.version !== '1.8') {
    throw new Error('Expected APL 1.8 document');
}
if (JSON.stringify(document).indexOf('${payload') !== -1) {
    throw new Error('APL document should inline text instead of using data binding');
}

if (!apl.viewportMatchesManifest({
    mode: 'HUB',
    shape: 'RECTANGLE',
    pixelWidth: 1280,
    pixelHeight: 800
})) {
    throw new Error('Echo Show 8 viewport should match target manifest');
}

if (apl.supportsApl({
    context: {
        Viewport: {
            mode: 'HUB',
            shape: 'RECTANGLE',
            pixelWidth: 1280,
            pixelHeight: 800
        },
        System: {
            device: {
                supportedInterfaces: {
                    'Alexa.Presentation.APL': {}
                }
            }
        }
    }
})) {
    throw new Error('1280px-wide Show should skip APL until live manifest includes Hub Landscape Large');
}

if (!apl.supportsApl({
    context: {
        Viewport: {
            mode: 'HUB',
            shape: 'RECTANGLE',
            pixelWidth: 1024,
            pixelHeight: 600
        },
        System: {
            device: {
                supportedInterfaces: {
                    'Alexa.Presentation.APL': {}
                }
            }
        }
    }
})) {
    throw new Error('Expected APL support for in-range Echo Show viewport');
}

var context = {
    attributes: { STATE: '_SEARCHMODE' },
    handler: {},
    event: {
        context: {
            Viewport: { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 },
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
        var directive = response.response.directives[0];
        if (!directive || directive.type !== 'Alexa.Presentation.APL.RenderDocument') {
            throw new Error('Expected APL RenderDocument directive');
        }
        if (directive.datasources) {
            throw new Error('Directive should not use datasources');
        }
        console.log('APL response OK');
    }
};

apl.emitResponse(context, {
    speech: 'Christ Schools Menu lunch for August 13th is Chicken Tenders.',
    reprompt: 'Would you like to know more?',
    cardTitle: 'Christ Schools Menu',
    cardContent: 'Wednesday, August 13\n\n• Chicken Tenders\n• Sunbutter Uncrustable',
    directive: apl.buildRenderDirective(
        apl.buildSingleDayPayload('Wednesday, August 13', 'Chicken Tenders OR Sunbutter Uncrustable'),
        'singleDayView'
    )
});

console.log('Week APL payload OK');
