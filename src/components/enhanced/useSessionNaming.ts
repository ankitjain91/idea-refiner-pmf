import { useState } from 'react';

export function useSessionNaming(initialName: string) {
  const [internalSessionName, setInternalSessionName] = useState<string>(initialName);
  const [sessionNameDraft, setSessionNameDraft] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const isDefaultSessionName = !internalSessionName || internalSessionName === 'New Chat Session';

  function resetNaming() {
    setInternalSessionName('');
    setSessionNameDraft('');
    setAnonymous(false);
  }

  function commitName() {
    if (sessionNameDraft.trim().length >= 4) {
      setInternalSessionName(sessionNameDraft.trim());
      setSessionNameDraft('');
      return true;
    }
    return false;
  }

  return {
    internalSessionName,
    sessionNameDraft,
    anonymous,
    isDefaultSessionName,
    setSessionNameDraft,
    setAnonymous,
    commitName,
    resetNaming,
    setInternalSessionName
  };
}
