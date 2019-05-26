/**
 * @file    Index for the Spokapi application
 * @author  James Grams
 */

// -------------------- Setup --------------------

const puppeteer = require('puppeteer');
const express = require('express');
const ip = require("ip");
const bodyParser = require('body-parser');
const fs = require('fs');
const execSync = require('child_process').execSync;
const publicIp = require('public-ip');
const fetch = require('node-fetch');

const Site 	                    = require('./modules/site');
const Provider 	                = require('./modules/provider');
const WiFi                      = require('./modules/wifi.js');
const Espn 	                    = require('./modules/site/espn');
const NbcSports 	            = require('./modules/site/nbcsports');
const FoxSports 	            = require('./modules/site/foxsports');
const AnimalPlanet 	            = require('./modules/site/discoverysite/animalplanet');
const Discovery 	            = require('./modules/site/discoverysite/discovery');
const InvestigationDiscovery 	= require('./modules/site/discoverysite/investigationdiscovery');
const FoodNetwork 	            = require('./modules/site/discoverysite/foodnetwork');
const Hgtv 	                    = require('./modules/site/discoverysite/hgtv');
const Tlc 	                    = require('./modules/site/discoverysite/tlc');
const TravelChannel 	        = require('./modules/site/discoverysite/travelchannel');
const ScienceChannel 	        = require('./modules/site/discoverysite/sciencechannel');
const DiscoveryLife 	        = require('./modules/site/discoverysite/discoverylife');
const CookingChannel 	        = require('./modules/site/discoverysite/cookingchannel');
const Ahc 	                    = require('./modules/site/discoverysite/ahc');
const DiyNetwork 	            = require('./modules/site/discoverysite/diynetwork');
const DestinationAmerica 	    = require('./modules/site/discoverysite/destinationamerica');
const Cbs                       = require('./modules/site/cbs');
const PbsKids                   = require('./modules/site/pbskids');
const NationalGeographic        = require('./modules/site/foxsite/nationalgeographic');
const NationalGeographicWest    = require('./modules/site/foxsite/nationalgeographicwest');
const Fbn                       = require('./modules/site/foxsite/fbn');
const Fox                       = require('./modules/site/foxsite/fox');
const FoxNews                   = require('./modules/site/foxsite/foxnews');
const Fx                        = require('./modules/site/foxsite/fx');
const FxWest                    = require('./modules/site/foxsite/fxwest');
const Fxm                       = require('./modules/site/foxsite/fxm');
const Fxx                       = require('./modules/site/foxsite/fxx');
const FxxWest                   = require('./modules/site/foxsite/fxxwest');
const NatGeoWild                = require('./modules/site/foxsite/natgeowild');
const Usa                       = require('./modules/site/usa');
const BbcAmerica                = require('./modules/site/bbcamerica');
const AdultSwim                = require('./modules/site/adultswim');

/**
 * @constant
 * @type {number}
 * @default
 */
const PORT = 8080;
/**
 * @constant
 * @type {number}
 * @default
 */
const STATIC_PORT = 8081;
/**
 * @constant
 * @type {number}
 * @default
 * 15 minutes
 */
const FETCH_INTERVAL = process.env.SPOKAPI_FETCH_INTERVAL ? parseInt(process.env.SPOKAPI_FETCH_INTERVAL) : 600000;
/**
 * @constant
 * @type {number}
 * @default
 */
let MAX_SIMULTANEOUS_FETCHES = process.env.SPOKAPI_SIMULTANEOUS_FETCHES ? parseInt(process.env.SPOKAPI_SIMULTANEOUS_FETCHES) : 3;
/**
 * @constant
 * @type {Object}
 * @default
 */
const NETWORKS = { 
    "animalplanet": AnimalPlanet,
    "discovery": Discovery, 
    "investigationdiscovery": InvestigationDiscovery, 
    "foodnetwork": FoodNetwork, 
    "hgtv": Hgtv, 
    "tlc": Tlc,
    "travelchannel": TravelChannel,
    "sciencechannel": ScienceChannel,
    "discoverylife": DiscoveryLife,
    "cookingchannel": CookingChannel,
    "ahc": Ahc,
    "diynetwork": DiyNetwork,
    "destinationamerica": DestinationAmerica,
    "espn": Espn, 
    "nbcsports": NbcSports, 
    "foxsports": FoxSports,
    "cbs": Cbs,
    "pbskids": PbsKids,
    "fox": Fox,
    "fbn": Fbn,
    "foxnews": FoxNews,
    "usa": Usa,
    "bbcamerica": BbcAmerica,
    "adultswim": AdultSwim
};
/**
 * @constant
 * @type {Array}
 * @default
 */
const LOCAL_ONLY_NETWORKS = [
    "fox",
    "cbs",
    "foxsports"
];
/**
 * @constant
 * @type {string}
 * @default
 * The remote
 */
const REMOTE_SERVER = "http://spokapi.com:8080/programs";
/**
 * @constant
 * @type {boolean}
 * @default
 * If this is a server
 */
const SERVER_MODE = process.env.SPOKAPI_SERVER_MODE;
/**
 * @constant
 * @type {boolean}
 * @default
 */
const USE_REMOTE = process.argv.includes("--use-remote") ? true : false;
/**
 * @constant
 * @type {string}
 * @default
 */
const DIR = 'public';
/**
 * @constant
 * @type {string}
 * @default
 */
const APP_DIR = 'app';
/**
 * @constant
 * @type {string}
 * @default
 */
const LOGIN_INFO_FILE = 'login-info.txt';

Site.totalNetworks = Object.keys(NETWORKS).length;

var watchBrowser;
var programsCache;
var fetchLocked = false;
var fetchInterval;
var reloadPrograms = false;
var watchLocked = false;

process.setMaxListeners(Infinity);

const app = express();
const staticApp = express();

// -------------------- Endpoints --------------------

// Allow parsing of the body of json requests
app.use( bodyParser.json() );

// Middleware to serve static public directory
app.use( '/static/', express.static(DIR) );

// Middleware to serve static public directory
staticApp.use( '/static/', express.static(DIR) ); // Allow instant access to static resources

// Middleware to serve static public directory
app.use( '/app/', express.static(APP_DIR) );

// Middleware to serve static public directory
staticApp.use( '/app/', express.static(APP_DIR) ); // Allow instant access to static resources

// Middleware to allow cors from any origin
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Endpoint to serve the basic HTML needed to run this app
app.get("/", async function(request, response) {
    request.url = "/static/index.html";
    staticApp.handle(request, response);
});

// Endpoint to get a list of programs
app.get('/programs', async function(request, response) {

    // There is no cache yet or there is a request for specific networks
    if( !programsCache || request.query.networks || reloadPrograms ) {

        let object = {};
        // If we are reloading programs we should respond with the programsCache
        if( reloadPrograms ) {
            object = { live: programsCache };
        }
        writeResponse( response, "loading", object );

        // Start fetching programs
        if( !fetchLocked ) {

            // Disconnect the current session
            if( !Site.PATH_TO_CHROME ) {
                if( watchBrowser ) {
                    try {
                        if( !Site.PATH_TO_CHROME )
                            await Site.cancelLoading();
                    }
                    catch (err) { console.log(err); }
                    try {
                        await watchBrowser.disconnect();
                    }
                    catch (err) { console.log(err); }
                    watchBrowser = null;
                }
                // Reconnect / connect
                await openBrowser();
            }

            let fetchNetworks;
            if( request.query.networks ) {
                fetchNetworks = request.query.networks.split(",");
            }
            await fetchPrograms(fetchNetworks);
        }

    }
    else {
        let status = "success";
        if( fetchLocked ) {
            status = "loading";
        }
        writeResponse( response, status, {live: programsCache} );
    }
});

// Endpoint to find what channels are currently disallowed
app.get( '/channel', async function(request, response) {
    writeResponse( response, "success", {"channels":Site.unsupportedChannels} );
} );

// Endpoint to break the cache
app.get( '/break', async function(request, response) {
    reloadPrograms = true;

    writeResponse( response, "success" );
} );

if( !SERVER_MODE ) {
    // Endpoint to watch a program
    app.get('/watch', async function(request, response) {
        writeResponse( response, "success" );

        // Remove watchBrowser from memory only if not fetching
        if( !Site.PATH_TO_CHROME && watchBrowser && !fetchLocked ) {
            try {
                try {
                    if( !Site.PATH_TO_CHROME )
                        await Site.cancelLoading();
                }
                catch (err) { console.log(err); }
                try {
                    await watchBrowser.disconnect();
                }
                catch (err) { console.log(err); }
            }
            catch (err) { console.log(err); }
            watchBrowser = null;
        }

        if( !watchBrowser ) {
            await openBrowser();
        }
        // The url to watch the program on
        let url = decodeURIComponent(request.query.url);

        let page;
        if ( Site.PATH_TO_CHROME ) {
            let pages = await watchBrowser.pages();
            page = pages[0];
        }
        else {
            page = Site.connectedTabs[0];
        }

        // Set watching to true on the program
        if( programsCache ) {
            for( let program of programsCache ) {
                program.stopped = false;
                let programUrl = decodeURIComponent( program.link.replace( "/watch?url=", "" ).replace( /&network=.*/, "" ) );
                if( programUrl == url ) {
                    program.watching = true;
                }
                else {
                    program.watching = false;
                }
            }
        }

        await watch(page, url, request);

        // Remove watchBrowser from memory only if not fetching
        if ( !Site.PATH_TO_CHROME && !fetchLocked ) {
            if (watchBrowser) { try { await watchBrowser.disconnect() } catch (err) { console.log(err) } };
            watchBrowser = null;
        }
    });

    // Endpoint to stop a program
    app.get('/stop', async function(request, response) {
        writeResponse( response, "success" );

        if( !Site.PATH_TO_CHROME && watchBrowser ) {
            try {
                try {
                    if( !Site.PATH_TO_CHROME )
                        await Site.cancelLoading();
                }
                catch (err) { console.log(err); }
                try {
                    await watchBrowser.disconnect();
                }
                catch (err) { console.log(err); }
            }
            catch (err) { console.log(err); }
            watchBrowser = null;
        }

        if( !watchBrowser ) {
            await openBrowser();
        }

        let page;
        if ( Site.PATH_TO_CHROME ) {
            let pages = await watchBrowser.pages();
            page = pages[0];
        }
        else {
            page = Site.connectedTabs[0];
        }
        let site = new Site(page);
        await site.stop();

        // All programs are not being watched now
        // List the program as being stopped
        if( programsCache ) {
            for( let program of programsCache ) {
                if( program.watching ) {
                    program.watching = false;
                    program.stopped = true;
                }
            }
        }

        // Remove watchBrowser from memory
        if ( !Site.PATH_TO_CHROME && !fetchLocked ) {
            if (watchBrowser) { try { await watchBrowser.disconnect() } catch (err) { console.log(err) } };
            watchBrowser = null;
        }

    });

    // Endpoint to set cable information
    app.post( '/info', async function(request, response) {
        let username = request.body.username;
        let password = request.body.password;
        let provider = request.body.provider;
        let cbsUsername = request.body.cbsUsername;
        let cbsPassword = request.body.cbsPassword;

        if( username ) {
            Provider.username = username;
        }
        if( password ) {
            Provider.password = password;
        }
        if( provider ) {
            Site.providerName = provider;
        }
        if( cbsUsername ) {
            Cbs.cbsUsername = cbsUsername;
        }
        if( cbsPassword ) {
            Cbs.cbsPassword = cbsPassword;
        }

        // Save the info for future use
        updateLoginInfo( request.body );

        writeResponse( response, "success" );
    } );

    // Endpoint to set cable information
    app.get( '/info', async function(request, response) {
        let status = "success";
        let object = {
            username: Provider.username,
            password: Provider.password,
            provider: Site.providerName,
            cbsUsername: Cbs.cbsUsername,
            cbsPassword: Cbs.cbsPassword
        };

        writeResponse( response, status, object );
    } );

    // Endpoint to remove/add channels from the list of those disallowed
    app.post( '/channel', async function(request, response) {
        let channel = request.body.channel;
        let type = request.body.type;

        Site.addUnsupportedChannel({ "channel": channel, "type": type });

        updateLoginInfo( { "unsupportedChannels": Site.unsupportedChannels } );

        writeResponse( response, "success" );
    } );

    // Endpoint to start the regularly occuring process of refetching programs
    app.get( '/start-interval', async function(request, response) {
        startInterval();

        writeResponse( response, "success" );
    } );

    // Endpoint to stop the regularly occuring process of refetching programs
    app.get( '/stop-interval', async function(request, response) {
        clearInterval(fetchInterval);
        fetchInterval = null;

        writeResponse( response, "success" );
    } );

    // Endpoint to get available wifi networks
    app.get ( '/networks/available', async function(request, response) {
        let networks = await WiFi.availableNetworks();

        writeResponse( response, "success", {"networks":networks} );
    } );

    // Endpoint to get connected networks
    app.get ( '/networks/connected', async function(request, response) {
        let networks = WiFi.connectedNetworks();

        writeResponse( response, "success", {"networks":networks} );
    } );

    // Endpoint to get disconnect from networks
    app.post ( '/networks/disconnect', async function(request, response) {
        let ssid = request.body.ssid;

        WiFi.disconnect(ssid);

        writeResponse( response, "success" );
    } );

    // Endpoint to connect to a wifi network
    app.post( '/networks/connect', async function(request, response) {
        let ssid = request.body.ssid;
        let password = request.body.password;
        let identity = request.body.identity;

        WiFi.connect(ssid, password, identity);

        // Respond to the user
        writeResponse( response, "success" );
    } );

    // Endpoint to perform an update to spokapi
    // Spokapi will need to be restarted after performing an update
    app.post( '/update', async function(request, response) {
        execSync("git -C /home/chronos/user/Downloads/spokapi/ pull");
        execSync("/bin/sh /home/chronos/user/Downloads/spokapi/scripts/setup.sh");

        // Respond to the user
        writeResponse( response, "success" );

        execSync("reboot");
    } );

    // Endpoint to return IP address
    app.get('/ip', async function(request, response) {
        let publicIpAddress = await publicIp.v4();
        let ipAddress = ip.address(); 

        // Respond to the user
        writeResponse( response, "success", {"ip": ipAddress, "public": publicIpAddress} );
    } );

    // Endpoint to go to any URL (for debugging)
    app.get('/navigate', async function(request, response) {
        let url = decodeURIComponent(request.query.url);

        let page;
        if ( Site.PATH_TO_CHROME ) {
            let pages = await watchBrowser.pages();
            page = pages[0];
        }
        else {
            page = Site.connectedTabs[0];
        }

        await page.bringToFront();
        await page.goto(url);

        // Respond to the user
        writeResponse( response, "success" );
    } );
}

// -------------------- Main Program --------------------

// Read file for login data
if ( fs.existsSync(LOGIN_INFO_FILE) ) { 
    let contents = fs.readFileSync(LOGIN_INFO_FILE, 'utf8');
    try {
        let loginInfo = JSON.parse(contents);
        if( loginInfo.username ) {
            Provider.username = loginInfo.username;
        }
        if( loginInfo.password ) {
            Provider.password = loginInfo.password;
        }
        if( loginInfo.provider ) {
            Site.providerName = loginInfo.provider;
        }
        if( loginInfo.cbsUsername ) {
            Cbs.cbsUsername = loginInfo.cbsUsername;
        }
        if( loginInfo.cbsPassword ) {
            Cbs.cbsPassword = loginInfo.cbsPassword;
        }
        if( loginInfo.unsupportedChannels ) {
            Site.unsupportedChannels = loginInfo.unsupportedChannels;
        }
    }
    catch(e) {
        console.log(e);
    }
}

// Open browser
staticApp.listen(STATIC_PORT);

if( !Site.PATH_TO_CHROME ) {
    openBrowser(true).then( () => app.listen(PORT) );
}
else {
    app.listen(PORT);
    if( SERVER_MODE ) {
        startInterval();
    }
}

// -------------------- Helper Functions --------------------

/**
 * Start the fetching inverval
 */
function startInterval() {
    if( !fetchInterval ) {
        fetchInterval = setInterval( function() { reloadPrograms = true; fetchPrograms(); }, FETCH_INTERVAL); // Fetch every few minutes from this point on
    }
}

/**
 * Send a response to the user
 * @param {Response} response - the response object
 * @param {String} status - the status of the request
 * @param {Object} object - an object containing values to include in the response
 * @param {Number} code - the HTTP response code (defaults to 200)
 * @param {String} contentType - the content type of the response (defaults to application/json)
 */
function writeResponse( response, status, object, code, contentType ) {
    if( !code ) { code = 200; }
    if( !contentType ) { contentType = "application/json"; }
    if( !object ) { object = {}; }
    response.writeHead(200, {'Content-Type': 'application/json'});
    
    let responseObject = Object.assign( {status:status}, object );
    response.end(JSON.stringify(responseObject));
}

/**
 * Launch the watch browser.
 * @param {boolean} clean - true if the browser should clean out its pages (Non-launch/connect only)
 * @param {boolean} bringToFront - true if we should bring the spokapi page to front
 * @returns {Promise}
 */
async function openBrowser(clean, bringToFront = true) {
    // If there is a Chrome path, we will try to launch chrome
    if ( Site.PATH_TO_CHROME ) {
        watchBrowser = await puppeteer.launch({
            headless: false,
            executablePath: Site.PATH_TO_CHROME,
            args: ['--disable-infobars','--start-maximized'],
            userDataDir: './userDataDir'
        });
        let pages = await watchBrowser.pages();
        let page = pages[0];
        let location = await Site.getLocation();
        // This makes the viewport correct
        // https://github.com/GoogleChrome/puppeteer/issues/1183#issuecomment-383722137
        await page._client.send('Emulation.clearDeviceMetricsOverride');
        await page.setGeolocation(location);
        let context = watchBrowser.defaultBrowserContext();
        await context.overridePermissions('https://www.cbs.com', ['geolocation']);
        await context.overridePermissions('https://www.fox.com', ['geolocation']);
    }
    // If not, we'll try to connect to an existing instance (ChromeOS)
    else {
        watchBrowser = await Site.connectToChrome(bringToFront);
        if( clean ) {
            await Site.cleanupAll(watchBrowser);
        }        
    }
    watchBrowser.on("disconnected", function() {
        watchBrowser = null;
    });
    return Promise.resolve(1);
}

/**
 * Asynchronously start watching
 * @param {Page} page - the page in which to start watching the program
 * @param {String} url - the url of the program to watch
 * @param {Request} request - the request object to start watching
 */
async function watch(page, url, request) {

    // Set this so we know to make sure the programs fetch doesn't remove watch browser from memory
    // once it finishes
    watchLocked = true;

    let networkName = request.query.network;

    let Network = NETWORKS[networkName];
    if( Network ) {
        let network = new Network(page);
        let provider = Network.getProvider();
        if( provider ) {
            // Try to watch, but it's OK if the watch fails
            try {
                await network.watch(url);
            }
            catch (err) {
                await new Site(page).stop("An error has occurred. Please try again.");
                console.log(err);
            }
        }
        else {
            await network.stop(Site.CHANNEL_UNSUPPORTED_MESSAGE);
        }
    }

    watchLocked = false;

    return Promise.resolve(1);
}

/**
 * Fetch programs and cache the result
 * @param {Array<String>} fetchNetworks - A list of networks to fetch only (result will be joined with pre-existing cache)
 * @returns Promise - true if programs where fetched, false if not (the method is locked)
 */
async function fetchPrograms(fetchNetworks) {
    // Only fetch programs if we are not already fetching them and we know we can
    if( fetchLocked ) {
        return Promise.resolve(false);
    }

    fetchLocked = true;
    reloadPrograms = false;

    // First, we get the networks we want to fetch
    if( !fetchNetworks ) {
        if( USE_REMOTE ) {
            // Only fetch networks that are local-specific
            fetchNetworks = LOCAL_ONLY_NETWORKS;
        }
        else {
            fetchNetworks = Object.keys(NETWORKS);
        }
    }

    networks = [];
    // Note: To block a channel from fetching, make sure it is lower case
    if( !Site.PATH_TO_CHROME ) {
        // Create an instance of each network class
        let index = 2; // Avoid watch tab and loading tab
        for( let Network of fetchNetworks.map( v => NETWORKS[v] ) ) {
            if( Site.unsupportedChannels.indexOf(Network.name.toLowerCase()) === -1 ) {
                networks.push(new Network( Site.connectedTabs[index] ));
            }
            index++; // We still want to maintain one tab per network
        }
    }
    else {
        // Create an instance of each network class
        for( let Network of fetchNetworks.map( v => NETWORKS[v] ) ) {
            if( Site.unsupportedChannels.indexOf(Network.name.toLowerCase()) === -1 ) {
                networks.push(new Network());
            }
        }
    }

    // Generate all the programs
    if( !programsCache ) {
        programsCache = [];
    }
    var newProgramsCache = [];

    // If we are using remote, do a request to the remote server
    // Remote request will necessarily be for all channels, so we can
    // overwrite the programsCache here.
    if( USE_REMOTE ) {
        let response = await fetch(REMOTE_SERVER);
        let json = await response.json();
        if ( json.programs ) {
            programsCache = updateProgramsCache( json.programs, Object.keys(NETWORKS).map( (network) => network.constructor.name.toLowerCase() ) );
            newProgramsCache = json.programs;
        }
    }

    // Fetch shows (multi-threaded) - in batches of MAX_SIMULTANEOUS_FETCHES
    for( let i=0; i < networks.length; i += MAX_SIMULTANEOUS_FETCHES ) {
        let currentNetworks = [];
        for ( let j=0; j<MAX_SIMULTANEOUS_FETCHES; j++ ) {
            if( i+j < networks.length ) {
                currentNetworks.push(networks[i+j]);
            }
        }
        await Promise.all(
            currentNetworks.map( async network => {
                let programs = await network.generatePrograms();
                for( var i=0; i<programs.length; i++ ) {
                    programs[i].fetched = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
                }
                let networkClassName = network.constructor.name.toLowerCase();
                programsCache = updateProgramsCache( programs, [networkClassName] );
                newProgramsCache = newProgramsCache.concat(programs);
            } )
        )
    }

    try {
        // Cleanup
        if( Site.PATH_TO_CHROME ) {
            networks.map( network => { try {network.browser.close()} catch(err) { console.log(err);} } )
        }
        else {
            // Try to conserve memory by closing pages
            await Promise.all(
                networks.map( async network => { try { await network.stop() } catch(err) {console.log(err)} } )
            );
            // Remove watch browser from memory as long as we're not in the middle of trying to watch something
            if( !watchLocked ) {
                if (watchBrowser) { try { await watchBrowser.disconnect() } catch (err) { console.log(err) } };
                watchBrowser = null;
            }
        }
    }
    catch (err) { console.log(err) }

    // Set programsCache to be newProgramsCache
    // This will remove shows no longer there
    programsCache = newProgramsCache;

    fetchLocked = false;

    return Promise.resolve(true);
}

/**
 * Update the Login info file
 * @param {Object} newData - new data for the login info file
 */
function updateLoginInfo( newData ) {
    let contents;
    try {
        contents = fs.readFileSync(LOGIN_INFO_FILE, 'utf8');
    }
    catch(err) {
        contents = "{}";
    }
    let data = JSON.parse(contents);

    for( let key of Object.keys(newData) ) {
        if( newData[key] ) {
            data[key] = newData[key];
        }
    }

    fs.writeFileSync(LOGIN_INFO_FILE, JSON.stringify(data));
}

/**
 * Update the programs cache
 */
/**
 * Update the programs cache
 * @param {Array<Program>} programs - an array of programs to add to the programs cache
 * @param {Array<String>} networkClassNames - the network class names from which the programs to add originate (to remove previous programs from these networks from the programs cache)
 */
function updateProgramsCache( programs, networkClassNames ) {
    // Remove programs to be replaced
    for( let i=programsCache.length-1; i >= 0; i-- ) {
        if( networkClassNames.includes(programsCache[i].network) ) {
            programsCache.splice(i, 1);
        }
    }
    // Add new programs
    programsCache = programsCache.concat(programs);
    return programsCache;
}