# Spokapi Application

Spokapi is an application that simplifies watching TV online (using sites such as WatchESPN) by providing an interface as simple as a TV remote that can be accessed on your smartphone.

## Usage Overview
1. Connect a computer to your TV and the internet.
2. Install and run Spokapi on that computer.
3. Get the IP of your computer
4. Access Spokapi with any device with a web browser by going to your computer's **local** IP address and port 8080 (e.g. 10.0.0.120:8080).

## Installation
1. Clone this repository.
2. `cd` to this repository.
3. Make sure you have node and npm installed.
4. Make sure you have Google Chrome downloaded and know the path to it.
5. `npm install`
7. `export SPOKAPI_USERNAME=<Your Cable Provider Username/Email>`
8. `export SPOKAPI_PASSWORD=<Your Cable Provider Username/Password>`
9. `export SPOKAPI_PROVIDER=<Your Cable Provider>` (See the list of Supported Cable Providers)
11. `export SPOKAPI_CHROME_PATH=<Path to Google Chrome on your Computer>` (Recommended Version: 68 [This saves your flash settings]).
    1. You may run Spokapi without specifying Chrome Path. If you do this, Spokapi will try to connect to Chrome's remote debugging on port 1337 (It'll try to connect to an already running instance of Chrome - the only way to work on Chrome OS, since you can't reopen a new instance of Chrome).
    2. You must configure chrome to enable remote debugging (using `--remote-debugging-port=1337`) to do this.
    3. You can include this flag when you start Chrome on the command line
    4. On Chrome OS, you can put this flag in `/etc/chrome_dev.conf` (You will have to restart your Chromebook after doing so for changes to take effect)
12. `npm start`
13. Some programs use flash. Unfortunately, Spokapi can't allow flash automatically. You can set up the Chrome Profile that Spokapi uses to save your flash settings, provided you are not using Chrome above version 68. To do this, do the following:
    1. `<Path to Google Chrome on your Computer> --user-data-dir=<Path to Spokapi Directory>/userDataDir` (Run this from the Spokapi directory)
    2. Once the browser starts, go to `chrome://flags/`
    3. Set the `Enable Ephemeral Flash Permissions` permission to Disabled.
    4. Restart Chrome.
    5. When you go to watch a program on Spokapi that needs flash installed, Spokapi will fail to start the program, because Flash is disabled. When this happens, manually click to "Allow Flash" (There may be a link to "Update Flash Player" that you must click). Chrome should now have saved your preference to allow Flash for that site, and you should be able to use Spokapi worry-free now.
14. Alternitivelty, to enable flash, you can create a policy to allow flash (tested on Linux and Chrome OS).
    1. `mkdir -p mkdir /etc/opt/chrome/policies/managed`
    2. `touch /etc/opt/chrome/policies/managed/test_policy.json`
    3. Add the following to the newly created file `{ "RunAllFlashInAllowMode": true, "AllowOutdatedPlugins": true, "DefaultPluginsSetting": 1,"PluginsAllowedForUrls": ["https://*", "http://*"]}`
    4. Restart Chrome/Chrome OS. Flash should now be enabled by default. You can confirm policies by going to `chrome://policy`
15. You should be all set! Note: You might want to make sure that the computer running the Spokapi server has a static local IP address in your router settings. In addition, adding the Spokapi client's URL to the homesreen of your device should provide easy access!
16. Another note: If you are connecting to a pre-existing chrome instance, you will want to make sure the window is somewhat large, so that Spokapi finds all the right elements (We don't want mobile view!). Starting chrome with `--start-maximized` should work on most screens.

## Current Support
- Providers
    - AT&T U-verse
    - Cox
    - DIRECTV
    - DIRECTV NOW
    - DISH
    - Frontier Communications
    - Hulu
    - Mediacom
    - Optimum
    - Sling TV
    - Spectrum
    - Suddenlink
    - Verizon Fios
    - Xfinity
    
- Channels
    - AHC (American History Channel)
    - Animal Planet
    - CBS
    - Cooking Channel
    - Destination America
    - Discovery
    - Discovery Life
    - DIY Network
    - ESPN (+ subsidiaries)
    - FBN (Fox Business Network)
    - Food Network
    - Fox
    - Fox News
    - Fox Sports (+ subsidiaries)
    - HGTV
    - Investigation Discovery
    - NBC Sports (+ subsidiaries)
    - PBS KIDS
    - Science Channel
    - TLC
    - Travel Channel

### How to add a network

1. Create a class for the network extending Site (the filename should be the lowercase class name)
2. Implement a generatePrograms, login, and watch method (make sure you make use of the provider features [Create a mapping, "VALID_PROVIDERS," to map provider classes to a string that can easily be used to select the provider])
3. Add the class to the object of networks in `src/index.js` (the key should be the lowercase class name). You will have to import the class too.

### How to add a provider

1. Create a class for the provider extending Provider (the filename should be the lowercase class name)
    - It's a good idea for the "name" to be what you would usually need to select the provider (That way, you don't have to specify a custom one for each network)
    - The "name" is also what you will use as the provider name when specifying (e.g. SPOKAPI_PROVIDER env variable)
2. Add the class to the array of classes in `src/modules/site.js`
3. For each of the site subclasses, make sure to appropriately update VALID_PROVIDERS to help with selecting the new provider when provider login is needed

## Endpoints
- `/programs/`
    - This will return an array of objects containing a list of available programs to watch
- `/watch/`
    - This allows you to control the browser by watching a program
- `/pause/`
    - This pauses the watching program
- `/stop/`
    - This stops the program that is currently playing (It directs the browser to a blank page)
- `/break/`
    - This breaks the cache of stored programs
- `/info/`
    - Post to this endpoint to update provider and login information
    - Get this endpoint to get login information (requires a key)
- `/channel/`
    - Post to this endpoint to change what channels you want to include
    - Get this endpoint to get what channels are currently blocked
- `/start-interval/`
    - This starts the regular fetching of programs (on an interval)
- `/stop-interval/`
    - This stops the regular fetching of programs (on an interval)
- `/networks/connect/`
    - Connect to a wifi network (Chrome OS)
- `/networks/available`
    - list available wifi network (Chrome OS)
- `/networks/connected`
    - list connected wifi network (Chrome OS)
- `/networks/disconnect`
    - Disconnect from a wifi network (Chrome OS)
- `/update/`
    - Updates Spokapi (Chrome OS)
- `/ip/`
    - Gets the ip of the Spokapi server
- `/navigate/`
    - Allows for navigation to any URL (useful for testing; especially going to `chrome://settings`)
- `/`
    - This will return the Spokapi Client (Simple and useful for testing)

![Spokapi Logo](public/spokapi.png)
