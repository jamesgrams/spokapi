/**
 * @file    Site for Spokapi
 * @author  James Grams
 */

const puppeteer = require('puppeteer');

/**
 * @constant
 * @type {string}
 * @default
 */
const USERNAME = process.env.SPOKAPI_USERNAME;
/**
 * @constant
 * @type {string}
 * @default
 */
const PASSWORD = process.env.SPOKAPI_PASSWORD;
/**
 * @constant
 * @type {string}
 */
const PROVIDER = process.env.SPOKAPI_PROVIDER;
/**
 * @constant
 * @type {Array.<string>}
 * @default
 */
const UNSUPPORTED_CHANNELS = ["espn+","espndeportes","longhorn","accextra","sec","secplus","NBC Sports Gold"];
/**
 * @constant
 * @type {string}
 * @default
 */
const STOP_URL = "https://google.com";
/**
 * @constant
 * @type {number}
 * @default
 */
const STANDARD_TIMEOUT = 20000;
/**
 * @constant
 * @type {number}
 * @default
 */
const STANDARD_WAIT_OK_TIMEOUT = 3500;
// We need to use Chrome instead of Chromium here, since Chromium does not support video playback
// https://github.com/GoogleChrome/puppeteer/issues/291
/**
 * @constant
 * @type {string}
 */
const PATH_TO_CHROME = process.env.SPOKAPI_CHROME_PATH;

/**
 * Class representing a generate Sports Site.
 */
class Site {

    static get USERNAME() { return USERNAME };
    static get PASSWORD() { return PASSWORD };
    static get UNSUPPORTED_CHANNELS() { return UNSUPPORTED_CHANNELS };
    static get PROVIDER() { return PROVIDER };
    static get STANDARD_TIMEOUT() { return STANDARD_TIMEOUT };
    static get STANDARD_WAIT_OK_TIMEOUT() { return STANDARD_WAIT_OK_TIMEOUT };
    static get PATH_TO_CHROME() { return PATH_TO_CHROME };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
	constructor(page) {
        this.page = page;
    }

    /**
     * Open up a headless browser page.
     * @returns {Promise<Page>}
     */
    async openPage() {
        this.browser = await puppeteer.launch({
            headless: true,
            executablePath: PATH_TO_CHROME
        });
        let page = await this.browser.newPage();
        return Promise.resolve(page); 
    }
    
    /**
     * Login to the correct provider.
     * @returns {Promise}
     */
    async loginProvider() {
        try {
            if( PROVIDER === "Spectrum" ) {
                await this.loginSpectrum();
            }
        }
        // Sometimes there will be no login, so don't crash if so
        catch(err) {}
        return Promise.resolve(1);
    }

    /**
     * Login to Spectrum
     * @returns {Promise}
     */
    async loginSpectrum() {
        // Wait until we have the username box
        await this.page.waitForSelector("#IDToken1", {timeout: STANDARD_TIMEOUT});
        // Enter the username and password
        await this.page.click("#IDToken1");
        await this.page.focus("#IDToken1");
        await this.page.click("#IDToken1", {clickCount: 3});
        await this.page.keyboard.type(USERNAME);
        await this.page.click("#IDToken2");
        await this.page.waitFor(250);
        await this.page.focus("#IDToken2");
        await this.page.click("#IDToken2", {clickCount: 3});
        await this.page.keyboard.type(PASSWORD);
        // Login
        await this.page.click('#submint_btn');
        return Promise.resolve(1);
    }

    /**
     * Stop playing a game
     * @returns {Promise}
     */
    async stop() {
        await this.page.goto(STOP_URL, {timeout: STANDARD_TIMEOUT});
        return Promise.resolve(1);
    }

};

module.exports = Site;
