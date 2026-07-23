// services/qrService.ts
// Uses built-in URL generation without external QR library
// QR will be generated on frontend using a QR library
export class QRService {
    static generateQRData(complaintId: string, mongoId: string): string {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${frontendUrl}/complaints/${mongoId}/scan?id=${complaintId}`;
    }

    static async generateSVG(data: string): Promise<string> {
        // Simple SVG-based QR placeholder (actual QR rendered on frontend)
        // Returns a data URL that can be stored
        return `qr:${data}`;
    }
}
