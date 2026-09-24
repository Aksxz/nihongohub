# 日本語ハブ NihongoHub — Japanese Vocabulary & Kanji Studio

A complete, modern Japanese vocabulary, kanji learning, testing, and note-taking web application. NihongoHub is engineered with an authentic Japanese minimalist aesthetic (clean rice paper canvas, deep sumi ink typography, and torii vermilion accents).

Built for **100% offline, local-only usage** on your laptop with **IndexedDB persistence**, zero cloud databases, and zero external servers.

---

## Key Features

### 1. 📖 Textbook Chapters (1 to 24)
- **Chapter Dashboard**: Clean overview cards for Chapters 1 through 24 and Extra Vocabulary showing word counts and progress (preventing visual clutter).
- **Chapter Vocabulary Page**: Focused view displaying only words assigned to that chapter.
- **Word Types**: Categorize by `Noun`, `Verb`, `Adjective`, `Adverb`, `Particle`, `Expression`, `Counter`, `Other`.
- **🔊 Speaker Button**: Offline Japanese pronunciation for every single word via browser `SpeechSynthesis` (`ja-JP`).
- **Custom Vocabulary Selection**: Checkboxes next to each word allow custom ad-hoc practice sessions.

### 2. ⭐ Extra Vocabulary
- Dedicated non-textbook vocabulary area.
- Organize by categories: *Daily Life*, *Conversation*, *Travel*, *General*, and *Custom*.

### 3. 🧠 Spaced Repetition System (SRS) & Practice Options
- **Chapter Practice**: Practice words from a single chapter with customizable question count (5, 10, 15, 20, All).
- **Multiple Chapter Practice**: Checkbox multi-selection across any combination of chapters (e.g., Chapters 1, 2, and 3).
- **Custom Test**: Practice from manually checked vocabulary words.
- **Practice Weak Words**: Automatically flags words missed during quizzes; consistent correct answers decrease difficulty.
- **New Words**: Target unpracticed vocabulary.
- **Smart Practice (SRS)**: Spaced repetition algorithm prioritizing overdue words, weak words, and learning words.
- **Learning Statuses**: `New` ➔ `Learning` ➔ `Difficult` (Weak Word) ➔ `Familiar` ➔ `Mastered`.

### 4. 📝 Japanese Study Notes (ノート)
- Dedicated study notebook for grammar, particles (`は`, `が`, `を`, `に`, `で`, `と`, `へ`, `も`), verb groups, and JLPT patterns.
- Formatting toolbar: Headings (`##`), Bullet lists (`*`), Numbered lists (`1.`), Bold, Italic, and Japanese quotes (`「」`).
- Live Preview mode.
- Search and category organization.

### 5. 🔒 Local-Only Storage & Data Safety (IndexedDB)
- All data stored in your laptop's browser IndexedDB (`KotobaFlowDB`).
- Survives browser closures, reloads, and computer restarts.
- **Backup & Restore**: Single-click JSON export and import for all chapters, vocabulary, notes, weak words, and practice scores.

---

## How to Run

### Development Mode
```bash
cd /Users/akshsaini/.gemini/antigravity/scratch/japanese-vocab-app
npm run dev
```
Open **http://localhost:5174** in your browser.

### Production Build
```bash
npm run build
npm run preview
```
