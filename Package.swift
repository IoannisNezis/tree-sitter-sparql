// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "TreeSitterSparql",
    products: [
        .library(name: "TreeSitterSparql", targets: ["TreeSitterSparql"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ChimeHQ/SwiftTreeSitter", from: "0.8.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterSparql",
            dependencies: [],
            path: ".",
            sources: [
                "src/parser.c",
                // NOTE: if your language has an external scanner, add it here.
            ],
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterSparqlTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterSparql",
            ],
            path: "bindings/swift/TreeSitterSparqlTests"
        )
    ],
    cLanguageStandard: .c11
)
