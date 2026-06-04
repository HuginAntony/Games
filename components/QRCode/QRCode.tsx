'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './QRCode.module.css';

interface QRCodeProps {
  code: string;
}

export function QRCode({ code }: QRCodeProps) {
  const [url, setUrl] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/lobby/${code}`);
  }, [code]);

  if (!url) return null;

  return (
    <>
      <div className={styles.wrapper} onClick={() => setExpanded(true)} title="Click to enlarge">
        <span className={styles.label}>Scan to join</span>
        <div className={styles.qr}>
          <QRCodeSVG
            value={url}
            size={96}
            bgColor="transparent"
            fgColor="#00f5ff"
            level="M"
          />
        </div>
        <span className={styles.hint}>tap to enlarge</span>
      </div>

      {expanded && (
        <div className={styles.overlay} onClick={() => setExpanded(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG
              value={url}
              size={240}
              bgColor="transparent"
              fgColor="#00f5ff"
              level="M"
            />
            <p className={styles.modalUrl}>{url}</p>
            <button className={styles.closeBtn} onClick={() => setExpanded(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
