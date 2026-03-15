import { Notification } from '../models/Notification';

export class NotificationService {
    static async getNotifications(recipient: string, role: string) {
        let query: any = { recipient };

        if (role === 'admin') {
            query = {
                $or: [{ recipient: recipient }, { recipient: 'admin' }]
            };
        }

        return await Notification.find(query).sort({ createdAt: -1 }).limit(20);
    }

    static async markAsRead(id: string) {
        return await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    }

    static async markAllRead(recipient: string, role: string) {
        const query: any = { recipient };
        if (role === 'admin') {
            return await Notification.updateMany(
                { $or: [{ recipient }, { recipient: 'admin' }], read: false },
                { read: true }
            );
        }
        return await Notification.updateMany({ recipient, read: false }, { read: true });
    }
}
