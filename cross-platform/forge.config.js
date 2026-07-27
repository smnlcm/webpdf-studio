const {
  FuseV1Options,
  FuseVersion
} = require("@electron/fuses");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

module.exports = {
  packagerConfig: {
    asar: true,
    executableName: "WebPDF",
    appBundleId: "studio.webpdf.desktop",
    appCategoryType: "public.app-category.productivity",
    ignore: [/^\/tmp(?:\/|$)/],
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
  hooks: {
    postPackage: async (_forgeConfig, packageResult) => {
      if (packageResult.platform !== "darwin") {
        return;
      }

      for (const outputPath of packageResult.outputPaths) {
        const appPath = path.join(outputPath, "WebPDF Studio.app");
        if (!fs.existsSync(appPath)) {
          throw new Error(`Packaged macOS application not found: ${appPath}`);
        }

        // This is an ad-hoc signature for bundle integrity and native CI tests.
        // It does not establish a developer identity and is not notarization.
        execFileSync(
          "codesign",
          ["--force", "--deep", "--sign", "-", appPath],
          { stdio: "inherit" }
        );
        execFileSync(
          "codesign",
          ["--verify", "--deep", "--strict", "--verbose=2", appPath],
          { stdio: "inherit" }
        );
      }
    }
  },
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false
    })
  ]
};
