/**
 * @file    Abstract Turner Site for Spokapi
 * @author  James Grams
 * Turner owns several channels (TNT, TBS, TruTV, etc.)
 * They all use a similar streaming portal
 */

const Site = require('../site');
const Program 	= require('../program');

/**
 * @constant
 * @type {Object<string,string>}
 * These are lowercase class names and values to be used in the 
 * selector when finding the provider link if different from the 
 * provider default name
 */
const VALID_PROVIDERS = {
    "attuverse": "",
    "directv": "",
    "cox": "",
    "dish": "",
    "frontiercommunications": "",
    "mediacom": "",
    "optimum": "",
    "spectrum": "Charter Spectrum",
    "suddenlink": "",
    "verizonfios": "",
    "xfinity": ""
}

/**
 * Abstract class representing a Turner Site.
 */
class TurnerSite extends Site {

    static get VALID_PROVIDERS() { return VALID_PROVIDERS; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    * @param {string} url - The watch url for this discovery site
    * @param {string} channelName - The channel name to display
    */
    constructor(page, url, channelName) {
        super(page);
        this.url = url;
        this.channelName = channelName;
        let baseUrlRegex = /(.*\.com)/;
        this.baseUrl = baseUrlRegex.exec(this.url)[1];
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
            await this.page.goto(this.url, {timeout: Site.STANDARD_TIMEOUT});
            // Wait until the live program is loaded
            await this.page.waitForSelector('.watch-live-block-wrapper .main-content', {timeout: Site.STANDARD_TIMEOUT});

            let currentPrograms = await this.page.$$(".watch-live-block-wrapper .main-content");

            for( let program of currentPrograms ) {

                let title = await (await (await program.$(".watch-live-title")).getProperty('textContent')).jsonValue();
                let network = this.constructor.name.toLowerCase();
                let zone = await program.$(".watch-live-zone");
                let channel = await (await zone.getProperty('textContent')).jsonValue();

                let offsetHours = 0;
                if( channel == "West" ) {
                    offsetHours = 3;
                }

                channel = this.channelName + " " + channel;
                let link = await this.page.evaluate( (zone) => { return zone.getAttribute("data-videohref"); }, zone );
                link = this.baseUrl + link;
                let thumbnail = await (await (await program.$(".liveimg")).getProperty('src')).jsonValue();

                let time = await( await (await program.$(".watch-live-airtime")).getProperty('textContent')).jsonValue();
                let timeRegex = /(\d+):(\d+)\s([ap])m\s+-\s+(\d+):(\d+)\s([ap])/i;
                let timeMatch = timeRegex.exec(time);
                let times = Site.makeTimes(timeMatch[1], timeMatch[2], timeMatch[3].toUpperCase(), timeMatch[4], timeMatch[5], timeMatch[6].toUpperCase(), offsetHours);
            
                let season = "";
                let episode = "";
                let episodeTitle = "";
                try {
                    let seasonEpisode = await (await (await program.$(".watch-live-epinfo")).getProperty('textContent')).jsonValue();
                    seasonEpisode = seasonEpisode.trim();
                    let seasonEpisodeRegex = /S(\d+)\s\|\sE(\d+)\s+(.*)/i;
                    let seasonEpisodeMatch = await seasonEpisodeRegex.exec(seasonEpisode);
                    if( seasonEpisodeMatch ) {
                        if( seasonEpisodeMatch[1] ) {
                            season = seasonEpisodeMatch[1];
                        }
                        if( seasonEpisodeMatch[2] ) {
                            episode = seasonEpisodeMatch[2];
                        }
                        if( seasonEpisodeMatch[3] ) {
                            episodeTitle = seasonEpisodeMatch[3];
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
                        link,
                        times.start,
                        times.run,
                        network,
                        channel,
                        null,
                        season,
                        episode,
                        episodeTitle,
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
     * Login to Discovery.
     * @returns {Promise}
     */
    async login() {
        // Click the preview sign in button if necessary (only on preview)
        await this.page.evaluate( () => { var signIn = document.querySelector( ".timer-wrapper .freeview--button" ); if( signIn ) { signIn.click(); } } );
        // Wait for the selector
        // It comes up automatically if your preview has ended
        await this.page.waitForSelector("#mvpdpicker", {timeout: Site.STANDARD_TIMEOUT});

        // Wait until we have the option to log in
        let provider = this.constructor.getProvider();
        if( !provider ) { // Provider unsupported
            await this.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
            return Promise.resolve(0);
        }

        let providerSelector = '//ul[contains(@class,"mvpdsbyname")]/li[contains(text(),"'+provider.name+'")]';
        // Wait for the provider selector to be visible
        await this.page.waitForXPath(providerSelector, {timeout: Site.STANDARD_TIMEOUT});
        // Click the provider selector
        let providerElements = await this.page.$x(providerSelector);
        await this.page.evaluate( (providerElement) => providerElement.click(), providerElements[0] );
        


        let browserContext = await this.page._target.browserContext();

        // Get all the current pages (So we can tell which page the popup is)
        let allPages = await browserContext.pages();
        let oldPages = allPages;
        let oldPageCount = allPages.length;

        // We should be on our Provider screen now
        // It'll be on a different tab though, so we have to switch to that
        await this.page.waitFor(1000);

        // Wait until we have a new page
        // Note: Waiting until we have a new page causes a race condition if other new pages popup
        let count = 0;
        while( allPages.length == oldPageCount && count < 20 ) {
            allPages = await browserContext.pages();
            await this.page.waitFor(1000); // We're just sleeping here...
            count ++;
        }

        // Find which is the new page
        let newPages = allPages.filter( page => !oldPages.includes(page) );

        // Temporarily switch the site's page
        let watchPage = this.page;
        this.page = newPages[0];
        
        try {
            await provider.login(this.page, Site.STANDARD_TIMEOUT);
        }
        catch(err) {console.log(err);}

        this.page = watchPage;

        // Bring this page to front temporarily to allow credentials to fetch,
        // then go back to the loading page
        if( !Site.PATH_TO_CHROME ) {
            // Wait for successful login
            while( ! (await newPages[0].isClosed()) ) {
                await this.page.waitFor(1000);
            }
            await this.page.waitFor(1000);
            await this.page.bringToFront();
            await this.page.waitFor(1000);
            await Site.displayLoading(); // Go back to the loading page
        }
        else {
            this.page.waitFor(1000);
        }

        // Click the watch now button
        await this.page.waitForSelector(".mvpd-logged-in:not(.tn-hidden)", {timeout: Site.STANDARD_TIMEOUT});
        await this.page.waitFor(1000);
        await this.page.evaluate( () => { document.querySelector(".watchnowbutton").click(); } );
        return Promise.resolve(1);
    }

    /**
     * Begin watching something on Discovery.
     * @param {String} url - the url to watch
     * @returns {Promise}
     */
    async watch(url) {

        if( !Site.PATH_TO_CHROME )
            await Site.displayLoading();

        // Go to the url
        await this.page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

        // Wait for an indicator about logged in or logged out
        await this.page.waitForSelector(".mvpd-logged-out:not(.tn-hidden), .mvpd-logged-in:not(.tn-hidden)", {timeout: Site.STANDARD_TIMEOUT});
        try {
            // Wait for the logged in indicator that is not hidden
            await this.page.waitForSelector(".mvpd-logged-in:not(.tn-hidden)", {timeout: Site.STANDARD_WAIT_OK_TIMEOUT});
        }
        // We need to log in
        catch(err) {
            let signInBox = await this.page.$('#mvpdPickerFrame');
            if( signInBox ) {
                let returnVal = await this.login();
                if( !returnVal ) return Promise.resolve(1);
            }
        }
        // Wait for the video
        await this.page.waitForSelector("#playerarea_cvp", {timeout: Site.STANDARD_TIMEOUT});

        // Exit the loading page now that we're loaded (needs to be before fullscreen)
        if( !Site.PATH_TO_CHROME )
            await Site.stopLoading(this.page);

        await this.page.evaluate( () => document.querySelector("#playerarea_cvp").webkitRequestFullScreen() );
        return Promise.resolve(1);
    }

};

module.exports = TurnerSite;
