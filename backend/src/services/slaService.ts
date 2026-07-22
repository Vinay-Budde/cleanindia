import { Complaint } from '../models/Complaint';
import { CATEGORY_PRIORITY, DEFAULT_PRIORITY } from '../config/priorityConfig';

export class SLAService {
    static getSLAHours(category: string): number {
        const config = CATEGORY_PRIORITY[category] || DEFAULT_PRIORITY;
        return config.slaHours;
    }

    static computeDeadline(category: string, fromDate: Date = new Date()): Date {
        const hours = this.getSLAHours(category);
        return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
    }

    /**
     * Mark all overdue complaints as SLA breached.
     * Call this from a scheduled job (e.g., every 15 min).
     */
    static async checkAndMarkBreaches(): Promise<number> {
        const result = await Complaint.updateMany(
            {
                slaDeadline: { $lt: new Date() },
                slaBreached: false,
                status: { $nin: ['resolved', 'closed'] },
            },
            { $set: { slaBreached: true } }
        );
        return result.modifiedCount;
    }

    /**
     * Get SLA status for a complaint.
     */
    static getSLAStatus(complaint: any): { status: 'ok' | 'warning' | 'breached'; hoursLeft: number } {
        if (!complaint.slaDeadline) return { status: 'ok', hoursLeft: 0 };

        const msLeft = new Date(complaint.slaDeadline).getTime() - Date.now();
        const hoursLeft = msLeft / (1000 * 60 * 60);

        if (msLeft < 0) return { status: 'breached', hoursLeft: Math.round(hoursLeft) };
        if (hoursLeft < 6) return { status: 'warning', hoursLeft: Math.round(hoursLeft) };
        return { status: 'ok', hoursLeft: Math.round(hoursLeft) };
    }
}
