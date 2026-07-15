const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const mocks = require('../mocks/mocks.js');

const chromeCandidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')
].filter(Boolean);

const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate));

if (!executablePath) {
    throw new Error('Chrome was not found. Set PUPPETEER_EXECUTABLE_PATH to a Chrome executable.');
}

const opts = {
    executablePath,
    headless: true,
    timeout: 30000,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ]
};

const corsHeaders = {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': '*'
};

const respond = (request, payload, status = 200) => request.respond({
    status,
    contentType: 'application/json',
    headers: corsHeaders,
    body: JSON.stringify(payload)
});

let authenticationAttempts = 0;

const getPayload = body => {
    switch (body.method) {
        case 'Authenticate': {
            const payload = authenticationAttempts % 2 === 0 ? mocks.credentials : mocks.refreshedCredentials;
            authenticationAttempts++;
            return { result: payload };
        }
        case 'Get':
            switch (body.params.typeName) {
                case 'Device':
                    return { result: [mocks.device] };
                case 'User':
                    return { result: [mocks.user] };
                default:
                    return { result: [] };
            }
        case 'Geet':
            return {
                error: {
                    code: -32000,
                    name: 'JSONRPCError',
                    message: "The method 'Geet' could not be found. Verify the method name and ensure all method parameters are included.",
                    data: {
                        type: 'MissingMethodException',
                        id: 'ee15868e-6d47-41de-bafc-b20c1ca95152',
                        requestIndex: 0
                    }
                }
            };
        case 'ExecuteMultiCall':
            return { result: [2000, 2001] };
        default:
            return { result: null };
    }
};

module.exports = async function () {
    const browser = await puppeteer.launch(opts);

    try {
        const page = await browser.newPage();
        await page.setRequestInterception(true);

        page.on('request', async request => {
            try {
                const isApiRequest = request.url().includes(`https://${mocks.server}/apiv1`);
                const isInvalidCredentialRequest = request.url().includes('badinfo');

                if (!isApiRequest && !isInvalidCredentialRequest) {
                    await request.continue();
                    return;
                }

                if (request.method() === 'OPTIONS') {
                    await respond(request, null, 204);
                    return;
                }

                if (request.method() !== 'POST') {
                    await respond(request, { error: 'Method not allowed' }, 405);
                    return;
                }

                if (isInvalidCredentialRequest) {
                    await respond(request, {
                        error: {
                            code: -32000,
                            name: 'JSONRPCError',
                            message: 'Incorrect login credentials',
                            data: {
                                type: 'InvalidUserException',
                                id: '0b508b9e-7b94-4d38-b72f-8629119f73a3',
                                requestIndex: 0
                            }
                        }
                    });
                    return;
                }

                await respond(request, getPayload(JSON.parse(request.postData())));
            } catch (error) {
                if (!request.isInterceptResolutionHandled()) {
                    await request.abort('failed');
                }
                console.error('Failed to handle intercepted request', error);
            }
        });

        await page.goto('http://localhost:9000/test/web/', { waitUntil: 'domcontentloaded' });
        return [browser, page];
    } catch (error) {
        await browser.close();
        throw error;
    }
};
