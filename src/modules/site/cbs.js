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
 * @constant
 * @type {Object<string,string>}
 * These are lowercase class names and values to be used in the 
 * selector when finding the provider link if different from the 
 * provider default name
 */
const VALID_PROVIDERS = {
    "spectrum": "",
    "dish": "",
    "hulu": "",
    "mediacom": "",
    "suddenlink": "",
    "optimum": "",
    "frontiercommunications": "",
    "verizonfios": ""
};

/**
 * Class representing a CBS Site.
 */
class Cbs extends Site {

    static get cbsUsername() { return cbsUsername };
    static set cbsUsername(user) { cbsUsername = user };
    static get cbsPassword() { return cbsPassword };
    static set cbsPassword(pass) { cbsPassword = pass };
    static get CBS_URL() { return CBS_URL; };
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
                "CBS",
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

            // Wait until we have the option to log in
            let provider = this.constructor.getProvider();
            if( !provider ) { // Provider unsupported
                await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
                return Promise.resolve(0);
            }

            // Click the "More Providers" button
            await this.page.evaluate( () => document.querySelector(".button--cta").click() );
            await this.page.waitForSelector( 'div[data-provider-id="'+provider.name+'"]', {timeout: Site.STANDARD_TIMEOUT} );
            // Click the input field
            await this.page.evaluate( () => document.querySelector(".providers__search-field").focus() );
            await this.page.keyboard.type(provider.name);
            await this.page.waitFor(250);
            await this.page.keyboard.press("ArrowDown");
            await this.page.keyboard.press("Enter");
            
            // Click the sign in button
            await this.page.evaluate( () => document.querySelectorAll(".button--cta")[1].click() );

            // We should be on our Provider screen now
            try {
                await provider.login(this.page, Site.STANDARD_TIMEOUT);
            }
            catch (err) { console.log(err); }
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
            await this.page.evaluate( () => { document.querySelector('#submit-btn').click(); } );
        }
        // We didn't actually have to sign in
        catch (err) { console.log(err); }

        return Promise.resolve(1);
    }

    /**
     * Begin watching something on CBS.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {
        
        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

        // This means the page should be ready
        await this.page.waitForSelector("#flashcontent", {timeout: Site.STANDARD_TIMEOUT});
        // See what we need to do
        await this.page.waitFor(1500);
        await this.page.waitForSelector("#LIVE_TV_CONTENT, #mvpd-signin, .providers__grid-view", {timeout: Site.STANDARD_TIMEOUT});

        let actionElement = await this.page.$("#LIVE_TV_CONTENT, #mvpd-signin, .providers__grid-view");
        let actionClassName = await (await actionElement.getProperty("className")).jsonValue();
        // We need to login to Spectrum
        if( actionClassName.indexOf("providers__grid-view") != -1 ) {
            let returnVal = await this.login();
            if( !returnVal ) return Promise.resolve(1);
            await this.loginCbs();
        }
        // We need to login to CBS
        else if( await (await actionElement.getProperty("id")).jsonValue() == "#mvpd-signin" ) {
            await this.loginCbs();
        }

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // We don't need to login to anything!
        // Wait for the drop down arrow to log out
        await this.page.waitForSelector("#userBarArrow", {timeout: Site.STANDARD_TIMEOUT});

        // Click the full screen button
        await this.page.evaluate( () => { document.querySelector('#LIVE_TV_CONTENT').webkitRequestFullScreen(); } );
        return Promise.resolve(1);
    }

};

module.exports = Cbs;
