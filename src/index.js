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
const FETCH_INTERVAL = 600000;
/**
 * @constant
 * @type {number}
 * @default
 */
let MAX_SIMULTANEOUS_FETCHES = 3;
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
    "foxnews": FoxNews
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
var watchNetwork;
var programsCache;
var fetchLocked = false;
var fetchInterval;

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
    if( !programsCache || request.query.networks ) {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: "loading" }));

        // Start fetching programs
        if( !fetchLocked ) {

            // Disconnect the current session
            if( !Site.PATH_TO_CHROME && watchBrowser ) {
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
                // Reconnect
                await openBrowser();
            }

            let fetchNetworks;
            if( request.query.networks ) {
                fetchNetworks = request.query.networks.split(",");
            }
            await fetchPrograms(fetchNetworks);

            // Remove watchBrowser from memory
            if ( !Site.PATH_TO_CHROME ) {
                if (watchBrowser) { try { await watchBrowser.disconnect() } catch (err) { console.log(err) } };
                watchBrowser = null;
            }
        }

    }
    else {
        let status = "success";
        if( fetchLocked ) {
            status = "loading";
        }
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ "status": status, live: programsCache }));
    }
});

// Endpoint to watch a program
app.get('/watch', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));

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

// Endpoint to pause or unpause a program
app.get('/pause', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));

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
        await openBrowser(false, false);
    }

    if ( Site.PATH_TO_CHROME ) {
        let pages = await watchBrowser.pages();
        page = pages[0];
    }
    else {
        page = Site.connectedTabs[0];
    }

    watchNetwork.page = page;
    await watchNetwork.pause();

    // Remove watchBrowser from memory only if not fetching
    if ( !Site.PATH_TO_CHROME && !fetchLocked ) {
        if (watchBrowser) { try { await watchBrowser.disconnect() } catch (err) { console.log(err) } };
        watchBrowser = null;
    }
} );

// Endpoint to stop a program
app.get('/stop', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));

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
    if( programsCache ) {
        for( let program of programsCache ) {
            program.watching = false;
        }
    }

    // Remove watchBrowser from memory
    if ( !Site.PATH_TO_CHROME ) {
        if (watchBrowser) { try { await watchBrowser.disconnect() } catch (err) { console.log(err) } };
        watchBrowser = null;
    }

});

// Endpoint to break the cache
app.get( '/break', async function(request, response) {
    programsCache = null;

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

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

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to remove/add channels from the list of those disallowed
app.post( '/channel', async function(request, response) {
    let channel = request.body.channel;
    let type = request.body.type;

    Site.addUnsupportedChannel({ "channel": channel, "type": type });

    updateLoginInfo( { "unsupportedChannels": Site.unsupportedChannels } );

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to find what channels are currently disallowed
app.get( '/channel', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success", "channels":Site.unsupportedChannels}));
} );

// Endpoint to start the regularly occuring process of refetching programs
app.get( '/start-interval', async function(request, response) {
    if( !fetchInterval ) {
        fetchInterval = setInterval(fetchPrograms, FETCH_INTERVAL); // Fetch every few minutes from this point on
    }

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to stop the regularly occuring process of refetching programs
app.get( '/stop-interval', async function(request, response) {
    clearInterval(fetchInterval);
    fetchInterval = null;

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to get available wifi networks
app.get ( '/networks/available', async function(request, response) {
    let networks = await WiFi.availableNetworks();

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success", "networks":networks}));
} );

// Endpoint to get connected networks
app.get ( '/networks/connected', async function(request, response) {
    let networks = WiFi.connectedNetworks();

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success", "networks":networks}));
} );

// Endpoint to get disconnect from networks
app.post ( '/networks/disconnect', async function(request, response) {
    let ssid = request.body.ssid;

    WiFi.disconnect(ssid);

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to connect to a wifi network
app.post( '/networks/connect', async function(request, response) {
    let ssid = request.body.ssid;
    let password = request.body.password;
    let identity = request.body.identity;

    WiFi.connect(ssid, password, identity);

    // Respond to the user
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to perform an update to spokapi
// Spokapi will need to be restarted after performing an update
app.post( '/update', async function(request, response) {
    execSync("git -C /home/chronos/user/Downloads/spokapi/ pull");
    execSync("/bin/sh /home/chronos/user/Downloads/spokapi/scripts/setup.sh");

    // Respond to the user
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));

    execSync("reboot");
} );

// Endpoint to return IP address
app.get('/ip', async function(request, response) {
    let publicIpAddress = await publicIp.v4();
    let ipAddress = ip.address(); 

    // Respond to the user
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success","ip": ipAddress, "public": publicIpAddress}));
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
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success","ip":ipAddress}));
} );

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
}

// -------------------- Helper Functions --------------------

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
 */
async function watch(page, url, request) {

    let networkName = request.query.network;

    let Network = NETWORKS[networkName];
    if( Network ) {
        let network = new Network(page);
        watchNetwork = network;
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
    programsCache = [];

    // If we are using remote, do a request to the remote server
    // Remote request will necessarily be for all channels, so we can
    // overwrite the programsCache here.
    if( USE_REMOTE ) {
        let response = await fetch(REMOTE_SERVER);
        let json = await response.json();
        if ( json.programs ) {
            programsCache = updateProgramsCache( json.programs, Object.keys(NETWORKS).map( (network) => network.constructor.name.toLowerCase() ) );
        }
    }

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
                let networkClassName = network.constructor.name.toLowerCase();
                programsCache = updateProgramsCache( programs, [networkClassName] );
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
                networks.map( network => network.stop() )
            );
        }
    }
    catch (err) { console.log(err) }

    fetchLocked = false;

    return Promise.resolve(true);
}

/**
 * Update the Login Info file
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