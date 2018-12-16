/**
 * @file    Fox Sports Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Game 	= require('../../modules/game');

/**
 * @constant
 * @type {string}
 * @default
 */
const FOX_SPORTS_URL = "https://www.foxsportsgo.com";
/**
 * @constant
 * @type {string}
 * @default
 */
const FOX_SPORTS_API_URL = "https://media-api.foxsportsgo.com/epg/ws/live/all";

/**
 * Class representing an Fox Sports Site.
 */
class FoxSports extends Site {

    static get FOX_SPORTS_URL() { return FOX_SPORTS_URL; };
    static get FOX_SPORTS_API_URL() { return FOX_SPORTS_API_URL; };

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

        // We have to go to fox sports, so fox will allow us to access the API
        // Otherwise, we will get rejected when we try to go to the API
        await this.page.goto(FOX_SPORTS_URL, {timeout: Site.STANDARD_TIMEOUT});
        // We need to make sure we are logged in for Fox, since Fox's data is location specific
        await this.checkLogin();
        await this.page.waitFor(500);
        // We now go to fox's API
        await this.page.goto(FOX_SPORTS_API_URL, {timeout: Site.STANDARD_TIMEOUT});

        // Get the JSON
        let jsonString = await this.page.evaluate( () => document.body.textContent );
        let json = JSON.parse(jsonString);
        
        // Iterate over the live items
        if( json.body.items && json.body.items.length ) {
            for ( let item of json.body.items ) {

                let airing = item.airings[0];
                let network = this.constructor.name.toLowerCase();
                let subnetwork = airing.channel_name;

                // Make sure the network is not blacklisted
                if( Site.UNSUPPORTED_CHANNELS.indexOf(network) === -1 && Site.UNSUPPORTED_CHANNELS.indexOf(subnetwork) === -1 ) {
                    games.push( new Game (
                        item.title,
                        FOX_SPORTS_URL + airing.mf_links[0].href.replace("airing/", ""),
                        new Date( Date.parse(item.airing_date) ).toLocaleTimeString(),
                        item.sport_tag,
                        network, // This is the network (this class name)
                        null,
                        subnetwork
                    ) );
                }
            }
        }
        
        await this.page.waitFor(100);
        return Promise.resolve(games);
    }

    /**
     * Login to Fox Sports.
     * @returns {Promise}
     */
    async login() {
        // Wait until we have the option to log in
        let providerSelector = "";
        if( Site.PROVIDER === "Spectrum" ) {
            providerSelector = ".provider-desktop-image-container:nth-child(5)";
        }
        await this.page.waitForSelector(providerSelector, {timeout: Site.STANDARD_TIMEOUT, visible: true});
        await this.page.evaluate( (providerSelector) => document.querySelector(providerSelector).click(), providerSelector );
        // We should be on our Provider screen now
        await this.loginProvider();
        // Make sure we are now logged in
        await this.page.waitForSelector(".fsg-header__mvpd-logo", {timeout: Site.STANDARD_TIMEOUT});
        return Promise.resolve(1);
    }

    /**
     * Check if it is neccessary to login and do so if needed
     * @returns {Promise}
     */
    async checkLogin() {
        // See if we need to log in
        try {
            // Wait for logo of our TV Provider (means we are signed in)
            await this.page.waitForSelector(".fsg-header__mvpd-logo", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            // Make sure we are on the login page
            if( ! (await this.page.$(".provider-desktop-image-container")) ) {
                await this.page.evaluate( () => document.querySelector(".fsg-header__tv-sign-in").click() );
            }

            await this.login();
        }
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on Fox Sports.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        await this.checkLogin();

        // Check in on whether or not we're playing by seeing if no ask is enabled
        await this.page.waitForSelector('#liveWFB' , {timeout: Site.STANDARD_TIMEOUT});
        let autoplayChecked = await this.page.evaluate( () => document.querySelector("#liveWFB").checked );
        if (!autoplayChecked) {
            await this.page.evaluate( () => document.querySelector("#liveWFB").click() );
            await this.page.reload();
        }

        // Go Fullscreen
        await this.page.waitForSelector("#video__wrapper", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.evaluate( () => { document.querySelector("#video__wrapper").webkitRequestFullScreen(); } );

        return Promise.resolve(1);
    }

};

module.exports = FoxSports;
