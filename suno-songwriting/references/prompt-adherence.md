# 指示違反への診断と再指示

Sunoの生成結果が指示から外れたとき、「モデルが無視した」とだけ結論づけず、入力・設定・モデル特性・生成結果を分けて診断する。

## 最初に確認する順序

1. **モデル**: 指示遵守を優先するならv6を基準にする。v6-wildは公式にも探索的・予測しにくいモデルと説明されるため、逸脱を即座にバグと断定しない。v6-miniは高速案出し向けで、v6との差分は未確認。
2. **設定**: VarietyがStyleを書き換える設定になっていないか、Vocal Gender、Persona、Inspo、Exclude Styles、Max Modeの有無を確認する。
3. **責務分離**: Styleに全体音像、Lyricsに本文と局所cueが置かれているか確認する。
4. **競合**: 複数ジャンル、複数BPM、相反するムード、include/excludeの同時指定を減らす。
5. **再指示**: 主役を1〜2個に絞り、`instrument + action + role` へ具体化して短いA/B案を試す。
6. **局所修正**: 全体を作り直すより、必要ならReplace SectionやExtendを使う。
7. **試聴確認**: ジャンル、声、楽器、構造、歌詞の実現は音声を聴いて判定する。テキストvalidatorは結果音声を判定できない。

## 代表的な失敗モード

| 症状 | 対応 |
| --- | --- |
| ジャンルが汎用ポップ化する | v6へ戻す、Varietyを0にする、主ジャンル1つ＋補助要素2〜3個へ整理する。これは設定部分以外は暫定仮説。 |
| 指定楽器が出ない | `instrument + action + role` にする。例: `active melodic bassline following guitar riffs`。主役楽器を1〜2個に絞る。 |
| 不要な楽器が混ざる | Styleの列挙を減らし、Exclude Stylesが使える場合だけ短い除外語を試す。結果保証ではない。 |
| 声の性別・質感が違う | CustomのVocal Genderを設定し、Styleには音域・質感・発音を追加する。Persona/Inspoとの競合も確認する。 |
| 構造タグが無視される | 公式資料で例示された基本タグを使い、非公式cueと長い角括弧指示を減らす。必要ならReplace Section。 |
| Lyricsが途中で切れる・反復する | 不要な説明と重複を削り、構造を単純化する。長尺はExtend等を検討する。上限内でも歌唱完了は保証されない。 |
| Instrumentalなのに声が入る | Lyrics本文を空にし、Instrumental設定を確認する。否定文だけでの回避は保証しない。 |
| BPM・テンポが守られない | BPMを1つに絞り、相反するtempo語を削る。実テンポは試聴で確認する。 |

## 公式情報と仮説の境界

公式に確認できる操作・設定は、v6のモデル特性、Variety、Vocal Gender、Max Mode、Replace Section、Extend、Exclude Stylesなど。これらも生成結果を保証するものではない。

次はコミュニティ仮説または未確認事項として扱う。

- 「短いStyleほど必ず良い」
- 否定文が必ず逆効果になる
- 特定の語句で楽器が必ず出る
- StyleとLyricsのどちらかが常に優先される
- `[End]`、`[Hard Stop]`、`[Guitar Solo]`等が公式固定コマンドである
