import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from 'livekit-client';
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useChat,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';

type Props = {
  token: string;
  serverUrl: string;
  onDisconnected?: () => void;
};

function TrackTile({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
  if (!isTrackReference(trackRef) || trackRef.publication?.isMuted) {
    return (
      <View
        style={{
          flex: 1,
          minHeight: 160,
          backgroundColor: '#292524',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="person" size={36} color="#a8a29e" />
        <Text style={{ marginTop: 8, color: '#a8a29e', fontSize: 13 }}>
          {trackRef.participant?.name || trackRef.participant?.identity || 'Participant'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 160, borderRadius: 12, overflow: 'hidden' }}>
      <VideoTrack trackRef={trackRef} style={{ flex: 1, width: '100%', height: '100%' }} />
      <View
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12 }}>
          {trackRef.participant.name || trackRef.participant.identity}
        </Text>
      </View>
    </View>
  );
}

function CallControls({
  showChat,
  onToggleChat,
  onLeave,
}: {
  showChat: boolean;
  onToggleChat: () => void;
  onLeave: () => void;
}) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleCam() {
    setBusy('cam');
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } finally {
      setBusy(null);
    }
  }

  async function toggleMic() {
    setBusy('mic');
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } finally {
      setBusy(null);
    }
  }

  async function toggleScreen() {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Screen share',
        'Screen sharing on iOS needs a Broadcast Extension build. Use Android or the web client for now.',
      );
      return;
    }
    setBusy('screen');
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
        audio: true,
        resolution: { width: 1280, height: 720 },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start screen share';
      Alert.alert('Screen share failed', message);
    } finally {
      setBusy(null);
    }
  }

  const btn = (
    active: boolean,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    danger = false,
  ) => (
    <Pressable
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: danger ? '#dc2626' : active ? '#0d9488' : '#44403c',
      }}
    >
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 12,
        backgroundColor: '#1c1917',
      }}
    >
      {btn(isMicrophoneEnabled, isMicrophoneEnabled ? 'mic' : 'mic-off', () => void toggleMic())}
      {btn(isCameraEnabled, isCameraEnabled ? 'videocam' : 'videocam-off', () => void toggleCam())}
      {btn(
        isScreenShareEnabled,
        isScreenShareEnabled ? 'stop-circle' : 'desktop-outline',
        () => void toggleScreen(),
      )}
      {btn(showChat, 'chatbubble-ellipses', onToggleChat)}
      {btn(true, 'call', onLeave, true)}
      {busy ? <ActivityIndicator color="#5eead4" style={{ position: 'absolute', right: 16 }} /> : null}
    </View>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState('');

  async function onSend() {
    const text = draft.trim();
    if (!text || isSending) return;
    setDraft('');
    await send(text);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 72,
        width: '78%',
        maxWidth: 360,
        backgroundColor: 'rgba(28,25,23,0.96)',
        borderLeftWidth: 1,
        borderLeftColor: '#44403c',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: '#44403c',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>In-call chat</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color="#d6d3d1" />
        </Pressable>
      </View>
      <FlatList
        data={[...chatMessages].reverse()}
        inverted
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: '#292524',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: '#5eead4', fontSize: 11, fontWeight: '600' }}>
              {item.from?.name || item.from?.identity || 'Participant'}
            </Text>
            <Text style={{ color: '#fafaf9', fontSize: 14, marginTop: 2 }}>{item.message}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#a8a29e', textAlign: 'center', marginTop: 24 }}>
            No messages yet
          </Text>
        }
      />
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: 10,
          borderTopWidth: 1,
          borderTopColor: '#44403c',
        }}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message…"
          placeholderTextColor="#78716c"
          style={{
            flex: 1,
            backgroundColor: '#292524',
            color: '#fff',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
          }}
          onSubmitEditing={() => void onSend()}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => void onSend()}
          disabled={isSending || !draft.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: '#0d9488',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isSending || !draft.trim() ? 0.5 : 1,
          }}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function RoomBody({ onDisconnected }: { onDisconnected?: () => void }) {
  const room = useRoomContext();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const [showChat, setShowChat] = useState(false);

  const leave = useCallback(() => {
    void room.disconnect();
    onDisconnected?.();
  }, [onDisconnected, room]);

  return (
    <View style={{ flex: 1, backgroundColor: '#1c1917' }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          flexWrap: 'wrap',
          padding: 8,
          gap: 8,
          alignContent: 'stretch',
        }}
      >
        {tracks.map((item, index) => {
          const key = isTrackReference(item)
            ? `${item.participant.identity}-${item.source}-${index}`
            : `placeholder-${index}`;
          const multi = tracks.length > 1;
          return (
            <View
              key={key}
              style={{
                flexGrow: 1,
                flexBasis: multi ? '47%' : '100%',
                minHeight: multi ? 160 : 280,
              }}
            >
              <TrackTile trackRef={item} />
            </View>
          );
        })}
      </View>
      {showChat ? <ChatPanel onClose={() => setShowChat(false)} /> : null}
      <CallControls
        showChat={showChat}
        onToggleChat={() => setShowChat((v) => !v)}
        onLeave={leave}
      />
    </View>
  );
}

/**
 * Native LiveKit room — camera/mic, screen share, in-call chat (compatible with web VideoConference chat).
 * Requires a development build (`npx expo run:android` / `run:ios`), not Expo Go.
 */
export function LiveKitCallRoom({ token, serverUrl, onDisconnected }: Props) {
  useEffect(() => {
    let active = true;
    void (async () => {
      await AudioSession.startAudioSession();
      if (!active) await AudioSession.stopAudioSession();
    })();
    return () => {
      active = false;
      void AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        audio
        video
        options={{ adaptiveStream: { pixelDensity: 'screen' } }}
        onDisconnected={onDisconnected}
      >
        <RoomBody onDisconnected={onDisconnected} />
      </LiveKitRoom>
    </View>
  );
}
