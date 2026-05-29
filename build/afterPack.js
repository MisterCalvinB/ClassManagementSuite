/**
 * electron-builder afterPack hook.
 * Overwrites user/class-groups.js in the packed output with an empty template
 * so distributed builds never contain personal student data.
 * The source file in the workspace is never modified.
 */
'use strict';

const path = require('path');
const fs   = require('fs').promises;

const EMPTY_CONTENT =
`const CLASS_GROUPS_DATA = {
  "classGroups": {},
  "classGroupsMeta": {}
};
var CLASS_GROUPS = CLASS_GROUPS_DATA.classGroups || {};
var CLASS_GROUPS_META = CLASS_GROUPS_DATA.classGroupsMeta || {};
`;

exports.default = async function afterPack(context) {
    // user/class-groups.js is listed in asarUnpack, so Electron serves it from
    // app.asar.unpacked/ transparently – overwrite that copy with empty content.
    const unpackedPath = path.join(
        context.appOutDir,
        'resources',
        'app.asar.unpacked',
        'user',
        'class-groups.js'
    );

    try {
        await fs.writeFile(unpackedPath, EMPTY_CONTENT, 'utf8');
        console.log('afterPack: user/class-groups.js blanked in build output.');
    } catch (err) {
        // Warn but don't fail the build – the file may not exist if asarUnpack
        // wasn't honoured (e.g. a future config change).
        console.warn('afterPack: could not blank user/class-groups.js:', err.message);
    }
};
