import { useMemo } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  token: string;
  serverUrl: string;
  onDisconnected?: () => void;
};

/**
 * WebView LiveKit fallback for Expo Go. Prefer TelehealthVideoRoom / native LiveKitCallRoom
 * in development builds — WebView getUserMedia is unreliable on many Android devices.
 */
export function LiveKitRoomWebView({ token, serverUrl, onDisconnected }: Props) {
  const html = useMemo(() => {
    const safeToken = JSON.stringify(token);
    const safeUrl = JSON.stringify(serverUrl);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #1c1917; color: #fff; font-family: system-ui, sans-serif; }
    #root { height: 100%; display: flex; flex-direction: column; }
    #videos { flex: 1; display: grid; grid-template-columns: 1fr; gap: 8px; padding: 8px; min-height: 0; }
    video { width: 100%; height: 100%; object-fit: cover; background: #000; border-radius: 12px; }
    #status { padding: 8px 12px; font-size: 12px; background: #292524; }
    #bar { display: flex; gap: 8px; justify-content: center; padding: 10px; background: #1c1917; flex-wrap: wrap; }
    #bar button { min-width: 44px; height: 44px; border: 0; border-radius: 22px; background: #44403c; color: #fff; font-size: 16px; }
    #bar button.on { background: #0d9488; }
    #bar button.danger { background: #dc2626; }
    #chat { display: none; position: absolute; right: 0; top: 0; bottom: 64px; width: 78%; max-width: 340px;
      background: rgba(28,25,23,0.96); border-left: 1px solid #44403c; flex-direction: column; }
    #chat.open { display: flex; }
    #chat-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #44403c; font-weight: 600; }
    #chat-log { flex: 1; overflow: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
    .bubble { background: #292524; border-radius: 10px; padding: 8px 10px; }
    .bubble .who { color: #5eead4; font-size: 11px; font-weight: 600; }
    .bubble .msg { color: #fafaf9; font-size: 14px; margin-top: 2px; }
    #chat-form { display: flex; gap: 8px; padding: 10px; border-top: 1px solid #44403c; }
    #chat-form input { flex: 1; background: #292524; border: 0; border-radius: 10px; color: #fff; padding: 10px 12px; }
    #chat-form button { width: 44px; height: 44px; border: 0; border-radius: 12px; background: #0d9488; color: #fff; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/livekit-client@2.9.1/dist/livekit-client.umd.min.js"></script>
</head>
<body>
  <div id="root">
    <div id="status">Connecting…</div>
    <div id="videos" style="position:relative">
      <video id="remote" autoplay playsinline></video>
      <video id="local" autoplay playsinline muted style="max-height: 28%"></video>
      <div id="chat">
        <div id="chat-header"><span>In-call chat</span><button type="button" id="chat-close" style="background:transparent;border:0;color:#d6d3d1;font-size:18px">×</button></div>
        <div id="chat-log"></div>
        <form id="chat-form">
          <input id="chat-input" placeholder="Message…" autocomplete="off" />
          <button type="submit">➤</button>
        </form>
      </div>
    </div>
    <div id="bar">
      <button type="button" id="mic" class="on" title="Microphone">🎤</button>
      <button type="button" id="cam" class="on" title="Camera">📷</button>
      <button type="button" id="screen" title="Share screen">🖥</button>
      <button type="button" id="chat-btn" title="Chat">💬</button>
      <button type="button" id="leave" class="danger" title="Leave">📞</button>
    </div>
  </div>
  <script>
    (async function () {
      const status = document.getElementById('status');
      const localVideo = document.getElementById('local');
      const remoteVideo = document.getElementById('remote');
      const chatEl = document.getElementById('chat');
      const chatLog = document.getElementById('chat-log');
      const { Room, RoomEvent, Track } = LivekitClient;
      const room = new Room({ adaptiveStream: true, dynacast: true });
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const CHAT_TOPIC = 'lk-chat-topic';

      function setStatus(t) { status.textText = t; status.textContent = t; }
      function post(type, extra) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, extra || {})));
        }
      }
      function addChatBubble(who, message) {
        const div = document.createElement('div');
        div.className = 'bubble';
        div.innerHTML = '<div class="who"></div><div class="msg"></div>';
        div.querySelector('.who').textContent = who;
        div.querySelector('.msg').textContent = message;
        chatLog.appendChild(div);
        chatLog.scrollTop = chatLog.scrollHeight;
      }

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video) track.attach(remoteVideo);
        if (track.kind === Track.Kind.Audio) track.attach(remoteVideo);
      });
      room.on(RoomEvent.Disconnected, () => {
        setStatus('Disconnected');
        post('disconnected');
      });
      room.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        if (topic && topic !== CHAT_TOPIC) return;
        try {
          const raw = decoder.decode(payload);
          const data = JSON.parse(raw);
          const message = data.message || data.text || raw;
          addChatBubble((participant && (participant.name || participant.identity)) || 'Participant', message);
        } catch (_) {}
      });

      document.getElementById('leave').onclick = () => room.disconnect();
      document.getElementById('chat-btn').onclick = () => chatEl.classList.toggle('open');
      document.getElementById('chat-close').onclick = () => chatEl.classList.remove('open');
      document.getElementById('mic').onclick = async (e) => {
        const next = !room.localParticipant.isMicrophoneEnabled;
        await room.localParticipant.setMicrophoneEnabled(next);
        e.currentTarget.classList.toggle('on', next);
      };
      document.getElementById('cam').onclick = async (e) => {
        const next = !room.localParticipant.isCameraEnabled;
        await room.localParticipant.setCameraEnabled(next);
        e.currentTarget.classList.toggle('on', next);
      };
      document.getElementById('screen').onclick = async (e) => {
        try {
          const next = !room.localParticipant.isScreenShareEnabled;
          await room.localParticipant.setScreenShareEnabled(next);
          e.currentTarget.classList.toggle('on', next);
          if (!next) setStatus('In call');
          else setStatus('Sharing screen');
        } catch (err) {
          setStatus('Screen share not supported in this WebView. Use a native build.');
        }
      };
      document.getElementById('chat-form').onsubmit = async (ev) => {
        ev.preventDefault();
        const input = document.getElementById('chat-input');
        const message = (input.value || '').trim();
        if (!message) return;
        input.value = '';
        const payload = encoder.encode(JSON.stringify({ id: String(Date.now()), message: message, timestamp: Date.now() }));
        await room.localParticipant.publishData(payload, { reliable: true, topic: CHAT_TOPIC });
        addChatBubble('You', message);
      };

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API unavailable in this WebView (getUserMedia missing)');
        }
        await room.connect(${safeUrl}, ${safeToken});
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        room.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track) pub.track.attach(localVideo);
        });
        setStatus('In call');
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        setStatus('Could not join: ' + msg);
        post('error', { message: msg });
      }
    })();
  </script>
</body>
</html>`;
  }, [token, serverUrl]);

  return (
    <View style={{ flex: 1, backgroundColor: '#1c1917' }}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        mediaCapturePermissionGrantType="grant"
        mixedContentMode="always"
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as { type?: string };
            if (payload.type === 'disconnected') onDisconnected?.();
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}
