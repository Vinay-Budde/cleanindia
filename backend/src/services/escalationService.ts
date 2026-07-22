import { Complaint } from '../models/Complaint';
import { User } from '../models/User';
import { Notification } from '../models/Notification';

const ESCALATION_ROLES = ['field_inspector', 'ward_officer', 'zone_officer', 'commissioner'];

export class EscalationService {
    /**
     * Escalate a complaint to the next officer level.
     * Level 0: field_inspector → 1: ward_officer → 2: zone_officer → 3: commissioner
     */
    static async escalate(complaintId: string): Promise<void> {
        const complaint = await Complaint.findById(complaintId);
        if (!complaint) return;
        if (complaint.status === 'resolved' || complaint.status === 'closed') return;

        const newLevel = Math.min(complaint.escalationLevel + 1, 3);
        const targetRole = ESCALATION_ROLES[newLevel];

        // Find officer with target role in the same municipality
        const officer = await User.findOne({
            role: targetRole,
            municipalityId: complaint.assignedMunicipality,
            isActive: true,
        }).lean();

        const reason = `SLA breached — escalated from level ${complaint.escalationLevel} to ${newLevel} (${targetRole})`;

        complaint.escalationLevel = newLevel;
        complaint.escalationHistory.push({
            escalatedTo: targetRole,
            escalatedToUserId: officer?._id as any,
            reason,
            at: new Date(),
        });

        // Assign to escalation officer if found
        if (officer) {
            complaint.assignedOfficer = officer._id as any;
        }

        // Add timeline entry
        complaint.timeline.push({
            action: 'escalated',
            by: 'System',
            role: 'system',
            comment: reason,
            at: new Date(),
        });

        await complaint.save();

        // Notify the escalated-to officer
        if (officer) {
            await new Notification({
                recipient: (officer as any).email,
                message: `Complaint "${complaint.title}" has been escalated to you due to SLA breach.`,
                type: 'warning',
            }).save();
        }
    }

    /**
     * Check all SLA-breached complaints and escalate them.
     */
    static async runEscalationCycle(): Promise<void> {
        const breachedComplaints = await Complaint.find({
            slaBreached: true,
            escalationLevel: { $lt: 3 },
            status: { $nin: ['resolved', 'closed'] },
        }).select('_id');

        for (const c of breachedComplaints) {
            await this.escalate(c._id.toString());
        }
    }
}
