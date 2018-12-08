/**
 * @file    Site for Spokapi
 * @author  James Grams
 */

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
const UNSUPPORTED_CHANNELS = ["espn+","espndeportes","longhorn","accextra","sec","secplus"];
/**
 * @constant
 * @type {string}
 * @default
 */
const STOP_URL = "https://google.com";

/**
 * Class representing a generate Sports Site.
 */
class Site {

    static get USERNAME() { return USERNAME };
    static get PASSWORD() { return PASSWORD };
    static get UNSUPPORTED_CHANNELS() { return UNSUPPORTED_CHANNELS };
    static get PROVIDER() { return PROVIDER };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
	constructor(page) {
        this.page = page;
    }
    
    /**
     * Login to the correct provider.
     * @returns {Promise}
     */
    async loginProvider() {
        if( PROVIDER === "Spectrum" ) {
            this.loginSpectrum();
        }
        return Promise.resolve(1);
    }

    /**
     * Login to Spectrum
     * @returns {Promise}
     */
    async loginSpectrum() {
        // Wait until we have the username box
        await this.page.waitForSelector("#IDToken1");
        // Enter the username and password
        await this.page.click("#IDToken1");
        await this.page.keyboard.type(USERNAME);
        await this.page.click("#IDToken2");
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
        await this.page.goto(STOP_URL);
        return Promise.resolve(1);
    }

};

module.exports = Site;