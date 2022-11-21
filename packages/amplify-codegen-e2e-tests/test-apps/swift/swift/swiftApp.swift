//
//  swiftApp.swift
//  swift
//
//  Created by Pilcher, Dane on 11/21/22.
//

import SwiftUI
import Amplify
import AWSDataStorePlugin

@main
struct swiftApp: App {
    init() {
        configureAmplify()
    }
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

func configureAmplify() {
    let dataStorePlugin = AWSDataStorePlugin(modelRegistration: AmplifyModels())
    do {
        try Amplify.add(plugin: dataStorePlugin)
        try Amplify.configure()
        print("Initialized Amplify");
    } catch {
        // simplified error handling for the tutorial
        print("Could not initialize Amplify: \(error)")
    }
}
