// swiftlint:disable all
import Amplify
import Foundation

public enum PostStatus: String, EnumPersistable {
  case draft = "DRAFT"
  case published = "PUBLISHED"
}