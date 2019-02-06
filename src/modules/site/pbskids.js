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
    "optimum": "",
    "slingtv": "",
    "frontiercommunications": "",
    "verizonfios": "",
    "attuverse": ""
};

/**
 * Class representing a PBS KIDS Site.
 */
class PbsKids extends Site {

    static get PBS_KIDS_URL() { return PBS_KIDS_URL; };
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
            await this.page.goto(PBS_KIDS_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the live program is loaded
            await this.page.waitForSelector('.stream-item.active .stream-program-title', {timeout: Site.STANDARD_TIMEOUT});

            let network = this.constructor.name.toLowerCase();
            let channel = "PBS KIDS";

            let seasonEpisode = await this.page.evaluate( () => document.querySelector(".stream-item.active").getAttribute("data-nola-episode") );
            let season;
            let episode;
            try {
                season = parseInt( seasonEpisode.substr(0, seasonEpisode.length - 2) );
                episode = parseInt( seasonEpisode.substr(seasonEpisode.length - 2) );
            }
            catch(err) { console.log(err) }

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    await (await (await this.page.$(".stream-item.active .stream-image-container")).getProperty('alt')).jsonValue(),
                    PBS_KIDS_URL,
                    new Date( Date.parse(  await this.page.evaluate( () => document.querySelector(".stream-item.active").getAttribute("data-time") )  ) ),
                    parseInt( await this.page.evaluate( () => document.querySelector(".stream-item.active").getAttribute("data-duration") ) ) * 60000,
                    network,
                    channel,
                    null,
                    season,
                    episode,
                    await (await (await this.page.$(".stream-item.active .stream-program-title")).getProperty('textContent')).jsonValue(),
                    await (await (await this.page.$(".stream-item.active .stream-image-container")).getProperty('src')).jsonValue()
                ) );
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(programs);
    }

    /**
     * Begin watching something on PBS KIDS.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {

        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

        // Wait for the fullscreen button
        await this.page.waitForSelector(".vjs-fullscreen-control", {timeout: Site.STANDARD_TIMEOUT});

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector('.vjs-fullscreen-control').click(); } );
        return Promise.resolve(1);
    }

};

module.exports = PbsKids;