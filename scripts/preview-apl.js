#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var apl = require('../lambda/apl');

var outDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

var days = [
    { dayName: 'Monday', dateLabel: 'Aug 10', menu: '', hasMenu: false },
    { dayName: 'Tuesday', dateLabel: 'Aug 11', menu: '', hasMenu: false },
    { dayName: 'Wednesday', dateLabel: 'Aug 12', menu: '', hasMenu: false },
    { dayName: 'Thursday', dateLabel: 'Aug 13', menu: 'Chicken Tenders OR Sunbutter Uncrustable', hasMenu: true },
    { dayName: 'Friday', dateLabel: 'Aug 14', menu: 'Cheeseburger OR Sunbutter Uncrustable', hasMenu: true }
];

var variants = [
    {
        name: 'week-medium',
        viewport: { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 },
        payload: apl.buildWeekPayload('Next week', days)
    },
    {
        name: 'week-large',
        viewport: { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1280, pixelHeight: 800 },
        payload: apl.buildWeekPayload('Next week', days)
    },
    {
        name: 'week-round',
        viewport: { mode: 'HUB', shape: 'ROUND', pixelWidth: 480, pixelHeight: 480 },
        payload: apl.buildWeekPayload('Next week', days)
    },
    {
        name: 'single-medium',
        viewport: { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 },
        payload: apl.buildSingleDayPayload('Thursday, August 13', 'Chicken Tenders OR Sunbutter Uncrustable')
    },
    {
        name: 'welcome-medium',
        viewport: { mode: 'HUB', shape: 'RECTANGLE', pixelWidth: 1024, pixelHeight: 600 },
        payload: apl.buildWelcomePayload()
    }
];

variants.forEach(function (variant) {
    var document = apl.buildDocument(variant.payload, variant.viewport);
    var filePath = path.join(outDir, 'apl-' + variant.name + '.json');
    fs.writeFileSync(filePath, JSON.stringify(document, null, 2));
    console.log('Wrote', filePath);
});

console.log('Paste these JSON files into the APL authoring tool in the Alexa developer console.');
