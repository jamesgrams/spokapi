# Program to create a virtual keyboard and type a password

import time
import signal
import os.path

from uinput import *

class timeout:
    def __init__(self, seconds=1, error_message='Timeout'):
        self.seconds = seconds
        self.error_message = error_message
    def handle_timeout(self, signum, frame):
        raise TimeoutError(self.error_message)
    def __enter__(self):
        signal.signal(signal.SIGALRM, self.handle_timeout)
        signal.alarm(self.seconds)
    def __exit__(self, type, value, traceback):
        signal.alarm(0)

def main():

    filename = "/opt/spokapi/password.txt"
    logged_in_file = "/home/chronos/user/Downloads/spokapi/scripts/login.py"
    timeoutSeconds = 3

    char_map = {
        "a":  KEY_A,
        "b":  KEY_B,
        "c":  KEY_C,
        "d":  KEY_D,
        "e":  KEY_E,
        "f":  KEY_F,
        "g":  KEY_G,
        "h":  KEY_H,
        "i":  KEY_I,
        "j":  KEY_J,
        "k":  KEY_K,
        "l":  KEY_L,
        "m":  KEY_M,
        "n":  KEY_N,
        "o":  KEY_O,
        "p":  KEY_P,
        "q":  KEY_Q,
        "r":  KEY_R,
        "s":  KEY_S,
        "t":  KEY_T,
        "u":  KEY_U,
        "v":  KEY_V,
        "w":  KEY_W,
        "x":  KEY_X,
        "y":  KEY_Y,
        "z":  KEY_Z,
        "1":  KEY_1,
        "2":  KEY_2,
        "3":  KEY_3,
        "4":  KEY_4,
        "5":  KEY_5,
        "6":  KEY_6,
        "7":  KEY_7,
        "8":  KEY_8,
        "9":  KEY_9,
        "0":  KEY_0,
        "\t": KEY_TAB,
        "\n": KEY_ENTER,
        " ":  KEY_SPACE,
        ".":  KEY_DOT,
        ",":  KEY_COMMA,
        "/":  KEY_SLASH,
        "\\": KEY_BACKSLASH,
    }

    # List of keyboard events to allow
    events = char_map.values() + [ KEY_LEFTSHIFT ]

    # List of keys we need to press shift to use
    shift_keys = {
        "!": "1",
        "@": "2",
        "#": "3",
        "$": "4",
        "%": "5",
        "^": "6",
        "&": "7",
        "*": "8",
        "(": "9",
        ")": "0"
    }


    # Open, read, and close the file 
    with open(filename) as f:
        content = f.read()

    print "Loading..."

    complete = False
    while not complete:
        # The Device can hang sometimes, retry after 3 seconds
        with timeout(seconds=timeoutSeconds):
            # Type the password
            with Device(events) as device:
                time.sleep(1) # This gives the screen time to load up
                for char in content:
                    # If the character needs shift (is uppercase or is special charater)
                    shift = False
                    if ( char.isupper() ) or ( char in shift_keys ):
                        shift = True
                        if ( char in shift_keys ):
                            char = shift_keys[char]
                    # Get the right keycode
                    keycode = char_map[char.lower()]
                    # emit the appropriate keys
                    if shift:
                        device.emit_combo([
                            KEY_LEFTSHIFT,
                            keycode
                        ])
                    else:
                        device.emit_click(keycode)
                time.sleep(1)
                device.emit_click(KEY_ENTER)
                complete = True
    
    print "Complete"

while not os.path.isfile(logged_in_file):
    time.sleep(timeoutSeconds)
    main()