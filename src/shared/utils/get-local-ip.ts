const isValidIPv4 = (ip) => {
  const blocks = ip.split('.');
  if (blocks.length !== 4) {
      return false;
  }
  for (const block of blocks) {
      const numericBlock = parseInt(block, 10);
      if (!(numericBlock >= 0 && numericBlock <= 255)) {
          return false; 
      }
  }
  return true;
};

const isValidIPv6 = (ip) => {
  const blocks = ip.split(':');
  if (blocks.length < 8) {
      return false;
  }
  for (const block of blocks) {
      if (!/^[0-9A-Fa-f]{1,4}$/.test(block)) {
          return false; 
      }
  }
  return true;
};

export const getLocalIP = () => {
    const os = require("os");
    const networkInterfaces = os.networkInterfaces();
    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        if ((net.family == 4 || net.family === 'IPv4')
          && !net.internal
          && net.address !== undefined
          && isValidIPv4(net.address)) return net.address;
      }
    }
    return undefined;
};

export const getLocalIpId = () => {
  const ip = getLocalIP();

  if (ip !== undefined) {
    return Number(ip.split('.')[3]) - 1;
  }
  return 0;
}