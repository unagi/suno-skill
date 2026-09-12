# Suno Songwriting Skill

Suno v6、v6-wild、v6-mini向けのCodex Skillです。

StyleとLyricsの作成、公式・コミュニティcueの区別、文字数チェック、音楽編成の推論、指示違反の診断を支援します。

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
```
