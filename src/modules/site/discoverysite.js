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
        let baseUrlRegex = /(.*\.com)/;
        let baseUrl = baseUrlRegex.exec(this.url)[1];
        this.scheduleUrl = baseUrl + "/schedule";
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

            let title = await (await (await this.page.$(".headerLiveStream__name")).getProperty('textContent')).jsonValue();
            let network = this.constructor.name.toLowerCase();
            let channel = this.channelName ? this.channelName : network;
            let startTime = await( await (await this.page.$(".liveVideoMetadata__now .liveVideoMetadata__time")).getProperty('textContent')).jsonValue();
            let endTime = await( await (await this.page.$(".liveVideoMetadata__next .liveVideoMetadata__time")).getProperty('textContent')).jsonValue();

            let timeRegex = /(\d+):(\d+)([AP])/;
            let startMatch = timeRegex.exec(startTime);
            let endMatch = timeRegex.exec(endTime);
            let times = Site.makeTimes(startMatch[1], startMatch[2], startMatch[3], endMatch[1], endMatch[2], endMatch[3]);

            // Now, we need to view the full schedule to get the extra information that we need
            await this.page.goto(this.scheduleUrl, {timeout: Site.STANDARD_TIMEOUT});

            // Wait for the show full schedule button and click it
            await this.page.waitForSelector( ".schedule__listingsButton", {timeout: Site.STANDARD_TIMEOUT});
            await this.page.evaluate( () => document.querySelector(".schedule__listingsButton").click() );

            // Wait for the selector for the current time
            let liveSelector = '//div[@class="episodeScheduleTile__time"]/p[text()="' + startTime.replace(/\s.*/,"").replace(/A/," A").replace(/P/, " P") + '"]/../..';
            await this.page.waitForXPath(liveSelector, {timeout: Site.STANDARD_TIMEOUT});
            let liveElement = await this.page.waitForXPath(liveSelector);

            let description = await this.page.evaluate( (liveElement) => liveElement.querySelector(".episodeScheduleTile__episodeDescription").innerText, liveElement );
            let episodeTitle = await this.page.evaluate( (liveElement) => liveElement.querySelector(".episodeScheduleTile__episodeTitle").innerText, liveElement );
            let thumbnail = "";
            try {
                thumbnail = await this.page.evaluate( (liveElement) => liveElement.querySelector('img').getAttribute('src'), liveElement );
            }
            catch(err) { // No thumbnail
                console.log(err);
            }
            let season = "";
            let episode = "";
            try {
                let seasonEpisode = await this.page.evaluate( (liveElement) => liveElement.querySelector('.episodeScheduleTile__episodeNumber').innerText, liveElement );
                let seasonEpisodeRegex = /(Season\s(\d+)\s)?Episode\s(\d+)/i;
                let seasonEpisodeMatch = await seasonEpisodeRegex.exec(seasonEpisode);
                if( seasonEpisodeMatch ) {
                    if( seasonEpisodeMatch[2] ) {
                        season = seasonEpisodeMatch[2];
                    }
                    if( seasonEpisodeMatch[3] ) {
                        episode = seasonEpisodeMatch[3];
                    }
                }
            }
            catch (err) { // There is no season episode
                console.log(err);
            }

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    title,
                    this.url,
                    times.start,
                    times.run,
                    network,
                    channel,
                    description,
                    season,
                    episode,
                    episodeTitle,
                    thumbnail
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
        await this.page.evaluate( (signInButton) => signInButton.click(), signInButton );
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
        await this.page.evaluate( (providerElement) => providerElement.click(), providerElements[0] );
        // We should be on our Provider screen now
        try {
            await provider.login(this.page, Site.STANDARD_TIMEOUT);
        }
        catch (err) { console.log(err); }
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on Discovery.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {

        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

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

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        await this.page.evaluate( () => document.querySelector("button[data-plyr='fullscreen']").click() );
        return Promise.resolve(1);
    }

};

module.exports = DiscoverySite;
