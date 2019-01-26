/**
 * @file    Food Network Site for Spokapi
 * @author  James Grams
 */

const DiscoverySite = require('../discoverysite');

/**
 * @constant
 * @type {string}
 * @default
 */
const FOOD_NETWORK_URL = "https://watch.foodnetwork.com/watch/food";

/**
 * Class representing an Food Network site.
 */
class FoodNetwork extends DiscoverySite {

    static get FOOD_NETWORK_URL() { return FOOD_NETWORK_URL; };

    /**
    * Constructor.
    * @param {string} page - The Puppeteer page object to use for this site.
    */
    constructor(page) {
        super(page, FOOD_NETWORK_URL);
    }

};

module.exports = FoodNetwork;

