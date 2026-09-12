# 編成分岐による音域・厚みの診断

「中域がスカスカ」「低音が少ない」「音が薄い」は、EQだけの問題とは限らない。どの楽器を前に出すか、どの役割を追加するかで結果が変わるため、編成がわからない状態で単一のStyleを決め打ちしない。

## 応答手順

1. ユーザーがすでに妥当なStyleを使っていると述べている場合、その入力を最初から作り直させない。
2. 症状を「生成後の音の結果」として受け止め、まず候補を提示する。
3. 次の候補から近いものを選んでもらう。「どれでもない」も選択肢にする。
4. 選択後、選ばれた役割だけをStyleへ組み込み、必要ならA/B比較用に1要素だけ変えた案を作る。

## J-Rockの中域不足

### A. ギター中心の中域

狙い: バンドの壁、リフ、コードの厚みで中域を埋める。ギター主体のJ-Rockに向く。

```text
mid-forward J-Rock, dense rhythm electric guitars with strong midrange body, articulate overdriven guitar chords, present lead vocal, punchy snare backbeat, controlled cymbals
```

### B. ボーカル・スネア中心の中域

狙い: ギターを増やしすぎず、歌とスネアの芯を前に出す。歌が埋もれている場合に向く。

```text
mid-forward J-Rock, forward clear lead vocal, expressive midrange lead guitar, punchy snare with a strong crack, melodic electric bass, balanced cymbals
```

### C. 鍵盤・シンセ補強

狙い: ギター中心ではなく、鍵盤やパッドで中域の持続感を作る。ポップ寄り・現代的なJ-Rockに向く。

```text
modern J-Rock, warm electric piano and analog synth pad filling the midrange, clean articulate guitars, present lead vocal, punchy live drums, controlled bright cymbals
```

### 選択後の確認

- Aに近い: 「ギターの壁」「リフ」「コードの厚み」のどれを強めるか。
- Bに近い: ボーカルを前に出すのか、スネアの芯を強めるのか。
- Cに近い: 電気ピアノ、オルガン、パッドのどれを使うか。
- どれでもない: バンドの主要楽器、ボーカルの有無、欲しい中域の役割を質問する。

## Rockの低音不足・薄さ

### A. ベースギターを土台にする

狙い: 自然なRockのまま、ベースがキックと結び付き、曲の土台を担う。

```text
full-bodied rock, clearly audible electric bass locked with the kick, melodic bassline carrying the low end, thick rhythm guitars, punchy live drums, solid low-mid foundation
```

### B. キックとドラムを強化する

狙い: ベース量より、キックとドラムの打撃感・バンド全体の重量を増やす。

```text
powerful live rock, deep punchy kick, weighty floor toms, tight drum kit, clearly audible electric bass, thick rhythm guitar body, full-band impact
```

### C. ギターの低中域で厚みを作る

狙い: ベースを過度に増やさず、パワーコードやリフの低中域で壁を作る。ギター主体のRockに向く。

```text
guitar-driven rock, thick low-mid rhythm guitars, heavy power-chord impact, tight palm-muted riffs, punchy kick and snare, supportive electric bass, dense full-band mix
```

### D. サブシンセで現代的な低域を補う

狙い: 生バンド寄りではなく、モダンRock、エレクトロRock、ラウド系の低域を補う。

```text
modern rock, deep controlled sub bass underneath a clearly audible electric bass, punchy kick, thick distorted guitars, powerful low-end foundation, polished full-band production
```

### 選択後の確認

- A: ベースギターの存在感が欲しいのか、ベースラインの動きが欲しいのか。
- B: キックの量感か、ドラム全体の重量感か。
- C: ベースよりギターの壁を厚くしたいのか。
- D: サブベースを使う現代的な音像でよいのか。
- どれでもない: 欲しい低音がベース、キック、タム、ギター、サブシンセのどれに近いかを聞く。

## 共通の注意

- `midrange`、`deep bass`、`full-bodied` は意図を伝える補助語であり、特定のEQ結果や編成を保証しない。
- 候補を全部Styleへ詰め込まない。選択された案を中心に、主役1〜2個と土台を組み合わせる。
- Exclude Stylesが使える場合も、短い除外語だけを追加し、主な音楽的役割は肯定形でStyleへ書く。
- 生成後は、ジャンル、主要楽器、ボーカル、キック/ベース/ギターのどれが不足しているかを試聴で再分類する。
