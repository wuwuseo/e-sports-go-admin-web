import axios from 'axios';
import type {
  ApiResponse,
  CreateDepartmentPayload,
  Department,
  DepartmentTreeNode,
  DepartmentTreeQuery,
  UpdateDepartmentPayload,
} from '@/types/api';

const DEPARTMENT_BASE_URL = '/api/v1/admin/auth/departments';

export function createDepartment(data: CreateDepartmentPayload) {
  return axios.post<ApiResponse<Department>>(DEPARTMENT_BASE_URL, data);
}

export function getDepartmentTree(params?: DepartmentTreeQuery) {
  return axios.get<ApiResponse<DepartmentTreeNode[]>>(
    `${DEPARTMENT_BASE_URL}/tree`,
    { params }
  );
}

export function getDepartmentDetail(id: number) {
  return axios.get<ApiResponse<Department>>(`${DEPARTMENT_BASE_URL}/${id}`);
}

export function updateDepartment(id: number, data: UpdateDepartmentPayload) {
  return axios.put<ApiResponse<Department>>(
    `${DEPARTMENT_BASE_URL}/${id}`,
    data
  );
}

export function deleteDepartment(id: number) {
  return axios.delete<ApiResponse<null>>(`${DEPARTMENT_BASE_URL}/${id}`);
}
