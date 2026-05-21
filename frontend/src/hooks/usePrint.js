import { useCallback } from 'react';

export default function usePrint() {
  const printReceipt = useCallback((type = 'thermal') => {
    // 1. Create temporary style tag to hold layout overrides
    const styleId = 'print-style-overrides';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    if (type === 'thermal') {
      style.innerHTML = `
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-size: 11px !important;
            font-family: 'Tajawal', sans-serif !important;
            direction: rtl !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .thermal-receipt {
            width: 76mm !important;
            padding: 2mm !important;
            box-sizing: border-box !important;
          }
        }
      `;
    } else {
      // A4 format
      style.innerHTML = `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: 'Tajawal', sans-serif !important;
            direction: rtl !important;
            width: 100% !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .invoice-container {
            width: 100% !important;
            padding: 20px !important;
          }
        }
      `;
    }

    // 2. Perform printing
    setTimeout(() => {
      window.print();
    }, 150);
  }, []);

  return { printReceipt };
}
