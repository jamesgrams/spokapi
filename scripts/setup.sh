# Script to set up parameters for Spokapi

# Disable auto updates
sudo rm /etc/init/update-engine.conf 

# Allow ssh
sudo /usr/libexec/debugd/helpers/dev_features_ssh

# Install node
crew install node
nodebrew install 10.15.0
nodebrew use 10.15.0

# Install Python
crew install python27
# Install uinput
pip2.7 install python-uinput

# Install SPOKAPI
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install --prefix /home/chronos/user/Downloads/spokapi
# Note that everything for Spokapi is installed prior to moving the files
# There was some issue running npm in the /opt/ directory 
sudo cp -r /home/chronos/user/Downloads/spokapi /opt/

# Install Bluetooth dependencies
# First, the header files
sudo mv /opt/spokapi/lib/bluetooth /usr/local/include/bluetooth
# Next, the custom version of PyBluez (this version specifies the gcc compiler to use gold)
# See here for info on why we need this (https://bugs.chromium.org/p/chromium/issues/detail?id=883719)
# Basically, the Chromium compiled .so files for Bluetooth have some infomation not supported by ld, the standard linker
# They do work with the gold linker, however (see here: https://gcc.gnu.org/onlinedocs/gcc/Link-Options.html)
sudo mv /opt/spokapi/lib/PyBluez-0.22 /usr/local/PyBluez-0.22
# Install PyBluez locally
sudo LD_LIBRARY_PATH=/usr/local/lib pip2.7 install -e /usr/local/PyBluez-0.22
# Add SDP tool to the library path
sudo mv /opt/spokapi/lib/sdptool /usr/bin/sdptool
# Move updated start_bluetoothd.script
sudo mv /opt/spokapi/lib/start_bluetoothd.sh /usr/bin/start_bluetoothd.sh

# Allow Wifi to be changed by wpa
chmod 777 -R /usr/lib/shill/shims/wpa_supplicant.conf
# Add update_config=1 if not already there
grep -q -x -F 'update_config=1' /usr/lib/shill/shims/wpa_supplicant.conf || echo 'update_config=1' >> /usr/lib/shill/shims/wpa_supplicant.conf

# Place the SPOKAPI startup scripts
sudo cp /opt/spokapi/scripts/spokapi_login.conf /etc/init/
sudo cp /opt/spokapi/scripts/spokapi_desktop.conf /etc/init/

# Allow Flash
sudo mkdir -p /etc/opt/chrome/policies/managed
sudo touch /etc/opt/chrome/policies/managed/test_policy.json
echo "{ \"RunAllFlashInAllowMode\": true, \"AllowOutdatedPlugins\": true, \"DefaultPluginsSetting\": 1,\"PluginsAllowedForUrls\": [\"https://*\", \"http://*\"]}" | sudo tee /etc/opt/chrome/policies/managed/test_policy.json

# Allow Chrome remote debugging
echo -e "--remote-debugging-port=1337" | sudo tee /etc/chrome_dev.conf