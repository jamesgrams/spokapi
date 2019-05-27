/**
 * @file    Adult Swim Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const ADULT_SWIM_URL = "https://www.adultswim.com/streams/";
/**
 * @constant
 * @type {Object<string,string>}
 * These are lowercase class names and values to be used in the 
 * selector when finding the provider link if different from the 
 * provider default name
 */
const VALID_PROVIDERS = {
    "attuverse": "",
    "cox": "",
    "directv": "",
    "dish": "",
    "frontiercommunications": "",
    "mediacom": "",
    "optimum": "",
    "spectrum": "Charter Spectrum",
    "suddenlink": "",
    "verizonfios": "Verizon",
    "xfinity": ""
}

/**
 * Class representing an Adult Swim Site.
 */
class AdultSwim extends Site {

    static get ADULT_SWIM_URL() { return ADULT_SWIM_URL; };
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
            await this.page.goto(ADULT_SWIM_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the schedule is loaded
            await this.page.waitForSelector('#__next nav', {timeout: Site.STANDARD_TIMEOUT});

            // Get all the links to programs
            let streams = await this.page.$$('#__next nav li');
            // All the programs are listed in tables (1 table per SUBSPORT)
            for (let stream of streams) {

                let network = this.constructor.name.toLowerCase();
                let channel = "Adult Swim";

                let title = "";
                let svgTitle = await stream.$("svg");
                if( svgTitle ) {
                    title = await this.page.evaluate( (svgTitle) => { return svgTitle.getAttribute("aria-label"); }, svgTitle );
                }
                else {
                    title = await ( await( await stream.$("span")).getProperty('textContent') ).jsonValue() ;
                }
                let thumbnail = await ( await( await stream.$("img")).getProperty('src') ).jsonValue() ;
                let link = await ( await( await stream.$("a")).getProperty('href') ).jsonValue() ;

                // Make sure the network is not blacklisted
                if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                    programs.push( new Program (
                        title,
                        link,
                        null,
                        null,
                        network,
                        channel,
                        null,
                        null,
                        null,
                        null,
                        thumbnail
                    ) );
                }

            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(programs);
    }

    /**
     * Begin watching something on Adult Swim.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {
        
        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

        await this.page.waitForSelector("video", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector('video').parentNode.webkitRequestFullScreen(); } );
        return Promise.resolve(1);
    }

};

module.exports = AdultSwim;