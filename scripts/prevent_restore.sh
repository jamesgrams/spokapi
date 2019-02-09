while true
do
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/chronos/'Local State'
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]\+"/"exit_type":"Normal"/' /home/chronos/Default/Preferences
    sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]\+"/"exit_type":"Normal"/' /home/chronos/user/Preferences
    sleep 5
done