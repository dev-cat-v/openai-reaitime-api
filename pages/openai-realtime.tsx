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
            ⏹️ チャット終了
          </button>
        ) : (
          <button onClick={startChat} className="px-4 py-2 bg-blue-500 text-white rounded">
            🎙️ チャット開始
          </button>
        )}
      </div>
    </div>
  );
}
