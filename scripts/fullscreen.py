import time
from uinput import *

with Device([KEY_F11]) as device:
  time.sleep(1)
  device.emit_click(KEY_F11)