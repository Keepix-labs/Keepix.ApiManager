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

mkdir /root/.keepix
wget -O /root/.keepix/api.tar.gz https://github.com/Keepix-labs/Keepix.ApiManager/releases/download/v0.0.37/api.tar.gz
rm -rf /root/.keepix/release
tar -xvf /root/.keepix/api.tar.gz -C /root/.keepix
rm -rf /root/.keepix/api.tar.gz
cp -r /root/.keepix/release/ssl /root/.keepix/ssl
cp /root/.keepix/release/package.json /root/.keepix/package.json
cp /root/.keepix/release/run.js /root/.keepix/run.js
npm install --prefix /root/.keepix
pm2 restart /root/.keepix/release/pm2.config.js