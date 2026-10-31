# TOWA様バトル

TOWA様が戦う、ブラウザで遊べる 1対1 の対戦格闘ゲームです。スマホでもPCでも遊べます。

## 遊び方

- **CPUと対戦**（よわい / ふつう / つよい）か **2人で対戦** を選びます。
- 相手の体力を 0 にするか、時間切れのとき体力が多いほうがラウンドの勝ち。**2本先取**で勝利！
- 攻撃を当てたり受けたりすると **りんごゲージ** がたまります。半分使って必殺技 **「リンゴ投げ」**！

| 操作 | 1P | 2P | スマホ |
|---|---|---|---|
| 移動 | ← → | A D | ◀ ▶ |
| ジャンプ | ↑ | W | ▲ |
| ガード | ↓ | S | ▼ |
| パンチ | J | F | P |
| キック | K | G | K |
| リンゴ投げ | L | H | 🍎 |

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
src/fighter.js    キャラの動き・技・当たり判定・描画
src/effects.js    リンゴ弾、エフェクト、効果音
src/ai.js         CPU
src/main.js       ゲーム進行、背景、HUD、メニュー
assets/           キャラ画像（towa-source.jpg が元画像）
tools/            画像の切り抜き・色違い作成スクリプト（Python + Pillow）
```

キャラ画像を作り直すとき:

```sh
python3 tools/cutout.py assets/towa-source.jpg assets/towa.png
python3 tools/make_dark.py assets/towa.png assets/towa-dark.png
```
