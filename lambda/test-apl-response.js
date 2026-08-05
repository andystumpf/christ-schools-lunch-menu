'use strict';

var apl = require('./apl');
var fs = require('fs');
var path = require('path');

function countInTree(node, predicate) {
    if (!node || typeof node !== 'object') {
        return 0;
    }
    var count = predicate(node) ? 1 : 0;
    if (node.mainTemplate) {
        count += countInTree(node.mainTemplate, predicate);
    }
    if (Array.isArray(node.items)) {
        node.items.forEach(function (child) {
            count += countInTree(child, predicate);
        });
    }
    if (node.item) {
        count += countInTree(node.item, predicate);
    }
    return count;
}

function findFirst(node, predicate) {
    if (!node || typeof node !== 'object') {
        return null;
    }
    if (predicate(node)) {
        return node;
    }
    if (node.mainTemplate) {
        var inTemplate = findFirst(node.mainTemplate, predicate);
        if (inTemplate) {
            return inTemplate;
        }
    }
    if (Array.isArray(node.items)) {
        for (var i = 0; i < node.items.length; i += 1) {
            var found = findFirst(node.items[i], predicate);
            if (found) {
                return found;
            }
        }
    }
    if (node.item) {
        return findFirst(node.item, predicate);
    }
    return null;
}

if (!apl.APL_ENABLED) {
    throw new Error('APL should be enabled for certification builds');
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

var mediumViewport = { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 };
var largeViewport = { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1280, pixelHeight: 800 };
var roundViewport = { mode: 'HUB', shape: 'ROUND', pixelWidth: 480, pixelHeight: 480 };

var weekDoc = apl.buildDocument(weekPayload, mediumViewport);
var weekJson = JSON.stringify(weekDoc);

if (weekDoc.version !== '1.8') {
    throw new Error('Expected APL 1.8 document');
}
if (weekJson.indexOf('${') !== -1) {
    throw new Error('APL document should inline text instead of using data binding');
}
if (!findFirst(weekDoc, function (n) { return n.type === 'ScrollView'; })) {
    throw new Error('Week view should include ScrollView');
}

var dayCards = countInTree(weekDoc, function (n) {
    return n.backgroundColor === apl.THEME.cardBg;
});
if (dayCards < 5) {
    throw new Error('Week view should include five day cards, found ' + dayCards);
}

var smallScale = apl.resolveScale({ mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 480 });
var largeScale = apl.resolveScale(largeViewport);
if (smallScale.titleSize >= largeScale.titleSize) {
    throw new Error('Small and large scales should use different title sizes');
}

var roundDoc = apl.buildDocument(weekPayload, roundViewport);
var roundText = findFirst(roundDoc, function (n) {
    return n.type === 'Text' && n.textAlign === 'center';
});
if (!roundText) {
    throw new Error('Round viewport should use centered text');
}
if (countInTree(roundDoc, function (n) { return n.backgroundColor === apl.THEME.cardBg; }) > 0) {
    throw new Error('Round viewport should not render card chrome');
}

var singleDoc = apl.buildDocument(
    apl.buildSingleDayPayload('Wednesday, August 13', 'Chicken Tenders OR Sunbutter Uncrustable'),
    mediumViewport
);
if (!findFirst(singleDoc, function (n) { return n.type === 'ScrollView'; })) {
    throw new Error('Single-day view should include ScrollView on rectangle viewports');
}

var welcomeDoc = apl.buildDocument(apl.buildWelcomePayload(), mediumViewport);
if (!findFirst(welcomeDoc, function (n) { return n.text && n.text.indexOf('What is for lunch today?') !== -1; })) {
    throw new Error('Welcome view should list example prompts');
}

if (!apl.viewportMatchesManifest(largeViewport)) {
    throw new Error('Echo Show 8 viewport should match target manifest');
}

if (apl.LIVE_MANIFEST_ALIGNED) {
    if (!apl.supportsApl({
        context: {
            Viewport: largeViewport,
            System: { device: { supportedInterfaces: { 'Alexa.Presentation.APL': {} } } }
        }
    })) {
        throw new Error('Expected APL support for Echo Show 8 after manifest alignment');
    }
} else if (apl.supportsApl({
    context: {
        Viewport: largeViewport,
        System: { device: { supportedInterfaces: { 'Alexa.Presentation.APL': {} } } }
    }
})) {
    throw new Error('1280px-wide Show should skip APL until LIVE_MANIFEST_ALIGNED is true');
}

if (!apl.supportsApl({
    context: {
        Viewport: mediumViewport,
        System: { device: { supportedInterfaces: { 'Alexa.Presentation.APL': {} } } }
    }
})) {
    throw new Error('Expected APL support for in-range Echo Show viewport');
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
        var directive = response.response.directives[0];
        if (!directive || directive.type !== 'Alexa.Presentation.APL.RenderDocument') {
            throw new Error('Expected APL RenderDocument directive');
        }
        if (directive._payload) {
            throw new Error('Directive should be finalized before response');
        }
        if (!directive.document || directive.document.type !== 'APL') {
            throw new Error('Expected finalized APL document on directive');
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
console.log('All APL tests passed');
