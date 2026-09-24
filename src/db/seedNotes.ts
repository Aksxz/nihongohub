import { StudyNote } from '../types/vocab';

export const INITIAL_NOTES: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Japanese Adjectives (形容詞)',
    category: 'Adjectives',
    tags: ['JLPT N5', 'Adjectives', 'Grammar'],
    content: `# Japanese Adjectives Guide (い-adjectives & な-adjectives)

Japanese has two main categories of adjectives: **I-adjectives (い形容詞)** and **Na-adjectives (な形容詞)**.

---

### 1. Common I-Adjectives (い形容詞)
These always end in the hiragana **い (i)**:

* **おおきい (ookii)** — big / large
* **ちいさい (chiisai)** — small / little
* **あたらしい (atarashii)** — new / fresh
* **ふるい (furui)** — old (not for people)
* **たかい (takai)** — expensive / high / tall
* **やすい (yasui)** — cheap / inexpensive
* **おいしい (oishii)** — delicious / tasty

#### Conjugation Rules for I-Adjectives:
* **Present Positive**: たかい です (It is expensive)
* **Present Negative**: たか**くない** です (It is not expensive)
* **Past Positive**: たか**かった** です (It was expensive)
* **Past Negative**: たか**くなかった** です (It was not expensive)

---

### 2. Common Na-Adjectives (な形容詞)
When modifying a noun directly, attach **な (na)**:

* **しずか (shizuka)** — quiet (例: しずか**な** まち - quiet town)
* **べんり (benri)** — convenient (例: べんり**な** くるま - convenient car)
* **きれい (kirei)** — pretty / clean
* **ゆうめい (yuumei)** — famous (例: ゆうめい**な** ひと - famous person)

#### Conjugation Rules for Na-Adjectives:
* **Present Positive**: しずか です (It is quiet)
* **Present Negative**: しずか **じゃありません** (It is not quiet)
* **Past Positive**: しずか **でした** (It was quiet)
* **Past Negative**: しずか **じゃありませんでした** (It was not quiet)`
  },
  {
    title: 'Essential Japanese Particles (助詞)',
    category: 'Particles',
    tags: ['Particles', 'Grammar', 'JLPT N5'],
    content: `# Essential Japanese Particles (助詞)

Particles indicate the grammatical relationship between words in a sentence.

---

### 1. は (wa) — Topic Marker
Identifies what the sentence is about ("speaking of...", "as for...").
* **わたし は がくせい です。** (Watashi wa gakusei desu.)
  * *As for me, I am a student.*

### 2. が (ga) — Subject Marker / Identifier
Marks the grammatical subject, emphasis, or introduces new information.
* **だれ が きましたか。** (Dare ga kimashita ka?)
  * *Who came?*
* **ねこ が います。** (Neko ga imasu.)
  * *There is a cat.*

### 3. を (o) — Direct Object Marker
Marks the receiver of an action.
* **みず を のみます。** (Mizu o nomimasu.)
  * *I drink water.*
* **ほん を よみます。** (Hon o yomimasu.)
  * *I read a book.*

### 4. に (ni) — Target, Specific Time, Location of Existence
* **7じ に おきます。** (Shichiji ni okimasu.)
  * *I wake up at 7:00.*
* **とうきょう に いきます。** (Toukyou ni ikimasu.)
  * *I will go to Tokyo.*
* **へや に いぬ が います。** (Heya ni inu ga imasu.)
  * *There is a dog in the room.*

### 5. で (de) — Location of Action, Means / Instrument
* **としょかん で べんきょうします。** (Toshokan de benkyou shimasu.)
  * *I study at the library.* (location of active action)
* **バス で いきます。** (Basu de ikimasu.)
  * *I go by bus.* (means of transportation)

### 6. と (to) — "With" (person) or "And" (exhaustive noun list)
* **ともだち と えいが を みました。** (Tomodachi to eiga o mimashita.)
  * *I watched a movie with a friend.*
* **りんご と みかん** (Ringo to mikan)
  * *Apples and oranges.*

### 7. へ (e) — Direction of Movement
Emphasizes direction heading toward a place.
* **にほん へ いきます。** (Nihon e ikimasu.)
  * *I am heading toward Japan.*

### 8. も (mo) — "Also" / "Too" (replaces は, が, を)
* **わたし も がくせい です。** (Watashi mo gakusei desu.)
  * *I am also a student.*`
  },
  {
    title: 'Verb Groups & Te-Form Conjugation',
    category: 'Verbs',
    tags: ['Verbs', 'Conjugation', 'Minna no Nihongo'],
    content: `# Japanese Verb Groups & Te-Form (て形)

Japanese verbs fall into 3 distinct groups. Knowing the group determines how they conjugate into the crucial **て-form (te-form)**!

---

### Group 1: Godan Verbs (五段動詞 / U-verbs)
Verbs ending in -u, -ku, -gu, -su, -tsu, -nu, -bu, -mu, or -ru (preceded by a/u/o).

#### Te-Form Song / Rhyme:
* **う、つ、る** ➔ **って** (tte)
  * かう (buy) ➔ **かって**
  * まつ (wait) ➔ **まって**
  * とる (take) ➔ **とって**
* **む、ぶ、ぬ** ➔ **んで** (nde)
  * のむ (drink) ➔ **のんで**
  * あそぶ (play) ➔ **あそんで**
  * しぬ (die) ➔ **しんで**
* **く** ➔ **いて** (ite)
  * かく (write) ➔ **かいて**
  * *Exception*: **いく (go)** ➔ **いって** (itte)
* **ぐ** ➔ **いで** (ide)
  * およぐ (swim) ➔ **およいで**
* **す** ➔ **して** (shite)
  * はなす (speak) ➔ **はなして**

---

### Group 2: Ichidan Verbs (一段動詞 / Ru-verbs)
Verbs ending in **-iru** or **-eru**. Very simple to conjugate: drop **る** and add **て**!

* たべる (eat) ➔ **たべて**
* みる (see) ➔ **みて**
* ねる (sleep) ➔ **ねて**
* おきる (wake up) ➔ **おきて**

---

### Group 3: Irregular Verbs (不規則動詞)
There are only two irregular verbs to memorize:

* **する (to do)** ➔ **して** (shite)
* **くる (to come)** ➔ **きて** (kite)`
  },
  {
    title: 'Core JLPT N5 Sentence Patterns',
    category: 'Sentence Patterns',
    tags: ['JLPT N5', 'Grammar', 'Sentence Patterns'],
    content: `# Core JLPT N5 Sentence Patterns (重要文型)

Key sentence structures frequently tested on the JLPT N5 and used in daily conversation.

---

### 1. 〜は〜です (A wa B desu)
* **Meaning**: "A is B"
* **Example**: 「これ は にほん の おちゃ です。」(This is Japanese green tea.)

### 2. Verb[stem] + たいです (tai desu)
* **Meaning**: "Want to do [verb]" (expresses speaker's own desires)
* **Example**: 
  * たべます ➔ 「すし を **たべたいです**。」(I want to eat sushi.)
  * いきます ➔ 「にほん へ **いきたいです**。」(I want to go to Japan.)

### 3. Verb[て-form] + ください (kudasai)
* **Meaning**: "Please do [verb]"
* **Example**: 
  * 「ここ に なまえ を **かいてください**。」(Please write your name here.)
  * 「ちょっと **まってください**。」(Please wait a moment.)

### 4. Verb[ない-form] + でください (naide kudasai)
* **Meaning**: "Please do not do [verb]"
* **Example**: 
  * 「しゃしん を **とらないでください**。」(Please don't take photos.)

### 5. Verb[て-form] + もいいです (mo ii desu)
* **Meaning**: "May I do... / You may do..." (asking or giving permission)
* **Example**: 
  * 「トイレ に **いってもいいですか**。」(May I go to the restroom?)`
  }
];
