---
name: suno-songwriting
description: Create, refine, and validate Suno Style and custom Lyrics inputs using source-aware guidance, structure tags, and deterministic character checks.
---

# Suno Songwriting

Suno v6系（`v6`、`v6-wild`、`v6-mini`）のCustom/Create入力向けに、StyleとLyricsを作成・改善・検証するSkillです。専用ノウハウが少ないため、`v6`を知識の基準モデルとし、wild/miniでは差分未確認の暫定参考として継承します。一般的な作詞だけを依頼された場合は使わず、Sunoへ貼り付ける入力、Suno向けのタグ、またはSunoの入力上限が話題になったときに使います。

## 使い分け

- Styleだけを作る・直すときは、まず [references/style-guide.md](references/style-guide.md) を読む。
- Lyricsを作る・直すときは、まず [references/lyrics-guide.md](references/lyrics-guide.md) と [references/tags.md](references/tags.md) を読む。
- 公式仕様、文字数、更新日、コミュニティ報告の確度を説明するときは、[references/evidence-policy.md](references/evidence-policy.md) と [references/sources.json](references/sources.json) を読む。
- Lyricsの権利、他人の歌詞、公開・収益化に関する確認が必要なときは、[references/policies.md](references/policies.md) を読む。
- 楽器、奏法、音色、編曲語彙を意図へ変換するときは、[references/music-vocabulary.md](references/music-vocabulary.md) と [references/music-vocabulary.json](references/music-vocabulary.json) を読む。
- Sunoが指示を守らない、意図と違う音になる、タグを無視する、といった相談では、[references/prompt-adherence.md](references/prompt-adherence.md) と [references/prompt-diagnostic-rules.json](references/prompt-diagnostic-rules.json) を読む。
- 機械可読の文字数ルールは [references/constraints.json](references/constraints.json)、タグの分類は [references/tag-catalog.json](references/tag-catalog.json) を正本とする。

## 基本ワークフロー

1. 対象を `Style`、`Lyrics`、または両方に分ける。Custom/Create画面、`v6`系のモデル（v6/v6-wild/v6-mini）、言語、ボーカル有無、目的の雰囲気を確認する。
2. モデルが不明なら `v6`を基準に仮定し、その仮定を回答に明記する。v6-wild/mini専用の根拠がない場合はv6知識を継承し、差分未確認と表示する。v5.5、V4.5、Song Details編集画面などの情報は、v6系の仕様ではなく暫定参考としてのみ使う。
3. 貼り付け用の完成案を提示する。説明文と貼り付ける本文を分け、ユーザーがそのままコピーできる形にする。
4. 楽器や奏法の要望は、楽器名だけでなく `instrument + action/technique + role` の形へ変換する。主役の楽器は1〜2個から始め、必要な補助要素だけ追加する。
5. 指示違反の相談では、モデル・設定・Style/Lyricsの責務・競合・生成結果を分離して診断する。実際の音声結果は自動合否にせず、試聴確認と再生成・局所修正の手順を返す。
6. 保存済みの知識から主張を組み立て、公式文書・公式記事・教育資料・コミュニティ観測を混同しない。公式に確認できない内容は「暫定」「観測」「要確認」と表示する。
7. 作成・修正後は、次のvalidatorを実行して文字数とLyricsの括弧タグを確認する。

```powershell
node .\suno-songwriting\scripts\check_suno_input.mjs --field style --file .\style.txt --profile v6-create
node .\suno-songwriting\scripts\check_suno_input.mjs --field lyrics --file .\lyrics.txt --profile v6-create
node .\suno-songwriting\scripts\diagnose_suno_prompt.mjs --style .\style.txt --lyrics .\lyrics.txt --model v6 --variety 0 --json
```

上限を適用して可否を厳密に判定したい場合だけ `--strict` を付ける。初版の1000/5000文字ルールはv5.5等のコミュニティ観測をv6へ暫定適用し、v6-wild/miniにも差分未確認のまま継承した値であるため、通常実行ではwarningとして扱う。

## 出力上の原則

- Styleは、ジャンル/サブジャンル、ムード・エネルギー、ボーカル、主要楽器、リズム/テンポ、音像・プロダクションの順に、短く具体的に組み立てる。V4.5公式記事の会話的なStyle記述はv6向けの旧世代参考であり、v6での効果を保証しない。冗長な物語や相互矛盾は避ける。
- Lyricsは、セクションタグを必要な箇所だけ独立行に置き、歌わせる本文と演出用の指示を分ける。`[Verse]`、`[Chorus]`、`[Bridge]`、`[Outro]` は旧世代を含む公式資料で文書化されたv6系向け暫定候補とし、それ以外はコミュニティで観測された実験的な表記として扱う。
- タグ一覧を「Sunoの公式コマンド一覧」と断定しない。Sunoが公式に文書化していないタグは、使う場合も「モデル依存のcue」と説明する。
- ユーザーが提供したLyricsを、依頼なく大幅に改変・短縮・タグ追加しない。文字数超過時は、削る候補と構成変更案を示す。
- 実在アーティスト名、曲名、存命作家の作風そのものを、Sunoが必ず再現する指示として扱わない。必要なら音楽的特徴へ言い換え、権利・規約の確認が必要な点を明記する。
- 内容の安全性、著作権、模倣可否など意味判断はvalidatorの合否に委ねず、必要に応じて人手確認として報告する。
- 生成音声のジャンル逸脱、声質、楽器の可聴性、BPM、歌詞完遂はテキスト診断で判定できない。`human_checks` として試聴項目にする。

## 知識の更新

Sunoの仕様が変わったときは、Markdown本文を先に書き換えず、まず `sources.json` に根拠を追加・更新し、`constraints.json` または `tag-catalog.json` の状態・対象画面・確認日を更新する。その後にガイドの説明を追従させる。

```powershell
node .\suno-songwriting\scripts\audit_knowledge.mjs --as-of 2026-09-12
```

v6系公式情報が見つからない数値は削除せず、v5.5等の旧世代出典を明示した `provisional` または `conflict` として残す。音楽用語の意味とSunoでの効き方も別々に更新し、後からv6系公式情報で置き換えられるようにする。
