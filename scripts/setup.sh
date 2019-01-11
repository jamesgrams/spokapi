# Script to set up parameters for Spokapi (run as root)

# Install chromebrew
curl -Ls git.io/vddgY | bash

# Install node
crew install node

# Install SPOKAPI
cp /home/chronos/user/Downloads/spokapi /opt/
npm install --prefix /opt/spokapi

# Place the SPOKAPI startup script
cp /opt/spokapi/scripts/spokapi.conf /etc/init/

# Allow Flash
mkdir -p mkdir /etc/opt/chrome/policies/managed
touch /etc/opt/chrome/policies/managed/test_policy.json
echo "{ \"RunAllFlashInAllowMode\": true, \"AllowOutdatedPlugins\": true, \"DefaultPluginsSetting\": 1,\"PluginsAllowedForUrls\": [\"https://*\", \"http://*\"]}" > /etc/opt/chrome/policies/managed/test_policy.json

# Allow Chrome remote debugging
echo "--remote-debugging-port=1337" >> /etc/chrome_dev.conf