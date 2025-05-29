import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.argv[2];
if (!targetVersion) {
    console.error("请指定版本号");
    process.exit(1);
}

// 读取 manifest.json
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// 更新 versions.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

// 更新 README.md
let readme = readFileSync("README.md", "utf8");
readme = readme.replace(/(当前版本: )\d+\.\d+\.\d+/, `$1${targetVersion}`);
writeFileSync("README.md", readme);

// 更新 README-EN.md
let readmeEn = readFileSync("README-EN.md", "utf8");
readmeEn = readmeEn.replace(/(Current version: )\d+\.\d+\.\d+/, `$1${targetVersion}`);
writeFileSync("README-EN.md", readmeEn);