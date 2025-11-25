// lib/services/email.service.ts
import { google } from 'googleapis';

const NOTIFICATION_EMAILS = [
  'agusiglesias72@gmail.com',
  'agusiglesiast@gmail.com',
];

function getGmailAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Falta configuración de Google OAuth para Gmail');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  return oauth2Client;
}

function createEmailMessage(to: string[], subject: string, htmlBody: string): string {
  const messageParts = [
    `To: ${to.join(', ')}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    htmlBody,
  ];
  
  const message = messageParts.join('\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const emailService = {
  async sendProcessCompletedEmail(data: {
    startDate: string;
    endDate: string;
    reportsStats?: {
      totalRows: number;
      dataRows: number;
      processedRanges: number;
    };
    driversStats?: {
      successful: number;
      failed: number;
      total: number;
      errors?: Array<{ driver: string; error: string }>;
    };
    spreadsheetUrl?: string;
  }): Promise<void> {
    try {
      const auth = getGmailAuth();
      const gmail = google.gmail({ version: 'v1', auth });

      let html = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">✅ Proceso Completado</h2>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📅 Rango de Fechas</h3>
              <p><strong>${data.startDate}</strong> → <strong>${data.endDate}</strong></p>
            </div>
      `;

      if (data.reportsStats) {
        html += `
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #16a34a;">📊 Reporte de Pagos</h3>
              <ul style="list-style: none; padding: 0;">
                <li>✅ Rangos procesados: <strong>${data.reportsStats.processedRanges}</strong></li>
                <li>📝 Total de filas: <strong>${data.reportsStats.totalRows}</strong></li>
                <li>📋 Filas de datos: <strong>${data.reportsStats.dataRows}</strong></li>
              </ul>
            </div>
        `;
      }

      if (data.driversStats) {
        const successRate = ((data.driversStats.successful / data.driversStats.total) * 100).toFixed(1);
        html += `
            <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb;">🚗 Conductores Externos</h3>
              <ul style="list-style: none; padding: 0;">
                <li>✅ Exitosos: <strong>${data.driversStats.successful}</strong></li>
                <li>❌ Fallidos: <strong>${data.driversStats.failed}</strong></li>
                <li>📁 Total: <strong>${data.driversStats.total}</strong></li>
                <li>📈 Tasa de éxito: <strong>${successRate}%</strong></li>
              </ul>
        `;

        if (data.driversStats.errors && data.driversStats.errors.length > 0) {
          html += `
              <div style="margin-top: 15px; padding: 10px; background-color: #fee; border-left: 4px solid #ef4444;">
                <h4 style="margin-top: 0; color: #dc2626;">⚠️ Conductores con errores:</h4>
                <ul style="margin: 0;">
          `;
          data.driversStats.errors.forEach(err => {
            html += `<li style="font-size: 14px;">${err.driver}</li>`;
          });
          html += `
                </ul>
              </div>
          `;
        }

        html += `</div>`;
      }

      if (data.spreadsheetUrl) {
        html += `
            <div style="margin: 30px 0; text-align: center;">
              <a href="${data.spreadsheetUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                📊 Ver Reporte en Google Sheets
              </a>
            </div>
        `;
      }

      html += `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                        color: #6b7280; font-size: 12px;">
              <p>Este es un email automático generado por el sistema de procesamiento.</p>
            </div>
          </body>
        </html>
      `;

      const encodedMessage = createEmailMessage(
        NOTIFICATION_EMAILS,
        `✅ Proceso Completado - ${data.startDate} a ${data.endDate}`,
        html
      );

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log('✅ Email de notificación enviado');
    } catch (error: any) {
      console.error('❌ Error enviando email:', error.message);
    }
  },

  async sendProcessFailedEmail(data: {
    startDate: string;
    endDate: string;
    error: string;
  }): Promise<void> {
    try {
      const auth = getGmailAuth();
      const gmail = google.gmail({ version: 'v1', auth });

      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">❌ Proceso Fallido</h2>
            
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="margin-top: 0;">📅 Rango de Fechas</h3>
              <p><strong>${data.startDate}</strong> → <strong>${data.endDate}</strong></p>
              
              <h3>⚠️ Error:</h3>
              <p style="color: #991b1b; font-family: monospace; background-color: #fee; padding: 10px; border-radius: 4px;">
                ${data.error}
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; 
                        color: #6b7280; font-size: 12px;">
              <p>Por favor revisa los logs del sistema para más detalles.</p>
            </div>
          </body>
        </html>
      `;

      const encodedMessage = createEmailMessage(
        NOTIFICATION_EMAILS,
        `❌ Proceso Fallido - ${data.startDate} a ${data.endDate}`,
        html
      );

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log('✅ Email de error enviado');
    } catch (error: any) {
      console.error('❌ Error enviando email de error:', error.message);
    }
  },
};