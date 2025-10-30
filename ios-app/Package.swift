// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "LifeApp",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "LifeApp",
            targets: ["LifeApp"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "LifeApp",
            dependencies: [],
            path: "LifeApp"
        ),
    ]
)

