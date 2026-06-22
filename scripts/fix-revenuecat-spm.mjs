#!/usr/bin/env node
/**
 * fix-revenuecat-spm.mjs
 *
 * Patches ios/capacitor-cordova-ios-plugins/sources/CordovaPluginPurchases/Package.swift
 * after every `cap sync` run.
 *
 * `cap sync` regenerates this file from a generic template that only declares the
 * capacitor-swift-pm dependency. But the CordovaPluginPurchases Swift source files
 * import RevenueCat and PurchasesHybridCommon, so those packages must also be declared
 * or every archive attempt fails with "Unable to resolve module dependency" errors.
 *
 * This script is called automatically by the cap:build npm script.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(
  __dirname,
  "../ios/capacitor-cordova-ios-plugins/sources/CordovaPluginPurchases/Package.swift"
);

let src;
try {
  src = readFileSync(pkgPath, "utf8");
} catch {
  console.warn("[fix-revenuecat-spm] Package.swift not found — skipping (run cap sync first)");
  process.exit(0);
}

// Already patched?
if (src.includes("purchases-ios-spm")) {
  console.log("[fix-revenuecat-spm] Already patched — nothing to do.");
  process.exit(0);
}

// Add RevenueCat packages to the dependencies array
src = src.replace(
  `.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.4.0")`,
  `.package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.4.0"),\n        .package(url: "https://github.com/RevenueCat/purchases-ios-spm", from: "5.78.0"),\n        .package(url: "https://github.com/RevenueCat/purchases-hybrid-common.git", from: "18.15.1")`
);

// Add RevenueCat products to the target dependencies
src = src.replace(
  `.product(name: "Cordova", package: "capacitor-swift-pm")`,
  `.product(name: "Cordova", package: "capacitor-swift-pm"),\n                .product(name: "RevenueCat", package: "purchases-ios-spm"),\n                .product(name: "PurchasesHybridCommon", package: "purchases-hybrid-common")`
);

writeFileSync(pkgPath, src, "utf8");
console.log("[fix-revenuecat-spm] ✅ Patched CordovaPluginPurchases/Package.swift with RevenueCat dependencies.");
