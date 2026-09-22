import { MessagesInbox } from '../../../components/messages/MessagesInbox';

export default function ClinicalMessagesScreen() {
  return (
    <MessagesInbox
      basePath="/(clinical)/messages"
      i18nNs="clinical"
      canStartStaffThreads
    />
  );
}
