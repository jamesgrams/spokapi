# Script to set up parameters for Spokapi (run as root)

# Install chromebrew
curl -Ls git.io/vddgY | bash

# Install node
crew install node
nodebrew install 10.15.0
nodebrew use 10.15.0

# Install SPOKAPI
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
npm install --prefix /home/chronos/user/Downloads/spokapi
sudo cp -r /home/chronos/user/Downloads/spokapi /opt/

# Place the SPOKAPI startup script
sudo cp /opt/spokapi/scripts/spokapi.conf /etc/init/

# Allow Flash
sudo mkdir -p /etc/opt/chrome/policies/managed
sudo touch /etc/opt/chrome/policies/managed/test_policy.json
echo "{ \"RunAllFlashInAllowMode\": true, \"AllowOutdatedPlugins\": true, \"DefaultPluginsSetting\": 1,\"PluginsAllowedForUrls\": [\"https://*\", \"http://*\"]}" | sudo tee /etc/opt/chrome/policies/managed/test_policy.json

# Allow Chrome remote debugging
echo "--remote-debugging-port=1337" | sudo tee --append /etc/chrome_dev.conf