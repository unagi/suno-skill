# 音楽ドメイン知識の使い方

このSkillの音楽用語は、百科事典ではなく「ユーザーの曖昧な意図をSuno入力へ変換するための小さな語彙集」として使う。

## 変換の基本形

楽器名だけでなく、次の順で必要な要素を足す。

```text
instrument + action/technique + role + texture/register + section
```

例:

```text
electric guitar → palm-muted electric guitar riff → tight rhythmic palm-muted electric guitar riff
```

「何の音か」だけでなく、「何をしているか」「曲のどこで何を担うか」を書くと、ユーザーの意図をStyleへ落とし込みやすい。ただし、Sunoが必ずその楽器や奏法を生成する保証ではない。

## 語彙の読み方

`music-vocabulary.json` の各項目は、次の2つの確度を分けて持つ。

- `music_semantics_status`: 音楽用語としての意味。教育資料で確認できる場合は `documented`。
- `suno_prompt_effect_status`: Suno入力にしたときの効果。公式に確認できない場合は `provisional` または `observed`。

この分離を崩し、「音楽的に正しい語だからSunoでも必ず効く」と推論しない。

## StyleとLyricsの責務

- **Styleへ置く**: ジャンル、ムード、声質、楽器、奏法、グルーヴ、音色、編曲、ミックス、全体の音像。
- **Lyricsへ置く**: 歌詞本文、公式資料で例示された構造ラベル、短い区間限定のcue。
- **混ぜない**: 長い制作指示、BPMやミックス全体の説明をLyrics本文へ大量に入れない。

Lyrics cueのうち `[Verse]`、`[Chorus]`、`[Bridge]`、`[Outro]` 以外は、公式固定コマンドではなく、モデル依存の実験的cueとして扱う。

## 初版の選定基準

初版カタログには、次のいずれかを満たす語だけを追加する。

1. 複数ジャンルで役割が説明できる基本楽器・音色。
2. Styleを具体化する頻出奏法・アーティキュレーション。
3. グルーヴ、編曲、ボーカル役割、音像を短い語で指定できる用語。
4. 教育資料で意味を確認でき、Suno用の表現へ変換しやすい語。

Sunoでの効果が一度報告されたというだけで、カタログへ公式知識として昇格させない。
