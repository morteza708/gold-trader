import apiClient from './client';

export type SupportChannelType =
  | 'phone'
  | 'phone_secondary'
  | 'landline'
  | 'whatsapp'
  | 'telegram'
  | 'email';

export interface SupportChannel {
  type: SupportChannelType;
  label: string;
  value: string;
  url: string | null;
}

export interface SupportHoursRow {
  day: string;
  day_label: string;
  hours_label: string;
}

export interface SupportInfo {
  enabled: boolean;
  is_online: boolean;
  hours_enabled: boolean;
  show_floating_button: boolean;
  show_on_public_site: boolean;
  status_label: string;
  message: string;
  hours_summary: SupportHoursRow[];
  next_open_at: string | null;
  next_open_label: string | null;
  channels: SupportChannel[];
  has_any_channel: boolean;
}

export interface SupportSettings {
  support_enabled: boolean;
  support_phone: string;
  support_phone_secondary: string;
  support_landline: string;
  whatsapp_number: string;
  telegram_username: string;
  support_email: string;
  support_hours_enabled: boolean;
  support_hours: Record<string, { enabled: boolean; start: string; end: string }>;
  support_offline_message: string;
  support_online_message: string;
  support_show_floating_button: boolean;
  support_show_on_public_site: boolean;
  support_preview?: SupportInfo;
}

export const DEFAULT_SUPPORT_HOURS: SupportSettings['support_hours'] = {
  sat: { enabled: true, start: '09:00', end: '18:00' },
  sun: { enabled: true, start: '09:00', end: '18:00' },
  mon: { enabled: true, start: '09:00', end: '18:00' },
  tue: { enabled: true, start: '09:00', end: '18:00' },
  wed: { enabled: true, start: '09:00', end: '18:00' },
  thu: { enabled: true, start: '09:00', end: '13:00' },
  fri: { enabled: false, start: '09:00', end: '18:00' },
};

export const supportAPI = {
  getInfo: async (): Promise<SupportInfo> => {
    const response = await apiClient.get<SupportInfo>('/support/info/');
    return response.data;
  },
};
