'use strict';

// Use Amazon's responsive AlexaHeadline layout. Custom Container/ScrollView
// documents have blanked physical Echo Hub/Show devices even when voice works.
var APL_VERSION = '2023.3';
var ALEXA_LAYOUTS_VERSION = '1.7.0';
var SKILL_TITLE = 'Christ Schools Menu';

// Must match skill-package/skill.json supportedViewports.
var MANIFEST_VIEWPORTS = [
    { mode: 'HUB', shape: 'ROUND', minWidth: 100, maxWidth: 599, minHeight: 100, maxHeight: 599 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 100, maxHeight: 599 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 600, maxHeight: 959 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 1280, maxWidth: 1920, minHeight: 600, maxHeight: 1279 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 1920, maxWidth: 2560, minHeight: 960, maxHeight: 1279 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 1920, maxHeight: 2560 },
    { mode: 'TV', shape: 'RECTANGLE', minWidth: 960, maxWidth: 960, minHeight: 540, maxHeight: 540 },
    { mode: 'MOBILE', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 320, maxHeight: 1920 }
];

var LIVE_MANIFEST_ALIGNED = true;

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
            return '- ' + option;
        }).join('\n');
    }

    return text || '';
}

function sanitizeDisplayText(text) {
    return String(text || '')
        .replace(/\u00B7/g, '-')
        .replace(/[•●]/g, '-')
        .replace(/\r\n/g, '\n');
}

function buildDisplayPayload(subtitle, bodyText, footer) {
    return {
        title: SKILL_TITLE,
        subtitle: sanitizeDisplayText(subtitle || 'Lunch menu'),
        bodyText: sanitizeDisplayText(bodyText || 'Ask what is for lunch today or next week.'),
        footer: sanitizeDisplayText(footer || 'Say stop to exit.')
    };
}

function buildSingleDayPayload(dateLabel, menuText, kind, message) {
    var bodyText = kind === 'message' ? (message || ' ') : formatCardMenu(menuText);

    return buildDisplayPayload(
        dateLabel,
        bodyText,
        'Say help for examples or stop when you are done.'
    );
}

function formatWeekDayBlock(day) {
    var header = day.dayName.toUpperCase() + ' - ' + day.dateLabel;
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
        'Ask about another day or say stop to exit.'
    );
}

function buildWelcomePayload() {
    return buildDisplayPayload(
        'Elementary lunch menu',
        'Try asking:\n\n- What is for lunch today?\n- What is for lunch next week?\n- What is for lunch on Friday?',
        'What would you like?'
    );
}

function buildDisplayDocument() {
    return {
        type: 'APL',
        version: APL_VERSION,
        import: [
            {
                name: 'alexa-layouts',
                version: ALEXA_LAYOUTS_VERSION
            }
        ],
        mainTemplate: {
            parameters: ['payload'],
            items: [
                {
                    type: 'AlexaHeadline',
                    headerTitle: '${payload.menu.title}',
                    primaryText: '${payload.menu.subtitle}',
                    secondaryText: '${payload.menu.bodyText}',
                    footerHintText: '${payload.menu.footer}',
                    backgroundColor: 'darkblue'
                }
            ]
        }
    };
}

function buildRenderDirective(payload, token) {
    return {
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: token || 'christSchoolsMenu',
        document: buildDisplayDocument(),
        datasources: {
            menu: {
                title: payload.title,
                subtitle: payload.subtitle,
                bodyText: payload.bodyText,
                footer: payload.footer
            }
        }
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

var APL_ENABLED = true;

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

function viewportMatchesManifest(viewport) {
    return viewportMatchesRanges(viewport, MANIFEST_VIEWPORTS);
}

function viewportMatchesLiveManifest(viewport) {
    return viewportMatchesManifest(viewport);
}

function supportsApl(event) {
    if (!event || !event.context) {
        return false;
    }

    var interfaces = event.context.System &&
        event.context.System.device &&
        event.context.System.device.supportedInterfaces;

    // With APL enabled in the skill manifest, skipping RenderDocument leaves
    // Echo Hub/Show on a black screen. Always send APL when the device supports it.
    if (interfaces && interfaces['Alexa.Presentation.APL']) {
        if (event.context.Viewport) {
            console.log('APL viewport', JSON.stringify({
                mode: event.context.Viewport.mode,
                shape: event.context.Viewport.shape,
                pixelWidth: event.context.Viewport.pixelWidth,
                pixelHeight: event.context.Viewport.pixelHeight,
                dpi: event.context.Viewport.dpi
            }));
        }
        return true;
    }

    // Developer console simulator may send Viewport without the interface flag.
    return !!event.context.Viewport;
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
