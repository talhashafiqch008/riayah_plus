import { useLocalSearchParams } from 'expo-router';
import { MessageThread } from '../../../components/messages/MessagesInbox';

export default function ClinicalMessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <MessageThread
      conversationId={String(id ?? '')}
      basePath="/(clinical)/messages"
    />
  );
}
