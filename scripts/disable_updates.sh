# Disable auto-updates for Chrome OS

sudo touch /mnt/stateful_partition/etc/lsb-release && echo -e "CHROMEOS_RELEASE_VERSION=9999.9999.9999.9999\nGOOGLE_RELEASE=9999.9999.9999.9999" | sudo tee /mnt/stateful_partition/etc/lsb-release