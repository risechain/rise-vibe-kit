'use client';

import { useEffect, useRef } from 'react';
import { useEventNotifications } from '@/hooks/useEventNotifications';

export function EventNotifications() {
  const isMountedRef = useRef(false);
  
  useEffect(() => {
    if (isMountedRef.current) {
      console.warn('EventNotifications is already mounted. This component should only be rendered once.');
      return;
    }
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEventNotifications();
  return null;
}