import type { StateTree, Store } from 'pinia';
import type { UnwrapRef } from 'vue';

export interface CrudState<T> extends StateTree {
  items: T[];
  total: number;
  currentItem?: T;
  loading: boolean;
}

// ==========================================
// 1. 查：获取列表 + 获取详情（两个独立函数）
// ==========================================
export interface FetchListApi<TQuery> {
  getList: (params?: TQuery) => Promise<any>;
}

export interface FetchListAction<TQuery> {
  fetchList: (query?: TQuery) => Promise<void>;
}

export function createFetchListAction<T, TQuery>(
  api: FetchListApi<TQuery>
): FetchListAction<TQuery> & ThisType<Store<string, CrudState<T>>> {
  return {
    async fetchList(this: Store<string, CrudState<T>>, query?: TQuery) {
      this.loading = true;
      try {
        const res = await api.getList(query);
        const { data } = res.data;
        this.items = data.data;
        this.total = data.total;
      } finally {
        this.loading = false;
      }
    },
  } as FetchListAction<TQuery> & ThisType<Store<string, CrudState<T>>>;
}

export interface FetchDetailApi {
  getDetail: (id: number) => Promise<any>;
}

export interface FetchDetailAction<T> {
  fetchDetail: (id: number) => Promise<T>;
  setCurrentItem: (item?: T) => void;
}

export function createFetchDetailAction<T>(
  api: FetchDetailApi
): FetchDetailAction<T> & ThisType<Store<string, CrudState<T>>> {
  return {
    async fetchDetail(this: Store<string, CrudState<T>>, id: number) {
      const res = await api.getDetail(id);
      this.currentItem = res.data.data;
      return res.data.data;
    },

    setCurrentItem(this: Store<string, CrudState<T>>, item?: T) {
      this.currentItem = item as UnwrapRef<T> | undefined;
    },
  } as FetchDetailAction<T> & ThisType<Store<string, CrudState<T>>>;
}

// ==========================================
// 2. 增：创建
// ==========================================
export interface CreateApi<TCreate> {
  create: (data: TCreate) => Promise<any>;
}

export interface CreateAction<TCreate> {
  create: (data: TCreate) => Promise<any>;
}

export function createCreateAction<T, TCreate>(
  api: CreateApi<TCreate>
): CreateAction<TCreate> & ThisType<Store<string, CrudState<T>>> {
  return {
    async create(this: Store<string, CrudState<T>>, data: TCreate) {
      const res = await api.create(data);
      return res.data.data;
    },
  } as CreateAction<TCreate> & ThisType<Store<string, CrudState<T>>>;
}

// ==========================================
// 3. 改：更新
// ==========================================
export interface UpdateApi<TUpdate> {
  update: (id: number, data: TUpdate) => Promise<any>;
}

export interface UpdateAction<TUpdate> {
  update: (id: number, data: TUpdate) => Promise<any>;
}

export function createUpdateAction<T, TUpdate>(
  api: UpdateApi<TUpdate>
): UpdateAction<TUpdate> & ThisType<Store<string, CrudState<T>>> {
  return {
    async update(this: Store<string, CrudState<T>>, id: number, data: TUpdate) {
      const res = await api.update(id, data);
      return res.data.data;
    },
  } as UpdateAction<TUpdate> & ThisType<Store<string, CrudState<T>>>;
}

// ==========================================
// 4. 删：删除
// ==========================================
export interface DeleteApi {
  delete: (id: number) => Promise<any>;
}

export interface DeleteAction {
  delete: (id: number) => Promise<void>;
}

export function createDeleteAction<T>(
  api: DeleteApi
): DeleteAction & ThisType<Store<string, CrudState<T>>> {
  return {
    async delete(this: Store<string, CrudState<T>>, id: number) {
      await api.delete(id);
    },
  } as DeleteAction & ThisType<Store<string, CrudState<T>>>;
}

// ==========================================
// 组合：完整 CRUD（向后兼容）
// ==========================================
export interface FullCrudApi<TCreate, TUpdate, TQuery>
  extends FetchListApi<TQuery>,
    CreateApi<TCreate>,
    FetchDetailApi,
    UpdateApi<TUpdate>,
    DeleteApi {}

export interface FullCrudActions<T, TCreate, TUpdate, TQuery>
  extends FetchListAction<TQuery>,
    CreateAction<TCreate>,
    FetchDetailAction<T>,
    UpdateAction<TUpdate>,
    DeleteAction {}

export function createCrudActions<T, TCreate, TUpdate, TQuery>(
  api: FullCrudApi<TCreate, TUpdate, TQuery>
): FullCrudActions<T, TCreate, TUpdate, TQuery> &
  ThisType<Store<string, CrudState<T>>> {
  return {
    ...createFetchListAction<T, TQuery>(api),
    ...createFetchDetailAction<T>(api),
    ...createCreateAction<T, TCreate>(api),
    ...createUpdateAction<T, TUpdate>(api),
    ...createDeleteAction<T>(api),
  } as FullCrudActions<T, TCreate, TUpdate, TQuery> &
    ThisType<Store<string, CrudState<T>>>;
}
