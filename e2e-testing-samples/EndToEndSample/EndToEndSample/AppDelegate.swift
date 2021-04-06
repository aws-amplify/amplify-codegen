//
//  AppDelegate.swift
//  EndToEndSample
//
//  Created by Edupuganti, Phani Srikar on 3/30/21.
//

import Foundation
import Amplify
import AmplifyPlugins

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        do {
        // AmplifyModels is generated in the previous step
        let dataStorePlugin = AWSDataStorePlugin(modelRegistration: AmplifyModels())
        try Amplify.add(plugin: dataStorePlugin)
        try Amplify.add(plugin: AWSAPIPlugin())
        try Amplify.configure()
        print("Amplify configured with DataStore plugin")
    } catch {
        print("Failed to initialize Amplify with \(error)")
        return false
    }

        return true
    }
}
