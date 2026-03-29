import { useEffect } from 'react';
import useStore from '../store/useStore';

const ReceiptPrinter = () => {
  const { lastOrder, config, clearLastOrder } = useStore();

  useEffect(() => {
    if (lastOrder && config.printEnabled) {
      const handlePrint = () => {
        const printWindow = window.open('', '', 'height=600,width=400');
        if (!printWindow) {
          alert("Le bloqueur de fenêtres empêche l'impression. Veuillez autoriser les popups.");
          return;
        }

        const restaurantName = config.restaurantName || 'RestoBKV';
        const currency = config.currency || '$';
        const phone = config.phone || '';
        const rccm = config.rccm || '';
        const idNat = config.idNat || '';
        const footer = config.footerMessage || 'Merci de votre visite !';
        const taxRate = (Number(config.taxRate || 0) * 100).toFixed(0);

        const itemsHtml = lastOrder.items.map(item => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <div style="text-align: left; flex: 1;">
              ${item.quantity}x ${item.name}<br/>
              <small style="font-size: 10px;">${Number(item.price).toFixed(2)} ${currency}</small>
            </div>
            <div style="text-align: right; min-width: 80px;">
              ${(item.quantity * Number(item.price)).toFixed(2)} ${currency}
            </div>
          </div>
        `).join('');

        const styles = `
          body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Courier New', Courier, monospace; 
            text-align: center; 
            font-size: 13px; 
            color: #000; 
            background: #fff;
          }
          .content-wrapper {
            width: 72mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 10px;
            box-sizing: border-box;
          }
          h2 { font-size: 18px; text-align: center; margin: 5px 0; text-transform: uppercase; }
          p { margin: 2px 0; text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th, .items-table td { text-align: left; padding: 2px 0; vertical-align: top; }
          .items-table .right { text-align: right; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row { font-size: 16px; font-weight: bold; margin-top: 5px; }
          .footer-msg { text-align: center; font-size: 11px; font-style: italic; margin-top: 6px; }
          @page { margin: 0; size: auto; }
        `;

        const html = `
          <html>
            <head>
              <title>Facture POS</title>
            <style>${styles}</style>
            </head>
            <body>
              <div class="content-wrapper">
                <h2>${restaurantName}</h2>
                <p>Bukavu, RDC</p>
                ${phone ? `<p>Tél: ${phone}</p>` : ''}
                ${rccm ? `<p>RCCM: ${rccm}</p>` : ''}
                ${idNat ? `<p>ID NAT: ${idNat}</p>` : ''}
                <div class="divider"></div>
                <p>Facture: <b>${lastOrder.id}</b></p>
                <p>Serveur: ${lastOrder.server}</p>
                <p>Date: ${new Date(lastOrder.timestamp || Date.now()).toLocaleString()}</p>
                <div class="divider"></div>
                
                <div style="margin: 10px 0;">
                  ${itemsHtml}
                </div>

              <div class="divider"></div>
              
              <div class="row">
                <span>Sous-total:</span>
                <span>${Number(lastOrder.subtotal || 0).toFixed(2)} ${currency}</span>
              </div>
              <div class="row">
                <span>TVA (${taxRate}%):</span>
                <span>${Number(lastOrder.tax || 0).toFixed(2)} ${currency}</span>
              </div>
              <div class="total-row row">
                <span>TOTAL:</span>
                <span>${Number(lastOrder.total || 0).toFixed(2)} ${currency}</span>
              </div>

              <div class="divider"></div>
              <p style="font-size: 11px; font-style: italic;">${footer.replace(/\n/g, '<br/>')}</p>
              <div style="height: 40px;"></div>
            </body>
          </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
          printWindow.print();
          // Note: On some mobile browsers, closing too early blocks the print
          // so we don't force close the window immediately
          clearLastOrder();
        }, 800);
      };

      handlePrint();
    }
  }, [lastOrder, config, clearLastOrder]);

  return null;
};

export default ReceiptPrinter;
