/**
 * @file    Site for Spokapi
 * @author  James Grams
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const publicIp = require('public-ip');
const iplocation = require("iplocation").default;

const AttUverse = require("./provider/attuverse");
const Cox = require("./provider/cox");
const DirecTv = require("./provider/directv");
const DirecTvNow = require("./provider/directvnow");
const Dish = require("./provider/dish");
const FrontierCommunications = require("./provider/frontiercommunications");
const Hulu = require("./provider/hulu");
const Mediacom = require("./provider/mediacom");
const Optimum = require("./provider/optimum");
const SlingTv = require("./provider/slingtv");
const Spectrum = require("./provider/spectrum");
const Suddenlink = require("./provider/suddenlink");
const VerizonFios = require("./provider/verizonfios");
const Xfinity = require("./provider/xfinity");

/**
 * @constant
 * @type {string}
 * @default
 */
const STOP_URL = "about:blank";
/**
 * @constant
 * @type {string}
 * @default
 */
const LOADING_URL = "localhost:8081/static/loading.html";
/**
 * @constant
 * @type {number}
 * @default
 */
const STANDARD_TIMEOUT = 120000;
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
 * @constant
 * @type {string}
 */
const CHANNEL_UNSUPPORTED_MESSAGE = "You don't have access to this channel with your cable provider.";
/**
 * @constant
 * @type {string}
 */
 const FAKE_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36";
/**
 * @constant
 * @type {string}
 */
const FAKE_PLATFORM = "MacIntel";
 /**
 * @constant
 * @type {Array<Class>}
 * Ideally, in subclasses, we would have class names
 * mapped to name values rather than the literal string
 * value of the class name, but having it here and then
 * matching them up prevents having to import in every
 * subclass
 */
const PROVIDER_CLASSES = [
    AttUverse,
    Cox,
    DirecTv,
    DirecTvNow,
    Dish,
    FrontierCommunications,
    Hulu,
    Mediacom,
    Optimum,
    SlingTv,
    Spectrum,
    Suddenlink,
    VerizonFios,
    Xfinity
];

/**
 * @type {string}
 */
var providerName = process.env.SPOKAPI_PROVIDER;
/**
 * @type {Array.<string>}
 * @default
 */
var unsupportedChannels = ["ESPN+","ESPNDEPORTES","LONGHORN","ACCEXTRA","SEC","SECPLUS","NBC Sports Gold"];
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
    static get CHANNEL_UNSUPPORTED_MESSAGE() { return CHANNEL_UNSUPPORTED_MESSAGE };
    static get FAKE_USER_AGENT() { return FAKE_USER_AGENT };
    static get FAKE_PLATFORM() { return FAKE_PLATFORM };

    static get providerName() { return providerName };
    static set providerName(prov) { providerName = prov; };
    static get totalNetworks() { return totalNetworks };
    static set totalNetworks(numNetworks) { totalNetworks = numNetworks; };
    static get connectedTabs() { return connectedTabs };
    static set connectedTabs(tabs) { connectedTabs = tabs };
    static get watchTabId() { return watchTabId };
    static set watchTabId(id) { watchTabId = id };
    static get unsupportedChannels() { return unsupportedChannels };
    static set unsupportedChannels(channels) { unsupportedChannels = channels };

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
            page.setUserAgent(Site.FAKE_USER_AGENT);
        }
        else {
            this.browser = await Site.connectToChrome();
        }
        return Promise.resolve(page); 
    }

    /**
     * Stop playing a program
     * @param {String} message - An optional message to display on the blank page
     * @returns {Promise}
     */
    async stop(message) {
        await this.page.goto(STOP_URL, {timeout: STANDARD_TIMEOUT});
        // If this is the watch page being stopped, we can display a message in Chrome OS mode
        if( !Site.PATH_TO_CHROME && this.page.mainFrame()._id == Site.watchTabId ) {
            // Go to the loading/home page and display the message
            await Site.connectedTabs[1].bringToFront();
            // Make sure the stop page isn't loading
            await Site.cancelLoading();
            if ( message ) {
                await Site.connectedTabs[1].waitForSelector("body", {timeout: STANDARD_TIMEOUT});
                await Site.connectedTabs[1].evaluate( (message) => document.querySelector("#message").innerText = message, message );
            }
        }
        return Promise.resolve(1);
    }

    /**
     * Pause/unpause a program
     * @returns {Promise}
     */
    async pause() {
        let mousie = this.page.mouse;
        await mousie.click(100, 100); // Not sure we'll have anything smaller than 100 pixels
        return Promise.resolve(1);
    }

    // --------------- Static methods -----------------

    /**
     * Connect to a pre-running instance of Chrome
     * @param {boolean} bringToFront - true if we should bring the spokapi page to the front
     * @returns {Promise<Browser>}
     */
    static async connectToChrome(bringToFront = true) {
        // The number of needed tabs
        // Total networks + watch tab + loading tab
        let neededTabs = totalNetworks + 2;

        // First, get the ID of the running chrome instance (it must have remote debugging enabled on port 1337)
        let response = await fetch('http://localhost:1337/json/version');
        let json = await response.json();
         // Now, we can connect to chrome
        let endpoint = json.webSocketDebuggerUrl;
        
        let browser = await puppeteer.connect( {browserWSEndpoint: endpoint, defaultViewport: null} );
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
        Site.connectedTabs = [];
        let tabs = await incongitoContext.pages();
        for(let i=0; i<tabs.length; i++ ) { // We will remove tabs we don't need later
            connectedTabs.push(tabs[i]);
            await tabs[i]._client.send('Emulation.clearDeviceMetricsOverride');
            await tabs[i].setGeolocation(location);
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
        await Site.makeWatchTabFirst(browser); // For easy referral as the first tab later on
        // Sometime watching video doesn't work well unless we have a correct user agent
        await Site.connectedTabs[0].setUserAgent(Site.FAKE_USER_AGENT);
        await Site.connectedTabs[0]._client.send('Emulation.clearDeviceMetricsOverride');

        await Site.makeLoadingTabSecond(browser);

        if( bringToFront ) {
            await Site.connectedTabs[1].bringToFront();
        }

        // Remove unecessary tabs
        // We know we won't accidently remove the watch and loading tabs,
        // since they are tabs #0 & #1, and neededTabs will always be at least 2
        for(let i=Site.connectedTabs.length-1; i>=neededTabs; i--) {
            await Site.connectedTabs[i].close();
            Site.connectedTabs.splice(i, 1);
        }

        return Promise.resolve(browser);
    }

    /**
     * Make the watch tab the first tab on the list of connected tabs
     * @returns {Promise}
     */
    static async makeWatchTabFirst() {
        let watchTab;
        let watchTabIndex = 0;
        for( let i=0; i<Site.connectedTabs.length; i++ ) {
            let tab = Site.connectedTabs[i];
            if( tab.mainFrame()._id == Site.watchTabId && ! tab.url().includes(LOADING_URL) ) {
                watchTab = tab;
                watchTabIndex = i;
                break;
            }
        }
        if( !watchTab ) {
            watchTab = Site.connectedTabs[0];
            await watchTab.goto(STOP_URL, {timeout: Site.STANDARD_TIMEOUT});
            Site.watchTabId = watchTab.mainFrame()._id;
        }
        // Switch the element currently first with watchTab
        Site.connectedTabs[watchTabIndex] = Site.connectedTabs[0];
        Site.connectedTabs[0] = watchTab;
        
        return Promise.resolve(watchTab);
    }

    /**
     * Make the loading tab the second tab on the list of connected tabs
     * @returns {Promise}
     */
    static async makeLoadingTabSecond() {
        let loadingTab;
        let loadingTabIndex = 1;

        for( let i=1; i<Site.connectedTabs.length; i++ ) { // Start at 1 since loadingTab cannot equal watchTab
            let tab = Site.connectedTabs[i];
            if( tab.url().includes(LOADING_URL) ) {
                loadingTab = tab;
                loadingTabIndex = i;
                break;
            }
        }
        if( !loadingTab ) {
            loadingTab = Site.connectedTabs[1];
            await loadingTab.goto(LOADING_URL, {timeout: Site.STANDARD_TIMEOUT});
        }
        // Switch the element currently first with watchTab
        Site.connectedTabs[loadingTabIndex] = Site.connectedTabs[1];
        Site.connectedTabs[1] = loadingTab;
        
        return Promise.resolve(loadingTab);
    }

    /**
     * Send the browser to the loading screen
     * @returns {Promise<Page>}
     */
    static async displayLoading() {
        let loadingPage = Site.connectedTabs[1];
        await loadingPage.bringToFront();
        await loadingPage.evaluate( () => startLoading() );
        await Site.clearMessage();
        return Promise.resolve(loadingPage);
    }

    /**
     * Go back to the watch tab
     * @param {string} watchPage - the watch page
     * @returns {Promise<Page>}
     */
    static async stopLoading(watchPage) {
        try {
            await watchPage.bringToFront();
            let session = await watchPage.target().createCDPSession();
            await session.send("Page.enable");
            await session.send("Page.setWebLifecycleState", { state: "active" });
        }
        catch(err) { console.log(err); }
        let loadingPage = Site.connectedTabs[1];
        await loadingPage.evaluate( () => stopLoading() );
        await Site.clearMessage();
        return Promise.resolve(watchPage);
    }

    /**
     * Cancel loading (due to error, or user interaction)
     * @returns {Promise<Page>}
     */
    static async cancelLoading() {
        let loadingPage = Site.connectedTabs[1];
        await loadingPage.bringToFront();
        await loadingPage.evaluate( () => stopLoading() );
        await Site.clearMessage(); // Stop, which adds a message, calls this before adding a new message
        return Promise.resolve(loadingPage);
    }

    /**
     * Remove the message from being displayed
     * @returns {Promise}
     */
    static async clearMessage() {
        await Site.connectedTabs[1].waitForSelector("body", {timeout: STANDARD_TIMEOUT});
        await Site.connectedTabs[1].evaluate( () => document.querySelector("#message").innerText = "" );
        return Promise.resolve(1);
    }

    /**
     * Cleanup all tabs (for loading on program startup)
     * @param {Browser} browser - the browser to clean up
     * @returns {Promise}
     */
    static async cleanupAll(browser) {
        let tabs = await browser.pages();
        if(tabs.length > 0) {
            await tabs[0].goto(STOP_URL, {timeout: STANDARD_TIMEOUT});
            for(let i=0; i<tabs.length; i++ ) {
                // Don't reset the loading page
                if( tabs[i].mainFrame()._id != Site.connectedTabs[1].mainFrame()._id ) {
                    try {
                        await tabs[i].goto(STOP_URL, {timeout: STANDARD_TIMEOUT});
                    }
                    catch (err) {
                        console.log(err);
                    }
                }
                else {
                    // This allows the loading url to update
                    await tabs[i].goto(LOADING_URL, {timeout: STANDARD_TIMEOUT});
                }
            }
        }
        
        new Site(tabs[0]).stop("Welcome");

        return Promise.resolve(1);
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

    /**
     * Add or remove an unsupported channel
     * @param {Object} option - an object with a type ("type" - allow or remove) and a channel name ("channel")
     */
    static addUnsupportedChannel(option) {
        if( option.type == "allow" ) {
            let index = unsupportedChannels.indexOf(option.channel);
            if(index > -1) {
                unsupportedChannels.splice(index, 1);
            }
        }
        else {
            unsupportedChannels.push(option.channel);
        }
    }

    /**
     * Create the start time, end time, and run time based on some common string values for showtimes
     * @param {*} startHours    - the start hour  
     * @param {*} startMinutes  - the start minute
     * @param {string} startMeridian - the start meridian (A or P)
     * @param {*} endHours      - the end hour
     * @param {*} endMinutes    - the end minute
     * @param {string} endMeridian  - the end meridian (A or P)
     * @param {number} offset - the offset hours to add to the start and end dates
     */
    static makeTimes( startHours, startMinutes, startMeridian, endHours, endMinutes, endMeridian, offset ) {
        startHours = parseInt(startHours);
        startMinutes = parseInt(startMinutes);
        endHours = parseInt(endHours);
        endMinutes = parseInt(endMinutes);

        // When only the end meridian is known
        if (startMeridian == "?") {
            if( startHours > endHours || (startHours < endHours && endHours == 12) ) {
                startMeridian = (endMeridian == "P" ? "A" : "P");
            }
            else {
                startMeridian = endMeridian;
            }
        }

        let endDay = 0;
        // If the hours are less than 12 but we have PM, add 12 to convert to 24 hour time
        if( startHours < 12 && startMeridian == "P" ) {
            startHours += 12;
        }
        else if ( startHours == 12 && startMeridian == "A") {
            startHours = 0;
        }
        if( endHours != null ) {
            if( endHours < 12 && endMeridian == "P" ) {
                endHours += 12;
            }
            else if( endHours == 12 && endMeridian == "A" ) {
                endHours = 0;
                // If the start is not also at the midnight hour,
                // Or it is at the midnight hour, but has later minutes (e.g. start is 12:45am, end is 12:15am)
                // The days must be different 
                if( startHours != 0 || (startHours == 0 && startMinutes >= endMinutes) ) {
                    endDay += 1;
                }
            }
        }

        if( offset ) {
            startHours += offset;
            endHours += offset;
        }

        let startDate = new Date(0, 0, 0, startHours, startMinutes, 0);
        let endDate; 
        let runtime; 
        
        if ( endHours != null ) {
            endDate = new Date(0, 0, endDay, endHours, endMinutes, 0);
            runtime = Math.abs(endDate.getTime() - startDate.getTime());
        }

        return {
            "start": startDate,
            "end": endDate,
            "run": runtime
        };
    }

    /**
     * Get the correct provider.
     * To only be called in subclasses of site
     * @returns {Provider}
     */
    static getProvider() {
        // Get the classes that are valid for this site
        let validProviderClasses = PROVIDER_CLASSES.filter( ProviderTmp => Object.keys(this.VALID_PROVIDERS).includes(ProviderTmp.name.toLowerCase()) );
        // Now get the class for the current provider if it is in the list of valid classes
        let ProviderClass = validProviderClasses.filter( ProviderTmp => new ProviderTmp().name == Site.providerName )[0];
        if( ProviderClass ) {
            let provider = new ProviderClass();
            // We know there is a key, what we are checking is if the value is defined
            if( this.VALID_PROVIDERS[ProviderClass.name.toLowerCase()] ) {
                // Set a custom name for the provider for this site for the selector
                provider.name = this.VALID_PROVIDERS[ProviderClass.name.toLowerCase()];
            }
            return provider;
        }
        else {
            return null;
        } 
    }

};

module.exports = Site;
