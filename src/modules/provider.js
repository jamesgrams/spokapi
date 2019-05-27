/**
* Provider for Spokapi
* @author  James Grams
*/

/**
 * @type {string}
 * @default
 */
var username = process.env.SPOKAPI_USERNAME;
/**
 * @type {string}
 * @default
 */
var password = process.env.SPOKAPI_PASSWORD;

/**
 * Class representing a TV Provider.
 */
class Provider {

    static get username() { return username };
    static set username(user) { username = user };
    static get password() { return password };
    static set password(pass) { password = pass };

    /**
    * Constructor.
    * @param {string} name - the name of the provider
    * @param {string} usernameSelector - the css selector for the username field
    * @param {string} passwordSelector - the css selector for the password field
    * @param {string} submitSelector - the css selector for the submit button
    */
	constructor(name, usernameSelector, passwordSelector, submitSelector) {
        this.name = name;
        this.usernameSelector = usernameSelector;
        this.passwordSelector = passwordSelector;
        this.submitSelector = submitSelector;
    }

    /**
     * Standard method to log into a provider
     * @param {Page} page - the puppeteer page object to control
     * @param {number} timeout - the wait timeout
     * @returns {Promise}
     */
    async login(page, timeout) {
        let usernameSelector = this.usernameSelector;
        let passwordSelector = this.passwordSelector;
        let submitSelector = this.submitSelector;
        // Wait until we have the username box
        try {
            await page.waitForSelector(usernameSelector, {timeout: timeout});
        }
        catch(err) {
            // We could be auto logged in
            return Promise.resolve(1);
        }
        // Enter the username and password (evalute allows for this to occur in bg tab)
        await page.waitFor(250);
        await page.evaluate( (usernameSelector, username) => { 
            document.querySelector(usernameSelector).focus();
            document.querySelector(usernameSelector).select();
            document.querySelector(usernameSelector).value = username;
        }, usernameSelector, username );
        await page.waitFor(250);
        await page.evaluate( (passwordSelector, password) => {
            document.querySelector(passwordSelector).focus();
            document.querySelector(passwordSelector).select();
            document.querySelector(passwordSelector).value = password;
        }, passwordSelector, password );
        // Login
        await page.evaluate( (submitSelector) => {
            document.querySelector(submitSelector).click();
        }, submitSelector );
        return Promise.resolve(1);
    }

}

module.exports = Provider;