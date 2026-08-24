import { useLocalSearchParams } from 'expo-router';
import { MessageThread } from '../../../components/messages/MessagesInbox';

export default function CoordinatorMessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <MessageThread
      conversationId={String(id ?? '')}
      basePath="/(coordinator)/messages"
    />
  );
}
