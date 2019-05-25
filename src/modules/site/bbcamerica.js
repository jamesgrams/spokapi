/**
 * @file    BBC America Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const BBC_AMERICA_URL = "http://www.bbcamerica.com/schedule";
/**
 * @constant
 * @type {string}
 * @default
 */
const BBC_AMERICA_LIVESTREAM_URL = "http://www.bbcamerica.com/livestream";
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
    "directvnow": "",
    "dish": "",
    "frontiercommunications": "Frontier",
    "mediacom": "",
    "optimum": "",
    "spectrum": "",
    "suddenlink": "",
    "verizonfios": "Verizon",
    "xfinity": ""
}

/**
 * Class representing an BBC America Site.
 */
class BbcAmerica extends Site {

    static get BBC_AMERICA_URL() { return BBC_AMERICA_URL; };
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
            // Go to the schedule page
            await this.page.goto(BBC_AMERICA_URL, {timeout: Site.STANDARD_TIMEOUT});
    
            // Wait for the on now selector
            await this.page.waitForSelector(".on_now", {timeout: Site.STANDARD_TIMEOUT});

            // Get all the info
            let network = this.constructor.name.toLowerCase();
            let channel = network;
            let onNow = await this.page.$(".on_now");
            let title = await ( await( await onNow.$(".ssi-title a")).getProperty('textContent') ).jsonValue() ;
            let episodeTitle = await ( await( await onNow.$(".ssi-episode-title")).getProperty('textContent') ).jsonValue() ;
            let description = await ( await( await onNow.$(".bbca-description")).getProperty('textContent') ).jsonValue() ;

            let startTime = await ( await( await onNow.$(".ssi-main-time")).getProperty('textContent') ).jsonValue() ;
            let endTime = await ( await( await this.page.$(".on_now + .not_now .ssi-main-time")).getProperty('textContent') ).jsonValue() ;

            let timeRegex = /(\d+):(\d+)([AP])/;
            let startMatch = timeRegex.exec(startTime);
            let endMatch = timeRegex.exec(endTime);

            let times = Site.makeTimes(startMatch[1], startMatch[2], startMatch[3], endMatch[1], endMatch[2], endMatch[3]);

            let season = "";
            let episode = "";
            try {
                let seasonEpisode = await ( await( await onNow.$(".ssi-season-info")).getProperty('textContent') ).jsonValue() ;
                let seasonEpisodeRegex = /Season\s(\d+)\s—\sEpisode\s(\d+)/i;
                let seasonEpisodeMatch = await seasonEpisodeRegex.exec(seasonEpisode);
                if( seasonEpisodeMatch ) {
                    if( seasonEpisodeMatch[1] ) {
                        season = seasonEpisodeMatch[1];
                    }
                    if( seasonEpisodeMatch[2] ) {
                        episode = seasonEpisodeMatch[2];
                    }
                }
            }
            catch (err) { // There is no season episode
                console.log(err);
            }

            // Get the thumbnail from the explore episode page
            let thumbnail = "";
            let explore = await onNow.$(".explore a");
            if( explore ) {
                await this.page.evaluate( (explore) => explore.click(), explore );
                await this.page.waitForSelector(".episode-image", {timeout: Site.STANDARD_TIMEOUT});
                thumbnail = await ( await( await this.page.$(".episode-image img")).getProperty('src') ).jsonValue() ; 
            }

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    title,
                    BBC_AMERICA_LIVESTREAM_URL,
                    times.start,
                    times.run,
                    network,
                    channel,
                    description,
                    season,
                    episode,
                    episodeTitle,
                    thumbnail
                ) );
            }

            await this.page.waitFor(100);
        }
        catch(err) { console.log(err); }
        return Promise.resolve(programs);
    }

    /**
     * Login to BBC America.
     * @returns {Promise}
     */
    async login() {
        // Click sign in
        let signInButton = await this.page.$('.video-player-modal .login');
        await this.page.evaluate( (signInButton) => {signInButton.click();}, signInButton );
        await this.page.waitFor(200);
        // Wait until we have the option to log in
        let provider = this.constructor.getProvider();
        if (!provider) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }
        // Wait for the form to enter the provider
        await this.page.waitForSelector( "#mvpdLogin", {timeout: Site.STANDARD_TIMEOUT} );
        // Click the provider
        await this.page.waitFor(500);
        await this.page.evaluate( (provider) => {
            document.evaluate("//li[@class='mvpd_option'][text()='"+provider+"']", document).iterateNext().click(); }, 
        provider.name );
        // We should be on our Provider screen now
        await provider.login(this.page, Site.STANDARD_TIMEOUT);
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on BBC America.
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
            await this.page.waitForSelector(".provider-image img", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let signInButton = await this.page.$('.video-player-modal .login');
            if( signInButton ) {
                let returnVal = await this.login();
                if( !returnVal ) return Promise.resolve(1);
            }
        }

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        await this.page.waitForSelector(".tpPlayOverlay", {timeout: Site.STANDARD_TIMEOUT});

        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // Wait for the play button
        await this.page.waitFor(200);
        await this.page.waitForSelector(".img-placeholder", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.waitForSelector(".img-placeholder", {timeout: Site.STANDARD_TIMEOUT, hidden: true});
        try {
            await this.page.evaluate( () => { document.querySelector('.tpPlayOverlay').click(); } );
        }
        // There may be autoplay.
        catch(err) {}

        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.evaluate( () => { document.querySelector(".platform-container").webkitRequestFullScreen(); } );
        return Promise.resolve(1);
    }

};

module.exports = BbcAmerica;