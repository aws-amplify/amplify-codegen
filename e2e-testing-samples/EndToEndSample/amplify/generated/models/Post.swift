// swiftlint:disable all
import Amplify
import Foundation

public struct Post: Model {
  public let id: String
  public var title: String
  public var status: PostStatus
  public var content: String?
  
  public init(id: String = UUID().uuidString,
      title: String,
      status: PostStatus,
      content: String? = nil) {
      self.id = id
      self.title = title
      self.status = status
      self.content = content
  }
}