// WebPDF Studio v4.0.1 FINAL BASIC - forge.config.js
module.exports = {
  packagerConfig: {
    asar: true,
    name: 'WebPDF-Studio-v4.0.1',
    executableName: 'WebPDF-Studio-v4.0.1',
    icon: './src/renderer/icon',
    extraResource: []
  },
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'linux', 'darwin'],
      config: {}
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'WebPDF Studio',
          homepage: 'https://mavvi.online'
        }
      }
    }
  ],
  plugins: []
};
