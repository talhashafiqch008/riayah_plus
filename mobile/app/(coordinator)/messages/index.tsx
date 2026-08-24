import { MessagesInbox } from '../../../components/messages/MessagesInbox';

export default function CoordinatorMessagesScreen() {
  return (
    <MessagesInbox
      basePath="/(coordinator)/messages"
      canStartStaffThreads
    />
  );
}
