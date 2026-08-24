import { useLocalSearchParams } from 'expo-router';
import { MessageThread } from '../../../components/messages/MessagesInbox';

export default function FamilyMessageThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <MessageThread
      conversationId={String(id ?? '')}
      basePath="/(family)/messages"
      tone="family"
    />
  );
}
