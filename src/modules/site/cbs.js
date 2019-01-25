/**
 * @file    CBS Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @type {string}
 * @default
 */
var cbsUsername = process.env.SPOKAPI_CBS_USERNAME;
/**
 * @type {string}
 * @default
 */
var cbsPassword = process.env.SPOKAPI_CBS_PASSWORD;
/**
 * @constant
 * @type {string}
 * @default
 */
const CBS_URL = "https://www.cbs.com/live-tv/stream/tveverywhere/";

/**
 * Class representing a CBS Site.
 */
class Cbs extends Site {

    static get cbsUsername() { return cbsUsername };
    static set cbsUsername(user) { cbsUsername = user };
    static get cbsPassword() { return cbsPassword };
    static set cbsPassword(pass) { cbsPassword = pass };
    static get CBS_URL() { return CBS_URL; };

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
        let programs = [];
        let network = this.constructor.name.toLowerCase();

        // Make sure the network is not blacklisted
        if( Site.unsupportedChannels.indexOf(network) === -1 ) {
            programs.push( new Program (
                "CBS",
                CBS_URL,
                Date.now(),
                null,
                network,
                network,
                null,
                null,
                null,
                null,
                null
            ) );
        }

        return Promise.resolve(programs);
    }

    /**
     * Login to CBS (Cable Provider).
     * @returns {Promise}
     */
    async login() {
        // Wait for the list of providers
        try {
            await this.page.waitForSelector('.providers__grid-view', {timeout: 7000});

            let providerSelector = "";
            if( Site.provider === "Spectrum" ) {
                providerSelector = "#grid-section-wrap div:nth-child(8)";
            }
            await this.page.click(providerSelector);
            // We should be on our Provider screen now
            await this.loginProvider();
        }
        // It doesn't want our TV Provider
        catch (err) { console.log(err); }

        return Promise.resolve(1);
    }

    /**
     * Login to CBS (CBS)
     * @returns {Promise}
     */
    async loginCbs() {
        try {
            // Login to CBS Account
            await this.page.waitForSelector("#mvpd-signin", {timeout: Site.STANDARD_TIMEOUT});
            await this.page.waitFor(1000);
            // Click login
            await this.page.evaluate( () => { document.querySelector('#mvpd-signin').click(); } );
            // Wait until we have the username box
            await this.page.waitForSelector("#j_username", {timeout: Site.STANDARD_TIMEOUT});
            await this.page.waitFor(1000);
            // Enter the username and password
            await this.page.evaluate( (cbsUsername) => { document.querySelector('#j_username').value =cbsUsername; }, cbsUsername );
            await this.page.evaluate( (cbsPassword) => { document.querySelector('#j_password').value =cbsPassword; }, cbsPassword );
            // Login
            await this.page.click('#submit-btn');
        }
        // We didn't actually have to sign in
        catch (err) { console.log(err); }

        return Promise.resolve(1);
    }

    /**
     * Begin watching something on CBS.
     * Note: You should already be at the correct url
     * @returns {Promise}
     */
    async watch() {
        // This means the page should be ready
        await this.page.waitForSelector("#flashcontent", {timeout: Site.STANDARD_TIMEOUT});
        // See what we need to do
        await this.page.waitFor(1500);
        await this.page.waitForSelector("#LIVE_TV_CONTENT, #mvpd-signin, .providers__grid-view", {timeout: Site.STANDARD_TIMEOUT});

        let actionElement = await this.page.$("#LIVE_TV_CONTENT, #mvpd-signin, .providers__grid-view");
        let actionClassName = await (await actionElement.getProperty("className")).jsonValue();
        // We need to login to Spectrum
        if( actionClassName.indexOf("providers__grid-view") != -1 ) {
            await this.login();
            await this.loginCbs();
        }
        // We need to login to CBS
        else if( await (await actionElement.getProperty("id")).jsonValue() == "#mvpd-signin" ) {
            await this.loginCbs();
        }
        // We don't need to login to anything!
        // Wait for the drop down arrow to log out
        await this.page.waitForSelector("#userBarArrow", {timeout: Site.STANDARD_TIMEOUT});
        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector('#LIVE_TV_CONTENT').webkitRequestFullScreen(); } );
        return Promise.resolve(1);
    }

};

module.exports = Cbs;
