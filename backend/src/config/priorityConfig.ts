// Maps complaint categories to priority levels and SLA hours
export const CATEGORY_PRIORITY: Record<string, { priority: string; slaHours: number }> = {
  'Water Leakage': { priority: 'emergency', slaHours: 12 },
  'Road Collapse': { priority: 'emergency', slaHours: 6 },
  'Electrical Hazard': { priority: 'emergency', slaHours: 6 },
  'Garbage': { priority: 'high', slaHours: 24 },
  'Drainage': { priority: 'high', slaHours: 24 },
  'Potholes': { priority: 'medium', slaHours: 168 },
  'Street Lights': { priority: 'medium', slaHours: 48 },
  'Water Supply': { priority: 'high', slaHours: 24 },
  'Others': { priority: 'low', slaHours: 120 },
};

export const DEFAULT_PRIORITY = { priority: 'medium', slaHours: 72 };

export type ComplaintPriority = 'emergency' | 'critical' | 'high' | 'medium' | 'low';
