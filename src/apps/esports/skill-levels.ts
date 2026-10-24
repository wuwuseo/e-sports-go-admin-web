import axios from 'axios';
import type { ApiResponse } from '@/types/api';

// 技能等级：后端专用表驱动（在「技能等级」页维护，整体保存，列表序即高低序），
// 配置顺序即高低序。管理端各处（商品门槛 / 考核目标 / 结算与提成维度 / 文案展示）
// 统一从公开读接口拉取，模块级缓存一次（保存配置后调用方须 force 刷新）。

export interface SkillLevel {
  code: string;
  name: string;
  rank: number;
}

let cache: SkillLevel[] | null = null;
let pending: Promise<SkillLevel[]> | null = null;

export async function fetchSkillLevels(force = false): Promise<SkillLevel[]> {
  if (!force && cache) return cache;
  if (!force && pending) return pending;
  pending = axios
    .get<ApiResponse<{ items: SkillLevel[] }>>('/api/v1/esports/skill-levels')
    .then(({ data }) => {
      cache = data.data?.items ?? [];
      return cache;
    })
    .catch(() => {
      // 拉取失败按空列表处理：调用方回落「原样展示编码」，不阻塞页面。
      cache = [];
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

// skillLevelName 编码 → 显示名；不在配置（含失效档）原样回显编码。
export function skillLevelName(
  levels: SkillLevel[],
  code: string | null | undefined
): string {
  if (!code) return '';
  return levels.find((item) => item.code === code)?.name ?? code;
}
