# Script to set up parameters for Spokapi (run as root)

curl -Ls git.io/vddgY | bash
crew install node
cp /home/chronos/user/Downloads/spokapi /opt/
mkdir -p mkdir /etc/opt/chrome/policies/managed
touch /etc/opt/chrome/policies/managed/test_policy.json
echo "{ \"RunAllFlashInAllowMode\": true, \"AllowOutdatedPlugins\": true, \"DefaultPluginsSetting\": 1,\"PluginsAllowedForUrls\": [\"https://*\", \"http://*\"]}" > /etc/opt/chrome/policies/managed/test_policy.json