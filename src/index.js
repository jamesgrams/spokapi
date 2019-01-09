/**
 * @file    Index for the Spokapi application
 * @author  James Grams
 */

const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const ip = require("ip");
const Site 	= require('./modules/site');
const Espn 	= require('./modules/site/espn');
const NbcSports 	= require('./modules/site/nbcsports');
const FoxSports 	= require('./modules/site/foxsports');

/**
 * @constant
 * @type {number}
 * @default
 */
const PORT           = 8080;

var watchBrowser;
const app = express();
const dir = 'public';

// Middleware to serve static public directory
app.use( '/static/', express.static(dir) );

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
<script src="/static/index.js"></script>
<link rel="stylesheet" type="text/css" href="/static/index.css">
<link href="https://fonts.googleapis.com/css?family=Noto+Sans+JP" rel="stylesheet"> 
</head>
<body>
    <h1><img src="/static/spokapi.png"/>Spokapi</h1>
    <div id="games">
        Loading...
    </div>
</body>
</html>
`;

    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(page);
});

// Endpoint to get a list of games
app.get('/games', async function(request, response) {
    let espn = new Espn();
    let nbcSports = new NbcSports();
    let foxSports = new FoxSports();

    let values = await Promise.all(
        [ espn.generateGames(),
        nbcSports.generateGames(),
        foxSports.generateGames() ]
    );

    let joinedValues = [];
    for (let value of values) {
        joinedValues = joinedValues.concat(value);
    }

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({ status: "success", games: joinedValues }));

    if( Site.PATH_TO_CHROME ) {
        espn.browser.close();
        nbcSports.browser.close();
        foxSports.browser.close();
    }
    else {
        espn.page.close();
        nbcSports.page.close();
        foxSports.page.close();
    }
});

// Endpoint to watch a game
app.get('/watch', async function(request, response) {
    if( !watchBrowser ) {
        await openBrowser();
    }
    // The url to watch the game on
    let url = decodeURIComponent(request.query.url);
    let pages = await watchBrowser.pages();
    let page = pages[0];

    // We don't wait for watching to be done
    // Browsers can start retrying requests that don't complete - we don't want this
    watch(page, url, request);

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
});

// Endpoint to stop a game
app.get('/stop', async function(request, response) {
    if( !watchBrowser ) {
        await openBrowser();
    }
    let pages = await watchBrowser.pages();
    let page = pages[0];
    let site = new Site(page);
    await site.stop();

    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify({"status":"success"}));
});

app.listen(PORT);

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
    }
    // If not, we'll try to connect to an existing instance (ChromeOS)
    else {
        watchBrowser = await Site.connectToChrome();
    }
    watchBrowser.on("disconnected", function() {
        watchBrowser = null;
    });
    let pages = await watchBrowser.pages();
    let page = pages[0];
    // This makes the viewport correct
    // https://github.com/GoogleChrome/puppeteer/issues/1183#issuecomment-383722137
    await page._client.send('Emulation.clearDeviceMetricsOverride');
    return Promise.resolve(1);
}

/**
 * Asynchronously start watching
 */
async function watch(page, url, request) {
    await page.goto(url, {timeout: Site.STANDARD_TIMEOUT});

    let network = request.query.network;
    // Use the right code to watch the game
    switch(network) {
        case "espn":
            let espn = new Espn(page);
            await espn.watch();
            break;
        case "nbcsports":
            let nbcSports = new NbcSports(page);
            await nbcSports.watch();
            break;
        case "foxsports":
            let foxSports = new FoxSports(page);
            await foxSports.watch();
            break;
        default:
            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(JSON.stringify({"status":"failure", "message":"Invalid Network"}));
            return;
    }
    return Promise.resolve(1);
}