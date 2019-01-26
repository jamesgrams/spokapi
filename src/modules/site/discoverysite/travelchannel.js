/**
 * @file    Travel Channel Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const TRAVEL_CHANNEL_URL = "https://watch.travelchannel.com/watch/travel";

/**
 * Class representing an Travel Channel site.
 */
class TravelChannel extends DiscoverySite {

    static get TRAVEL_CHANNEL_URL() { return TRAVEL_CHANNEL_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, TRAVEL_CHANNEL_URL);
    }

};

module.exports = TravelChannel;

