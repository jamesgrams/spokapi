/**
* DIRECTV NOW Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a DIRECTV NOW Provider.
 */
class DirecTvNow extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("DIRECTV NOW", "#userName", "#password", "#loginButton-lgwgLoginButton");
    }

}

module.exports = DirecTvNow;