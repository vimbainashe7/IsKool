# Gradebook decision

Use the already installed TanStack Table with a controlled cell editor. No second grid dependency. The data model is one class and one assessment at a time, so the same view fits mobile without a wide spreadsheet. All enrolled learners appear, including missing submissions. Missing scores are null, never zero.

Only the active cell renders an input. Other marks are roving-focus buttons. Enter/F2 opens editing; Enter/Tab advances; Shift+Tab reverses; arrows move; Escape returns focus to the cell. A single-column paste validates the whole slice first. Dirty marks carry textual status; navigation/reload warns. A save keeps local changes until server confirmation. The development adapter validates the entire batch and versions before atomically replacing persisted data. Production requires VIM-54's equivalent transactional save contract.

Accessibility tradeoff: native table headings plus grid semantics; one editable mark column reduces keyboard complexity. Screen-reader testing with NVDA/VoiceOver is still required; automated axe and keyboard tests are evidence, not a substitute. Bundle: TanStack is already present, grid code is lazy-loaded. Performance fixtures exercise 30, 50 and 100 learners. No uncontrolled input per cell or fake persistence.
