apt-get --yes update
apt-get --yes upgrade

# Go to settings kde wallet -> disable
# Go to settings "Startup and shutdown" -> Login Screen -> Advanced Tab -> enable Automaticaly login radxa and enable Login again

apt-get --yes install git ansible build-essential wireless-tools hostapd dnsmasq python3-dev python3-pip
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash 
source ~/.bashrc
nvm install v18.18.0
npm install -g pm2

npm install -g keepix-server-build@latest
keepix-server pm2