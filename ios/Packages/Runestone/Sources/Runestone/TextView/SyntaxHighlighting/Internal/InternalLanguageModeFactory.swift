import Foundation

enum InternalLanguageModeFactory {
    static func internalLanguageMode(from languageMode: LanguageMode, stringView: StringView, lineManager: LineManager) -> InternalLanguageMode {
        switch languageMode {
        case is PlainTextLanguageMode:
            return PlainTextInternalLanguageMode()
        // Liftosaur fork addition: externally-driven highlighting (Lezer on the RN JS thread).
        case let languageMode as ExternalRangesLanguageMode:
            return ExternalRangesInternalLanguageMode(store: languageMode.store)
        case let languageMode as TreeSitterLanguageMode:
            return TreeSitterInternalLanguageMode(
                language: languageMode.language.internalLanguage,
                languageProvider: languageMode.languageProvider,
                stringView: stringView,
                lineManager: lineManager)
        default:
            fatalError("\(languageMode) is not a supported language mode")
        }
    }
}
