import { MessagesInbox } from '../../../components/messages/MessagesInbox';

export default function FamilyMessagesScreen() {
  return (
    <MessagesInbox
      basePath="/(family)/messages"
      tone="family"
      canStartCoordinatorThread
    />
  );
}
