// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "QuickJSCore",
    platforms: [
        .iOS(.v14),
        .watchOS(.v9)
    ],
    products: [
        .library(
            name: "QuickJSCore",
            targets: ["QuickJSCore"]
        ),
    ],
    targets: [
        .target(
            name: "QuickJSC",
            publicHeadersPath: "include",
            cSettings: [
                .headerSearchPath("include"),
                .define("CONFIG_VERSION", to: "\"2024-01-13\""),
                .define("CONFIG_BIGNUM"),
                .unsafeFlags([
                    "-Wno-implicit-function-declaration",
                    "-Wno-incompatible-pointer-types",
                    "-Wno-shorten-64-to-32"
                ])
            ]
        ),
        .target(
            name: "QuickJSCore",
            dependencies: ["QuickJSC"]
        ),
    ]
)
