# 品質ゲート実行手順

この文書は、付属スクリプトを実行するための手順だけを定義する。品質ゲートの判定内容、閾値、エラー分類を意味知識として解釈・再現してはならない。判定の正本はスクリプトと機械可読台帳である。

## 実行規約

- 入力本文は会話から作業ファイルへそのまま保存する。追加断片だけのファイルを候補本文として渡さない。
- 既存Styleの変更では、基準Style全文、候補Style全文、変更計画ファイルを指定する。
- 最終化前に必ず`--strict --json`で実行する。
- プロセスの終了コードとJSONの最終判定だけを採用判断に使う。手計算や目視による代替をしない。
- 実行できない場合は、候補を検証済み・貼り付け可能として提示しない。

## コマンド

通常のStyle/Lyrics入力：

```powershell
node .\suno-songwriting\scripts\check_suno_input.mjs --field style --file .\style.txt --profile v6-create --strict --json
node .\suno-songwriting\scripts\check_suno_input.mjs --field lyrics --file .\lyrics.txt --profile v6-create --strict --json
```

既存Styleの変更：

```powershell
node .\suno-songwriting\scripts\check_style_change.mjs --before .\style-before.txt --after .\style-after.txt --plan .\style-change-plan.json --strict --json
```

診断情報が必要な場合だけ、別途診断スクリプトを実行する。診断結果を品質ゲートの合格結果として扱わない。
