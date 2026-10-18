enum MusicStyle: String, CaseIterable, Identifiable {
    case normal
    case tense
    case frenchHouse = "french-house"
    case pop

    var id: String { rawValue }
    var filename: String { "music-\(rawValue).m4a" }
    var title: String {
        switch self {
        case .normal: return "Normal"
        case .tense: return "Tense"
        case .frenchHouse: return "French House"
        case .pop: return "Pop"
        }
    }
}
