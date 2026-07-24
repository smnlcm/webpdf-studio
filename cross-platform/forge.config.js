const {
  FuseV1Options,
  FuseVersion
} = require("@electron/fuses");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "WebPDF",
    appBundleId: "studio.webpdf.desktop",
    appCategoryType: "public.app-category.productivity",
    win32metadata: {
      CompanyName: "WebPDF Studio",
      FileDescription: "WebPDF Studio",
      InternalName: "WebPDF",
      OriginalFilename: "WebPDF.exe",
      ProductName: "WebPDF Studio"
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],
      config: {
        name: "webpdf_studio",
        authors: "WebPDF Studio",
        description: "Professional HTML to PDF desktop application",
        setupExe: "WebPDF-Studio-Setup.exe",
        noMsi: true
      }
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        name: "WebPDF-Studio",
        format: "ULFO"
      }
    },
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {
        options: {
          name: "webpdf-studio",
          productName: "WebPDF Studio",
          genericName: "HTML to PDF Converter",
          bin: "WebPDF",
          categories: ["Office", "Utility"],
          maintainer: "WebPDF Studio",
          homepage: "https://github.com/smnlcm/webpdf-studio"
        }
      }
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32", "darwin", "linux"]
    }
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
      resetAdHocDarwinSignature: true
    })
  ]
};
