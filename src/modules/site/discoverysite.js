/**
 * @file    Abstract Discovery Site for Spokapi
 * @author  James Grams
 * Discovery owns several channels (Discovery, Animal Planet, Investigation Discovery, etc.)
 * They all use a similar streaming portal
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * Abstract class representing a Discovery Site.
 */
class DiscoverySite extends Site {

    static get DISCOVERY_URL() { return DISCOVERY_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    * @param {string} url - The watch url for this discovery site
    */
    constructor(page, url) {
        super(page);
        this.url = url;
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
            let channel = network;
            let startTime = await (await this.page.$(".liveVideoMetadata__now .liveVideoMetadata__time")).getProperty('textContent');
            let endTime = await (await this.page.$(".liveVideoMetadata__next .liveVideoMetadata__time")).getProperty('textContent');

            let timeRegex = /(\d+):(\d+)([AP])/;
            let startMatch = timeRegex.exec(startTime);
            let endMatch = timeRegex.exec(endTime);
            let startDate = new Date(0, 0, 0, parseInt(startMatch[1]) + (startMatch[3] == "P" ? 12 : 0), parseInt(startMatch[2]), 0, 0);
            let endDate = new Date(0, 0, 0, parseInt(endMatch[1]) + (endMatch[3] == "P" ? 12 : 0), parseInt(endMatch[2]), 0, 0);
            let runtime = Math.abs(endDate.getTime() - startDate.getTime());

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    await (await (await this.page.$(".headerLiveStream__name")).getProperty('textContent')).jsonValue(),
                    this.url,
                    startDate,
                    runtime,
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

        let providerSelector = "";
        if( Site.provider === "Spectrum" || 
            Site.provider === "DIRECTV" || 
            Site.provider === "Verizon Fios" ||
            Site.provider === "Xfinity" ||
            Site.provider === "DISH" ||
            Site.provider === "Cox" ||
            Site.provider === "Optimum" ||
            Site.provider === "Hulu" ||
            Site.provider === "Suddenlink" ||
            Site.provider === "Frontier Communications" ||
            Site.provider === "Mediacom" ) {
            providerSelector = Site.provider;
        }
        else if( Site.provider === "AT&T U-verse") {
            providerSelector = "AT&T U-Verse";
        }
        else { // Provider unsupported
            this.stop();
            return Promise.resolve(1);
        }
        providerSelector = '//span[contains(@class,"affiliateList__item")][contains(text(),"'+providerSelector+'")]';
        // Wait for the provider selector to be visible
        await this.page.waitForXPath(providerSelector, {timeout: Site.STANDARD_TIMEOUT});
        // Click the provider selector
        let providerElements = await this.page.$x(providerSelector);
        await providerElements[0].click();
        // We should be on our Provider screen now
        await this.loginProvider();
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
                await this.login();
            }
        }
        // Wait for the play button
        await this.page.waitForSelector("button[data-plyr='fullscreen']", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.click("button[data-plyr='fullscreen']");
        return Promise.resolve(1);
    }

};

module.exports = DiscoverySite;
