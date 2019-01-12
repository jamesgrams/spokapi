# Spokapi Setup on Chrome OS

1. Setup a Google account specifically for this device with a unique password.
2. Put your Chrome Device in developer mode (Follow instructions [here](https://archlinuxarm.org/platforms/armv7/rockchip/asus-chromebit-cs10))
3. Open a terminal by pressing `Ctrl + Alt + T` in Chrome, and use the `shell` command to get to a bash shell.
4. Install Chromebrew using `curl -Ls git.io/vddgY | bash` (this will also install Git)
5. Clone Spokapi into `/home/chronos/user/Downloads` by running `git clone https://github.com/jamesgrams/spokapi.git`
6. Reboot, and go back into a bash terminal (see step 2).
7. Create a file named `password.txt` and place in `/home/chronos/user/Downloads/spokapi`. The contents of this file should be the password of your account (This will be used to auto-login).
8. In Chrome Settings, set to boot to the new tab page each time.
9. Remove the write protection on the file system by running `sudo /usr/share/vboot/bin/make_dev_ssd.sh --remove_rootfs_verification`, and then running the command that prints out.
10. Reboot, go back into a bash terminal (see step 2) and make sure you can write to the file system (`touch /etc/test`)
11. If you can't remove the write protection (happens sometimes) repeat the previous two steps until you can (should take at most 3 times)
12. At this point, the system is setup where all future steps can be done automatically. Run `/home/chronos/user/Downloads/spokapi/scripts/setup.sh` to setup Spokapi. You may have to input some information (such as typing Y to confirm) while this script runs.
13. To allow ssh with a password, you may have to set a password for the chronos user.