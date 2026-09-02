import Foundation

/// The 19 FMGE subjects, in the order the tracker grid shows them
/// (`SUBJECTS_LIST`, src/api/tracker.ts:8).
enum Syllabus {
    static let subjects = [
        "Anatomy", "Physiology", "Biochemistry", "Pathology",
        "Microbiology", "Pharmacology", "Forensic medicine",
        "Community Medicine (PSM)", "General Medicine", "General Surgery",
        "Obstetrics & Gynecology (OBG)", "Pediatrics", "Ophthalmology",
        "Otorhinolaryngology (ENT)", "Orthopedics", "Anesthesiology",
        "Dermatology & Venereology", "Psychiatry", "Radiodiagnosis (Radiology)",
    ]

    static let grandTests = (1...7).map { "GT\($0)" }

    /// Six checkboxes per subject, plus seven grand tests: 19 × 6 + 7 = 121.
    static let totalItems = subjects.count * SubjectField.allCases.count + grandTests.count

    /// Exam date the countdowns tick towards (StudyPage.tsx:60).
    static let examDate: Date = {
        var comps = DateComponents()
        comps.year = 2027
        comps.month = 1
        comps.day = 9
        return Calendar.current.date(from: comps) ?? Date()
    }()
}

/// One column of the subject grid. Raw values are the API's field names; the
/// labels are the abbreviations the grid shows (`FIELD_LABELS`, StudyPage.tsx:25).
enum SubjectField: String, CaseIterable, Identifiable, Codable, Sendable {
    case videos = "Videos"
    case r1 = "R1"
    case r2 = "R2"
    case pyqs = "PYQs"
    case revisionVideos = "RevisionVideos"
    case qbank = "Qbank"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .videos: return "Videos"
        case .r1: return "Rev 1"
        case .r2: return "Rev 2"
        case .pyqs: return "PYQs"
        case .revisionVideos: return "Rev Vids"
        case .qbank: return "Qbank"
        }
    }
}

struct TrackerSubject: Codable, Hashable, Sendable {
    var videos = false
    var r1 = false
    var r2 = false
    var pyqs = false
    var revisionVideos = false
    var qbank = false

    enum CodingKeys: String, CodingKey {
        case videos = "Videos"
        case r1 = "R1"
        case r2 = "R2"
        case pyqs = "PYQs"
        case revisionVideos = "RevisionVideos"
        case qbank = "Qbank"
    }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        videos = c.flexBool(.videos)
        r1 = c.flexBool(.r1)
        r2 = c.flexBool(.r2)
        pyqs = c.flexBool(.pyqs)
        revisionVideos = c.flexBool(.revisionVideos)
        qbank = c.flexBool(.qbank)
    }

    subscript(field: SubjectField) -> Bool {
        get {
            switch field {
            case .videos: return videos
            case .r1: return r1
            case .r2: return r2
            case .pyqs: return pyqs
            case .revisionVideos: return revisionVideos
            case .qbank: return qbank
            }
        }
        set {
            switch field {
            case .videos: videos = newValue
            case .r1: r1 = newValue
            case .r2: r2 = newValue
            case .pyqs: pyqs = newValue
            case .revisionVideos: revisionVideos = newValue
            case .qbank: qbank = newValue
            }
        }
    }

    var completedCount: Int {
        SubjectField.allCases.reduce(0) { $0 + (self[$1] ? 1 : 0) }
    }

    var isComplete: Bool { completedCount == SubjectField.allCases.count }
}

struct TrackerData: Codable, Hashable, Sendable {
    var subjects: [String: TrackerSubject] = Syllabus.subjects.reduce(into: [:]) {
        $0[$1] = TrackerSubject()
    }
    var gts: [String: Bool] = Syllabus.grandTests.reduce(into: [:]) { $0[$1] = false }

    enum CodingKeys: String, CodingKey { case subjects, gts }

    init() {}

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)

        var merged: [String: TrackerSubject] = Syllabus.subjects.reduce(into: [:]) {
            $0[$1] = TrackerSubject()
        }
        if let sent = try? c.decodeIfPresent([String: TrackerSubject].self, forKey: .subjects) {
            for (key, value) in sent { merged[key] = value }
        }
        subjects = merged

        var mergedGts: [String: Bool] = Syllabus.grandTests.reduce(into: [:]) { $0[$1] = false }
        if let sent = try? c.decodeIfPresent([String: Bool].self, forKey: .gts) {
            for (key, value) in sent { mergedGts[key] = value }
        }
        gts = mergedGts
    }

    func subject(_ name: String) -> TrackerSubject {
        subjects[name] ?? TrackerSubject()
    }

    // ── Derived ─────────────────────────────────────────────────────────────

    /// Checked items out of 121. Ported from `calculateProgress`
    /// (src/api/tracker.ts:160).
    var completedItems: Int {
        let subjectCount = Syllabus.subjects.reduce(0) { $0 + subject($1).completedCount }
        let gtCount = gts.values.filter { $0 }.count
        return subjectCount + gtCount
    }

    /// Whole percent, matching the web app's `Math.round`.
    var progressPercent: Int {
        guard Syllabus.totalItems > 0 else { return 0 }
        return Int((Double(completedItems) / Double(Syllabus.totalItems) * 100).rounded())
    }

    var completedSubjects: Int {
        Syllabus.subjects.filter { subject($0).isComplete }.count
    }

    var completedGTs: Int { gts.values.filter { $0 }.count }

    /// Home-widget status word (FmgeProgressWidget.tsx:69).
    var statusLabel: String {
        switch progressPercent {
        case ..<10: return "Just starting"
        case ..<30: return "Getting going"
        case ..<60: return "Halfway there"
        case ..<90: return "Almost done"
        default: return "Ready!"
        }
    }

    var daysToExam: Int {
        max(0, DayKey.calendarDays(from: Date(), to: Syllabus.examDate))
    }
}
