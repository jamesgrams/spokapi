/**
 * @file    Site for Spokapi
 * @author  James Grams
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

/**
 * @constant
 * @type {string}
 * @default
 */
const STOP_URL = "about:blank";
/**
 * @constant
 * @type {number}
 * @default
 */
const STANDARD_TIMEOUT = 40000;
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
 * @type {string}
 * @default
 */
var username = process.env.SPOKAPI_USERNAME;
/**
 * @type {string}
 * @default
 */
var password = process.env.SPOKAPI_PASSWORD;
/**
 * @type {string}
 */
var provider = process.env.SPOKAPI_PROVIDER;
/**
 * @type {Array.<string>}
 * @default
 */
var unsupportedChannels = ["espn+","espndeportes","longhorn","accextra","sec","secplus","NBC Sports Gold"];
/**
 * @type {number}
 */
var totalNetworks;
/**
 * @type {Array.<string>}
 * When connecting to a chrome instance (limiting our ability to create new windows), 
 * such as on Chrome OS, we need to keep track of the tabs that we are using. 
 * This will allow us to work with these tabs without switching to new ones (happens on creation)
 */
var connectedTabs = [];

/**
 * Class representing a generate Sports Site.
 */
class Site {

    static get STANDARD_TIMEOUT() { return STANDARD_TIMEOUT };
    static get STANDARD_WAIT_OK_TIMEOUT() { return STANDARD_WAIT_OK_TIMEOUT };
    static get PATH_TO_CHROME() { return PATH_TO_CHROME };

    static get username() { return username };
    static set username(user) { username = user };
    static get password() { return password };
    static set password(pass) { password = pass };
    static get provider() { return provider };
    static set provider(prov) { provider = prov };
    static get totalNetworks() { return totalNetworks };
    static set totalNetworks(numNetworks) { totalNetworks = numNetworks; };
    static get connectedTabs() { return connectedTabs };
    static get unsupportedChannels() { return unsupportedChannels };
    static set unsupportedChannels(option) { 
        if( option.type == "allow" ) {
            let index = unsupportedChannels.indexOf(option.channel);
            if(index > -1) {
                unsupportedChannels.splice(index, 1);
            }
        }
        else {
            unsupportedChannels.push(option.channel);
        }
    };

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
        let page;
        if( PATH_TO_CHROME ) {
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: PATH_TO_CHROME
            });
            page = await this.browser.newPage();
        }
        else {
            this.browser = await Site.connectToChrome();
        }
        return Promise.resolve(page); 
    }
    
    /**
     * Login to the correct provider.
     * @returns {Promise}
     */
    async loginProvider() {
        if( provider === "Spectrum" ) {
            await this.loginSpectrum();
        }
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
        await this.page.keyboard.type(username);
        await this.page.click("#IDToken2");
        await this.page.waitFor(250);
        await this.page.focus("#IDToken2");
        await this.page.click("#IDToken2", {clickCount: 3});
        await this.page.keyboard.type(password);
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

    /**
     * Connect to a pre-running instance of Chrome
     * @returns {Promise<Browser>}
     */
    static async connectToChrome() {
        // First, get the ID of the running chrome instance (it must have remote debugging enabled on port 1337)
        let response = await fetch('http://localhost:1337/json/version');
        let json = await response.json();
         // Now, we can connect to chrome
        let endpoint = json.webSocketDebuggerUrl;
        let browser = await puppeteer.connect( {browserWSEndpoint: endpoint} );

        // Create the connected chrome tabs
        if( connectedTabs.length < totalNetworks ) {
            // We need a tab for each network plus the watch tab
            for ( let i=connectedTabs.length; i < totalNetworks + 1; i++ ) {
                let page = await browser.newPage();
                // This makes the viewport correct
                // https://github.com/GoogleChrome/puppeteer/issues/1183#issuecomment-383722137
                await page._client.send('Emulation.clearDeviceMetricsOverride');
                connectedTabs.push(page);
            }
        }

        return Promise.resolve(browser);
    }

};

module.exports = Site;
