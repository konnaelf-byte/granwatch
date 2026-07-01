// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(name: "CapgoCapacitorSocialLogin", path: "../../../node_modules/.pnpm/@capgo+capacitor-social-login@8.3.30_@capacitor+core@8.4.0/node_modules/@capgo/capacitor-social-login"),
        .package(name: "CordovaPluginPurchases", path: "../../capacitor-cordova-ios-plugins/sources/CordovaPluginPurchases"),
        .package(name: "PurchasesCapacitor", path: "../../../node_modules/.pnpm/@revenuecat+purchases-capacitor@10.4.0_@capacitor+core@8.4.0/node_modules/@revenuecat/purchases-capacitor"),
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapgoCapacitorSocialLogin", package: "CapgoCapacitorSocialLogin"),
                .product(name: "CordovaPluginPurchases", package: "CordovaPluginPurchases"),
                .product(name: "PurchasesCapacitor", package: "PurchasesCapacitor"),
            ]
        )
    ]
)
