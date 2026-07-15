const fs = require('fs');
const path = require('path');
const assert = require('chai').assert;
const packageJson = require('../../package.json');
const packageLock = require('../../package-lock.json');

const read = relativePath => fs.readFileSync(path.join(__dirname, '..', '..', relativePath), 'utf8');

describe('Release version metadata', () => {
    const version = packageJson.version;

    it('keeps package and lockfile versions aligned', () => {
        assert.equal(packageLock.version, version);
        assert.equal(packageLock.packages[''].version, version);
    });

    it('pins the browser CDN example to the package version and bundle path', () => {
        const readme = read('README.md');
        const pinnedUrl = `https://cdn.jsdelivr.net/npm/mg-api-js@${version}/dist/api.min.js`;

        assert.include(readme, pinnedUrl);
        assert.notMatch(readme, /src="https:\/\/cdn\.jsdelivr\.net\/npm\/mg-api-js"/);
    });

    it('keeps source and distribution banners aligned with the package version', () => {
        const expectedBanner = `mg-api-js - v${version}`;

        assert.include(read('lib/api.js'), expectedBanner);
        assert.include(read('dist/api.min.js.LICENSE.txt'), expectedBanner);
    });
});
