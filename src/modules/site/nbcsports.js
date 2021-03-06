/**
 * @file    NBC Sports Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const NBC_SPORTS_URL = "https://www.nbcsports.com/live";
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
    "directvnow": "",
    "hulu": "",
    "mediacom": "",
    "suddenlink": "",
    "optimum": "Optimum",
    "slingtv": "Sling Television",
    "frontiercommunications": "FRONTIER",
    "verizonfios": "Verizon FIOS",
    "attuverse": "AT&T"
};

/**
 * Class representing an NBC Sports Site.
 */
class NbcSports extends Site {

    static get NBC_SPORTS_URL() { return NBC_SPORTS_URL; };
    static get VALID_PROVIDERS() { return VALID_PROVIDERS; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page);
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
            await this.page.goto(NBC_SPORTS_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the schedule is loaded
            // There may not be any live events
            try {
                await this.page.waitForSelector(".events-list__list-wrapper_live", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
            }
            // There are no live events
            catch(err) {
                return Promise.resolve(programs);
            }

            // Get the live section
            let liveSection = await this.page.$(".events-list__list-wrapper_live",{timeout: Site.STANDARD_TIMEOUT});
            // Get all the events
            let liveEvents = await liveSection.$$('.live-upcoming-list__event');

            // Generate the programs by cycling through live events
            for ( let liveEvent of liveEvents ) {
                let network = this.constructor.name.toLowerCase();
                let channel = await (await (await liveEvent.$(".live-upcoming-list__event-channel")).getProperty('textContent')).jsonValue();

                // Format the time properly into a date object
                let startTime = await (await (await liveEvent.$(".live-upcoming-list__event-time")).getProperty('textContent')).jsonValue();
                let timeRegex = /(\d+):(\d+)\s([ap])/;
                let startMatch = timeRegex.exec(startTime);
                let times = Site.makeTimes(startMatch[1], startMatch[2], startMatch[3]);

                // Make sure the network is not blacklisted
                if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                    programs.push( new Program (
                        await (await (await liveEvent.$(".live-upcoming-list__event-name")).getProperty('textContent')).jsonValue(),
                        await (await (await liveEvent.$(".link")).getProperty('href')).jsonValue(),
                        times.start,
                        null,
                        network,
                        channel,
                        await (await (await liveEvent.$(".live-upcoming-list__event-type")).getProperty('textContent')).jsonValue(),
                        null, 
                        null,
                        null,
                        null
                    ) );
                }
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(programs);
    }

    /**
     * Login to NBC Sports.
     * @returns {Promise}
     */
    async login() {
        // Wait for the sign in initiater
        let initiater = "#accessEnablerLogin"; // Click access enabler login for good measure
        await this.page.waitForSelector(initiater, {timeout: Site.STANDARD_TIMEOUT});
        await this.page.evaluate( (initiater) => { document.querySelector(initiater).click(); }, initiater );

        // Click verify now if necessary
        if( await(this.page.$("#temp-pass-login")) ) {
            initiater = "#temp-pass-login";
            await this.page.waitForSelector(initiater, {timeout: Site.STANDARD_TIMEOUT});
            await this.page.evaluate( (initiater) => { document.querySelector(initiater).click(); }, initiater );
        }

        // Wait until we have the option to log in
        let provider = this.constructor.getProvider();
        if( !provider ) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }

        let providerSelector = '//a[contains(@class,"selectboxit-option-anchor")][contains(text(),"'+provider.name+'")]';
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
     * Begin watching something on NBC Sports.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {

        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

        // Wait until the login detector is loaded
        await this.page.waitForSelector("#accessEnablerUI", {timeout: Site.STANDARD_TIMEOUT});
        // See if we need to log in
        try {
            // Wait for the logout button
            await this.page.waitForSelector("#accessEnablerLogout", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT, visible: true});
        }
        // We need to log in
        catch(err) {
            let returnVal = await this.login();
            if( !returnVal ) return Promise.resolve(1);
        }
        // Wait for the container
        await this.page.waitForSelector(".playerContainer, #video-container", {timeout: Site.STANDARD_TIMEOUT}); // There may be an ad before we go full screen
        // Wait for a play button, sometimes it autoplays though..
        try {
            await this.page.waitForSelector('.player-wrapper', {timeout: 7000}); // Note this is non-standard
            await this.page.evaluate( () => document.querySelector(".player-wrapper").click() );
        }
        // OK to autoplay
        catch(err) { }
        // Click the full screen button (it might be hidden, so use evaluate)
        let container = "#video-container";
        if( await(this.page.$(".playerContainer")) ) {
            container = ".playerContainer";
        }

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        await this.page.evaluate( (container) => { document.querySelector(container).webkitRequestFullScreen(); }, container );
        return Promise.resolve(1);
    }

};

module.exports = NbcSports;
