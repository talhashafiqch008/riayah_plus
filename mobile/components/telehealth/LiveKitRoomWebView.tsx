import { useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  token: string;
  serverUrl: string;
  onDisconnected?: () => void;
};

/**
 * Expo-friendly LiveKit join via WebView (works in Expo Go).
 * Native @livekit/react-native can replace this in a custom dev client later.
 */
export function LiveKitRoomWebView({ token, serverUrl, onDisconnected }: Props) {
  const html = useMemo(() => {
    const safeToken = JSON.stringify(token);
    const safeUrl = JSON.stringify(serverUrl);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; height: 100%; background: #1c1917; color: #fff; font-family: system-ui, sans-serif; }
    #root { height: 100%; display: flex; flex-direction: column; }
    #videos { flex: 1; display: grid; grid-template-columns: 1fr; gap: 8px; padding: 8px; }
    video { width: 100%; height: 100%; object-fit: cover; background: #000; border-radius: 12px; }
    #status { padding: 10px 12px; font-size: 13px; background: #292524; }
    #leave { margin: 8px; padding: 12px; border: 0; border-radius: 12px; background: #0d9488; color: #fff; font-weight: 600; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/livekit-client@2.9.1/dist/livekit-client.umd.min.js"></script>
</head>
<body>
  <div id="root">
    <div id="status">Connecting…</div>
    <div id="videos">
      <video id="remote" autoplay playsinline></video>
      <video id="local" autoplay playsinline muted style="max-height: 28%"></video>
    </div>
    <button id="leave">Leave call</button>
  </div>
  <script>
    (async function () {
      const status = document.getElementById('status');
      const localVideo = document.getElementById('local');
      const remoteVideo = document.getElementById('remote');
      const leaveBtn = document.getElementById('leave');
      const { Room, RoomEvent, Track } = LivekitClient;
      const room = new Room({ adaptiveStream: true, dynacast: true });
      function setStatus(t) { status.textContent = t; }
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video) track.attach(remoteVideo);
        if (track.kind === Track.Kind.Audio) track.attach(remoteVideo);
      });
      room.on(RoomEvent.Disconnected, () => {
        setStatus('Disconnected');
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'disconnected' }));
        }
      });
      leaveBtn.onclick = () => room.disconnect();
      try {
        await room.connect(${safeUrl}, ${safeToken});
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        room.localParticipant.videoTrackPublications.forEach((pub) => {
          if (pub.track) pub.track.attach(localVideo);
        });
        setStatus('In call');
      } catch (err) {
        setStatus('Could not join: ' + (err && err.message ? err.message : String(err)));
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
        source={{ html }}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
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
