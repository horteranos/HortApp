const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error("\nHuerto Alboraya necesita Node.js 22.13 o superior.\nInstala una versión LTS actual desde https://nodejs.org/en/download, reinicia Visual Studio Code y repite npm ci.\nTu versión: " + process.version);
  process.exit(1);
}
