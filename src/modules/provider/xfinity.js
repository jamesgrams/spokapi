/**
* Xfinity Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing an Xfinity Provider.
 */
class Xfinity extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Xfinity", "#user", "#passwd", "#sign_in");
    }

}

module.exports = Xfinity;