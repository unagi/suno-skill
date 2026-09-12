# Lyricsタグの分類

## v6向けの公式旧世代参照

v6系専用のタグ一覧はまだ確認できない。Suno公式Hub記事は、Lyricsの構造を導く例として `[Verse]`、`[Chorus]`、`[Bridge]` を挙げ、公式リリースノートはLyrics編集の構造ラベルとして `Verse` と `Outro` を説明している。このSkillでは、次を「公式旧世代参照によるv6基準の暫定候補」とし、v6-wild/miniへは差分未確認のまま継承する。

- `[Verse]`
- `[Chorus]`
- `[Bridge]`
- `[Outro]`

これはSunoの全タグ一覧ではない。v6系モデルでの結果を保証するコマンド仕様でもない。

## コミュニティで観測されるcue

`[Intro]`、`[Pre-Chorus]`、`[Post-Chorus]`、`[Hook]`、`[Refrain]`、`[Interlude]`、`[Instrumental Break]`、`[Solo]`、`[Breakdown]`、`[Build]`、`[Drop]`、`[Verse 1]`、`[Final Chorus]` などは、ユーザーが構造や演出の手がかりとして試している表記である。便利な場合もあるが、公式の固定タグ一覧として扱わない。

## 使い方

1. 最初は `[Verse]`、`[Chorus]`、`[Bridge]`、`[Outro]` だけで構造を作る。
2. 必要な場合だけ、独立したタグ行にコミュニティcueを追加する。
3. 生成結果で無視・誤解釈された場合は、タグを減らすか、Styleまたは本文の短い自然言語cueへ移す。
4. `check_suno_input.mjs` のunknown tag warningは、失敗判定ではなく検証対象の通知として読む。
