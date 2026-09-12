# Styleガイド

## 組み立てる軸

Styleは、次の順で必要なものだけを組み合わせる。すべてを埋める必要はない。

1. **Genre / subgenre**: 例 `alternative R&B`, `melodic drum and bass`
2. **Mood / energy**: 例 `intimate, bittersweet, slowly building`
3. **Vocal**: 例 `warm female lead vocal, breathy but clear diction`
4. **Rhythm / tempo**: 例 `syncopated groove, around 92 BPM`
5. **Instrumentation**: 例 `electric piano, muted guitar, sub bass, brushed drums`
6. **Production / texture**: 例 `warm tape saturation, spacious reverb, polished modern mix`
7. **Arrangement cue**: 例 `start sparse, widen in the chorus, end with a soft instrumental outro`

## 語彙の選び方

- 広いジャンル名だけで終わらせず、サブジャンル、ムード、音色のうち2〜4軸を追加する。
- 楽器は羅列しすぎず、主役・土台・装飾に分ける。主役を1〜2個、土台を1〜2個、装飾を少数にする。
- ボーカルは性別だけでなく、音域、質感、発音、感情、ハーモニーの役割を書く。
- `dark`, `bright`, `minimal`, `maximal` など意味が衝突しうる語は、時間軸を付けて解消する（例 `dark verses, brighter anthemic chorus`）。
- `cinematic` や `epic` のような抽象語は、弦、空間、ダイナミクスなど可聴な特徴と一緒に使う。
- 公式V4.5記事では、短いタグ列だけでなく、自然な文章で音の進行や質感を説明する方法も示されている。これはv6向けの旧世代参考であり、短いタグ版と文章版を比較する仮説として使う。

## 推奨テンプレート

短い版:

```text
[genre/subgenre], [mood/energy], [vocal], [rhythm/tempo], [key instruments], [production texture]
```

会話的な版:

```text
A [mood] [genre] track with [vocal]. Build from [opening texture] into [chorus or peak], using [main instruments] over [rhythm]. Keep the production [texture/space].
```

## 避けること

- 目的と無関係な長い世界設定や歌詞本文をStyle欄に入れる。
- 同じ意味の形容詞を重ね、重要な特徴を埋もれさせる。
- 実在アーティスト名や曲名を、再現保証のように使う。代わりに時代、ジャンル、声質、編曲、ミックス特徴へ分解する。
- 「絶対に」「完全に」など、生成結果を保証する語を使う。
- 除外したい要素をStyle本文に否定文で大量に並べる。Exclude Styles欄が使える画面なら、そこで短いカンマ区切りにする。画面による提供範囲があるため、利用できるかを確認する。
