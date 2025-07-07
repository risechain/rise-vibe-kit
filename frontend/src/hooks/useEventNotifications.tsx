import { useEffect, useRef } from 'react';
import { toast } from '@/lib/toast-manager';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useAccount } from 'wagmi';

export function useEventNotifications() {
  const { contractEvents } = useWebSocket();
  const { address } = useAccount();
  const lastProcessedIndexRef = useRef<number>(-1);
  const processedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!contractEvents || contractEvents.length === 0) return;
    
    // Only process new events since last check
    const newEventIndex = contractEvents.length - 1;
    if (newEventIndex <= lastProcessedIndexRef.current) return;
    
    // Process only the new events
    const eventsToProcess = contractEvents.slice(lastProcessedIndexRef.current + 1);
    lastProcessedIndexRef.current = newEventIndex;
    
    eventsToProcess.forEach((event) => {
      // Create a unique key for this event
      const eventKey = `${event.transactionHash}-${event.logIndex || 0}`;
      
      // Check if we've already processed this event
      if (processedEventsRef.current.has(eventKey)) return;
      processedEventsRef.current.add(eventKey);

      // Only show notifications for decoded events
      if (!event.decoded || !event.eventName) return;

      // Show different notifications based on event type
      switch (event.eventName) {
        case 'MessageSent':
          // Don't notify for own messages
          if (event.args?.user?.toLowerCase() !== address?.toLowerCase()) {
            toast.info(
              <div>
                <strong>New Message</strong>
                <p className="text-sm">{event.args?.userId}: {event.args?.message}</p>
              </div>,
              {
                position: "bottom-left",
                autoClose: 3000,
              }
            );
          }
          break;

        case 'UserRegistered':
          if (event.args?.user?.toLowerCase() !== address?.toLowerCase()) {
            toast.success(
              <div>
                <strong>New User Joined</strong>
                <p className="text-sm">{event.args?.userId}</p>
              </div>,
              {
                position: "bottom-left",
                autoClose: 3000,
              }
            );
          }
          break;

        case 'KarmaChanged':
          toast.info(
            <div>
              <strong>Karma Update</strong>
              <p className="text-sm">{event.args?.userId}: {event.args?.karma?.toString()}</p>
            </div>,
            {
              position: "bottom-left",
              autoClose: 3000,
            }
          );
          break;
      }
    });
  }, [contractEvents, address]);
}