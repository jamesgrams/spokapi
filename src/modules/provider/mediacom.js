/**
* Mediacom Provider for Spokapi
* @author  James Grams
*/

const Provider = require('../provider');

/**
 * Class representing a Mediacom Provider.
 */
class Mediacom extends Provider {

    /**
    * Constructor.
    */
	constructor() {
        super("Mediacom", "#username", "#password", "a[title='Login']");
    }

}

module.exports = Mediacom;