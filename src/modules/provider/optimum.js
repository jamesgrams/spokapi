/**
* Optimum Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing an Optimum Provider.
 */
class Optimum extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Optimum", "#IDToken1", "#IDToken2", "#signin_button");
    }

}

module.exports = Optimum;