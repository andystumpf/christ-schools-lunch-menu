'use strict';

// APL 1.8 renders reliably on Echo Show devices in the field.
var APL_VERSION = '1.8';

var THEME = {
    pageBg: '#0F2440',
    cardBg: '#1B3A5C',
    accent: '#F0C674',
    textPrimary: 'white',
    textMuted: '#9FB3C8'
};

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

// Live manifest until six-viewport cert publishes; set true after publish (flip-viewports todo).
var LIVE_MANIFEST_ALIGNED = true;

var LIVE_MANIFEST_VIEWPORTS = [
    { mode: 'TV', shape: 'RECTANGLE', minWidth: 960, maxWidth: 960, minHeight: 540, maxHeight: 540 },
    { mode: 'HUB', shape: 'RECTANGLE', minWidth: 960, maxWidth: 1279, minHeight: 600, maxHeight: 1279 },
    { mode: 'HUB', shape: 'ROUND', minWidth: 600, maxWidth: 959, minHeight: 600, maxHeight: 959 },
    { mode: 'MOBILE', shape: 'RECTANGLE', minWidth: 100, maxWidth: 959, minHeight: 100, maxHeight: 599 }
];

var SCALES = {
    round: {
        pagePadding: 20,
        titleSize: 28,
        subtitleSize: 22,
        daySize: 20,
        menuSize: 18,
        footerSize: 16,
        cardGap: 10,
        cardPadding: 0,
        useCards: false,
        centerText: true
    },
    small: {
        pagePadding: 24,
        titleSize: 30,
        subtitleSize: 22,
        daySize: 20,
        menuSize: 18,
        footerSize: 16,
        cardGap: 10,
        cardPadding: 12,
        useCards: true,
        centerText: false
    },
    medium: {
        pagePadding: 32,
        titleSize: 34,
        subtitleSize: 26,
        daySize: 22,
        menuSize: 20,
        footerSize: 18,
        cardGap: 12,
        cardPadding: 14,
        useCards: true,
        centerText: false
    },
    large: {
        pagePadding: 40,
        titleSize: 40,
        subtitleSize: 30,
        daySize: 24,
        menuSize: 22,
        footerSize: 20,
        cardGap: 14,
        cardPadding: 16,
        useCards: true,
        centerText: false
    }
};

function resolveScale(viewport) {
    if (viewport && viewport.shape === 'ROUND') {
        return SCALES.round;
    }
    if (!viewport || typeof viewport.pixelWidth !== 'number') {
        return SCALES.medium;
    }
    if (viewport.pixelHeight < 600) {
        return SCALES.small;
    }
    return viewport.pixelWidth >= 1280 ? SCALES.large : SCALES.medium;
}

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

function textBlock(text, fontSize, color, extra) {
    var block = {
        type: 'Text',
        text: text,
        width: '100%',
        fontSize: fontSize,
        color: color
    };
    if (extra) {
        for (var key in extra) {
            if (Object.prototype.hasOwnProperty.call(extra, key)) {
                block[key] = extra[key];
            }
        }
    }
    return block;
}

function bulletRows(items, fontSize, color, scale) {
    return items.map(function (item) {
        return textBlock('• ' + item, fontSize, color, {
            paddingTop: 6,
            textAlign: scale.centerText ? 'center' : 'left'
        });
    });
}

function buildFooter(footer, scale) {
    return textBlock(footer, scale.footerSize, THEME.textMuted, {
        paddingTop: 16,
        textAlign: scale.centerText ? 'center' : 'left'
    });
}

function buildHeaderRow(title, subtitle, scale) {
    return [
        textBlock(title, scale.titleSize, THEME.textPrimary, {
            fontWeight: 'bold',
            textAlign: scale.centerText ? 'center' : 'left'
        }),
        textBlock(subtitle, scale.subtitleSize, THEME.accent, {
            paddingTop: 8,
            textAlign: scale.centerText ? 'center' : 'left'
        })
    ];
}

function buildPageShell(contentItems, scale) {
    return {
        type: 'APL',
        version: APL_VERSION,
        mainTemplate: {
            parameters: [],
            items: [{
                type: 'ScrollView',
                width: '100vw',
                height: '100vh',
                scrollDirection: 'vertical',
                item: {
                    type: 'Container',
                    width: '100%',
                    backgroundColor: THEME.pageBg,
                    paddingLeft: scale.pagePadding,
                    paddingRight: scale.pagePadding,
                    paddingTop: scale.pagePadding,
                    paddingBottom: scale.pagePadding,
                    items: contentItems
                }
            }]
        }
    };
}

function buildDayCard(day, scale) {
    var dayHeader = day.dayName.toUpperCase() + ' · ' + day.dateLabel;
    var bodyItems;

    if (!day.hasMenu) {
        bodyItems = [
            textBlock('No lunch planned', scale.menuSize, THEME.textMuted, { paddingTop: 6 })
        ];
    } else {
        var options = parseMenuOptions(day.menu);
        if (options.length === 0 && day.menu) {
            options.push(day.menu);
        }
        bodyItems = bulletRows(options, scale.menuSize, THEME.textPrimary, scale);
    }

    if (!scale.useCards) {
        var roundLines = [textBlock(dayHeader, scale.daySize, THEME.accent, { textAlign: 'center', paddingTop: 8 })];
        if (!day.hasMenu) {
            roundLines.push(textBlock('No lunch planned', scale.menuSize, THEME.textMuted, { textAlign: 'center' }));
        } else {
            var firstOption = parseMenuOptions(day.menu)[0] || day.menu;
            roundLines.push(textBlock(firstOption, scale.menuSize, THEME.textPrimary, { textAlign: 'center', paddingTop: 4 }));
        }
        return {
            type: 'Container',
            width: '100%',
            items: roundLines
        };
    }

    return {
        type: 'Container',
        width: '100%',
        paddingBottom: scale.cardGap,
        items: [{
            type: 'Container',
            width: '100%',
            backgroundColor: THEME.cardBg,
            borderRadius: 12,
            paddingTop: scale.cardPadding,
            paddingBottom: scale.cardPadding,
            paddingLeft: scale.cardPadding,
            paddingRight: scale.cardPadding,
            items: [
                textBlock(dayHeader, scale.daySize, THEME.accent, { fontWeight: 'bold' })
            ].concat(bodyItems)
        }]
    };
}

function buildWeekDocument(payload, scale) {
    var dayCards = (payload.days || []).map(function (day) {
        return buildDayCard(day, scale);
    });

    return buildPageShell(
        buildHeaderRow(payload.title || SKILL_TITLE, payload.weekLabel, scale)
            .concat(dayCards)
            .concat([buildFooter(payload.footer, scale)]),
        scale
    );
}

function buildSingleDayDocument(payload, scale) {
    var menuItems;

    if (payload.view === 'message') {
        menuItems = [
            textBlock(payload.message, scale.menuSize, THEME.textPrimary, {
                paddingTop: 16,
                textAlign: scale.centerText ? 'center' : 'left'
            })
        ];
    } else {
        var options = payload.options || [];
        if (options.length === 0 && payload.menuText) {
            options = [payload.menuText];
        }
        menuItems = bulletRows(options, scale.menuSize, THEME.textPrimary, scale);
        if (menuItems.length > 0) {
            menuItems[0].paddingTop = 16;
        }
    }

    var layoutItems = buildHeaderRow(payload.title || SKILL_TITLE, payload.dateLabel, scale);

    if (scale.useCards) {
        layoutItems.push({
            type: 'Container',
            width: '100%',
            backgroundColor: THEME.cardBg,
            borderRadius: 12,
            paddingTop: scale.cardPadding,
            paddingBottom: scale.cardPadding,
            paddingLeft: scale.cardPadding,
            paddingRight: scale.cardPadding,
            items: menuItems
        });
    } else {
        layoutItems = layoutItems.concat(menuItems);
    }

    layoutItems.push(buildFooter(payload.footer, scale));

    return buildPageShell(layoutItems, scale);
}

function buildWelcomeDocument(payload, scale) {
    var examples = payload.examples || [];
    var exampleItems = examples.map(function (line) {
        return textBlock('• ' + line, scale.menuSize, THEME.textPrimary, {
            paddingTop: 10,
            textAlign: scale.centerText ? 'center' : 'left'
        });
    });

    var body = {
        type: 'Container',
        width: '100%',
        paddingTop: 16,
        items: exampleItems
    };

    return buildPageShell(
        buildHeaderRow(payload.title || SKILL_TITLE, payload.subtitle, scale)
            .concat([body, buildFooter(payload.footer, scale)]),
        scale
    );
}

function buildDocument(payload, viewport) {
    var scale = resolveScale(viewport);

    if (payload.view === 'week') {
        return buildWeekDocument(payload, scale);
    }
    if (payload.view === 'welcome') {
        return buildWelcomeDocument(payload, scale);
    }
    return buildSingleDayDocument(payload, scale);
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
    if (kind === 'message') {
        return {
            view: 'message',
            title: SKILL_TITLE,
            dateLabel: dateLabel,
            message: message || ' ',
            footer: 'Say "help" for examples or "stop" when you are done.'
        };
    }

    return {
        view: 'singleDay',
        title: SKILL_TITLE,
        dateLabel: dateLabel,
        menuText: menuText,
        options: parseMenuOptions(menuText),
        footer: 'Say "help" for examples or "stop" when you are done.'
    };
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
    return {
        view: 'week',
        title: SKILL_TITLE,
        weekLabel: weekLabel,
        days: days,
        bodyText: buildWeekBodyText(days),
        footer: 'Ask about another day or say "stop" to exit.'
    };
}

function buildWelcomePayload() {
    return {
        view: 'welcome',
        title: SKILL_TITLE,
        subtitle: 'Elementary lunch menu',
        examples: [
            'What is for lunch today?',
            'What is for lunch next week?',
            'What is for lunch on Friday?'
        ],
        footer: 'What would you like?'
    };
}

function buildDisplayDocument(payload, viewport) {
    return buildDocument(payload, viewport);
}

function buildRenderDirective(payload, token) {
    return {
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: token || 'christSchoolsMenu',
        _payload: payload
    };
}

function finalizeDirective(directive, event) {
    if (!directive || !directive._payload) {
        return directive;
    }

    var viewport = event && event.context && event.context.Viewport;
    return {
        type: directive.type,
        token: directive.token,
        document: buildDocument(directive._payload, viewport)
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
    var directive = null;
    if (APL_ENABLED && supportsApl(context.event) && options.directive) {
        directive = finalizeDirective(options.directive, context.event);
    }

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
    THEME: THEME,
    SCALES: SCALES,
    LIVE_MANIFEST_ALIGNED: LIVE_MANIFEST_ALIGNED,
    MANIFEST_VIEWPORTS: MANIFEST_VIEWPORTS,
    LIVE_MANIFEST_VIEWPORTS: LIVE_MANIFEST_VIEWPORTS,
    resolveScale: resolveScale,
    supportsApl: supportsApl,
    viewportMatchesManifest: viewportMatchesManifest,
    viewportMatchesLiveManifest: viewportMatchesLiveManifest,
    parseMenuOptions: parseMenuOptions,
    formatCardMenu: formatCardMenu,
    buildDocument: buildDocument,
    buildDisplayDocument: buildDisplayDocument,
    buildRenderDirective: buildRenderDirective,
    finalizeDirective: finalizeDirective,
    buildSingleDayPayload: buildSingleDayPayload,
    buildWeekPayload: buildWeekPayload,
    buildWelcomePayload: buildWelcomePayload,
    buildDisplayPayload: buildDisplayPayload,
    emitResponse: emitResponse
};
