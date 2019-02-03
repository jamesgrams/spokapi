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
 * @type {number}
 * @default
 */
const STANDARD_TIMEOUT = 280000;
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
        if ( message ) {
            await this.page.waitForSelector("body", {timeout: STANDARD_TIMEOUT});
            await this.page.evaluate( (message) => document.body.innerText = message, message );
        }
        return Promise.resolve(1);
    }

    // --------------- Static methods -----------------

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
     */
    static makeTimes(startHours, startMinutes, startMeridian, endHours, endMinutes, endMeridian ) {
        startHours = parseInt(startHours);
        startMinutes = parseInt(startMinutes);
        endHours = parseInt(endHours);
        endMinutes = parseInt(endMinutes);

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
                    endDay = 1;
                }
            }
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
