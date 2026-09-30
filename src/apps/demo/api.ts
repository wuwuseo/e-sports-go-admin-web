import axios from 'axios';

export interface DemoItem {
  id: number;
  title: string;
}

export function getDemoItems() {
  return axios.get<DemoItem[]>('/api/v1/demo/items');
}
