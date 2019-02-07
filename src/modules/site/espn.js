/**
 * @file    Espn Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const ESPN_URL = "http://www.espn.com/watch/schedule/";
/**
 * @constant
 * @type {Object<string,string>}
 * These are lowercase class names and values to be used in the 
 * selector when finding the provider link if different from the 
 * provider default name
 */
const VALID_PROVIDERS = {
    "directv": "",
    "verizonfios": "",
    "dish": "",
    "attuverse": "",
    "cox": "",
    "optimum": "",
    "slingtv": "",
    "directvnow": "",
    "hulu": "",
    "suddenlink": "",
    "frontiercommunications": "",
    "mediacom": "",
    "spectrum": "Charter Spectrum",
}

/**
 * Class representing an ESPN Site.
 */
class Espn extends Site {

    static get ESPN_URL() { return ESPN_URL; };
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
            await this.page.goto(ESPN_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the schedule is loaded
            await this.page.waitForSelector('#tabLive a', {timeout: Site.STANDARD_TIMEOUT});

            // Get all the links to programs
            let sportTables = await this.page.$$('#tabLive table');
            // All the programs are listed in tables (1 table per SUBSPORT)
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
                    let channel = "";
                    try {
                        channel = await (await (await gameRow.$(".schedule__network img")).getProperty('alt')).jsonValue();
                        channel = channel.toUpperCase();
                    }
                    catch(err) {console.log(err);}

                    // Format the time properly into a date object
                    let startTime = await (await (await gameRow.$(".schedule__time")).getProperty('textContent')).jsonValue();
                    let timeRegex = /(\d+):(\d+)\s([AP])/;
                    let startMatch = timeRegex.exec(startTime);
                    let times = Site.makeTimes(startMatch[1], startMatch[2], startMatch[3]);

                    // Make sure the network is not blacklisted
                    if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                        programs.push( new Program (
                            await (await (await gameRow.$(".schedule__competitors a")).getProperty('textContent')).jsonValue(),
                            await (await (await gameRow.$(".schedule__competitors a")).getProperty('href')).jsonValue(),
                            times.start,
                            null,
                            network,
                            channel,
                            sport + " - " + subsport,
                            null,
                            null,
                            null,
                            null
                        ) );
                    }
                }
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(programs);
    }

    /**
     * Login to ESPN.
     * @returns {Promise}
     */
    async login() {
        // Wait until we have the option to log in
        let provider = this.constructor.getProvider();
        if (!provider) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }
        let providerSelector = '//ul[contains(@class,"watchProvider__list-items")]//a[contains(text(),"'+provider.name+'")]';
        // Wait for the provider selector to be visible
        await this.page.waitForXPath(providerSelector, {timeout: Site.STANDARD_TIMEOUT});
        // Click the provider selector
        let providerElements = await this.page.$x(providerSelector);
        await this.page.evaluate( (providerElement) => providerElement.click(), providerElements[0] );
        // We should be on our Provider screen now
        await provider.login(this.page, Site.STANDARD_TIMEOUT);
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on ESPN.
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
            // Wait for the play button
            await this.page.waitForSelector(".vjs-big-play-button", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let modalPresented = await this.page.$('.watch-provider-modal');
            if( modalPresented ) {
                let returnVal = await this.login();
                if( !returnVal ) return Promise.resolve(1);
            }
        }
        // Wait for the play button
        await this.page.waitForSelector(".vjs-big-play-button", {timeout: Site.STANDARD_TIMEOUT});
        try {
            await this.page.evaluate( () => { document.querySelector('.vjs-big-play-button').click(); } );
        }
        // There may be autoplay.
        catch(err) {}

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector('.vjs-fullscreen-control').click(); } );
        return Promise.resolve(1);
    }

};

module.exports = Espn;