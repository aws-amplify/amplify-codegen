#!/bin/bash

# set exit on error to true
set -e

function buildModels() {
    # download and unzip the models from S3
    tempDirectory=$(mktemp -d)
    cd $tempDirectory
    wget -O models.zip  "$MODELS_S3_URL"
    tar -xvf models.zip

    # create a Swift package to test the models
    pathToSwiftPackage=${tempDirectory}/swiftapp
    rm -rf $pathToSwiftPackage
    mkdir $pathToSwiftPackage && cd $pathToSwiftPackage
    echo "Creating Swift package at $pathToSwiftPackage"
    createSwiftPackage

    cd ${tempDirectory}/models
    for model in */; do
        echo "Building model $model"
        buildAndRunModel $model $pathToSwiftPackage
    done
}

function buildAndRunModel() {
    pwd && ls
    modelName=$1
    ls $modelName && cd $modelName
    currentDirectory=$(pwd)
    pwd && ls

    pathToSwiftPackage=$2

    # copy with replace all files in current directory to the swift package
    mkdir -p $pathToSwiftPackage/Sources/models
    rm -rf $pathToSwiftPackage/Sources/models/*
    cp -r $currentDirectory/* $pathToSwiftPackage/Sources/models

    # build and run the model
    cd $pathToSwiftPackage
    ls Sources/models
    swift build && swift run

    # clean up
    cd $currentDirectory
}

function createSwiftPackage() {
    # create a swift package
    swift package init --type executable
    rm -rf Package.swift
    echo '// swift-tools-version: 5.7
    import PackageDescription
    let package = Package(name: "swiftapp", platforms: [.macOS(.v10_15)], dependencies: [.package(url: "https://github.com/aws-amplify/amplify-swift", from: "2.12.0")   ], targets: [ .executableTarget( name: "swiftapp",  dependencies: [ .product(name: "Amplify", package: "amplify-swift") ], path: "Sources")]
    )' >> Package.swift
    cat Package.swift
}

buildModels
