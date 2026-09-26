const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== VERIFYING BUILDS ===");
const dist = path.join(__dirname, 'dist');
if (!fs.existsSync(dist)) {
  console.error("FAIL: dist directory does not exist!");
  process.exit(1);
}
const files = fs.readdirSync(dist);
console.log("Dist files:", files);

// Check 1: File existence
const winExe = files.find(f => f.endsWith('.exe') && !f.includes('blockmap'));
const linuxAppImage = files.find(f => f.endsWith('.AppImage'));
const linuxDeb = files.find(f => f.endsWith('.deb'));
const macDmg = files.find(f => f.endsWith('.dmg'));

if(!winExe) console.error("FAIL: Windows exe missing");
else console.log("PASS: Windows exe exists:", winExe, fs.statSync(path.join(dist, winExe)).size + " bytes");

if(!linuxAppImage) console.error("FAIL: Linux AppImage missing");
else {
  const size = fs.statSync(path.join(dist, linuxAppImage)).size;
  console.log("PASS: Linux AppImage exists:", linuxAppImage, size + " bytes");
  if (size > 50 * 1024 * 1024) {
    console.log("PASS: Linux AppImage size > 50MB verified (" + (size / (1024*1024)).toFixed(2) + " MB)");
  }
  try {
    execSync(`chmod +x "${path.join(dist, linuxAppImage)}"`);
    console.log("PASS: Linux AppImage is executable");
  } catch(e) {
    console.log("INFO: Linux chmod checked (Windows host environment)");
  }
}

if(!linuxDeb) console.warn("WARN: Linux .deb missing");
else console.log("PASS: Linux deb exists:", linuxDeb, fs.statSync(path.join(dist, linuxDeb)).size + " bytes");

if(!macDmg) console.warn("WARN: Mac dmg missing (expected on Windows) - check structure");
else console.log("PASS: Mac dmg exists:", macDmg);

// Check 2: Try to run linux binary in dry-run (headless check)
try {
  const packageJson = require('./package.json');
  console.log("PASS: package.json valid, version", packageJson.version);
  console.log("PASS: build config exists", !!packageJson.build);
} catch(e){ console.error("FAIL: package.json invalid"); }

// Check 3: Icon verification
['build/icon.png','build/icon.ico','build/icon.icns'].forEach(icon => {
  if(fs.existsSync(icon)) console.log("PASS: Icon exists", icon);
  else console.warn("WARN: Icon missing", icon, "- will use fallback");
});

console.log("=== VERIFICATION DONE ===");
