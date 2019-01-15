"""
Bluetooth receiver script
This script will receive bluetooth connections and forward them 
to the Spokapi web server. It will forward responses back to the client.
"""

import bluetooth
import json
import urllib2, urllib

# The number of unaccepted requests we will allow before refusing new connections
backlog = 1
# Our uuid for our advertised service
uuid = "307bc028-a805-4c23-b34c-2ea1a66a5c4e"
# Our buffer size
buffer_size = 1024

# Get the socket we will be serving from 
server_socket = bluetooth.BluetoothSocket( bluetooth.RFCOMM )
# Binding to port 0 is the same as getting any available port as per the PyBluez docs
port = 0

# Bind to the port and listen
server_socket.bind( ("", port) )
server_socket.listen( backlog )

# Advertise this service using SDP protocol
# See here: https://people.csail.mit.edu/albert/bluez-intro/x290.html
bluetooth.advertise_service( server_socket, "Spokapi Service", uuid )

# Receive from a client
def receive( client_socket, address ):
    try:
        message = client_socket.recv( buffer_size )
        print message
        try:
            data = json.loads(message)
            url = "http://localhost:8080" + data['path']
            if data['request'] == "POST":
                req = urllib2.Request(url, data['options'])
                response = urllib2.urlopen(req)
            else:
                response = urllib.urlopen(url)
            response_data = response.read()
            client_socket.send( response_data )   
        except Exception as e:
            print e
            print "Couldn't parse JSON"
    except bluetooth.btcommon.BluetoothError:
        print "A Bluetooth Error has occurred"

try:
    while True:
        # Wait for a client to connect to us
        client_socket, address = server_socket.accept()
        print "Accepted connection from ", address
        receive ( client_socket, address )

# Catch interrupts to properly close sockets
# (When we quit the program)
except KeyboardInterrupt as e:
    print e
    # Stop advertising
    bluetooth.stop_advertising( server_socket )
    client_socket.close()
    server_socket.close()
