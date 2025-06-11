import React, { useState, useEffect } from 'react';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('cookiesAccepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#333',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 9999,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.18)',
        width: '100vw',
        pointerEvents: 'auto',
        fontFamily: 'Quicksand, sans-serif',
        fontSize: '1rem',
        maxWidth: '100vw',
      }}
      role="alert"
      aria-live="polite"
    >
      <div style={{ maxWidth: '80vw', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>
          We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
          <a
            href="/privacy-policy"
            style={{ color: '#fff', marginLeft: '0.5rem', textDecoration: 'underline' }}
          >
            Learn more
          </a>
        </p>
      </div>
      <button
        onClick={handleAccept}
        style={{
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1.2rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '1rem',
          marginLeft: '1rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)'
        }}
      >
        Accept
      </button>
    </div>
  );
};

export default CookieBanner; 