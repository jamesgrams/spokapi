/**
 * @file    USA Site for Spokapi
 * @author  James Grams
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {string}
 * @default
 */
const USA_URL = "https://www.usanetwork.com/videos/live";
/**
 * @constant
 * @type {string}
 * @default
 */
const USA_HOMEPAGE_URL = "https://www.usanetwork.com/";
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
    "frontiercommunications": "",
    "hulu": "",
    "mediacom": "",
    "optimum": "",
    "slingtv": "",
    "spectrum": "",
    "suddenlink": "",
    "verizonfios": "Verizon",
    "xfinity": ""
}

/**
 * Class representing an USA Site.
 */
class Usa extends Site {

    static get USA_URL() { return USA_URL; };
    static get USA_HOMEPAGE_URL() { return USA_HOMEPAGE_URL; };
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
            // First, get the time of the program
            await this.page.goto(USA_HOMEPAGE_URL, {timeout: Site.STANDARD_TIMEOUT});
    
            // Wait for the on now selector
            await this.page.waitForSelector(".node-usanetwork-promo.on-now", {timeout: Site.STANDARD_TIMEOUT});

            // Click the link to view the time of the current live program
            await this.page.evaluate( () => document.querySelector('.icons-block a[data-name="description"]').click() );

            // Wait for the schedule table
            await this.page.waitForSelector(".schedule-table", {timeout: Site.STANDARD_TIMEOUT});

            // Get the time of the program on now
            let startTime = await ( await( await this.page.$(".schedule-table .active .time")).getProperty('textContent') ).jsonValue() ;

            // Now get the info for the current program
            await this.page.goto(USA_URL, {timeout: Site.STANDARD_TIMEOUT});

            // Wait until the schedule is loaded
            await this.page.waitForSelector('.node-usanetwork-promo', {timeout: Site.STANDARD_TIMEOUT});

            // Get all the info
            let network = this.constructor.name.toLowerCase();
            let channel = "USA";
            let title = await ( await( await this.page.$(".show-name")).getProperty('textContent') ).jsonValue() ;
            title = title.replace( /^[\n\s]+/, "" );
            title = title.replace( /[\n\s]+$/, "" );

            let promo = await this.page.$(".node-usanetwork-promo");
            let episodeTitle = await ( await( await promo.$(".title")).getProperty('textContent') ).jsonValue() ;
            episodeTitle = episodeTitle.replace("Live: ", "");

            if( title == "USA Movie" ) {
                title = episodeTitle;
                episodeTitle = "";
            }

            let additional = await ( await( await promo.$(".additional")).getProperty('textContent') ).jsonValue() ;
            let description = await ( await( await promo.$(".description")).getProperty('textContent') ).jsonValue() ;
            let thumbnail = await (await( await promo.$(".asset-img img")).getProperty('src') ).jsonValue() ;

            let timeRegex = /(\d+):(\d+)\n\s*([AP])/;
            let startMatch = timeRegex.exec(startTime);

            let runtimeRegex = /(\d+):(\d+):(\d+)/;
            let runtimeMatch = runtimeRegex.exec(additional);

            let endHours = parseInt(startMatch[1]);
            let endMinutes = parseInt(startMatch[2]);
            let endMeridian = startMatch[3];

            let runtimeHours = parseInt(runtimeMatch[1]);
            let runtimeMinutes = parseInt(runtimeMatch[2]);

            endHours += runtimeHours;
            endMinutes += runtimeMinutes;

            if( endMinutes >= 60 ) {
                endMinutes -= 60;
                endHours += 1;
            }
            if( endHours > 12 ) {
                endHours -= 12;
                if( endMeridian == "P" ) {
                    endMeridian = "A";
                }
                else {
                    endMeridian = "P";
                }
            }

            let times = Site.makeTimes(startMatch[1], startMatch[2], startMatch[3], endHours, endMinutes, endMeridian);

            let season = "";
            let episode = "";
            try {
                let seasonEpisodeRegex = /S(\d+)\sepisode\s(\d+)/i;
                let seasonEpisodeMatch = await seasonEpisodeRegex.exec(additional);
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

            // Make sure the network is not blacklisted
            if( Site.unsupportedChannels.indexOf(network) === -1 && Site.unsupportedChannels.indexOf(channel) === -1 ) {
                programs.push( new Program (
                    title,
                    USA_URL,
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
     * Login to USA.
     * @returns {Promise}
     */
    async login() {
        // Click sign in
        let signInButton = await this.page.$('.sign-in-button');
        await this.page.evaluate( (signInButton) => signInButton.click(), signInButton );
        await this.page.waitFor(200);
        // Wait until we have the option to log in
        let provider = this.constructor.getProvider();
        if (!provider) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }
        // Wait for the form to enter the provider
        await this.page.waitForSelector( ".providerForm", {timeout: Site.STANDARD_TIMEOUT} );
        // Click the provider
        await this.page.waitForSelector(".mvpd a[title='"+provider.name+"']", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.evaluate( (provider) => {
            document.querySelector(".mvpd a[title='"+provider+"']").click(); }, 
        provider.name );
        // We should be on our Provider screen now
        await provider.login(this.page, Site.STANDARD_TIMEOUT);
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on USA.
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
            await this.page.waitForSelector(".providerLogo img", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let signInButton = await this.page.$('.sign-in-button');
            if( signInButton ) {
                let returnVal = await this.login();
                if( !returnVal ) return Promise.resolve(1);
            }
        }
        // Wait for the controls
        await this.page.waitForSelector(".providerLogo img");

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        // Click the full screen button (it might be hidden, so use evaluate)
        await this.page.waitFor(10000);
        await this.page.evaluate( () => { 
            document.querySelector("#videoplayer").webkitRequestFullScreen();
        } );
        
        let mousie = this.page.mouse;
        await mousie.click(100, 100); // Not sure we'll have anything smaller than 100 pixels

        return Promise.resolve(1);
    }

};

module.exports = Usa;