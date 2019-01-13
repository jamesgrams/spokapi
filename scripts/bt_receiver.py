"""
Bluetooth Receiver script
"""

import bluetooth
import subprocess

command = 'hcitool dev | grep -o "[[:xdigit:]:]\{11,17\}"'
mac = subprocess.check_output(command, shell=True)

hostMACAddress = mac # The MAC address of a Bluetooth adapter on the server.
port = 3
backlog = 1
size = 1024
s = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
s.bind((hostMACAddress, port))
s.listen(backlog) # Listen for incoming requests
try:
    client, clientInfo = s.accept() # This will hang until we are connected
    while 1:
        data = client.recv(size)
        if data:
            print(data)
            client.send(data) # Echo back to client
except:
    print("Closing socket")
    client.close()
    s.close()
