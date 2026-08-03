import Foundation

// Liftosaur fork addition. Parsing lives outside (Lezer on the JS thread), so every
// parse/indent hook is a no-op like PlainText; only createLineSyntaxHighlighter differs.

final class ExternalRangesInternalLanguageMode: InternalLanguageMode {
    private let store: ExternalRangesStore

    init(store: ExternalRangesStore) {
        self.store = store
    }

    func parse(_ text: NSString) {}

    func parse(_ text: NSString, completion: @escaping ((Bool) -> Void)) {
        completion(true)
    }

    func textDidChange(_ change: TextChange) -> LineChangeSet {
        LineChangeSet()
    }

    func createLineSyntaxHighlighter() -> LineSyntaxHighlighter {
        ExternalRangesSyntaxHighlighter(store: store)
    }

    func syntaxNode(at linePosition: LinePosition) -> SyntaxNode? {
        nil
    }

    func currentIndentLevel(of line: DocumentLineNode, using indentStrategy: IndentStrategy) -> Int {
        0
    }

    func strategyForInsertingLineBreak(
        from startLinePosition: LinePosition,
        to endLinePosition: LinePosition,
        using indentStrategy: IndentStrategy) -> InsertLineBreakIndentStrategy {
        InsertLineBreakIndentStrategy(indentLevel: 0, insertExtraLineBreak: false)
    }

    func detectIndentStrategy() -> DetectedIndentStrategy {
        .unknown
    }
}
