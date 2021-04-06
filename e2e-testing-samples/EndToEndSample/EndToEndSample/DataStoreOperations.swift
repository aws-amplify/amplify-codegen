//
//  DataStoreOperations.swift
//  EndToEndSample
//
//  Created by Edupuganti, Phani Srikar on 3/30/21.
//

import Foundation
import Amplify

func createPost(id: String) throws {
    let post = Post(id: id, title: "Create an Amplify DataStore app", status: PostStatus.draft)

//    Amplify.DataStore.save(post) { result in
//        switch result {
//        case .success:
//            print("Post saved successfully!")
//        case .failure(let error):
//            print("Error creating post \(error)")
//            throw error
//        }
//    }
}
