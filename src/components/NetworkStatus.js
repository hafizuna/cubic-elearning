import React, { useState, useEffect } from 'react';

const NetworkStatus = ({ isOnline }) => {
  const [visible, setVisible] = useState(!isOnline);

  // Hide the online status after 3 seconds
  useEffect(() => {
    let timer;
    if (isOnline) {
      timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
    } else {
      setVisible(true);
    }

    return () => clearTimeout(timer);
  }, [isOnline]);

  if (!visible && isOnline) return null;

  return (
    <div className={`network-status ${isOnline ? 'online' : 'offline'}`}>
      {isOnline ? 'Back Online - Content will sync' : 'You are offline - Learning continues'}
    </div>
  );
};

export default NetworkStatus;
