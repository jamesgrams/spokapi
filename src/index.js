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

const Site 	= require('./modules/site');
const WiFi  = require('./modules/wifi.js');
const Espn 	= require('./modules/site/espn');
const NbcSports 	= require('./modules/site/nbcsports');
const FoxSports 	= require('./modules/site/foxsports');
const AnimalPlanet 	= require('./modules/site/discoverysite/animalplanet');
const Discovery 	= require('./modules/site/discoverysite/discovery');
const InvestigationDiscovery 	= require('./modules/site/discoverysite/investigationdiscovery');
const FoodNetwork 	= require('./modules/site/discoverysite/foodnetwork');
const Hgtv 	= require('./modules/site/discoverysite/hgtv');
const Tlc 	= require('./modules/site/discoverysite/tlc');
const TravelChannel 	= require('./modules/site/discoverysite/travelchannel');
const ScienceChannel 	= require('./modules/site/discoverysite/sciencechannel');
const DiscoveryLife 	= require('./modules/site/discoverysite/discoverylife');
const CookingChannel 	= require('./modules/site/discoverysite/cookingchannel');
const Ahc 	= require('./modules/site/discoverysite/ahc');
const DiyNetwork 	= require('./modules/site/discoverysite/diynetwork');
const DestinationAmerica 	= require('./modules/site/discoverysite/destinationamerica');
const Cbs           = require('./modules/site/cbs');
const PbsKids           = require('./modules/site/pbskids');
const NationalGeographic           = require('./modules/site/foxsite/nationalgeographic');

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
const FETCH_INTERVAL = 240000;
/**
 * @constant
 * @type {number}
 * @default
 */
let MAX_SIMULTANEOUS_FETCHES = 2;
/**
 * @constant
 * @type {Array.<Object>}
 * @default
 */
const NETWORKS = { 
    /*"animalplanet": AnimalPlanet,
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
    "pbskids": PbsKids,*/
    "nationalgeographic": NationalGeographic
};
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
const LOGIN_INFO_FILE = 'login-info.txt';

Site.totalNetworks = Object.keys(NETWORKS).length;

var watchBrowser;
var programsCache;
var fetchLocked = false;
var fetchInterval;

const app = express();

// -------------------- Endpoints --------------------

// Allow parsing of the body of json requests
app.use( bodyParser.json() );

// Middleware to serve static public directory
app.use( '/static/', express.static(DIR) );

// Middleware to allow cors from any origin
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Endpoint to serve the basic HTML needed to run this app
app.get("/", async function(request, response) {
    let ipAddress = ip.address();
    let page = `<html>
<head>
<title>Spokapi</title>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="mobile-web-app-capable" content="yes">
<script src="/static/index.js"></script>
<link rel="stylesheet" type="text/css" href="/static/index.css">
<link href="https://fonts.googleapis.com/css?family=Noto+Sans+JP" rel="stylesheet">
<link rel="manifest" href="/static/manifest.json">
</head>
<body>
    <h1><img src="/static/spokapi.png"/>Spokapi</h1>
    <div id="programs">
        Loading...
    </div>
    <div id="login-wrapper">
        <div class="login-row"><label for="username"><div class="login-label-title">Username/Email: </div><input id="username" type="text"/></label></div>
        <div class="login-row"><label for="password"><div class="login-label-title">Password: </div><input id="password" type="password"/></label></div>
        <div class="login-row"><label for="cbs-username"><div class="login-label-title">CBS Username/Email: </div><input id="cbs-username" type="text"/></label></div>
        <div class="login-row"><label for="cbs-password"><div class="login-label-title">CBS Password: </div><input id="cbs-password" type="password"/></label></div>
        <div class="login-row"><label for="provider"><div class="login-label-title">Provider: </div>
            <select id="provider">
                <option value="AT&T U-verse">AT&T U-verse</option>
                <option value="Cox">Cox</option>
                <option value="DIRECTV">DIRECTV</option>
                <option value="DIRECTV NOW">DIRECTV NOW</option>
                <option value="DISH">DISH</option>
                <option value="Frontier Communications">Frontier Communications</option>
                <option value="Hulu">Hulu</option>
                <option value="Mediacom">Mediacom</option>
                <option value="Optimum">Optimum</option>
                <option value="Sling TV">Sling TV</option>
                <option value="Spectrum">Spectrum</option>
                <option value="Spectrum">Suddenlink</option>
                <option value="Verizon Fios">Verizon Fios</option>
                <option value="Xfinity">Xfinity</option>
            </select>
        </label></div>
        <button id="update-info">Update Information</button>
    </div>
    <div id="break-cache-wrapper">
        <button id="start-fetching">Start Fetching</button>
        <button id="stop-fetching">Stop Fetching</button>
        <button id="break-cache">Break Cache</button>
    </div>
    <div id="channels-wrapper">
        <div id="block-channels">
            <div class="block-channels-row"><label for="channel"><div class="block-channels-title">Channel: </div><input id="channel" type="text"/></label></div>
            <button id="block-channel">Block Channel</button>
        </div>
        <div id="blocked-channels"></div>
    </div>
</body>
</html>
`;

    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(page);
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
                watchBrowser.disconnect();
                watchBrowser = null;
            }

            let fetchNetworks;
            if( request.query.networks ) {
                fetchNetworks = request.query.networks.split(",");
            }
            await fetchPrograms(fetchNetworks);

            // Remove watchBrowser from memory
            if ( !Site.PATH_TO_CHROME ) {
                if (watchBrowser) { watchBrowser.disconnect() };
                watchBrowser = null;
            }
        }

    }
    else {
        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify({ status: "success", programs: programsCache }));
    }
});

// Endpoint to watch a program
app.get('/watch', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));

    if( !Site.PATH_TO_CHROME && watchBrowser ) {
        watchBrowser.disconnect();
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

    // Ensure the page is focused
    await page.bringToFront();

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

    // We don't wait for watching to be done before sending the response
    await watch(page, url, request);

    // Remove watchBrowser from memory
    if ( !Site.PATH_TO_CHROME ) {
        if (watchBrowser) { watchBrowser.disconnect() };
        watchBrowser = null;
    }
});

// Endpoint to stop a program
app.get('/stop', async function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));

    if( !Site.PATH_TO_CHROME && watchBrowser ) {
        watchBrowser.disconnect();
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
        if (watchBrowser) { watchBrowser.disconnect() };
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
        Site.username = username;
    }
    if( password ) {
        Site.password = password;
    }
    if( provider ) {
        Site.provider = provider;
    }
    if( cbsUsername ) {
        Cbs.cbsUsername = cbsUsername;
    }
    if( cbsPassword ) {
        Cbs.cbsPassword = cbsPassword;
    }

    // Save the info for future use
    fs.writeFileSync( LOGIN_INFO_FILE, JSON.stringify(request.body) );

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
} );

// Endpoint to remove/add channels from the list of those disallowed
app.post( '/channel', async function(request, response) {
    let channel = request.body.channel;
    let type = request.body.type;

    Site.unsupportedChannels = { "channel": channel, "type": type };

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

// -------------------- Main Program --------------------

// Read file for login data
if ( fs.existsSync(LOGIN_INFO_FILE) ) { 
    let contents = fs.readFileSync(LOGIN_INFO_FILE, 'utf8');
    try {
        let loginInfo = JSON.parse(contents);
        if( loginInfo.username ) {
            Site.username = loginInfo.username;
        }
        if( loginInfo.password ) {
            Site.password = loginInfo.password;
        }
        if( loginInfo.provider ) {
            Site.provider = loginInfo.provider;
        }
        if( loginInfo.cbsUsername ) {
            Cbs.cbsUsername = loginInfo.cbsUsername;
        }
        if( loginInfo.cbsPassword ) {
            Cbs.cbsPassword = loginInfo.cbsPassword;
        }
    }
    catch(e) {
        console.log(e);
    }
}

app.listen(PORT); // Listen for requests

// -------------------- Helper Functions --------------------

/**
 * Launch the watch browser.
 */
async function openBrowser() {
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
        watchBrowser = await Site.connectToChrome();
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
    await page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

    let networkName = request.query.network;

    let Network = NETWORKS[networkName];
    if( Network ) {
        let network = new Network(page);
        await network.watch();
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
        fetchNetworks = Object.keys(NETWORKS);
    }

    networks = [];
    if( !Site.PATH_TO_CHROME ) {
        watchBrowser = await Site.connectToChrome();
        // Create an instance of each network class
        let index = 1;
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
    let values = [];
    for( let i=0; i < networks.length; i += MAX_SIMULTANEOUS_FETCHES ) {
        let currentNetworks = [];
        for ( let j=0; j<MAX_SIMULTANEOUS_FETCHES; j++ ) {
            if( i+j < networks.length ) {
                currentNetworks.push(networks[i+j]);
            }
        }
        values = values.concat(
            await Promise.all(
                currentNetworks.map( network => network.generatePrograms() )
            )
        );
    }

    // Concatenate all the values
    let joinedValues = [];
    for (let value of values) {
        joinedValues = joinedValues.concat(value);
    }

    // If we didn't fetch the network, try to use the cached value
    if( programsCache ) {
        for( let network of Object.keys(NETWORKS) ) {
            if( fetchNetworks.indexOf(network) == -1 ) {
                for( let cachedProgram of programsCache ) {
                    if( cachedProgram.network == network ) {
                        joinedValues.push(cachedProgram);
                    }
                }
            }
        }
    }

    // Update the cache
    programsCache = joinedValues;

    // Cleanup
    if( Site.PATH_TO_CHROME ) {
        networks.map( network => network.browser.close() )
    }
    else {
        // Try to conserve memory by closing pages
        await Promise.all(
            networks.map( network => network.stop() )
        );
    }

    fetchLocked = false;
    return Promise.resolve(true);
}