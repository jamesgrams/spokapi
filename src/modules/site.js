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
 * @type {string}
 */
var watchTabId;

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
    static set connectedTabs(tabs) { connectedTabs = tabs };
    static get watchTabId() { return watchTabId };
    static set watchTabId(id) { watchTabId = id };
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
        else if( provider === "DIRECTV" ) {
            await this.loginDIRECTV();
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
     * Login to DIRECTV
     * @returns {Promise}
     */
    async loginDIRECTV() {
        // Wait until we have the username box
        await this.page.waitForSelector("#usernameInputId", {timeout: STANDARD_TIMEOUT});
        // Enter the username and password
        await this.page.click("#usernameInputId");
        await this.page.focus("#usernameInputId");
        await this.page.click("#usernameInputId", {clickCount: 3});
        await this.page.keyboard.type(username);
        await this.page.click(".inputFieldPass");
        await this.page.waitFor(250);
        await this.page.focus(".inputFieldPass");
        await this.page.click(".inputFieldPass", {clickCount: 3});
        await this.page.keyboard.type(password);
        // Login
        await this.page.click('#loginSubmitId');
        return Promise.resolve(1);
    }

    /**
     * Stop playing a program
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
        // The number of needed tabs
        let neededTabs = totalNetworks + 1;

        // First, get the ID of the running chrome instance (it must have remote debugging enabled on port 1337)
        let response = await fetch('http://localhost:1337/json/version');
        let json = await response.json();
         // Now, we can connect to chrome
        let endpoint = json.webSocketDebuggerUrl;
        
        let browser = await puppeteer.connect( {browserWSEndpoint: endpoint} );

        // Create the connected chrome tabs
        // Connect to an incognito context
        let incongitoContext;
        let contexts = browser.browserContexts();
        for( let context of contexts ) {
            if( context.isIncognito() ) {
                incongitoContext = context;
            }
        }
        if ( !incongitoContext ) {
            incongitoContext = await browser.createIncognitoBrowserContext();
        }
        await incongitoContext.overridePermissions('https://www.cbs.com', ['geolocation']);

        // First, check to see if there are tabs open we can use
        // tab (first one means watching) (we "reconnect" to these)
        // Close all other open tabs too
        Site.connectedTabs = [];
        let tabs = await incongitoContext.pages();
        if( tabs.length > 0 ) {
            for(let i=0; i<tabs.length; i++ ) {
                Site.connectedTabs.push(tabs[i]);
                await tabs[i]._client.send('Emulation.clearDeviceMetricsOverride');
            }
            for(let i=Site.connectedTabs.length; i<tabs.length; i++) {
                await tabs[i].close();
            }
        } 

        // We need a tab for each network plus the watch tab
        for ( let i=Site.connectedTabs.length; i < neededTabs; i++ ) {
            let page = await incongitoContext.newPage();
            // This makes the viewport correct
            // https://github.com/GoogleChrome/puppeteer/issues/1183#issuecomment-383722137
            await page._client.send('Emulation.clearDeviceMetricsOverride');
            Site.connectedTabs.push(page);
        }
        await Site.makeWatchTabFirst(browser);
        await Site.connectedTabs[0].bringToFront();
        await Site.connectedTabs[0]._client.send('Emulation.clearDeviceMetricsOverride');

        return Promise.resolve(browser);
    }

    /**
     * Make the watch tab the first tab on the list of connected tabs
     * @param {BrowserContext} browserContext - the browser context
     */
    static async makeWatchTabFirst(browser) {
        let watchTab;
        let watchTabIndex = 0;
        Site.connectedTabs;
        for( let i=0; i<Site.connectedTabs.length; i++ ) {
            let tab = Site.connectedTabs[i];
            if( tab.mainFrame()._id == Site.watchTabId ) {
                watchTab = tab;
                watchTabIndex = i;
                break;
            }
        }
        if( !watchTab ) {
            watchTab = Site.connectedTabs[0];
            Site.watchTabId = watchTab.mainFrame()._id;
        }
        // Switch the element currently first with watchTab
        Site.connectedTabs[watchTabIndex] = Site.connectedTabs[0];
        Site.connectedTabs[0] = watchTab;
        
        return Promise.resolve(watchTab);
    }

};

module.exports = Site;
