// JavaScript File to run the Spokapi Client
var programs = {};
var xhttp;
window.addEventListener('load', function() {
    loadPrograms();
    loadBlockedChannels();
    document.getElementById("update-info").addEventListener('click', updateInfo);
    document.getElementById("break-cache").addEventListener('click', breakCache);
    document.getElementById("start-fetching").addEventListener('click', startFetching);
    document.getElementById("stop-fetching").addEventListener('click', stopFetching);
    document.getElementById("block-channel").addEventListener('click', addBlockedChannel);
});
function clearWatchedPrograms() {
    var programElements = document.querySelectorAll(".program");
    for(var i=0; i<programElements.length; i++) {
        programElements[i].className = "program";
    }
}
function watchProgram(programElement) {
    if(!programElement.className.includes("watching")) {
        clearWatchedPrograms();
        var link = programElement.getAttribute('data-link');
        // clear any existing requests
        if( xhttp ) {
            xhttp.abort;
        }
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                programElement.className = "program watching";
            }
        };
        xhttp.open("GET", link, true);
        xhttp.send();
    }
    // Turn off the program
    else {
        if( xhttp ) {
            xhttp.abort;
        }
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                programElement.className = "program";
            }
        };
        xhttp.open("GET", "/stop", true);
        xhttp.send();
    }
}
function loadPrograms() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            var status = JSON.parse(this.responseText).status;
            if( status === "success" ) {
                document.getElementById("programs").innerHTML = "";
                programs = JSON.parse(this.responseText).programs;
                sortPrograms();
                generatePrograms();
            }
            else {
                document.getElementById("programs").innerHTML = "Still loading...";
                window.setTimeout( loadPrograms, 2000 );
            }
        }
        else if( this.readyState == 4 ) {
            document.getElementById("programs").innerHTML = "An error has occurred.";
        }
    };
    xhttp.open("GET", "/programs", true);
    xhttp.send();
}
function sortPrograms() {
    programs.sort( function(a, b) {
        if( a.title.toLowerCase() < b.title.toLowerCase() ) { return -1 };
        if( b.title.toLowerCase() < a.title.toLowerCase() ) { return 1 };
        return 0;
    } );
}
function generatePrograms() {
    for(var i=0; i<programs.length; i++) {
        var program = programs[i];
        program = generateProgram(program);
        document.getElementById("programs").innerHTML += program;
    }
}
function generateProgram(program) {
    var className = 'program';
    if( program.watching ) {
        className += " watching";
    }
    program.endTime = new Date( new Date(program.startTime).getTime() + parseInt(program.runTime) ).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    program.startTime = new Date(program.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    var displayTime = program.startTime;
    if( program.runTime ) {
        displayTime = program.startTime + " - " + program.endTime;
    }
    var episodeInfo = "";
    if( program.episodeTitle || program.episode || program.season ) {
        var episodeInfoArray = [];
        if( program.episodeTitle ) {
            episodeInfoArray.push(program.episodeTitle);
        }
        if( program.season ) {
            episodeInfoArray.push("S" + parseInt(program.season));
        }
        if( program.episode ) {
            episodeInfoArray.push("E" + parseInt(program.episode));
        }
        episodeInfo = episodeInfoArray.join(" ");
        episodeInfo = "<div class='program-info'>" + episodeInfo + "</div>";
    }
    var image = "";
    if( program.episodeThumbnailUrl ) {
        image = "<div class='program-image' style='background-image: url(\"" + program.episodeThumbnailUrl + "\")'></div>";
    }
    var description = "";
    if( program.description ) {
        description = "<div class='program-description'>" + program.description + "</div>";
    }
    var html = "<div class='" + className + "' onclick='watchProgram(this)' data-link='"+program.link+"'>" +
        image +
        "<div class='program-title'>" + program.title + "</div>" +
        episodeInfo +
        "<div class='program-right'><div class='program-channel'>" + program.channel + "</div>" +
        "<div class='program-time'>" + displayTime + "</div></div>" +
        description + 
        "<div class='program-seperator'></div>"
        "</div>";
    return html;
}
function updateInfo() {
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    var provider = document.getElementById("provider").value;
    var cbsUsername = document.getElementById("cbs-username").value;
    var cbsPassword = document.getElementById("cbs-password").value;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/info", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        "username": username,
        "password": password,
        "provider": provider,
        "cbsUsername": cbsUsername,
        "cbsPassword": cbsPassword
    }));
}
function breakCache() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/break", true);
    xhttp.send();
}
function startFetching() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/start-interval", true);
    xhttp.send();
}
function stopFetching() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/stop-interval", true);
    xhttp.send();
}
function loadBlockedChannels() {
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", "/channel", true);
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            document.getElementById('blocked-channels').innerHTML = ""; // Clear out any current list of blocked channels
            channels = JSON.parse(this.responseText).channels;
            for(var i=0; i<channels.length; i++) {
                createBlockedChannel(channels[i]);
            }
        }
    };
    xhttp.send();
}
function createBlockedChannel(channel) {
    var html = "<div onclick='removeBlockedChannel(this)' class='blocked-channel'>" + channel + "</div>";
    document.getElementById('blocked-channels').innerHTML += html;
}
function addBlockedChannel() {
    var channel = document.getElementById("channel").value;
    if( channel ) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/channel", true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            "channel": channel,
            "type": "block"
        }));
    }
    loadBlockedChannels();
}
function removeBlockedChannel(channelElement) {
    var channel = channelElement.textContent;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/channel", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        "channel": channel,
        "type": "allow"
    }));
    loadBlockedChannels();
}