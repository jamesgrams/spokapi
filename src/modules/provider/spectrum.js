/**
* Spectrum Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Spectrum Provider.
 */
class Spectrum extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Spectrum", "#IDToken1", "#IDToken2", "#submint_btn");
    }

}

module.exports = Spectrum;