# Suno Songwriting Skill

Suno v6、v6-wild、v6-mini向けのCodex Skillです。

StyleとLyricsの作成、公式・コミュニティcueの区別、文字数チェック、音楽編成の推論、指示違反の診断を支援します。

既存Styleの改善では、Style全文を基準に、音楽的な副作用を比較してから候補を選ぶ変更契約を使います。候補の選択前に最終Styleを確定しないため、必要に応じて `check_style_change.mjs` で宣言外の差分や未承認変更を検査できます。

全文の文字数は会話内で手計算せず、Styleをファイルに保存して品質ゲートを実行します。LLMがゲートの中身を再現して判定せず、`--strict --json`の終了結果だけを採用判断に使うことで、既存Styleと追加分の合計で入力欄の実用上限を超える候補を除外できます。

## ZIPのダウンロード

GitHub Actionsの `Package Suno songwriting skill` が成功した実行を開き、Artifactsから `suno-songwriting-skill` をダウンロードします。GitHubがArtifact全体をZIPとしてダウンロードするため、展開は1回で済みます。

ワークフローは `main` へのpushと手動実行で動きます。Artifactの保持期間は90日です。

## Codexへの配置

ZIPを展開すると、`suno-songwriting` フォルダが得られます。PowerShellでは次のように配置できます。

```powershell
Expand-Archive .\suno-songwriting-skill.zip -DestinationPath "$env:USERPROFILE\.codex\skills" -Force
```

配置先は次の形になります。

```text
%USERPROFILE%\.codex\skills\suno-songwriting\SKILL.md
```

## ローカル検証

```powershell
node --test .\suno-songwriting\tests\*.test.mjs
node .\suno-songwriting\scripts\audit_knowledge.mjs --as-of 2026-09-12
node .\suno-songwriting\scripts\check_style_change.mjs --before .\style-before.txt --after .\style-after.txt --plan .\style-change-plan.json --strict --json
```
