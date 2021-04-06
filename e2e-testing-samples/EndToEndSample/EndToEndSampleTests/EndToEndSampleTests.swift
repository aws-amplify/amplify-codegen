//
//  EndToEndSampleTests.swift
//  EndToEndSampleTests
//
//  Created by Edupuganti, Phani Srikar on 3/30/21.
//

import XCTest
@testable import EndToEndSample
import Amplify

class DataStoreOperationsTests: XCTestCase {
    let postTitle = "test post"
    let updatedPostTitle = "updated test post"
    let postStatus = PostStatus.draft

    func testCreatingAndFetchingPost() throws {
        let id = UUID().uuidString
        let post = Post(id: id, title: postTitle, status: postStatus)

        Amplify.DataStore.save(post) {
            switch $0 {
            case .success:
                Amplify.DataStore.query(Post.self, byId: id) {
                    switch $0 {
                    case .success(let result):
                        guard let fetchedPost = result else {
                            XCTFail("Found nil while querying for created post object")
                            return
                        }
                        XCTAssertEqual(fetchedPost.title, self.postTitle)
                    case .failure(let error):
                        XCTFail("Error querying the Post - \(error.localizedDescription)")
                    }
                }
            case .failure(let error):
                XCTFail("Error creating post \(error.localizedDescription)")
            }
        }
    }
    
    func testUpdatingExistingPost() throws {
        let id = UUID().uuidString
        let post = Post(id: id, title: updatedPostTitle, status: postStatus)

        Amplify.DataStore.save(post) {
            switch $0 {
            case .success:
                Amplify.DataStore.query(Post.self, byId: id) {
                    switch $0 {
                    case .success(let result):
                        guard let fetchedPost = result else {
                            XCTFail("Found nil while querying for updated post object")
                            return
                        }
                        XCTAssertEqual(fetchedPost.title, self.updatedPostTitle)
                    case .failure(let error):
                        XCTFail("Error querying the Post - \(error.localizedDescription)")
                    }
                }
            case .failure(let error):
                XCTFail("Error creating post \(error.localizedDescription)")
            }
        }
    }
}
