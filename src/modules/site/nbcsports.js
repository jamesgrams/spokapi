/**
 * @file    NBC Sports Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Game 	= require('../../modules/game');

/**
 * @constant
 * @type {string}
 * @default
 */
const NBC_SPORTS_URL = "https://www.nbcsports.com/live";

/**
 * Class representing an NBC Sports Site.
 */
class NbcSports extends Site {

    static get NBC_SPORTS_URL() { return NBC_SPORTS_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page);
    }
    
    /**
     * Generate a list of games available on this site.
     * @returns {Promise<Array.<Game>>}
     */
    async generateGames() {
        if(!this.page) {
            this.page = await this.openPage();
        }

        let games = [];

        try {
            await this.page.goto(NBC_SPORTS_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the schedule is loaded
            // There may not be any live events
            try {
                await this.page.waitForSelector(".events-list__list-wrapper_live", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
            }
            // There are no live events
            catch(err) {
                return Promise.resolve(games);
            }

            // Get the live section
            let liveSection = await this.page.$(".events-list__list-wrapper_live",{timeout: Site.STANDARD_TIMEOUT});
            // Get all the events
            let liveEvents = await liveSection.$$('.live-upcoming-list__event');

            // Generate the games by cycling through live events
            for ( let liveEvent of liveEvents ) {
                let network = this.constructor.name.toLowerCase();
                let subnetwork = await (await (await liveEvent.$(".live-upcoming-list__event-channel")).getProperty('textContent')).jsonValue();

                // Make sure the network is not blacklisted
                if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(subnetwork) === -1 ) {
                    games.push( new Game (
                        await (await (await liveEvent.$(".live-upcoming-list__event-name")).getProperty('textContent')).jsonValue(),
                        await (await (await liveEvent.$(".link")).getProperty('href')).jsonValue(),
                        await (await (await liveEvent.$(".live-upcoming-list__event-time")).getProperty('textContent')).jsonValue(),
                        await (await (await liveEvent.$(".live-upcoming-list__event-type")).getProperty('textContent')).jsonValue(),
                        network, // This is the network (this class name)
                        null,
                        subnetwork
                    ) );
                }
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(games);
    }

    /**
     * Login to NBC Sports.
     * @returns {Promise}
     */
    async login() {
        // Wait for the sign in initiater
        await this.page.waitForSelector("#accessEnablerUI", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.evaluate( () => { document.querySelector('#accessEnablerLogin').click(); } );
        // Wait until we have the option to log in
        let providerSelector = "";
        if( Site.provider === "Spectrum" ) {
            providerSelector = "a[provider-id='Charter_Direct']";
        }
        await this.page.waitForSelector(providerSelector, {timeout: Site.STANDARD_TIMEOUT});
        await this.page.evaluate( (providerSelector) => document.querySelector(providerSelector).click(), providerSelector );
        // We should be on our Provider screen now
        await this.loginProvider();
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on NBC Sports.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // Wait until the login detector is loaded
        await this.page.waitForSelector("#accessEnablerUI", {timeout: Site.STANDARD_TIMEOUT});
        // See if we need to log in
        try {
            // Wait for the logout button
            await this.page.waitForSelector("#accessEnablerLogout", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            await this.login();
        }
        // Wait for the container
        await this.page.waitForSelector(".playerContainer, #video-container", {timeout: Site.STANDARD_TIMEOUT}); // There may be an ad before we go full screen
        // Wait for a play button, sometimes it autoplays though..
        try {
            await this.page.waitForSelector('.player-wrapper', {timeout: 7000}); // Note this is non-standard
            await this.page.click('.player-wrapper');
        }
        // OK to autoplay
        catch(err) { }
        // Click the full screen button (it might be hidden, so use evaluate)
        let container = "#video-container";
        if( await(this.page.$(".playerContainer")) ) {
            container = ".playerContainer";
        }
        await this.page.evaluate( (container) => { document.querySelector(container).webkitRequestFullScreen(); }, container );
        return Promise.resolve(1);
    }

};

module.exports = NbcSports;
