/**
 * @file    PBS KIDS Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const PBS_KIDS_URL = "https://pbskids.org/video/livetv";

/**
 * Class representing a PBS KIDS Site.
 */
class PbsKids extends Site {

    static get PBS_KIDS_URL() { return PBS_KIDS_URL; };

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
            await this.page.goto(PBS_KIDS_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the live program is loaded
            await this.page.waitForSelector('.stream-program-title', {timeout: Site.STANDARD_TIMEOUT});

            let network = this.constructor.name.toLowerCase();
            let channel = network;
            let startDate = Date.now();

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    await (await (await this.page.$(".stream-program-title")).getProperty('textContent')).jsonValue(),
                    PBS_KIDS_URL,
                    startDate,
                    null,
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
     * Begin watching something on PBS KIDS.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // Wait for the fullscreen button
        await this.page.waitForSelector(".vjs-fullscreen-control", {timeout: Site.STANDARD_TIMEOUT});
        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector('.vjs-fullscreen-control').click(); } );
        return Promise.resolve(1);
    }

};

module.exports = PbsKids;