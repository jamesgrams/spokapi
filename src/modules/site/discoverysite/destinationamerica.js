/**
 * @file    Destination America Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const DESTINATION_AMERICA_URL = "https://www.destinationamerica.com/watch/destination-america";

/**
 * Class representing a Destination America site.
 */
class DestinationAmerica extends DiscoverySite {

    static get DESTINATION_AMERICA_URL() { return DESTINATION_AMERICA_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, DESTINATION_AMERICA_URL, "Destination America");
    }

};

module.exports = DestinationAmerica;

