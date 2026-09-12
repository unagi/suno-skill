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
- 音域の不足・過多や音の薄さを相談されたが編成が不明なときは、[references/genre-arrangements.md](references/genre-arrangements.md) と [references/arrangement-diagnosis.md](references/arrangement-diagnosis.md) を読み、複数の編成仮説を提示してからStyleを確定する。未収載ジャンルや細分化されたジャンルは、近いジャンルで決め打ちせず、必要な範囲を調査する。
- 既存Styleの改善・音像修正では、[references/style-change-policy.md](references/style-change-policy.md) と [references/style-tradeoffs.json](references/style-tradeoffs.json) を読む。Style全文がない状態で最終Styleを書き換えず、現在のStyleを基準に副作用と変更範囲を明示する。候補の最終化時は [references/quality-gate-runbook.md](references/quality-gate-runbook.md) を実行手順として使う。
- 入力の機械的な可否判定は、意味解釈の知識ではなく付属の品質ゲートへ委ねる。タグの意味分類が必要なときだけ [references/tag-catalog.json](references/tag-catalog.json) を読む。

## 基本ワークフロー

既存Styleの改善は新規Style作成とは別分岐で扱う。全文未提示なら指定した質問だけを最初に返して停止し、モデルやLyricsなどの追加質問や完成案を先に出さない。全文提示後は、候補を比較してユーザーが選択するまで、下記3の完成案提示へ進まない。

既存Styleを受け取ったら、全文を会話内で再掲・手計算せず、作業ファイルへそのまま保存する。候補の最終化時は付属の品質ゲートを実行し、ゲートの中身を意味知識として再現・代替しない。最終Style全文は候補選択後に一度だけ提示する。

1. 対象を `Style`、`Lyrics`、または両方に分ける。既存Styleの改善依頼でStyle全文が未提示なら、他の確認に先立って「現在使っているStyle全文を、変更せずそのまま貼ってください。」と尋ねる。それ以外ではCustom/Create画面、`v6`系のモデル（v6/v6-wild/v6-mini）、言語、ボーカル有無、目的の雰囲気を確認する。
2. モデルが不明なら `v6`を基準に仮定し、その仮定を回答に明記する。v6-wild/mini専用の根拠がない場合はv6知識を継承し、差分未確認と表示する。v5.5、V4.5、Song Details編集画面などの情報は、v6系の仕様ではなく暫定参考としてのみ使う。
3. 新規Style作成、または既存Styleでユーザーが候補を選択した後に、貼り付け用の完成案を提示する。説明文と貼り付ける本文を分け、ユーザーがそのままコピーできる形にする。
4. 楽器や奏法の要望は、楽器名だけでなく `instrument + action/technique + role` の形へ変換する。主役の楽器は1〜2個から始め、必要な補助要素だけ追加する。
5. 既存Styleの改善依頼では、Style全文が提示されていなければ、最初の質問を「現在使っているStyle全文を、変更せずそのまま貼ってください。」とする。Style全文があれば、それを未承認の基準版として保存し、ユーザーの症状をそのまま操作語へ変換せず、現状・目的・維持条件・不明点を分けて影響分析する。
6. 影響分析では、現在の編成・音域・音像から起こりうる副作用を説明し、目的を満たす候補を通常2〜3案提示する。各案は主仮説を1つに絞り、追加・変更する要素、維持する要素、想定副作用、適するケースを示す。ユーザーが最も近い案を選ぶまで、最終Styleを確定しない。
7. 指示違反の相談では、症状に応じて切り分けの深さを変える。Style変更契約を優先し、入力確認だけで回答を終えない。一方で、すべてのLyricsやタグを妥当と仮定しない。冒頭指定のように確認条件が明快なものは短く確認し、一般のタグは該当タグだけを公式・観測cue・未知・配置不備の観点で確認する。
8. 音域や音の厚みの症状は、埋めればよい楽器が一意とは限らない。ジャンル、既存Style、Lyricsの局所cueから編成仮説を作り、ギター中心、ベース/ドラム中心、ボーカル/鍵盤中心、シンセ補強などを候補にする。ジャンルの一般論だけで楽器を追加せず、Style変更契約の維持条件を優先する。
9. 保存済みの知識から主張を組み立て、公式文書・公式記事・教育資料・コミュニティ観測を混同しない。公式に確認できない内容は「暫定」「観測」「要確認」と表示する。1回の生成結果はそのセッションの観測として扱い、恒久的なルールへ一般化しない。
10. 作成・修正後は、候補の最終化前に付属の品質ゲートを実行する。ゲートを実行できない場合は、候補を貼り付け可能・検証済みとして提示しない。上限や構文判定の根拠は、意味解釈の知識ではなくゲート側の実装と台帳で管理する。

品質ゲートの実行手順は [references/quality-gate-runbook.md](references/quality-gate-runbook.md) に分離する。

## 出力上の原則

- Styleは、ジャンル/サブジャンル、ムード・エネルギー、ボーカル、主要楽器、リズム/テンポ、音像・プロダクションの順に、短く具体的に組み立てる。V4.5公式記事の会話的なStyle記述はv6向けの旧世代参考であり、v6での効果を保証しない。冗長な物語や相互矛盾は避ける。
- Lyricsは、セクションタグを必要な箇所だけ独立行に置き、歌わせる本文と演出用の指示を分ける。`[Verse]`、`[Chorus]`、`[Bridge]`、`[Outro]` は旧世代を含む公式資料で文書化されたv6系向け暫定候補とし、それ以外はコミュニティで観測された実験的な表記として扱う。
- タグ一覧を「Sunoの公式コマンド一覧」と断定しない。Sunoが公式に文書化していないタグは、使う場合も「モデル依存のcue」と説明する。
- ユーザーが提供したLyricsを、依頼なく大幅に改変・短縮・タグ追加しない。文字数超過時は、削る候補と構成変更案を示す。
- 実在アーティスト名、曲名、存命作家の作風そのものを、Sunoが必ず再現する指示として扱わない。必要なら音楽的特徴へ言い換え、権利・規約の確認が必要な点を明記する。
- 内容の安全性、著作権、模倣可否など意味判断はvalidatorの合否に委ねず、必要に応じて人手確認として報告する。
- 生成音声のジャンル逸脱、声質、楽器の可聴性、BPM、歌詞完遂はテキスト診断で判定できない。`human_checks` として試聴項目にする。

## 知識の更新

Sunoの仕様が変わったときは、Markdown本文を先に書き換えず、まず根拠資料と機械可読の管理資産を更新し、その後に意味解釈のガイドを追従させる。機械的な検証資産の監査は品質ゲート側の保守作業として扱う。

v6系公式情報が見つからない数値は削除せず、v5.5等の旧世代出典を明示した `provisional` または `conflict` として残す。音楽用語の意味とSunoでの効き方も別々に更新し、後からv6系公式情報で置き換えられるようにする。
