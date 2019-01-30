/**
* DISH Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a DISH Provider.
 */
class Dish extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("DISH", "#username", "#password", "#login");
    }

}

module.exports = Dish;