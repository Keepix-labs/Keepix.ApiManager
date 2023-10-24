apt-get --yes update
apt-get --yes upgrade

# Go to settings kde wallet -> disable
# Go to settings "Startup and shutdown" -> Login Screen -> Advanced Tab -> enable Automaticaly login radxa and enable Login again

apt-get --yes install git ansible build-essential wireless-tools hostapd dnsmasq python3-dev python3-pip
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash 
source ~/.bashrc
nvm install v18.18.0
# git clone https://github.com/Keepix-labs/Keepix.ApiManager.git ~/Keepix.ApiManager
npm install -g pm2
# cd ~/Keepix.ApiManager
# npm install

wget https://github.com/Keepix-labs/Keepix.ApiManager/releases/download/v0.0.3/api.tar.gz
mkdir /root/.keepix
tar -xvf api.tar.gz -C /root/.keepix
rm -rf api.tar.gz
pm2 start pm2.config.js