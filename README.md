# 日本語ロールプレイ練習アプリ

OpenAI Realtime APIのWebRTCエンドポイントを使用した、日本語学習者向けのロールプレイ練習アプリケーションです。

## 機能

- 🎭 6つの異なるロールプレイシナリオ（レストラン、ホテル、就職面接など）
- 🎤 リアルタイム音声会話
- 📝 会話の文字起こし表示
- 🌊 3つの難易度レベル（初級・中級・上級）
- 🔇 ミュート機能

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **API**: OpenAI Realtime API (WebRTC)
- **音声モデル**: gpt-4o-realtime-preview-2025-06-03

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd realtime-speech-agent-app
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local` ファイルを作成し、OpenAI APIキーを設定してください：

```bash
cp .env.example .env.local
```

`.env.local` を編集：
```
OPENAI_API_KEY=your_actual_openai_api_key
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 使い方

1. **シナリオを選択**: 練習したいシナリオをクリックして選択
2. **練習を開始**: 「練習を開始」ボタンをクリック
3. **マイクの許可**: ブラウザのマイク使用許可を承認
4. **会話開始**: AIと日本語で会話練習
5. **終了**: 「終了」ボタンで練習を終了

## アーキテクチャ

### WebRTC接続フロー

1. クライアントが `/api/session` にPOSTリクエスト
2. サーバーがOpenAI Sessions APIからエフェメラルキーを取得
3. クライアントがWebRTC接続を確立
4. `oai-events` データチャネルでリアルタイムメッセージング

### 主要ファイル

- `app/api/session/route.ts` - エフェメラルキー取得API
- `hooks/useWebRTCSession.ts` - WebRTC接続管理フック
- `lib/scenarios.ts` - ロールプレイシナリオ定義
- `app/page.tsx` - メインUI

## トラブルシューティング

### 接続エラー

- OpenAI APIキーが正しく設定されているか確認
- ブラウザがマイクへのアクセスを許可しているか確認
- コンソールログでエラーメッセージを確認

### 音声が聞こえない

- ブラウザの音量設定を確認
- オーディオ要素が正しくDOMに追加されているか確認

## 開発のヒント

- ICE候補収集は最大3秒待機
- エフェメラルキーの有効期限は60秒
- 音声フォーマットはPCM16を使用
- サンプルレート: 24kHz

## ライセンス

MIT