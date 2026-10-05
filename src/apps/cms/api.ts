import axios from 'axios';
import type { ApiResponse } from '@/types/api';

export type CmsKind = 'article' | 'page';
export type CmsFormat = 'markdown' | 'html' | 'image';

export interface CmsContent {
  id: number;
  title: string;
  kind: CmsKind;
  format: CmsFormat;
  content: string;
  image: string;
  category_id: number;
  status: number;
  created_at: string;
  updated_at: string;
}

export type CmsContentInput = Omit<
  CmsContent,
  'id' | 'created_at' | 'updated_at'
>;

export interface CmsCategory {
  id: number;
  name: string;
  status: number;
  created_at: string;
}

export type CmsCategoryInput = Pick<CmsCategory, 'name' | 'status'>;

export interface CmsList {
  list: CmsContent[];
  total: number;
  page: number;
  page_size: number;
}

const base = '/api/v1/cms/admin';

export const listContents = (params: Record<string, string | number>) =>
  axios.get<ApiResponse<CmsList>>(`${base}/contents`, { params });

export const getContent = (id: number) =>
  axios.get<ApiResponse<CmsContent>>(`${base}/contents/${id}`);

export const createContent = (data: CmsContentInput) =>
  axios.post<ApiResponse<CmsContent>>(`${base}/contents`, data);

export const updateContent = (id: number, data: CmsContentInput) =>
  axios.put<ApiResponse<CmsContent>>(`${base}/contents/${id}`, data);

export const deleteContent = (id: number) =>
  axios.delete<ApiResponse<null>>(`${base}/contents/${id}`);

export const listCategories = () =>
  axios.get<ApiResponse<CmsCategory[]>>(`${base}/categories`);

export const createCategory = (data: CmsCategoryInput) =>
  axios.post<ApiResponse<CmsCategory>>(`${base}/categories`, data);

export const updateCategory = (id: number, data: CmsCategoryInput) =>
  axios.put<ApiResponse<CmsCategory>>(`${base}/categories/${id}`, data);

export const deleteCategory = (id: number) =>
  axios.delete<ApiResponse<null>>(`${base}/categories/${id}`);
