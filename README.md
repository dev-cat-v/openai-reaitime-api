# Next.js + OpenAI Realtime API テンプレート

## 🎙️ リアルタイム音声チャット
このテンプレートは、Next.jsで構築したフロントエンドから、OpenAIのRealtime API（WebRTC）を使って**音声チャット**を実現する最小構成のプロジェクトです。

## 環境構築(ご自身の環境で位置から構築する場合)
### 1 Next.jsプロジェクトを作成します。
```shell
npx create-next-app --example with-docker {your project name}
```

### 2 GitHub でリポジトリを作成し、ローカルの内容をPushします。（任意）
```shell
cd {your project name}
git remote add origin https://github.com/{your git account id}/{your git repository url}
git branch -M main
git push -u origin main
```

### 3 Tailwind-CSS をインストールします。（任意）
- Tailwind CSSをインストールする
以下コマンドを実行します。
```shell
npm install tailwindcss @tailwindcss/postcss postcss
```

- PostCSS設定にTailwindを追加する
Projectのrootディレクトリに、postcss.config.mjsを作成し、以下設定値を記述します。
```shell
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  }
}
```

- Tailwind CSSをインポートする
globals.cssに、以下設定を行います。
```
@import "tailwindcss";
```

### 4 .env.local にAPIキー設定
```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## リソースの配置
### /pages/api/openai-realtime/init.ts
OpenAIにエフェメラルキーをリクエストするAPI。

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key not found' });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "verse",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to create session:', errorText);
    return res.status(response.status).json({ error: 'Failed to create session', details: errorText });
  }

  const data = await response.json();
  res.status(200).json({ ephemeralKey: data.client_secret.value });
}
```

### /app/pages/openai-realtime.tsx
音声チャットのUIとWebRTC接続処理。
```typescript
import { useState, useRef } from 'react';

export default function Chat() {
  const [isChatting, setIsChatting] = useState(false);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const startChat = async () => {
    const res = await fetch('/api/openai-realtime/init');
    const { ephemeralKey } = await res.json();

    const pc = new RTCPeerConnection();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    pc.ontrack = (e) => audioEl.srcObject = e.streams[0];

    const dc = pc.createDataChannel('oai-events');
    dataChannelRef.current = dc;

    dc.onmessage = () => {};

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    const sdpText = await sdpResponse.text();
    const answer: RTCSessionDescriptionInit = {
      type: 'answer',
      sdp: sdpText,
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
    setIsChatting(true);
  };

  const stopChat = () => {
    peerConnection.current?.close();
    dataChannelRef.current?.close();
    setIsChatting(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">リアルタイム音声チャット</h1>

      <div className="mt-4">
        {isChatting ? (
          <button onClick={stopChat} className="px-4 py-2 bg-red-500 text-white rounded">
            ⏹チャット終了
          </button>
        ) : (
          <button onClick={startChat} className="px-4 py-2 bg-blue-500 text-white rounded">
            チャット開始
          </button>
        )}
      </div>
    </div>
  );
}
```

## 動作確認
### 開発サーバー起動
```bash
npm run dev
```

### ブラウザでアクセス
```
http://localhost:3000/openai-realtime
```
