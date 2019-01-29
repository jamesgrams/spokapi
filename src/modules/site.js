/**
 * @file    Site for Spokapi
 * @author  James Grams
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const publicIp = require('public-ip');
const iplocation = require("iplocation").default;

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
const STANDARD_TIMEOUT = 80000;
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
        else if( provider === "Verizon Fios" ) {
            await this.loginVerizon();
        }
        else if( provider === "Xfinity" ) {
            await this.loginXfinity();
        }
        else if( provider === "DISH" ) {
            await this.loginDISH();
        }
        else if( provider === "AT&T U-verse" ) {
            await this.loginATT();
        }
        else if( provider === "Cox" ) {
            await this.loginCox();
        }
        else if( provider === "Optimum" ) {
            await this.loginOptimum();
        }
        else if( provider === "Sling TV" ) {
            await this.loginSling();
        }
        else if( provider === "DIRECTV NOW" ) {
            await this.loginDIRECTVNOW();
        }
        else if( provider === "Hulu" ) {
            await this.loginHulu();
        }
        else if( provider === "Suddenlink" ) {
            await this.loginSuddenlink();
        }
        else if( provider === "Frontier Communications" ) {
            await this.loginFrontier();
        }
        else if( provider === "Mediacom" ) {
            await this.loginMediacom();
        }
        return Promise.resolve(1);
    }

    /**
     * Standard method to log into a provider
     * @param {string} usernameSelector - the selector for the username input
     * @param {string} passwordSelector - the selector for the password input
     * @param {string} submitSelector - the selector for the submit input
     * @returns {Promise}
     */
    async loginStandardProvider(usernameSelector, passwordSelector, submitSelector) {
        // Wait until we have the username box
        await this.page.waitForSelector(usernameSelector, {timeout: STANDARD_TIMEOUT});
        // Enter the username and password (evalute allows for this to occur in bg tab)
        await this.page.waitFor(250);
        await this.page.evaluate( (usernameSelector) => { 
            document.querySelector(usernameSelector).focus();
            document.querySelector(usernameSelector).click();
            document.querySelector(usernameSelector).click();
            document.querySelector(usernameSelector).click();
        }, usernameSelector );
        await this.page.keyboard.type(username);
        await this.page.waitFor(250);
        await this.page.evaluate( (passwordSelector) => {
            document.querySelector(passwordSelector).focus();
            document.querySelector(passwordSelector).click();
            document.querySelector(passwordSelector).click();
            document.querySelector(passwordSelector).click();
        }, passwordSelector );
        await this.page.keyboard.type(password);
        // Login
        await this.page.evaluate( (submitSelector) => {
            document.querySelector(submitSelector).click();
        }, submitSelector );
        return Promise.resolve(1);
    } 

    /**
     * Login to Spectrum
     * @returns {Promise}
     */
    async loginSpectrum() {
        await this.loginStandardProvider("#IDToken1", "#IDToken2", "#submint_btn");
        return Promise.resolve(1);
    }

    /**
     * Login to DIRECTV
     * @returns {Promise}
     */
    async loginDIRECTV() {
        await this.loginStandardProvider("#usernameInputId", ".inputFieldPass", "#loginSubmitId");
        return Promise.resolve(1);
    }

    /**
     * Login to Verizon
     * @returns {Promise}
     */
    async loginVerizon() {
        await this.loginStandardProvider("#IDToken1", "#IDToken2", "#tvloginsignin");
        return Promise.resolve(1);
    }

    /**
     * Login to Xfinity
     * @returns {Promise}
     */
    async loginXfinity() {
        await this.loginStandardProvider("#user", "#passwd", "#sign_in");
        return Promise.resolve(1);
    }

    /**
     * Login to DISH
     * @returns {Promise}
     */
    async loginDISH() {
        await this.loginStandardProvider("#username", "#password", "#login");
        return Promise.resolve(1);
    }

    /**
     * Login to AT&T U-verse
     * @returns {Promise}
     */
    async loginATT() {
        await this.loginStandardProvider("#nameBox", "#pwdBox", "#submitLogin");
        return Promise.resolve(1);
    }

    /**
     * Login to Cox
     * @returns {Promise}
     */
    async loginCox() {
        await this.loginStandardProvider("input[name='username']", "input[name='password']", "input[alt='Sign In']");
        return Promise.resolve(1);
    }

    /**
     * Login to Optimum
     * @returns {Promise}
     */
    async loginOptimum() {
        await this.loginStandardProvider("#IDToken1", "#IDToken2", "#signin_button");
        return Promise.resolve(1);
    }

    /**
     * Login to Sling
     * @returns {Promise}
     */
    async loginSling() {
        await this.loginStandardProvider("#username", "#password", "#login");
        return Promise.resolve(1);
    }

    /**
     * Login to DIRECTV NOw
     * @returns {Promise}
     */
    async loginDIRECTVNOW() {
        await this.loginStandardProvider("#userName", "#password", "#loginButton-lgwgLoginButton");
        return Promise.resolve(1);
    }

    /**
     * Login to Hulu
     * @returns {Promise}
     */
    async loginHulu() {
        await this.loginStandardProvider("input[name='email']", "input[name='password']", ".login-button");
        return Promise.resolve(1);
    }

    /**
     * Login to Sudddenlink
     * @returns {Promise}
     */
    async loginSuddenlink() {
        await this.loginStandardProvider("#username", "#password", "#login");
        return Promise.resolve(1);
    }

    /**
     * Login to Frontier Communications
     * @returns {Promise}
     */
    async loginFrontier() {
        await this.loginStandardProvider("#username", "#password", "#submit");
        return Promise.resolve(1);
    }

    /**
     * Login to Mediacom
     * @returns {Promise}
     */
    async loginMediacom() {
        await this.loginStandardProvider("#username", "#password", "a[title='Login']");
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
        this.browser = browser; // Important that browser be defined for later usage (if a site needs to rearrange tabs)

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
        await incongitoContext.overridePermissions('https://www.fox.com', ['geolocation']);

        // Get the location
        let location = await Site.getLocation();

        // First, check to see if there are tabs open we can use
        // tab (first one means watching) (we "reconnect" to these)
        // Close all other open tabs too
        Site.connectedTabs = [];
        let tabs = await incongitoContext.pages();
        if( tabs.length > 0 ) {
            for(let i=0; i<tabs.length; i++ ) {
                Site.connectedTabs.push(tabs[i]);
                await tabs[i]._client.send('Emulation.clearDeviceMetricsOverride');
                await tabs[i].setGeolocation(location);
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
            await page.setGeolocation(location);
            Site.connectedTabs.push(page);
        }
        await Site.makeWatchTabFirst(browser);
        await Site.connectedTabs[0].bringToFront();
        // Sometime watching video doesn't work well unless we have a correct user agent
        await Site.connectedTabs[0].setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36");
        await Site.connectedTabs[0]._client.send('Emulation.clearDeviceMetricsOverride');

        return Promise.resolve(browser);
    }

    /**
     * Make the watch tab the first tab on the list of connected tabs
     * @returns {Promise}
     */
    static async makeWatchTabFirst() {
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

    /**
     * Get the location by ip
     * @returns {Promise<object>} - A promise containing the longitude and latitude ready for Puppeteer
     */
    static async getLocation() {
        let ipAddress = await publicIp.v4();
        let location = await iplocation(ipAddress, []);
        return Promise.resolve({
            "latitude": location.latitude,
            "longitude": location.longitude
        });
    }

};

module.exports = Site;
