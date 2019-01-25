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
            // Wait until the live program is loaded
            await this.page.waitForSelector('.headerLiveStream__name', {timeout: Site.STANDARD_TIMEOUT});

            // Wait until the listing of what's on now is listed
            await this.page.waitForSelector(".liveVideoMetadata__now", {timeout: Site.STANDARD_TIMEOUT});

            let network = this.constructor.name.toLowerCase();
            let channel = network;
            let startTime = await (await this.page.$(".liveVideoMetadata__now .liveVideoMetadata__time")).getProperty('textContent');
            let endTime = await (await this.page.$(".liveVideoMetadata__next .liveVideoMetadata__time")).getProperty('textContent');

            let timeRegex = /(\d+):(\d+)([AP])/;
            let startMatch = timeRegex.exec(startTime);
            let endMatch = timeRegex.exec(endTime);
            let startDate = new Date(0, 0, 0, parseInt(startMatch[1]) + (startMatch[3] == "P" ? 12 : 0), parseInt(startMatch[2]), 0, 0);
            let endDate = new Date(0, 0, 0, parseInt(endMatch[1]) + (endMatch[3] == "P" ? 12 : 0), parseInt(endMatch[2]), 0, 0);
            let runtime = Math.abs(endDate.getTime() - startDate.getTime());

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    await (await (await this.page.$(".headerLiveStream__name")).getProperty('textContent')).jsonValue(),
                    ANIMAL_PLANET_URL,
                    startDate,
                    runtime,
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
        // Click sign in
        let signInButton = await this.page.$('.play-button');
        await signInButton.click();
        // Wait for the list of providers
        await this.page.waitForSelector('.affiliateList__preferred', {timeout: Site.STANDARD_TIMEOUT});

        let providerSelector = "";
        if( Site.provider === "Spectrum" ) {
            providerSelector = ".affiliateList__preferred ul li:nth-child(11)";
        }
        else if( Site.provider === "DIRECTV" ) {
            providerSelector = ".affiliateList__preferred ul li:nth-child(1)";
        }
        await this.page.click(providerSelector);
        // We should be on our Provider screen now
        await this.loginProvider();
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on Animal Planet.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // See if we need to log in
        try {
            // Wait for the fullscreen indicator (we will use this to know we are logged in)
            await this.page.waitForSelector("button[data-plyr='fullscreen']", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let signInButton = await this.page.$('.play-button');
            if( signInButton ) {
                await this.login();
            }
        }
        // Wait for the play button
        await this.page.waitForSelector("button[data-plyr='fullscreen']", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.click("button[data-plyr='fullscreen']");
        return Promise.resolve(1);
    }

};

module.exports = AnimalPlanet;
