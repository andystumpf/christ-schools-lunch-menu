'use strict';

// Flat text layout only — ScrollView/nested flex layouts fail silently on Echo Hub/Show.
var APL_VERSION = '1.8';

var PAGE_BG = '#1B3A5C';
var ACCENT = '#F0C674';
var TEXT_MUTED = '#B0BEC5';
var SKILL_TITLE = 'Christ Schools Menu';

// Must match skill-package/skill.json supportedViewports.
var MANIFEST_VIEWPORTS = [
    { mode: 'HUB', shape: 'ROUND', minWidth: 100, maxWidth: 599, minHeight: 100, maxHeight: 599 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 100, maxHeight: 599 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 600, maxHeight: 959 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 1280, maxWidth: 1920, minHeight: 600, maxHeight: 1279 },
    { mode: 'TV', shape: 'RECTANGLE', minWidth: 960, maxWidth: 960, minHeight: 540, maxHeight: 540 },
    { mode: 'MOBILE', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 320, maxHeight: 1920 }
];

var LIVE_MANIFEST_ALIGNED = true;

var LIVE_MANIFEST_VIEWPORTS = [
    { mode: 'TV', shape: 'RECTANGLE', minWidth: 960, maxWidth: 960, minHeight: 540, maxHeight: 540 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 600, maxHeight: 1279 },
    { mode: 'HUB', shape: 'ROUND', minWidth: 600, maxWidth: 959, minHeight: 600, maxHeight: 959 },
    { mode: 'MOBILE', shape: 'RECTANGLE', minWidth: 100, maxWidth: 959, minHeight: 100, maxHeight: 599 }
];

function parseMenuOptions(text) {
    if (!text) {
        return [];
    }

    return text
        .split(/\s+OR\s+/i)
        .map(function (part) {
            return part.replace(/^,\s*/, '').replace(/,\s*$/, '').trim();
        })
        .filter(Boolean);
}

function formatCardMenu(text) {
    var options = parseMenuOptions(text);
    if (options.length > 1) {
        return options.map(function (option) {
            return '• ' + option;
        }).join('\n');
    }

    return text || '';
}

function buildDisplayPayload(subtitle, bodyText, footer) {
    return {
        title: SKILL_TITLE,
        subtitle: subtitle || 'Lunch menu',
        bodyText: bodyText || 'Ask what is for lunch today or next week.',
        footer: footer || 'Say stop to exit.'
    };
}

function buildSingleDayPayload(dateLabel, menuText, kind, message) {
    var bodyText = kind === 'message' ? (message || ' ') : formatCardMenu(menuText);

    return buildDisplayPayload(
        dateLabel,
        bodyText,
        'Say "help" for examples or "stop" when you are done.'
    );
}

function formatWeekDayBlock(day) {
    var header = day.dayName.toUpperCase() + ' · ' + day.dateLabel;
    if (!day.hasMenu) {
        return header + '\nNo lunch planned';
    }

    return header + '\n' + formatCardMenu(day.menu);
}

function buildWeekBodyText(days) {
    return days.map(formatWeekDayBlock).join('\n\n');
}

function buildWeekPayload(weekLabel, days) {
    return buildDisplayPayload(
        weekLabel,
        buildWeekBodyText(days),
        'Ask about another day or say "stop" to exit.'
    );
}

function buildWelcomePayload() {
    return buildDisplayPayload(
        'Elementary lunch menu',
        'Try asking:\n\n• What is for lunch today?\n• What is for lunch next week?\n• What is for lunch on Friday?',
        'What would you like?'
    );
}

function buildDisplayDocument(payload) {
    return {
        type: 'APL',
        version: APL_VERSION,
        mainTemplate: {
            parameters: [],
            items: [{
                type: 'Container',
                width: '100vw',
                height: '100vh',
                backgroundColor: PAGE_BG,
                paddingLeft: 40,
                paddingRight: 40,
                paddingTop: 32,
                paddingBottom: 32,
                items: [
                    {
                        type: 'Text',
                        text: payload.title,
                        width: '100%',
                        fontSize: 36,
                        fontWeight: 'bold',
                        color: 'white'
                    },
                    {
                        type: 'Text',
                        text: payload.subtitle,
                        width: '100%',
                        fontSize: 28,
                        color: ACCENT,
                        paddingTop: 12
                    },
                    {
                        type: 'Text',
                        text: payload.bodyText,
                        width: '100%',
                        fontSize: 30,
                        color: 'white',
                        paddingTop: 24
                    },
                    {
                        type: 'Text',
                        text: payload.footer,
                        width: '100%',
                        fontSize: 20,
                        color: TEXT_MUTED,
                        paddingTop: 24
                    }
                ]
            }]
        }
    };
}

function buildRenderDirective(payload, token) {
    return {
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: token || 'christSchoolsMenu',
        document: buildDisplayDocument(payload)
    };
}

function buildSkillResponse(speech, reprompt, cardTitle, cardContent, directive, shouldEndSession, sessionAttributes) {
    var response = {
        outputSpeech: {
            type: 'SSML',
            ssml: '<speak> ' + speech + ' </speak>'
        },
        shouldEndSession: !!shouldEndSession
    };

    if (reprompt) {
        response.reprompt = {
            outputSpeech: {
                type: 'SSML',
                ssml: '<speak> ' + reprompt + ' </speak>'
            }
        };
    }

    if (cardTitle && cardContent) {
        response.card = {
            type: 'Simple',
            title: cardTitle,
            content: cardContent
        };
    }

    if (directive) {
        response.directives = Array.isArray(directive) ? directive : [directive];
    }

    return {
        version: '1.0',
        sessionAttributes: sessionAttributes || {},
        response: response
    };
}

// APL RenderDocument still blanks physical Echo Hub/Show screens even with a
// flat document and a live APL manifest. Keep disabled so devices show the
// Simple card (formatted menu text) instead of a black screen.
var APL_ENABLED = false;

function viewportMatchesRanges(viewport, ranges) {
    if (!viewport || typeof viewport.pixelWidth !== 'number' || typeof viewport.pixelHeight !== 'number') {
        return true;
    }

    var mode = viewport.mode;
    var shape = viewport.shape;
    var width = viewport.pixelWidth;
    var height = viewport.pixelHeight;

    return ranges.some(function (range) {
        return range.mode === mode &&
            range.shape === shape &&
            width >= range.minWidth &&
            width <= range.maxWidth &&
            height >= range.minHeight &&
            height <= range.maxHeight;
    });
}

function activeManifestViewports() {
    return LIVE_MANIFEST_ALIGNED ? MANIFEST_VIEWPORTS : LIVE_MANIFEST_VIEWPORTS;
}

function viewportMatchesManifest(viewport) {
    return viewportMatchesRanges(viewport, MANIFEST_VIEWPORTS);
}

function viewportMatchesLiveManifest(viewport) {
    return viewportMatchesRanges(viewport, activeManifestViewports());
}

function supportsApl(event) {
    if (!event || !event.context) {
        return false;
    }

    var interfaces = event.context.System &&
        event.context.System.device &&
        event.context.System.device.supportedInterfaces;

    var hasAplInterface = !!(interfaces && interfaces['Alexa.Presentation.APL']);
    var hasDevTestViewport = !!event.context.Viewport;

    if (!hasAplInterface && !hasDevTestViewport) {
        return false;
    }

    if (hasAplInterface &&
        event.context.Viewport &&
        typeof event.context.Viewport.pixelWidth === 'number' &&
        !viewportMatchesLiveManifest(event.context.Viewport)) {
        return false;
    }

    return true;
}

function emitResponse(context, options) {
    var directive = APL_ENABLED && supportsApl(context.event) ? options.directive : null;

    context.handler.response = buildSkillResponse(
        options.speech,
        options.reprompt,
        options.cardTitle,
        options.cardContent,
        directive,
        options.shouldEndSession === true,
        context.attributes
    );
    context.emit(':responseReady');
}

module.exports = {
    APL_ENABLED: APL_ENABLED,
    APL_VERSION: APL_VERSION,
    LIVE_MANIFEST_ALIGNED: LIVE_MANIFEST_ALIGNED,
    MANIFEST_VIEWPORTS: MANIFEST_VIEWPORTS,
    LIVE_MANIFEST_VIEWPORTS: LIVE_MANIFEST_VIEWPORTS,
    supportsApl: supportsApl,
    viewportMatchesManifest: viewportMatchesManifest,
    viewportMatchesLiveManifest: viewportMatchesLiveManifest,
    parseMenuOptions: parseMenuOptions,
    formatCardMenu: formatCardMenu,
    buildDisplayDocument: buildDisplayDocument,
    buildRenderDirective: buildRenderDirective,
    buildSingleDayPayload: buildSingleDayPayload,
    buildWeekPayload: buildWeekPayload,
    buildWelcomePayload: buildWelcomePayload,
    buildDisplayPayload: buildDisplayPayload,
    emitResponse: emitResponse
};
