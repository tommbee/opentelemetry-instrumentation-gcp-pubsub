const fs = require('fs');
const path = require('path');

const root = process.cwd();
const packageJsonUrl = path.resolve(root, 'package.json');
const pjson = require(packageJsonUrl);

const fileUrl = path.join(root, 'src', 'version.ts')
fs.writeFileSync(fileUrl, `export const VERSION = '${pjson.version}';
`);
