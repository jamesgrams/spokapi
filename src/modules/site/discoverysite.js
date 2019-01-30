/**
 * @file    Abstract Discovery Site for Spokapi
 * @author  James Grams
 * Discovery owns several channels (Discovery, Animal Planet, Investigation Discovery, etc.)
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
    "directv": "",
    "spectrum": "",
    "xfinity": "",
    "dish": "",
    "cox": "",
    "hulu": "",
    "mediacom": "",
    "suddenlink": "",
    "optimum": "",
    "frontiercommunications": "",
    "verizonfios": "",
    "attuverse": "AT&T U-Verse"
}

/**
 * Abstract class representing a Discovery Site.
 */
class DiscoverySite extends Site {

    static get VALID_PROVIDERS() { return VALID_PROVIDERS; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    * @param {string} url - The watch url for this discovery site
    * @param {string} channelName - The channel name to display
    */
    constructor(page, url, channelName) {
        super(page);
        this.url = url;
        this.channelName = channelName;
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

        try {
            await this.page.goto(this.url, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the live program is loaded
            await this.page.waitForSelector('.headerLiveStream__name', {timeout: Site.STANDARD_TIMEOUT});

            // Wait until the listing of what's on now is listed
            await this.page.waitForSelector(".liveVideoMetadata__now", {timeout: Site.STANDARD_TIMEOUT});

            let network = this.constructor.name.toLowerCase();
            let channel = this.channelName ? this.channelName : network;
            let startTime = await (await this.page.$(".liveVideoMetadata__now .liveVideoMetadata__time")).getProperty('textContent');
            let endTime = await (await this.page.$(".liveVideoMetadata__next .liveVideoMetadata__time")).getProperty('textContent');

            let timeRegex = /(\d+):(\d+)([AP])/;
            let startMatch = timeRegex.exec(startTime);
            let endMatch = timeRegex.exec(endTime);
            let times = Site.makeTimes(startMatch[1], startMatch[2], startMatch[3], endMatch[1], endMatch[2], endMatch[3]);

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    await (await (await this.page.$(".headerLiveStream__name")).getProperty('textContent')).jsonValue(),
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
        return Promise.resolve(programs);
    }

    /**
     * Login to Discovery.
     * @returns {Promise}
     */
    async login() {
        // Click sign in
        let signInButton = await this.page.$('.play-button');
        await signInButton.click();
        // Wait for the list of providers
        await this.page.waitForSelector('.affiliateList__preferred', {timeout: Site.STANDARD_TIMEOUT});

        // Wait until we have the option to log in
        let provider = this.constructor.getProvider();
        if( !provider ) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }

        let providerSelector = '//span[contains(@class,"affiliateList__item")][contains(text(),"'+provider.name+'")]';
        // Wait for the provider selector to be visible
        await this.page.waitForXPath(providerSelector, {timeout: Site.STANDARD_TIMEOUT});
        // Click the provider selector
        let providerElements = await this.page.$x(providerSelector);
        await providerElements[0].click();
        // We should be on our Provider screen now
        try {
            await provider.login(this.page, Site.STANDARD_TIMEOUT);
        }
        catch (err) { console.log(err); }
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on Discovery.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // See if we need to log in
        try {
            // Wait for the fullscreen indicator (we will use this to know we are logged in)
            await this.page.waitForSelector("button[data-plyr='fullscreen']", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let signInButton = await this.page.$('.play-button');
            if( signInButton ) {
                let returnVal = await this.login();
                if( !returnVal ) return Promise.resolve(1);
            }
        }
        // Wait for the play button
        await this.page.waitForSelector("button[data-plyr='fullscreen']", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.click("button[data-plyr='fullscreen']");
        return Promise.resolve(1);
    }

};

module.exports = DiscoverySite;
