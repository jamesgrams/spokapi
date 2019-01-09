/**
 * @file    Espn Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Game 	= require('../../modules/game');

/**
 * @constant
 * @type {string}
 * @default
 */
const ESPN_URL = "http://www.espn.com/watch/schedule/";

/**
 * Class representing an ESPN Site.
 */
class Espn extends Site {

    static get ESPN_URL() { return ESPN_URL; };

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
            await this.page.goto(ESPN_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the schedule is loaded
            await this.page.waitForSelector('#tabLive a', {timeout: Site.STANDARD_TIMEOUT});

            // Get all the links to games
            let sportTables = await this.page.$$('#tabLive table');
            // All the games are listed in tables (1 table per SUBSPORT)
            for (let sportTable of sportTables) {

                // Get the sport
                let sportTableTitle = await this.page.evaluateHandle(
                    element => element.closest('.responsive-table-wrap').previousSibling.querySelector('h2'),
                    sportTable
                );
                // Evaluate Handle will return a JSHandle (JS object), which we can convert to an element
                // Evaluate will return null unless you return a promise with a value. You can get that value.
                sportTableTitle = await sportTableTitle.asElement();
                let sport = await (await sportTableTitle.getProperty('textContent')).jsonValue();

                // Get the data for each individual game
                let gameRows = await sportTable.$$("tbody tr");
                for (let gameRow of gameRows) {

                    // Get the "subsport" (e.g. NCAA Men's Basketball)
                    // Check there will be a subsport
                    let sportTableSubTitle = await sportTable.$('thead span');
                    let subsport = null;
                    if( sportTableSubTitle ) {
                        // Get the closest one
                        sportTableSubTitle = await this.page.evaluateHandle(
                            element => element.closest('tbody').previousSibling.querySelector('span'),
                            gameRow
                        );
                        sportTableSubTitle = sportTableSubTitle.asElement();
                        // There can still sometimes be no subtitle...
                        if( sportTableSubTitle ) {
                            subsport = await (await sportTableSubTitle.getProperty('textContent')).jsonValue();
                        }
                    }

                    let network = this.constructor.name.toLowerCase();
                    let subnetwork = await (await (await gameRow.$(".schedule__network img")).getProperty('alt')).jsonValue();

                    // Make sure the network is not blacklisted
                    if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(subnetwork) === -1 ) {
                        games.push( new Game (
                            await (await (await gameRow.$(".schedule__competitors a")).getProperty('textContent')).jsonValue(),
                            await (await (await gameRow.$(".schedule__competitors a")).getProperty('href')).jsonValue(),
                            await (await (await gameRow.$(".schedule__time")).getProperty('textContent')).jsonValue(),
                            sport,
                            network, // This is the network (this class name)
                            subsport,
                            subnetwork
                        ) );
                    }
                }
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(games);
    }

    /**
     * Login to ESPN.
     * @returns {Promise}
     */
    async login() {
        // Wait until we have the option to log in
        let providerSelector = "";
        if( Site.provider === "Spectrum" ) {
            providerSelector = "img[alt='Charter Spectrum']";
        }
        await this.page.waitForSelector(providerSelector, {timeout: Site.STANDARD_TIMEOUT});
        await this.page.evaluate( (providerSelector) => document.querySelector(providerSelector).click(), providerSelector );
        // We should be on our Provider screen now
        await this.loginProvider();
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on ESPN.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // See if we need to log in
        try {
            // Wait for the play button
            await this.page.waitForSelector(".vjs-big-play-button", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let modalPresented = await this.page.$('.watch-provider-modal');
            if( modalPresented ) {
                await this.login();
            }
        }
        // Wait for the play button
        await this.page.waitForSelector(".vjs-big-play-button", {timeout: Site.STANDARD_TIMEOUT});
        try {
            await this.page.click(".vjs-big-play-button");
        }
        // There may be autoplay.
        catch(err) {}
        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector('.vjs-fullscreen-control').click(); } );
        return Promise.resolve(1);
    }

};

module.exports = Espn;
