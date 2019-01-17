/**
 * @file    Animal Planet Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const ANIMAL_PLANET_URL = "https://www.animalplanet.com/watch/animal-planet";

/**
 * Class representing an Animal Planet Site.
 */
class AnimalPlanet extends Site {

    static get ANIMAL_PLANET_URL() { return ANIMAL_PLANET_URL; };

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
            await this.page.goto(ANIMAL_PLANET_URL, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the schedule is loaded
            await this.page.waitForSelector('.headerLiveStream__name', {timeout: Site.STANDARD_TIMEOUT});

            let network = this.constructor.name.toLowerCase();
            let channel = network;

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    await (await (await this.page.$(".headerLiveStream__name")).getProperty('textContent')).jsonValue(),
                    ANIMAL_PLANET_URL,
                    null,
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
     * Login to Animal Planet.
     * @returns {Promise}
     */
    async login() {
        // TODO
    }

    /**
     * Begin watching something on Animal Planet.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // TODO
        return Promise.resolve(1);
    }

};

module.exports = AnimalPlanet;
