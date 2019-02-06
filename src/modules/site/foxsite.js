/**
 * @file    Abstract Fox Site for Spokapi
 * @author  James Grams
 * Fox owns several channels (Fox, Fox News, National Geographic, etc.)
 * They all use a similar streaming portal
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {Object<string,string>}
 * These are lowercase class names and values to be used in the 
 * selector when finding the provider link if different from the 
 * provider default name
 */
const VALID_PROVIDERS = {
    "spectrum": "",
    "directv": "",
    "verizonfios": "",
    "xfinity": "",
    "attuverse": "",
    "dish": "",
    "cox": "",
    "optimum": "",
    "slingtv": "",
    "directvnow": "",
    "frontiercommunications": "",
    "hulu": "",
    "suddenlink": "",
    "mediacom": ""
}

/**
 * Abstract class representing a Fox Site.
 */
class FoxSite extends Site {

    static get VALID_PROVIDERS() { return VALID_PROVIDERS; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    * @param {string} url - The watch url for this fox site
    * @param {string} channelName - The channel name to display
    * @param {string} altSelector - A selector to identify the alt tag on the image of this row (useful for reusing selectors)
    */
    constructor(page, url, channelName, altSelector) {
        super(page);
        this.url = url;
        this.channelName = channelName;
        this.altSelector = altSelector;
    }
    
    /**
     * Generate a list of programs available on this site.
     * @returns {Promise<Array.<Program>>}
     */
    async generatePrograms() {
        if(!this.page) {
            this.page = await this.openPage();
        }

        let programs = [];

        let originalPage = this.page;

        try {

            // See if we can find an already existing Fox page to latch onto
            let browserContext = await this.page._target.browserContext();
            let pages = await browserContext.pages();
            let foundPage = false;
            for( let page of pages ) {
                if( page.url().match(/www\.fox\.com/i) ) {
                    this.page = page;
                    foundPage = true;
                    break;
                }
            }

            if(!foundPage) {
                await this.page.goto(this.url, {timeout: Site.STANDARD_TIMEOUT * 2});
            }

            // Wait until the live program is loaded
            let liveSelector = '//*[contains(@class,"Live_scheduleRowSelected")]//*[contains(@class,"ScheduleItem_scheduleItem_1Cppt")]';
            if( this.altSelector ) {
                liveSelector = '//img[contains(@class,"Live_networkLogo")][@alt="'+this.altSelector+'"]/../..//*[contains(@data-test,"scheduleitem-item")]';
            }
            
            await this.page.waitForXPath(liveSelector, {timeout: Site.STANDARD_TIMEOUT * 2});

            // Get the element telling what's playing
            let liveElement = (await this.page.$x(liveSelector))[0];

            // Get the live info (Will throw an error if no title)
            let liveInfo = await (await liveElement.getProperty("title")).jsonValue();
            
            let network = this.constructor.name.toLowerCase();
            let channel = this.channelName ? this.channelName : network;

            let liveInfoRegex = /(.*)\s\((\d+):(\d+)\s([AP])M\s-\s(\d+):(\d+)\s([AP])M\)$/
            let liveInfoMatch = liveInfoRegex.exec(liveInfo);
            let title = liveInfoMatch[1];
            let times = Site.makeTimes(liveInfoMatch[2], liveInfoMatch[3], liveInfoMatch[4], liveInfoMatch[5], liveInfoMatch[6], liveInfoMatch[7]);

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    title,
                    this.url,
                    times.start,
                    times.run,
                    network,
                    channel,
                    null,
                    null,
                    null,
                    null,
                    null
                ) );
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }

        this.page = originalPage;

        return Promise.resolve(programs);
    }

    /**
     * Login to Fox.
     * @returns {Promise}
     */
    async login() {
        // Wait to see all providers and then click it
        await this.page.waitForSelector("div[class^='AuthMVPDStart_provider']:last-child > a[class^='AuthMVPDStart_provider']", {timeout: Site.STANDARD_TIMEOUT * 2});
        await this.page.waitFor(1000); // Some JS may still need to load
        await this.page.evaluate( () => document.querySelector("div[class^='AuthMVPDStart_provider']:last-child > a[class^='AuthMVPDStart_provider']").click() );

        // Focus on the place to type providers
        await this.page.waitForSelector("*[class^='AuthMVPDSearch_input'] > input", {timeout: Site.STANDARD_TIMEOUT * 2});
        await this.page.evaluate( () => document.querySelector("*[class^='AuthMVPDSearch_input'] > input").focus() );

        let provider = this.constructor.getProvider();
        if( !provider ) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }

        // Type the provider
        await this.page.keyboard.type(provider.name);
        // Wait for the provider selector to be visible
        await this.page.waitForSelector("*[class^='AuthMVPDSearch_providerContainer']", {timeout: Site.STANDARD_TIMEOUT * 2});
        
        // Click the provider selector
        // For some reason Fox opens the login in a new page
        // https://github.com/GoogleChrome/puppeteer/issues/386
        let browserContext = await this.page._target.browserContext();

        // Get all the current pages (So we can tell which page the popup is)
        let allPages = await browserContext.pages();
        let oldPages = allPages;
        let oldPageCount = allPages.length;

        // The new page will open in a popup
        await this.page.evaluate( () => document.querySelector("*[class^='AuthMVPDSearch_providerContainer'] a").click() );
        
        // We should be on our Provider screen now
        // It'll be on a different tab though, so we have to switch to that
        await this.page.waitFor(1000);

        // Wait until we have a new page
        // Note: Waiting until we have a new page causes a race condition if other new pages popup
        let count = 0;
        while( allPages.length == oldPageCount && count < 20 ) {
            allPages = await browserContext.pages();
            await this.page.waitFor(1000); // We're just sleeping here...
            count ++;
        }
        // Find which is the new page
        let newPages = allPages.filter( page => !oldPages.includes(page) );

        // Temporarily switch the site's page
        let watchPage = this.page;
        this.page = newPages[0];
        
        try {
            await provider.login(this.page, Site.STANDARD_TIMEOUT * 2);
        }
        catch(err) {console.log(err);}

        this.page = watchPage;

        return Promise.resolve(1);
    }

    /**
     * Begin watching something on Fox.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {

        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT * 2});

        // Exit the loading page now that we're loaded (TODO: figure this out better)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // See what we need to do
        await this.page.waitForSelector("*[class^='AuthPlaybackError_primaryAction'],*[class^='VideoContainer_previewPassLoginLink'],*[class^='AuthSignIn_button'],*[class^='AuthMVPDStart_provider'],.fullscreenButton", {timeout: Site.STANDARD_TIMEOUT * 2});

        let actionElement = await this.page.$("*[class^='AuthPlaybackError_primaryAction'],*[class^='VideoContainer_previewPassLoginLink'] a,*[class^='AuthSignIn_button'],*[class^='AuthMVPDStart_provider'],.fullscreenButton");
        let actionClassName = await (await actionElement.getProperty("className")).jsonValue();

        // The link won't have the class name, of course.
        if( !actionClassName ) {
            actionClassName = "VideoContainer_previewPassLoginLink";
        }

        // We need to click ok for location
        if( actionClassName.indexOf("AuthPlaybackError_primaryAction") != -1 ) {
            await this.page.evaluate( () => document.querySelector("*[class^='AuthPlaybackError_primaryAction']").click() );
            await this.watch(url); // We basically just want to start again after clicking OK for location.
            return Promise.resolve(1);
        }
        // We're in preview mode or it's asking us to login
        // Sometimes it will take us straight to the providers
        // In this case it looks like it still hits the previewPassLoginLink
        if( actionClassName.indexOf("VideoContainer_previewPassLoginLink") != -1 || actionClassName.indexOf("AuthSignIn_button") != -1 ) {
            await this.page.waitFor(700);
            await this.page.evaluate( (actionElement) => actionElement.click(), actionElement );
            if ( actionClassName.indexOf("VideoContainer_previewPassLoginLink") != -1 ) {
                try {
                    // Click Sign in again if necessary
                    await this.page.waitFor(700);
                    await this.page.waitForSelector("*[class^='AuthSignIn_button']", {timeout: (Site.STANDARD_WAIT_OK_TIMEOUT * 4)});
                    await this.page.evaluate( () => document.querySelector("*[class^='AuthSignIn_button']").click() );
                }
                catch (err) { console.log(err); }
            }
            let returnVal = await this.login();
            if( !returnVal ) return Promise.resolve(1);
        }

        // Wait for the play button
        await this.page.waitForSelector("video", {timeout: (Site.STANDARD_TIMEOUT * 2)});

        await this.page.evaluate( () => document.querySelector("video").webkitRequestFullScreen() );
        return Promise.resolve(1);
    }

};

module.exports = FoxSite;
