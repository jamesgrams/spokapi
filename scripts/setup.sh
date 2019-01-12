# Script to set up parameters for Spokapi

# Allow ssh
sudo /usr/libexec/debugd/helpers/dev_features_ssh

# Install node
crew install node
nodebrew install 10.15.0
nodebrew use 10.15.0

# Install Python
crew install python2.7
# Install uinput
pip2.7 install python-uinput 

# Install SPOKAPI
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install --prefix /home/chronos/user/Downloads/spokapi
# Note that everything for Spokapi is installed prior to moving the files
# There was some issue running npm in the /opt/ directory 
sudo cp -r /home/chronos/user/Downloads/spokapi /opt/

# Place the SPOKAPI startup scripts
sudo cp /opt/spokapi/scripts/spokapi_login.conf /etc/init/
sudo cp /opt/spokapi/scripts/spokapi_desktop.conf /etc/init/

# Allow Flash
sudo mkdir -p /etc/opt/chrome/policies/managed
sudo touch /etc/opt/chrome/policies/managed/test_policy.json
echo "{ \"RunAllFlashInAllowMode\": true, \"AllowOutdatedPlugins\": true, \"DefaultPluginsSetting\": 1,\"PluginsAllowedForUrls\": [\"https://*\", \"http://*\"]}" | sudo tee /etc/opt/chrome/policies/managed/test_policy.json

# Allow Chrome remote debugging
echo "--remote-debugging-port=1337" | sudo tee /etc/chrome_dev.conf