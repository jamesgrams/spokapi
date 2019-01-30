/**
* Hulu Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Hulu Provider.
 */
class Hulu extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Hulu", "input[name='email']", "input[name='password']", ".login-button");
    }

}

module.exports = Hulu;