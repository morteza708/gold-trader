import apiClient from './client';

export type SitePageSlug = 'about' | 'contact';

export interface SitePage {
  slug: SitePageSlug;
  slug_display: string;
  title: string;
  subtitle: string;
  body: string;
  hero_image_url: string | null;
  extra_image_url: string | null;
  section_one_title: string;
  section_one_body: string;
  section_two_title: string;
  section_two_body: string;
  address: string;
  phone: string;
  email: string;
  is_published: boolean;
  updated_at: string;
}

export type SitePageUpdatePayload = {
  title?: string;
  subtitle?: string;
  body?: string;
  section_one_title?: string;
  section_one_body?: string;
  section_two_title?: string;
  section_two_body?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_published?: boolean;
  hero_image?: File | null;
  extra_image?: File | null;
  clear_hero_image?: boolean;
  clear_extra_image?: boolean;
};

export const pagesAPI = {
  getPublic: async (slug: SitePageSlug): Promise<SitePage> => {
    const response = await apiClient.get<SitePage>(`/pages/${slug}/`);
    return response.data;
  },

  listAdmin: async (): Promise<SitePage[]> => {
    const response = await apiClient.get<SitePage[]>('/admin/pages/');
    return response.data;
  },

  getAdmin: async (slug: SitePageSlug): Promise<SitePage> => {
    const response = await apiClient.get<SitePage>(`/admin/pages/${slug}/`);
    return response.data;
  },

  updateAdmin: async (
    slug: SitePageSlug,
    data: SitePageUpdatePayload
  ): Promise<{ message: string; page: SitePage }> => {
    const formData = new FormData();
    const textFields: (keyof SitePageUpdatePayload)[] = [
      'title',
      'subtitle',
      'body',
      'section_one_title',
      'section_one_body',
      'section_two_title',
      'section_two_body',
      'address',
      'phone',
      'email',
    ];

    for (const key of textFields) {
      const value = data[key];
      if (typeof value === 'string') {
        formData.append(key, value);
      }
    }

    if (typeof data.is_published === 'boolean') {
      formData.append('is_published', data.is_published ? 'true' : 'false');
    }
    if (data.hero_image instanceof File) {
      formData.append('hero_image', data.hero_image);
    }
    if (data.extra_image instanceof File) {
      formData.append('extra_image', data.extra_image);
    }
    if (data.clear_hero_image) {
      formData.append('clear_hero_image', 'true');
    }
    if (data.clear_extra_image) {
      formData.append('clear_extra_image', 'true');
    }

    const response = await apiClient.put<{ message: string; page: SitePage }>(
      `/admin/pages/${slug}/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
