import apiClient from './client';

export interface ReygiriResult {
  packet_number: number | string;
  karat: number | string | null;
  name: string;
  announced_at: string;
  companion_code: number | string | null;
}

export interface ReygiriLookupResponse {
  results: ReygiriResult[];
  count: number;
  packet_number: string;
  seri: string | null;
  archive: boolean;
}

export const reygiriAPI = {
  lookup: async (data: {
    packet_number: string;
    seri?: string;
    archive?: boolean;
  }): Promise<ReygiriLookupResponse> => {
    const response = await apiClient.post<ReygiriLookupResponse>('/reygiri/lookup/', {
      packet_number: data.packet_number,
      seri: data.seri || '',
      archive: !!data.archive,
    });
    return response.data;
  },
};
