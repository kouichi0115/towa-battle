# TOWA様バトル

TOWA様が戦う、ブラウザで遊べる 1対1 の対戦格闘ゲームです。スマホでもPCでも遊べます。

## 遊び方

- **CPUと対戦**（よわい / ふつう / つよい）か **2人で対戦** を選びます。
- 相手の体力を 0 にするか、時間切れのとき体力が多いほうがラウンドの勝ち。**2本先取**で勝利！
- 攻撃を当てたり受けたりすると **ゲージ** がたまります。半分使って必殺技！

## キャラクター

- **TOWA様** — 葉っぱ頭の白いキャラ。必殺技は「リンゴ投げ」
- **ドングリ番長** — ライバル。眉毛が太くてほっぺに絆創膏。必殺技は「ドングリ投げ」

キャラは画像ではなくコード（`src/characters.js`）でパーツごとに描いているので、パンチで腕が伸びたりキックで足が上がったりします。

| 操作 | 1P | 2P | スマホ |
|---|---|---|---|
| 移動 | ← → | A D | ◀ ▶ |
| ジャンプ | ↑ | W | ▲ |
| ガード | ↓ | S | ▼ |
| パンチ | J | F | P |
| キック | K | G | K |
| 必殺技（投げ） | L | H | 🍎 |

P / Esc で一時停止。CPU対戦のときは WASD + FGH でも 1P を動かせます。

## 起動方法

ビルドは不要です。フォルダをWebサーバーで配信して `index.html` を開きます。

```sh
python3 -m http.server 8000
# → http://localhost:8000/ を開く
```

GitHub Pages（Settings → Pages → ブランチを選択）でそのまま公開することもできます。

## ファイル構成

```
index.html        画面とメニュー、スマホ用ボタン
style.css         レイアウト
src/input.js      キーボード・タッチ入力
src/fighter.js    キャラの動き・技・当たり判定
src/characters.js キャラの見た目（パーツ描画）とポーズ
src/effects.js    リンゴ弾、エフェクト、効果音
src/ai.js         CPU
src/main.js       ゲーム進行、背景、HUD、メニュー
assets/           タイトル画面用の画像（towa-source.jpg が元画像）
tools/            画像の切り抜きスクリプト（Python + Pillow）
```

タイトル画像を作り直すとき:

```sh
python3 tools/cutout.py assets/towa-source.jpg assets/towa.png
```
