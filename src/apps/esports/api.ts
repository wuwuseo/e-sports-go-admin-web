import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types/api';

export interface EsportsProductCategory {
  id: number;
  code: string;
  name: string;
  game: string;
  sort_order: number;
  status: 'enabled' | 'disabled';
  version: number;
}

export type CategoryInput = Omit<EsportsProductCategory, 'id' | 'version'>;

// 技能等级已改为系统配置驱动：编码不再受固定枚举约束，
// 选项与显示名统一从 /api/v1/esports/skill-levels 拉取（见 skill-levels.ts）。
export type PlayerLevel = string;

export interface EsportsSku {
  id: number;
  code: string;
  title: string;
  service_type: 'play' | 'teaching' | 'entertainment';
  category_id: number | null;
  description: string;
  // 商品内容图片（多张）：站内 /uploads/ 公开路径或 http/https 绝对地址；未设置为 null。
  content: string[] | null;
  unit_price_cents: number;
  min_unit_price_cents: number;
  adjustment_approval_bp: number;
  service_units: number;
  service_unit_name: string;
  // 商品 成本（分，）：可空，未登记为 null；仅授权角色能读到真实值。
  cost_cents: number | null;
  // 单次服务时长（分钟，）：用于预约时段重叠与容量判定，0 表示未配置。
  service_duration_minutes: number;
  // 所需技能等级：陪玩等级不得低于该值。
  required_level: PlayerLevel;
  // 结单要求：引用生效结单规则的 code，留空按游戏 / 全局规则回落。
  close_rule_code: string;
  quota_total: number;
  quota_reserved: number;
  quota_sold: number;
  sort_order: number;
  status: 'draft' | 'on_sale' | 'off_sale';
}

// 编辑成本价时，未传表示保持不变，null 表示清空。
export interface SkuInput
  extends Omit<
    EsportsSku,
    'id' | 'quota_reserved' | 'quota_sold' | 'cost_cents'
  > {
  cost_cents?: number | null;
}

// 编辑商品不提交 code（编码创建后不可变）。
export type SkuUpdateInput = Omit<SkuInput, 'code'>;

export type CustomerSource = 'manual' | 'wecom' | 'self' | 'import';

// 风险标记：normal 正常 / watch 疑似滥用复核（自动，不自动处罚）/ restricted 限制自助下单（人工）。
export type CustomerRiskStatus = 'normal' | 'watch' | 'restricted';
export type CustomerFollowStatus =
  | 'new'
  | 'following'
  | 'pending'
  | 'dormant'
  | 'closed';

export interface EsportsCustomer {
  id: number;
  display_name: string;
  owner_admin_id: number | null;
  age_status: 'unknown' | 'adult' | 'minor';
  // 客户档案扩展：手机号、消费偏好、标签、建档来源、跟进状态与最近联系时间。
  phone: string;
  // 生日（月-日，如 03-15），用于生日礼遇待办；空表示未填。
  birthday: string;
  consumption_preference: string;
  tags: string[] | null;
  source: CustomerSource;
  follow_status: CustomerFollowStatus;
  last_contact_at: string | null;
  // 是否允许客户自助下单。
  self_order_enabled: boolean;
  member_level_code: string;
  // 风险标记：normal 正常 / watch 疑似滥用复核（自动，不自动处罚）/ restricted 限制自助下单（人工）。
  risk_status: CustomerRiskStatus;
  risk_reason: string;
  risk_marked_at: string | null;
  version: number;
}

export interface AgeCheck {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_version: number;
  requested_by_admin_id: number;
  claimed_age_status: 'adult' | 'minor';
  evidence_attachment_id: number;
  created_at: string;
}

export interface AgeReviewInput {
  decision: 'approve' | 'reject';
  review_note: string;
  expected_customer_version: number;
}

export interface EsportsOrder {
  id: number;
  order_no: string;
  customer_id: number;
  product_id: number;
  // 下单时的商品 / 规格名快照：读取时优先于 商品 实时标题，
  // 历史单可能为空串，调用方回落实时 商品 标题。
  product_code: string;
  product_name: string;
  spec_name: string;
  channel_source: CustomerSource;
  entry_point:
    | 'cs_pc'
    | 'cs_mobile'
    | 'wecom_sidebar'
    | 'customer_self'
    | 'admin_backfill';
  quantity: number;
  unit_price_cents: number;
  min_unit_price_cents: number;
  adjustment_approval_bp: number;
  discount_cents: number;
  manual_adjust_cents: number;
  payable_cents: number;
  promised_service_units: number;
  // 加钟累计：由「已确认」的加钟单累加，payable_cents 保持原报价快照。
  addon_cents: number;
  addon_units: number;
  required_seats: number;
  // 所需技能等级快照。
  required_level: PlayerLevel;
  quote_version: number;
  version: number;
  fulfillment_status: string;
  payment_status: string;
  // 付款方式标记。
  payment_channel: string;
  // 优先派单权「独占优先通知」窗口（业务口径）。
  priority_notice_status: 'none' | 'pending' | 'released' | 'accepted';
  priority_notice_until: string | null;
  priority_game: string;
  priority_release_reason: string;
  // 客户指定陪玩：有值时订单走指派流程，不进入优先通知窗口。
  preferred_player_id: number | null;
  refund_status: string;
  appointment_status: string;
  // 预约档期：requested_start_at 为预约开始时间，deadline 为档期确认时限。
  requested_start_at: string | null;
  appointment_confirmation_deadline: string | null;
  // 服务时长快照（分钟，）：0 表示 商品 未配置，容量判定回落保守口径。
  service_duration_minutes: number;
  // 已知渠道成本：结单计提客服提成时从可分基数扣除。
  channel_cost_cents: number;
  // 单笔手动指定分成规则（五级优先级最高一级）：仅未锁定成员规则前可设。
  manual_commission_rule_id: number | null;
  manual_commission_rule_set_by_admin_id: number | null;
  manual_commission_rule_set_at: string | null;
  // 存单：仅订单上的冻结标记，不改变履约状态、不释放名额。
  deposit_status: 'none' | 'frozen';
  deposited_at: string | null;
  payment_deadline: string;
  created_at: string;
}

export interface OrderInput {
  customer_id: number;
  product_id: number;
  quantity: number;
  // 客户指定陪玩：可选；留空则由客服指派，不留空则不进入优先通知窗口。
  preferred_player_id?: number;
  // 多陪玩（多人单）：第一个为主陪玩，其余自动指派到剩余席位；上限 = 商品席位数。
  // 与 preferred_player_id 同时传时以本数组为准。
  preferred_player_ids?: number[];
  // 经授权的人工调整：金额（分，可正可负）非零时须同时给出 4–255 字原因，
  // 且绝对值不得超过 商品 免审额度（adjustment_approval_bp），否则须先落单再走改价审批。
  manual_adjust_cents?: number;
  manual_adjust_reason?: string;
  // 负责客服：留空默认建单人；显式指定时须为启用中的管理员。
  responsible_admin_id?: number;
}

// 报单页报价试算：GET /admin/products?quote_customer_id=&quote_quantity= 的
// quotes 段，不落单即可看到会员折扣、应付、服务量与结单要求。
export interface SkuQuotePreview {
  product_id: number;
  quantity: number;
  member_level_code: string;
  member_discount_bps: number;
  unit_price_cents: number;
  subtotal_cents: number;
  member_discount_cents: number;
  payable_cents: number;
  promised_service_units: number;
  service_unit_name: string;
  close_rule_code: string;
  per_seat_service_units: number;
  required_seats: number;
}

export interface SkuQuoteResult {
  items: EsportsSku[];
  quotes: Record<string, SkuQuotePreview>;
}

// 管理员历史订单补录（entry_point=admin_backfill）：为历史成交生成订单，不计入自助下单流程。
export interface BackfillOrderInput {
  customer_id: number;
  product_id: number;
  quantity: number;
  // 实际成交单价（分）：留 0 表示按 商品 当前商品价。
  unit_price_cents: number;
  // 实际成交时间（RFC3339）：不晚于当前、不早于 5 年前。
  settled_at: string;
  // 已完成单必须已收款：补录单一律按已收款登记，未收款的历史单应补录为「已取消」。
  fulfillment_status: 'completed' | 'cancelled';
  payment_status: 'paid';
  // 补录原因（4-255 字）。
  reason: string;
  // 是否计入客服提成：false 只跳过客服提成，陪玩分成与成长值始终计提。
  // 注意字段名须与后端 backfillOrderInput 的 count_cs_commission 一致。
  count_cs_commission: boolean;
}

export interface RepriceInput {
  expected_version: number;
  quantity: number;
  manual_adjust_cents: number;
  reason: string;
  approval_id?: number;
}

export interface RepriceQuote {
  order_id: number;
  quote_version: number;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  manual_adjust_cents: number;
  payable_cents: number;
  promised_service_units: number;
  min_unit_price_cents: number;
  approval_threshold_bp: number;
  requires_approval: boolean;
}

export interface PriceAdjustment {
  id: number;
  order_id: number;
  order_version: number;
  quantity: number;
  manual_adjust_cents: number;
  payable_cents: number;
  requested_by_admin_id: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'consumed';
  reviewed_by_admin_id: number | null;
  review_note: string;
  created_at: string;
}

export interface RescheduleInput {
  expected_version: number;
  start_at: string;
  reason: string;
}

export type WalletAccountType = 'customer_balance' | 'player_catfood';

// 钱包展示配置：后端按账户类型下发展示名称 / 图标 / 说明 / 单位与换算倍率。
export interface WalletDisplay {
  // 展示名称，如 "账户余额" / "猫粮"。
  display_name: string;
  // 图标标识，如 "wallet" / "cat"，前端需映射到实际图标组件，映射不到仅显示文字。
  icon: string;
  // 说明文案。
  description: string;
  // 单位名，如 "元" / "猫粮"。
  unit_name: string;
  // 每单位多少分，如 100（1 元 = 100 分）。
  unit_cents: number;
  // 按倍率换算后的展示金额（两位小数字符串，后端已算好，仅余额有值）。
  display_amount: string;
}

export interface WalletAccount {
  account_type: WalletAccountType;
  owner_id: number;
  display_name: string;
  status: string;
  principal_cents: number;
  bonus_cents: number;
  balance_cents: number;
  // 展示配置：后端钱包账户视图返回，旧数据可能缺失。
  display?: WalletDisplay;
}

export interface WalletTx {
  id: number;
  tx_no: string;
  account_type: WalletAccountType;
  owner_id: number;
  entry_type: string;
  principal_delta_cents: number;
  bonus_delta_cents: number;
  source_type: string;
  source_id: string;
  operator_id: number | null;
  note: string;
  // 充值活动规则快照与赠送到期时间（仅按活动充值的流水有值）。
  rule_snapshot: Record<string, unknown> | null;
  bonus_expires_at: string | null;
  created_at: string;
}

export interface WalletEntryInput {
  principal_cents: number;
  bonus_cents: number;
  note: string;
}

export interface EsportsDispatchSeat {
  id: number;
  order_id: number;
  seat_index: number;
  player_id: number | null;
  source: 'assign' | 'grab' | 'fixed_team' | 'temp_team';
  status:
    | 'open'
    | 'invited'
    | 'accepted'
    | 'rejected'
    | 'expired'
    | 'revoked'
    | 'released';
  invited_by_admin_id: number | null;
  expires_at: string | null;
  responded_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

// 看板顶部的客服在线摘要：presence 取 presence 表口径（online / busy / offline），
// 无 presence 档案时后端按「最近一次管理员操作」推导为 online / offline。
export interface DispatchBoardAdmin {
  admin_id: number;
  username: string;
  nickname: string;
  presence: 'online' | 'busy' | 'offline';
  online: boolean;
  last_active_at: string | null;
}

export interface EsportsDispatchBoard {
  pending_dispatch: EsportsOrder[];
  public_pool: EsportsOrder[];
  grabbing: EsportsOrder[];
  pending_acceptance: EsportsOrder[];
  accepted: EsportsOrder[];
  in_service: EsportsOrder[];
  pending_close: EsportsOrder[];
  abnormal: EsportsOrder[];
  online_players: number;
  // 各客服及其在线状态。
  admins: DispatchBoardAdmin[];
  // 会员订单优先：待派单池 / 公共池中属于会员优先等级客户的订单 ID（后端已置顶）。
  member_priority_order_ids: number[];
  // 会员专属通道（P1-11）：因「专属通道」权益二级置顶的订单 ID
  // （排在会员优先档之后、普通订单之前）；同时命中会员优先的订单只出现在上一字段。
  member_dedicated_channel_order_ids: number[];
  // 公共池脱敏：非超管在公共池只看到脱敏摘要，客户身份与金额被掩码。
  masked_public_pool_ids: number[];
}

const base = '/api/v1/esports/admin';

// 客户风控：风险名单与人工标记 / 解除。
export const listRiskCustomers = () =>
  axios.get<ApiResponse<EsportsCustomer[]>>(`${base}/risk-customers`);

export const markCustomerRisk = (
  customerId: number,
  status: CustomerRiskStatus,
  reason: string
) =>
  axios.post<ApiResponse<EsportsCustomer>>(
    `${base}/customers/${customerId}/risk`,
    { status, reason }
  );

export interface SkuListParams {
  // 关键词同时匹配商品名与编码（后端 adminSkus）。
  keyword?: string;
  status?: EsportsSku['status'];
  limit?: number;
}

export const listSkus = (params?: SkuListParams) =>
  axios.get<ApiResponse<EsportsSku[]>>(
    `${base}/products`,
    params ? { params } : undefined
  );

// 带报价试算的商品列表：响应由数组变为 { items, quotes }，
// 供报单页在选定客户 / 份数后逐商品展示会员折扣、应付、服务量与结单要求。
export const listSkusWithQuote = (customerId: number, quantity: number) =>
  axios.get<ApiResponse<SkuQuoteResult>>(`${base}/products`, {
    params: { quote_customer_id: customerId, quote_quantity: quantity },
  });

export const createSku = (input: SkuInput) =>
  axios.post<ApiResponse<EsportsSku>>(`${base}/products`, input);

export const updateSku = (id: number, input: SkuUpdateInput) =>
  axios.put<ApiResponse<EsportsSku>>(`${base}/products/${id}`, input);

export const listCategories = () =>
  axios.get<ApiResponse<EsportsProductCategory[]>>(`${base}/categories`);

export const createCategory = (input: CategoryInput) =>
  axios.post<ApiResponse<EsportsProductCategory>>(`${base}/categories`, input);

export const updateCategory = (id: number, input: CategoryInput) =>
  axios.put<ApiResponse<EsportsProductCategory>>(
    `${base}/categories/${id}`,
    input
  );

export const deleteCategory = (id: number) =>
  axios.delete<ApiResponse<{ id: number }>>(`${base}/categories/${id}`);

// 分页响应封装：仅在调用方显式传 page / page_size 时出现。
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// 客户列表查询参数：keyword 同时模糊匹配 display_name / phone。
export interface EsportsCustomerListParams {
  keyword?: string;
  follow_status?: CustomerFollowStatus;
  risk_status?: CustomerRiskStatus;
  limit?: number;
  offset?: number;
  page?: number;
  page_size?: number;
}

export function listCustomers(): Promise<
  AxiosResponse<ApiResponse<EsportsCustomer[]>>
>;
export function listCustomers(
  params: EsportsCustomerListParams & { page: number }
): Promise<AxiosResponse<ApiResponse<PageResult<EsportsCustomer>>>>;
export function listCustomers(
  params?: EsportsCustomerListParams
): Promise<
  AxiosResponse<ApiResponse<EsportsCustomer[] | PageResult<EsportsCustomer>>>
>;
export function listCustomers(params?: EsportsCustomerListParams) {
  return axios.get<
    ApiResponse<EsportsCustomer[] | PageResult<EsportsCustomer>>
  >(`${base}/customers`, params ? { params } : undefined);
}

export const createCustomer = (displayName: string) =>
  axios.post<ApiResponse<EsportsCustomer>>(`${base}/customers`, {
    display_name: displayName,
  });

export const submitAgeCheck = (
  customerId: number,
  claimedAgeStatus: 'adult' | 'minor',
  evidenceAttachmentId: number
) =>
  axios.post<ApiResponse<{ id: number; status: string }>>(
    `${base}/customers/${customerId}/age-checks`,
    {
      claimed_age_status: claimedAgeStatus,
      evidence_attachment_id: evidenceAttachmentId,
    }
  );

export const listPendingAgeChecks = () =>
  axios.get<ApiResponse<AgeCheck[]>>(`${base}/age-checks`);

export const reviewAgeCheck = (checkId: number, input: AgeReviewInput) =>
  axios.post<ApiResponse<{ id: number; status: string }>>(
    `${base}/age-checks/${checkId}/review`,
    input
  );

// 订单列表查询参数：不带 page / page_size 时后端仍返回数组（保持旧调用方兼容），
// 带 page 时返回 { items, total, page, page_size }，两种形态都会带 X-Total-Count 响应头。
export interface EsportsOrderListParams {
  customer_id?: number;
  keyword?: string;
  fulfillment_status?: string;
  payment_status?: string;
  limit?: number;
  offset?: number;
  page?: number;
  page_size?: number;
}

export function listOrders(): Promise<
  AxiosResponse<ApiResponse<EsportsOrder[]>>
>;
export function listOrders(
  params: EsportsOrderListParams & { page: number }
): Promise<AxiosResponse<ApiResponse<PageResult<EsportsOrder>>>>;
export function listOrders(
  params?: EsportsOrderListParams
): Promise<
  AxiosResponse<ApiResponse<EsportsOrder[] | PageResult<EsportsOrder>>>
>;
export function listOrders(params?: EsportsOrderListParams) {
  return axios.get<ApiResponse<EsportsOrder[] | PageResult<EsportsOrder>>>(
    `${base}/orders`,
    params ? { params } : undefined
  );
}

export const getOrder = (id: number) =>
  axios.get<ApiResponse<EsportsOrder>>(`${base}/orders/${id}`);

// 订单授权协作：负责人把订单的**查看**权限授予其他客服（不转移负责关系，写操作仍仅负责人可执行）。
export interface EsportsOrderCollaborator {
  id: number;
  order_id: number;
  admin_id: number;
  granted_by_admin_id: number | null;
  created_at: string;
}

export const listOrderCollaborators = (orderId: number) =>
  axios.get<ApiResponse<EsportsOrderCollaborator[]>>(
    `${base}/orders/${orderId}/collaborators`
  );

export const addOrderCollaborator = (orderId: number, adminId: number) =>
  axios.post<ApiResponse<EsportsOrderCollaborator>>(
    `${base}/orders/${orderId}/collaborators`,
    { admin_id: adminId }
  );

export const removeOrderCollaborator = (orderId: number, adminId: number) =>
  axios.delete<ApiResponse<{ order_id: number; admin_id: number }>>(
    `${base}/orders/${orderId}/collaborators/${adminId}`
  );

export const createOrder = (input: OrderInput, idempotencyKey: string) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders`, input, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

// 管理员历史订单补录：生成历史订单（entry_point=admin_backfill），返回订单视图对象。
export const backfillOrder = (
  input: BackfillOrderInput,
  idempotencyKey: string
) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/backfill`, input, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const repriceOrder = (id: number, input: RepriceInput) =>
  axios.put<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/quote`, input);

export const requestPriceAdjustment = (
  id: number,
  input: RepriceInput & { request_key: string }
) =>
  axios.post<ApiResponse<PriceAdjustment>>(
    `${base}/orders/${id}/price-adjustments`,
    input
  );

export const listPriceAdjustments = (status?: PriceAdjustment['status']) =>
  axios.get<ApiResponse<PriceAdjustment[]>>(`${base}/price-adjustments`, {
    params: { status },
  });

export const decidePriceAdjustment = (
  id: number,
  approve: boolean,
  note: string
) =>
  axios.post<ApiResponse<PriceAdjustment>>(
    `${base}/price-adjustments/${id}/decision`,
    { approve, note }
  );

export const previewReprice = (id: number, input: RepriceInput) =>
  axios.post<ApiResponse<RepriceQuote>>(
    `${base}/orders/${id}/quote-preview`,
    input
  );

export const cancelOrder = (id: number, reason: string) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/cancel`, {
    reason,
  });

export const rescheduleOrder = (id: number, input: RescheduleInput) =>
  axios.put<ApiResponse<EsportsOrder>>(
    `${base}/orders/${id}/appointment`,
    input
  );

// 确认预约档期：request → confirmed，含资源核验；未确认档期不允许派单。
export const confirmOrderAppointment = (id: number) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${id}/appointment/confirm`
  );

export const setOrderChannelCost = (id: number, channelCostCents: number) =>
  axios.put<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/channel-cost`, {
    channel_cost_cents: channelCostCents,
  });

export const payOrderWithBalance = (id: number) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/pay-by-balance`);

// 单笔手动指定分成规则：ruleId=0 表示清除，恢复逐级回落。
export const setOrderManualCommissionRule = (id: number, ruleId: number) =>
  axios.put<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/commission-rule`, {
    rule_id: ruleId,
  });

// 存单：把已付款订单冻结存起来；恢复清除冻结标记。
export const depositOrder = (id: number) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/deposit`);

export const restoreOrder = (id: number) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/restore`);

// 批次分摊明细：每笔消费动用了哪些批次。
export interface LedgerAllocation {
  id: number;
  account_type: string;
  account_id: string;
  consume_source_type: string;
  consume_source_id: string;
  batch_source_type: string;
  batch_source_id: string;
  amount_cents: number;
  created_at: string;
}

// 批次分摊明细：account_type 与 account_id 均为**后端必填**，
// 任一为空后端直接返回参数错误（不会返回空数组）。
export const listLedgerAllocations = (accountType: string, accountId: string) =>
  axios.get<ApiResponse<LedgerAllocation[]>>(`${base}/ledger-allocations`, {
    params: { account_type: accountType, account_id: accountId },
  });

export const listWallets = (accountType: WalletAccountType, keyword = '') =>
  axios.get<ApiResponse<WalletAccount[]>>(`${base}/wallets`, {
    params: { account_type: accountType, keyword },
  });

// 钱包展示口径：按账户类型返回完整展示配置，管理端页签标题 /
// 账户类型选项跟随「钱包展示配置」（系统配置 app.esports.wallet_display）动态渲染。
export const getWalletDisplayConfig = () =>
  axios.get<ApiResponse<Record<WalletAccountType, WalletDisplay>>>(
    `${base}/wallets/display`
  );

export const listWalletTransactions = (
  accountType: WalletAccountType,
  ownerId: number
) =>
  axios.get<ApiResponse<WalletTx[]>>(
    `${base}/wallets/${ownerId}/transactions`,
    { params: { account_type: accountType } }
  );

export const rechargeWallet = (
  accountType: WalletAccountType,
  ownerId: number,
  input: WalletEntryInput,
  idempotencyKey: string
) =>
  axios.post<ApiResponse<WalletAccount>>(
    `${base}/wallets/${ownerId}/recharge`,
    input,
    {
      params: { account_type: accountType },
      headers: { 'Idempotency-Key': idempotencyKey },
    }
  );

export const adjustWallet = (
  accountType: WalletAccountType,
  ownerId: number,
  input: WalletEntryInput,
  idempotencyKey: string
) =>
  axios.post<ApiResponse<WalletAccount>>(
    `${base}/wallets/${ownerId}/adjust`,
    input,
    {
      params: { account_type: accountType },
      headers: { 'Idempotency-Key': idempotencyKey },
    }
  );

// 看板排序：'remind_priority' 按催单优先级降序；其余取值后端明确返回 400。
export type DispatchBoardSort = 'remind_priority';

export const getDispatchBoard = (sort?: DispatchBoardSort) =>
  axios.get<ApiResponse<EsportsDispatchBoard>>(`${base}/dispatch/board`, {
    params: sort ? { sort } : undefined,
  });

export const listOrderSeats = (orderId: number) =>
  axios.get<ApiResponse<EsportsDispatchSeat[]>>(
    `${base}/orders/${orderId}/seats`
  );

export const assignOrderSeat = (
  orderId: number,
  seatIndex: number,
  playerId: number
) =>
  axios.post<ApiResponse<EsportsDispatchSeat>>(
    `${base}/orders/${orderId}/seats/${seatIndex}/assign`,
    { player_id: playerId }
  );

export const revokeOrderSeat = (
  orderId: number,
  seatIndex: number,
  reason: string
) =>
  axios.post<ApiResponse<EsportsDispatchSeat>>(
    `${base}/orders/${orderId}/seats/${seatIndex}/revoke`,
    { reason }
  );

export const claimOrder = (orderId: number) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${orderId}/claim`);

// 固排成队：主陪玩 + 其固排一次成队。
export interface TeammateDispatchCandidate {
  player_id: number;
  display_name: string;
  level: string;
  qualification: string;
  presence: string;
}

export const getTeammateCandidates = (orderId: number, mainPlayerId: number) =>
  axios.get<ApiResponse<TeammateDispatchCandidate[]>>(
    `${base}/orders/${orderId}/teammate-candidates`,
    { params: { main_player_id: mainPlayerId } }
  );

export const teamDispatch = (
  orderId: number,
  mainPlayerId: number,
  teammatePlayerIds: number[]
) =>
  axios.post<ApiResponse<EsportsDispatchSeat[]>>(
    `${base}/orders/${orderId}/team-dispatch`,
    { main_player_id: mainPlayerId, teammate_player_ids: teammatePlayerIds }
  );

export const transferOrder = (
  orderId: number,
  toAdminId: number,
  reason: string
) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${orderId}/transfer`, {
    to_admin_id: toAdminId,
    reason,
  });

export const remindOrder = (orderId: number, level: number, note: string) =>
  axios.post<ApiResponse<{ order_id: number }>>(
    `${base}/orders/${orderId}/remind`,
    { level, note }
  );

// 期望报价复核状态。
export type ExpectedPriceStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface EsportsPlayer {
  id: number;
  user_id: number;
  // 管理端列表补充的关联用户可读信息：避免界面只显示 user_id。
  user_display_name?: string;
  user_username?: string;
  user_phone?: string;
  user_email?: string;
  display_name: string;
  qualification: 'pending' | 'qualified' | 'suspended';
  presence: 'offline' | 'online' | 'protected_abnormal';
  // 考核等级：由考核结论写入，与接单权限联动。
  level: PlayerLevel;
  level_appraised_at: string | null;
  // 陪玩端保活：最近心跳时刻，超时由后台任务自动转离线。
  last_heartbeat_at: string | null;
  // 接单上限：0 = 不限。
  daily_limit: number;
  concurrent_limit: number;
  // 接单游戏分区：空表示不限。
  games: string[];
  // 接单时段与自动上线：分钟数从 0 点起算，0/0 表示不限。
  service_slot_start_minute: number;
  service_slot_end_minute: number;
  auto_online: boolean;
  // 可接报价区间（分）：0 表示该侧不限。
  accept_price_min_cents: number;
  accept_price_max_cents: number;
  // 固排：开关与允许成队的时段。
  fixed_team_enabled: boolean;
  fixed_team_slot_start_minute: number;
  fixed_team_slot_end_minute: number;
  // 期望报价与复核留痕：status 为 none / pending / approved / rejected，
  // 复核意见字段名是 expected_price_review_note（后端没有 review_reason）。
  expected_price_cents: number;
  expected_price_status: ExpectedPriceStatus;
  expected_price_submitted_at: string | null;
  expected_price_reviewed_by_admin_id: number | null;
  expected_price_reviewed_at: string | null;
  expected_price_review_note: string;
  version: number;
}

export type PlayerQualification = EsportsPlayer['qualification'];
export type PlayerPresence = EsportsPlayer['presence'];

export interface PlayerInput {
  user_id: number;
  display_name: string;
}

export interface PlayerUpdateInput {
  display_name: string;
  qualification: PlayerQualification;
  presence: PlayerPresence;
  // 接单上限：0 = 不限。
  daily_limit: number;
  concurrent_limit: number;
  // 接单游戏分区：空表示不限。
  games: string[];
}

export const listPlayers = (keyword = '') =>
  axios.get<ApiResponse<EsportsPlayer[]>>(`${base}/players`, {
    params: { keyword },
  });

// 新建陪玩时的用户候选：按用户名 / 昵称 / 姓名 / 邮箱 / 手机号搜索，
// 后端排除已建陪玩档案的用户，复用 players:list 权限。
export interface PlayerUserCandidate {
  id: number;
  display_name: string;
  username: string;
  email: string;
  phone: string;
}

export const searchPlayerUsers = (keyword = '', limit = 50) =>
  axios.get<ApiResponse<PlayerUserCandidate[]>>(`${base}/players`, {
    params: { scope: 'user_candidates', keyword, limit },
  });

export const createPlayer = (input: PlayerInput) =>
  axios.post<ApiResponse<EsportsPlayer>>(`${base}/players`, input);

export const updatePlayer = (id: number, input: PlayerUpdateInput) =>
  axios.put<ApiResponse<EsportsPlayer>>(`${base}/players/${id}`, input);

export interface PlayerIdentityView {
  id: number;
  player_id: number;
  real_name: string;
  id_number_masked: string;
  status: 'pending_verification' | 'verified' | 'rejected' | '';
  reject_reason: string;
  reviewed_by_admin_id?: number | null;
  reviewed_at?: string | null;
  created_at?: string;
}

export const getPlayerIdentity = (id: number) =>
  axios.get<ApiResponse<PlayerIdentityView>>(`${base}/players/${id}/identity`);

export const reviewPlayerIdentity = (
  id: number,
  input: { approved: boolean; reject_reason?: string }
) =>
  axios.post<ApiResponse<{ id: number; status: string }>>(
    `${base}/players/${id}/identity/review`,
    input
  );

// ── 结单（客服手动结单）与售后 / 退款 ──

export type AfterSaleKind =
  | 'service_mismatch'
  | 'duration_short'
  | 'no_show'
  | 'wrong_item'
  | 'overcharge'
  | 'player_appeal'
  | 'refund_request'
  | 'other';

export type AfterSaleChannel = 'customer' | 'admin' | 'player' | 'system';

export type AfterSaleStatus =
  | 'pending_accept'
  | 'processing'
  | 'pending_customer_confirm'
  | 'pending_approval'
  | 'pending_execution'
  | 'execution_failed'
  | 'completed'
  | 'rejected'
  | 'withdrawn';

export type AfterSaleFaultParty =
  | 'undetermined'
  | 'player'
  | 'admin'
  | 'customer'
  | 'platform'
  | 'none';

export type AfterSalePlanAction =
  | 'none'
  | 'refund_original'
  | 'compensate'
  | 'makeup_service';

// 统一售后来源：订单 / 礼物单 / 充值流水 / 考核记录。
export type AfterSaleSourceType = 'order' | 'gift' | 'recharge' | 'assessment';

export interface EsportsAfterSale {
  id: number;
  after_sale_no: string;
  source_type: AfterSaleSourceType;
  source_id: number;
  // 订单来源售后单附带：订单号。
  order_no?: string;
  kind: AfterSaleKind;
  channel: AfterSaleChannel;
  demand: string;
  expected_plan: string;
  evidence_ref: string;
  contact: string;
  status: AfterSaleStatus;
  fault_party: AfterSaleFaultParty;
  plan_action: AfterSalePlanAction;
  refund_cents: number;
  // 补履约方案参数：plan_action=makeup_service 时有值。
  makeup_kind: 'none' | 'makeup_time' | 'replace_player';
  makeup_player_id: number | null;
  makeup_seat_index: number | null;
  makeup_units: number;
  makeup_company_pay_cents: number;
  // 阶段时间戳与限时：当前阶段时限小时数与截止时间，超时时前端高亮。
  accepted_at: string | null;
  planned_at: string | null;
  approved_at: string | null;
  sla_limit_hours: number;
  sla_deadline: string | null;
  sla_overdue: boolean;
  // 追偿：赔付由陪玩承担时执行售后另建待审批的追偿明细。
  recovery_player_id: number | null;
  recovery_cents: number;
  // 待客户确认节点：确认渠道区分自助确认与客服代确认。
  customer_confirmed_at: string | null;
  customer_confirm_channel: 'none' | 'self_service' | 'admin_proxy';
  customer_confirmed_by_admin_id: number | null;
  customer_declined_at: string | null;
  customer_decline_reason: string;
  customer_id: number | null;
  player_id: number | null;
  handler_admin_id: number | null;
  approver_admin_id: number | null;
  executor_admin_id: number | null;
  resolution: string;
  version: number;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AfterSaleInput {
  source_type: AfterSaleSourceType;
  source_id: number;
  kind: AfterSaleKind;
  channel: AfterSaleChannel;
  demand: string;
  expected_plan?: string;
  evidence_ref?: string;
  // 凭证附件：须为建单人本人上传的私有附件，后端校验归属与 MIME 后
  // 把引用序列化为 evidence_ref 的 JSON 数组；越权引用被拒。
  evidence_attachment_ids?: number[];
  contact?: string;
  customer_id?: number;
}

// 方案动作项（多动作方案）：一张售后单可挂多条动作项并逐项执行。
export type AfterSaleActionType =
  | 'refund'
  | 'compensate'
  | 'makeup'
  | 'replace';

export type AfterSaleActionStatus =
  | 'pending'
  | 'executing'
  // 外部渠道退款已登记、等待财务执行（钱未出账，不阻断终态判定）。
  | 'awaiting_execution'
  | 'succeeded'
  | 'failed';

export interface AfterSaleActionInput {
  action_type: AfterSaleActionType;
  // 资金类动作（refund / compensate）金额（分）；补履约类须为 0。
  amount_cents?: number;
  // 补履约类动作参数：承接陪玩 / 席位 / 补足服务量 / 公司承担报酬。
  player_id?: number;
  seat_index?: number;
  units?: number;
  company_pay_cents?: number;
  // 退款类动作定向冲回的争议陪玩（成员明细冲回）。
  dispute_player_id?: number;
  source_ref?: string;
  note?: string;
}

export interface EsportsAfterSaleAction {
  id: number;
  after_sale_id: number;
  order_id: number;
  seq: number;
  action_type: AfterSaleActionType;
  amount_cents: number;
  player_id: number | null;
  seat_index: number | null;
  units: number;
  company_pay_cents: number;
  dispute_player_id: number | null;
  source_ref: string;
  idem_key: string;
  status: AfterSaleActionStatus;
  result_summary: string;
  note: string;
  executor_admin_id: number | null;
  executed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

// 逐项进度：total / succeeded / failed / pending 四档计数。
export interface AfterSaleActionProgress {
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
}

export interface AfterSaleActionsView {
  progress: AfterSaleActionProgress;
  actions: EsportsAfterSaleAction[];
}

export interface AfterSalePlanInput {
  fault_party: AfterSaleFaultParty;
  plan_action: AfterSalePlanAction;
  refund_cents: number;
  resolution: string;
  // 多动作方案：非空时改走「多动作方案 + 逐项执行」，
  // 忽略上面的单动作字段，聚合摘要由动作项推导（refund_cents = 资金类动作金额之和）。
  actions?: AfterSaleActionInput[];
  // 补履约方案参数：plan_action=makeup_service 时必填，其余动作留空。
  makeup_kind?: 'makeup_time' | 'replace_player';
  makeup_player_id?: number;
  makeup_seat_index?: number;
  makeup_units?: number;
  makeup_company_pay_cents?: number;
  // 追偿：赔付由陪玩承担时填承接陪玩与追偿金额（不得超过赔付额）。
  recovery_player_id?: number;
  recovery_cents?: number;
  // 争议涉及陪玩（部分退款成员明细冲回）：退款类方案可指定该单实际服务成员，
  // 执行退款时优先冲回该成员的服务与加钟分成；0 表示不指定、按整体比例冲回。
  dispute_player_id?: number;
}

// ── 陪玩追偿明细：售后赔付由陪玩承担时另建的扣回单 ──

export type PlayerRecoveryStatus =
  | 'pending'
  | 'approved'
  | 'recovered'
  | 'rejected';

export interface EsportsPlayerRecovery {
  id: number;
  recovery_no: string;
  player_id: number;
  after_sale_id: number;
  order_id: number;
  amount_cents: number;
  reason: string;
  status: PlayerRecoveryStatus;
  requested_by_admin_id: number | null;
  approved_by_admin_id: number | null;
  approved_at: string | null;
  recovered_at: string | null;
  wallet_tx_id: number | null;
  reject_reason: string;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export const listPlayerRecoveries = (params?: {
  player_id?: number;
  status?: string;
}) =>
  axios.get<ApiResponse<EsportsPlayerRecovery[]>>(`${base}/player-recoveries`, {
    params,
  });

export const approvePlayerRecovery = (id: number) =>
  axios.post<ApiResponse<EsportsPlayerRecovery>>(
    `${base}/player-recoveries/${id}/approve`
  );

export const rejectPlayerRecovery = (id: number, reason: string) =>
  axios.post<ApiResponse<EsportsPlayerRecovery>>(
    `${base}/player-recoveries/${id}/reject`,
    { reason }
  );

export const executePlayerRecovery = (id: number) =>
  axios.post<ApiResponse<EsportsPlayerRecovery>>(
    `${base}/player-recoveries/${id}/execute`
  );

export interface CloseOrderInput {
  note: string;
}

// 结单提交规则与订单结单配置视图共用的类型：因 closeOrder / OrderCloseFormView 引用而提前声明。
export type CloseSubmitMode = 'single' | 'multi' | 'custom';
export type CloseSubmitOnMissing = 'block' | 'remind' | 'auto_accept';

export interface CloseSubstituteReport {
  seat_index: number;
  reported_units: number;
  evidence_ref: string;
}

export interface OrderCloseSubmitSummary {
  id: number;
  code: string;
  name: string;
  version: number;
  mode: CloseSubmitMode;
  min_submit_ratio_bp: number;
  allow_substitute: boolean;
  on_missing: CloseSubmitOnMissing;
  required: number;
}

export interface UnsubmittedMember {
  seat_index: number;
  player_id: number;
}

// formValues 为结单表单模板驱动的字段值（key = 字段库 key）；订单无适用模板时可不传。
// substituteReports 为客服代未上报成员补填的服务段上报；仅生效提交规则允许代提交时有效。
// viewedEvidenceAttachmentIds 为「已逐张查看」的服务段凭证图片附件 ID：
// 订单有图片凭证时必须覆盖 close-form 返回的全部 evidence_attachment_ids，否则后端 400；
// 无图片凭证时无需传。传 undefined 时不写入请求体，保持既有调用方行为不变。
export const closeOrder = (
  id: number,
  note: string,
  formValues?: Record<string, unknown>,
  substituteReports?: CloseSubstituteReport[],
  viewedEvidenceAttachmentIds?: number[]
) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/close`, {
    note,
    form_values: formValues || {},
    substitute_reports: substituteReports || [],
    ...(viewedEvidenceAttachmentIds
      ? { viewed_evidence_attachment_ids: viewedEvidenceAttachmentIds }
      : {}),
  });

// 结单复核：金额达复核阈值的订单进入待复核，由非负责客服的管理员通过 / 驳回。
export const approveCloseReview = (id: number, note = '') =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/close-approve`, {
    note,
  });

export const rejectCloseReview = (id: number, reason: string) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/close-reject`, {
    reason,
  });

export const listAfterSales = (status = '') =>
  axios.get<ApiResponse<EsportsAfterSale[]>>(`${base}/after-sales`, {
    params: { status },
  });

export const getAfterSale = (id: number) =>
  axios.get<ApiResponse<EsportsAfterSale>>(`${base}/after-sales/${id}`);

export const createAfterSale = (input: AfterSaleInput) =>
  axios.post<ApiResponse<EsportsAfterSale>>(`${base}/after-sales`, input);

export const acceptAfterSale = (id: number) =>
  axios.post<ApiResponse<EsportsAfterSale>>(`${base}/after-sales/${id}/accept`);

export const planAfterSale = (id: number, input: AfterSalePlanInput) =>
  axios.post<ApiResponse<EsportsAfterSale>>(
    `${base}/after-sales/${id}/plan`,
    input
  );

export const approveAfterSale = (id: number) =>
  axios.post<ApiResponse<EsportsAfterSale>>(
    `${base}/after-sales/${id}/approve`
  );

export const rejectAfterSale = (id: number, reason: string) =>
  axios.post<ApiResponse<EsportsAfterSale>>(
    `${base}/after-sales/${id}/reject`,
    {
      reason,
    }
  );

export const executeAfterSale = (id: number) =>
  axios.post<ApiResponse<EsportsAfterSale>>(
    `${base}/after-sales/${id}/execute`
  );

export const withdrawAfterSale = (id: number) =>
  axios.post<ApiResponse<EsportsAfterSale>>(
    `${base}/after-sales/${id}/withdraw`
  );

// 售后动作项：列出逐项进度；逐项执行供人工对失败项重试。
export const listAfterSaleActions = (id: number) =>
  axios.get<ApiResponse<AfterSaleActionsView>>(
    `${base}/after-sales/${id}/actions`
  );

export const executeAfterSaleAction = (id: number, seq: number) =>
  axios.post<ApiResponse<EsportsAfterSaleAction>>(
    `${base}/after-sales/${id}/actions/${seq}/execute`
  );

// ── 售后沟通记录 / 提示补证 / 代客户确认方案 ──

// 沟通记录（管理端视角含内部备注）：visibility=internal 仅客服可见。
export type AfterSaleMessageVisibility = 'all' | 'internal';

export interface EsportsAfterSaleMessage {
  id: number;
  after_sale_id: number;
  // admin / customer / player / system。
  author_type: string;
  author_id: number;
  author_name: string;
  content: string;
  attachments: string[];
  visibility: AfterSaleMessageVisibility;
  created_at: string;
}

export interface AfterSaleMessageInput {
  // 沟通内容必填，不超过 1000 字。
  content: string;
  // 留空按 all（客户可见）；internal 为内部备注，客户不可见。
  visibility?: AfterSaleMessageVisibility;
  // 附件引用（沿用 evidence_ref 口径），单条最多 20 个。
  attachments?: string[];
}

export const listAfterSaleMessages = (id: number, limit?: number) =>
  axios.get<ApiResponse<EsportsAfterSaleMessage[]>>(
    `${base}/after-sales/${id}/messages`,
    { params: { limit } }
  );

export const createAfterSaleMessage = (
  id: number,
  input: AfterSaleMessageInput
) =>
  axios.post<ApiResponse<EsportsAfterSaleMessage>>(
    `${base}/after-sales/${id}/messages`,
    input
  );

// 客服回复售后单（，审核报告 ）：后端已注册
// POST /admin/after-sales/:id/messages（adminPostAfterSaleMessageHandler），
// 入参即 afterSaleMessageInput（content 必填 ≤1000 字、visibility 为 all / internal、
// attachments ≤20 个引用），返回新建的沟通记录。
// 与上面的 createAfterSaleMessage 是同一接口的两个语义名：保留旧名以免影响既有页面，
// 新的「批量清零残留」页面用这个更直白的名字。
export const sendAfterSaleMessage = (
  id: number,
  input: AfterSaleMessageInput
) => createAfterSaleMessage(id, input);

// 提示客户补证：同事务写客户可见沟通记录 + 外盒留痕，返回该条沟通记录。
export const requestAfterSaleEvidence = (id: number, input: { note: string }) =>
  axios.post<ApiResponse<EsportsAfterSaleMessage>>(
    `${base}/after-sales/${id}/evidence-request`,
    input
  );

// 客服代客户确认售后方案（，客户线下已同意）：pending_customer_confirm → pending_approval，
// 记录代确认管理员（customer_confirm_channel=admin_proxy）。
// 注意：后端服务层已就绪（confirmAfterSaleByAdmin），但 app.go 尚未注册
// POST /admin/after-sales/:id/confirm —— 「后端待注册」，注册后本封装即可用；
// 未注册前调用会 404，页面侧应先隐藏入口。已有 /after-sales/:id/approve 是**审批**
// （pending_approval → pending_execution），与本函数不是同一状态流转。
export const confirmAfterSale = (id: number) =>
  axios.post<ApiResponse<EsportsAfterSale>>(
    `${base}/after-sales/${id}/confirm`
  );

// ── 售后复核：终态售后凭新证据申请复核，由非申请人且非原审批人的异人审查 ──

export type AfterSaleReviewStatus =
  | 'pending'
  | 'upheld'
  | 'reopened'
  | 'withdrawn';

export type AfterSaleReviewDecision = 'uphold' | 'reopen';

export interface EsportsAfterSaleReview {
  id: number;
  review_no: string;
  after_sale_id: number;
  order_id: number;
  applicant_admin_id: number;
  reason: string;
  evidence_ref: string;
  status: AfterSaleReviewStatus;
  reviewer_admin_id: number | null;
  reviewed_at: string | null;
  decision_note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AfterSaleReviewInput {
  reason: string;
  evidence_ref?: string;
  // 复核附带凭证：须为申请人本人上传的私有附件，非空时后端校验归属。
  evidence_attachment_ids?: number[];
}

export const listAfterSaleReviews = (id: number) =>
  axios.get<ApiResponse<EsportsAfterSaleReview[]>>(
    `${base}/after-sales/${id}/reviews`
  );

export const requestAfterSaleReview = (
  id: number,
  input: AfterSaleReviewInput
) =>
  axios.post<ApiResponse<EsportsAfterSaleReview>>(
    `${base}/after-sales/${id}/reviews`,
    input
  );

export const decideAfterSaleReview = (
  reviewId: number,
  decision: AfterSaleReviewDecision,
  note = ''
) =>
  axios.post<ApiResponse<EsportsAfterSaleReview>>(
    `${base}/after-sale-reviews/${reviewId}/decision`,
    { decision, note }
  );

export const withdrawAfterSaleReview = (reviewId: number) =>
  axios.post<ApiResponse<EsportsAfterSaleReview>>(
    `${base}/after-sale-reviews/${reviewId}/withdraw`
  );

// ── 补履约任务：售后方案「补钟 / 换人」执行后产生，由客服开始服务并验收 ──

export type MakeupKind = 'makeup_time' | 'replace_player';
export type MakeupStatus = 'pending' | 'servicing' | 'completed' | 'cancelled';

export interface EsportsFulfillmentMakeup {
  id: number;
  makeup_no: string;
  after_sale_id: number;
  order_id: number;
  kind: MakeupKind;
  player_id: number;
  seat_index: number;
  units: number;
  company_pay_cents: number;
  status: MakeupStatus;
  created_by_admin_id: number | null;
  accepted_by_admin_id: number | null;
  accepted_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  system_seconds: number;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export const listFulfillmentMakeups = (status = '') =>
  axios.get<ApiResponse<EsportsFulfillmentMakeup[]>>(
    `${base}/fulfillment-makeups`,
    { params: { status } }
  );

export const startFulfillmentMakeup = (id: number) =>
  axios.post<ApiResponse<EsportsFulfillmentMakeup>>(
    `${base}/fulfillment-makeups/${id}/start`
  );

export const completeFulfillmentMakeup = (id: number, note = '') =>
  axios.post<ApiResponse<EsportsFulfillmentMakeup>>(
    `${base}/fulfillment-makeups/${id}/complete`,
    { note }
  );

// ── 加钟：客服对服务中订单发起，陪玩确认后累加并生成加钟分成 ──

export type AddonStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled';
export type AddonPaymentStatus = 'unpaid' | 'paid';

export interface EsportsOrderAddon {
  id: number;
  addon_no: string;
  order_id: number;
  added_cents: number;
  added_units: number;
  status: AddonStatus;
  requested_by_admin_id: number | null;
  rule_id: number | null;
  rule_no: string;
  rule_version: number;
  commission_cents: number;
  // 加钟收款：确认后的追加金额由客服收单，首版仅客户余额核销。
  payment_status: AddonPaymentStatus;
  paid_cents: number;
  paid_at: string | null;
  paid_by_admin_id: number | null;
  payment_ref: string;
  confirmed_player_id: number | null;
  confirmed_at: string | null;
  reject_reason: string;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OrderAddonInput {
  added_cents: number;
  added_units: number;
  note?: string;
}

export const listOrderAddons = (orderId: number) =>
  axios.get<ApiResponse<EsportsOrderAddon[]>>(
    `${base}/orders/${orderId}/addons`
  );

export const createOrderAddon = (orderId: number, input: OrderAddonInput) =>
  axios.post<ApiResponse<EsportsOrderAddon>>(
    `${base}/orders/${orderId}/addons`,
    input
  );

export const cancelOrderAddon = (id: number) =>
  axios.post<ApiResponse<EsportsOrderAddon>>(
    `${base}/order-addons/${id}/cancel`
  );

// 加钟收款：对已确认且未收款的加钟单用客户余额核销追加金额。
export const payOrderAddonByBalance = (id: number) =>
  axios.post<ApiResponse<EsportsOrderAddon>>(
    `${base}/order-addons/${id}/pay-by-balance`
  );

// ── 分成与结算 ──

export type CommissionScope = 'global' | 'game' | 'level' | 'player';
export type CommissionCalcMode =
  | 'percent'
  | 'fixed_per_order'
  | 'fixed_per_unit';
export type CommissionUnitBasis = 'sku_quantity' | 'promised_units';
export type CommissionRuleStatus = 'draft' | 'scheduled' | 'active' | 'history';
export type CommissionEntryKind = 'service' | 'reversal';
export type CommissionEntryStatus = 'pending_settlement' | 'settled' | 'void';
// 状态机：draft → locked → paid；void 为作废终态（明细回退待结算、原单不可再发放）。
export type SettlementStatus = 'draft' | 'locked' | 'paid' | 'void';
// 结算单列表的状态过滤：不带 = 默认视图（后端已排除作废单），all = 全部。
export type SettlementListStatus = SettlementStatus | 'all';

export interface CommissionRule {
  id: number;
  rule_no: string;
  version: number;
  status: CommissionRuleStatus;
  scope: CommissionScope;
  scope_key: string;
  calc_mode: CommissionCalcMode;
  value_bp: number;
  value_cents: number;
  unit_basis: CommissionUnitBasis;
  note: string;
  effective_at: string | null;
  created_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionRuleInput {
  rule_no?: string;
  scope: CommissionScope;
  scope_key?: string;
  calc_mode: CommissionCalcMode;
  value_bp: number;
  value_cents: number;
  unit_basis: CommissionUnitBasis;
  note?: string;
  effective_at?: string | null;
}

export interface CommissionEntry {
  id: number;
  idem_key: string;
  order_id: number;
  player_id: number;
  kind: CommissionEntryKind;
  seat_index: number;
  after_sale_id: number | null;
  rule_id: number | null;
  rule_no: string;
  rule_version: number;
  calc_mode: CommissionCalcMode;
  base_cents: number;
  amount_cents: number;
  status: CommissionEntryStatus;
  settlement_id: number | null;
  // 争议冻结：被争议的明细冻结待结算金额，不参与当期结算。
  frozen_at: string | null;
  frozen_reason: string;
  frozen_by_admin_id: number | null;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: number;
  settlement_no: string;
  // player 为陪玩分成结算（写猫粮钱包）；cs 为客服提成结算（不写钱包，发放走打款留痕）。
  owner_type: 'player' | 'cs';
  owner_id: number;
  period_start: string;
  period_end: string;
  gross_cents: number;
  adjustment_cents: number;
  net_cents: number;
  entry_count: number;
  status: SettlementStatus;
  // 乐观锁版本：锁定 / 发放 / 作废均按该值做条件更新。
  version: number;
  locked_by_admin_id: number | null;
  locked_at: string | null;
  // 发放（打款）留痕，仅 status=paid 时非空。
  payout_ref: string;
  paid_by_admin_id: number | null;
  paid_at: string | null;
  // 作废留痕（P0-8），仅 status=void 时非空。
  voided_by_admin_id: number | null;
  voided_at: string | null;
  void_reason: string;
  created_at: string;
  updated_at: string;
}

// 结算单详情包体：主表 + 本期可下钻明细（带规则版本，）。
// detail_truncated 为真表示本期明细超过返回上限（默认 200 条），避免「静默漏数」。
//
// entries 按结算单的 owner_type 分流，两种读模型字段名已对齐（id / kind / order_id /
// rule_no / rule_version / calc_mode / base_cents / amount_cents / net_cents / status /
// settlement_id / note / created_at），主体差异字段按主体给出：
//   - owner_type=player → 含 player_id / seat_index / 冻结与扣减项；
//   - owner_type=cs     → 含 admin_id / order_no / gift_order_id / base_mode。
// 因此除共有字段外一律可选，页面按 owner_type 取用。
export interface SettlementEntryDetail {
  id: number;
  // 陪玩侧为 service / reversal；客服侧为其自身明细类型。
  kind: string;
  order_id: number | null;
  rule_no: string;
  rule_version: number;
  calc_mode: string;
  base_cents: number;
  amount_cents: number;
  status: string;
  settlement_id: number | null;
  note: string;
  created_at: string;
  // 到手净额：陪玩侧含扣减项，客服侧无逐单扣减，等于本明细金额。
  net_cents: number;
  // 陪玩分成侧专有（owner_type=player）。
  player_id?: number;
  seat_index?: number;
  after_sale_id?: number | null;
  idem_key?: string;
  rule_id?: number | null;
  frozen_at?: string | null;
  frozen_reason?: string;
  frozen_by_admin_id?: number | null;
  deducted_cents?: number;
  rule_value_bp?: number;
  rule_value_cents?: number;
  service_unit_amounts?: number[];
  updated_at?: string;
  // 客服提成侧专有（owner_type=cs）。
  admin_id?: number;
  order_no?: string;
  gift_order_id?: number | null;
  base_mode?: string;
}

export interface SettlementDetail {
  settlement: Settlement;
  entries: SettlementEntryDetail[];
  entry_count: number;
  detail_truncated: boolean;
}

export interface SettlementInput {
  player_id: number;
  period_start: string;
  period_end: string;
}

export interface PlayerCommissionSummary {
  pending_settlement_cents: number;
  // 被争议冻结的待结算金额。
  frozen_cents: number;
  settled_cents: number;
  next_settlement_at: string;
  // 生效结算周期与命中层级（player/level/game/global/system_config）。
  settlement_period: string;
  settlement_scope: string;
}

// ── 结算周期与争议冻结 ──

export type SettlementCycleScope = 'global' | 'game' | 'level' | 'player';
export type SettlementCyclePeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface SettlementCycle {
  id: number;
  scope: SettlementCycleScope;
  scope_key: string;
  period: SettlementCyclePeriod;
  interval_days: number;
  enabled: boolean;
  note: string;
  created_by_admin_id: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SettlementCycleInput {
  scope: SettlementCycleScope;
  scope_key?: string;
  period: SettlementCyclePeriod;
  interval_days?: number;
  enabled?: boolean;
  note?: string;
}

export const listCommissionRules = (ruleNo = '') =>
  axios.get<ApiResponse<CommissionRule[]>>(`${base}/commission-rules`, {
    params: { rule_no: ruleNo },
  });

export const createCommissionRule = (input: CommissionRuleInput) =>
  axios.post<ApiResponse<CommissionRule>>(`${base}/commission-rules`, input);

export const activateCommissionRule = (id: number) =>
  axios.post<ApiResponse<CommissionRule>>(
    `${base}/commission-rules/${id}/activate`
  );

export const rollbackCommissionRule = (id: number) =>
  axios.post<ApiResponse<CommissionRule>>(
    `${base}/commission-rules/${id}/rollback`
  );

export const listCommissionEntries = (params: {
  player_id?: number;
  order_no?: string;
  status?: string;
}) =>
  axios.get<ApiResponse<CommissionEntry[]>>(`${base}/commission-entries`, {
    params,
  });

// 结算单列表：status 缺省时后端返回默认视图（已排除作废单）；status=all 看全部。
export const listSettlements = (
  playerId?: number,
  status?: SettlementListStatus
) =>
  axios.get<ApiResponse<Settlement[]>>(`${base}/settlements`, {
    params: { player_id: playerId, status },
  });

export const createSettlement = (input: SettlementInput) =>
  axios.post<ApiResponse<Settlement>>(`${base}/settlements`, input);

export const lockSettlement = (id: number) =>
  axios.post<ApiResponse<Settlement>>(`${base}/settlements/${id}/lock`);

// 结算单详情：包体是 { settlement, entries, entry_count, detail_truncated }，不要按单个 Settlement 解析。
export const getSettlementDetail = (id: number, limit?: number) =>
  axios.get<ApiResponse<SettlementDetail>>(`${base}/settlements/${id}`, {
    params: { limit },
  });

// 兼容旧名：同一详情接口，返回类型已改为详情包体。
export const getSettlement = getSettlementDetail;

// 结算周期配置：日/周/月/自定义间隔，按 全局 → 游戏 → 等级 → 陪玩 逐级覆盖。
export const listSettlementCycles = () =>
  axios.get<ApiResponse<SettlementCycle[]>>(`${base}/settlement-cycles`);

export const createSettlementCycle = (input: SettlementCycleInput) =>
  axios.post<ApiResponse<SettlementCycle>>(`${base}/settlement-cycles`, input);

export const updateSettlementCycle = (
  id: number,
  input: SettlementCycleInput
) =>
  axios.put<ApiResponse<SettlementCycle>>(
    `${base}/settlement-cycles/${id}`,
    input
  );

export const setSettlementCycleStatus = (id: number, enabled: boolean) =>
  axios.post<ApiResponse<SettlementCycle>>(
    `${base}/settlement-cycles/${id}/status`,
    { enabled }
  );

// 争议冻结：人工冻结 / 解冻订单待结算分成明细。
export const freezeOrderCommission = (
  orderId: number,
  input: { player_id?: number; reason?: string } = {}
) =>
  axios.post<ApiResponse<{ order_id: number; frozen: number }>>(
    `${base}/orders/${orderId}/freeze-commission`,
    input
  );

export const unfreezeOrderCommission = (orderId: number) =>
  axios.post<ApiResponse<{ order_id: number; unfrozen: number }>>(
    `${base}/orders/${orderId}/unfreeze-commission`
  );

// ── 客服提成 ──
export type CsCommissionScope = 'global' | 'admin';
export type CsCommissionBaseMode =
  | 'order_amount'
  | 'order_contribution'
  | 'order_count';
export type CsCommissionCalcMode = 'percent' | 'fixed_per_order';
export type CsCommissionPeriod = 'daily' | 'weekly' | 'monthly';

export interface CsCommissionTier {
  threshold_base_cents: number;
  value_bp: number;
}

export interface CsCommissionRule {
  id: number;
  rule_no: string;
  version: number;
  status: CommissionRuleStatus;
  scope: CsCommissionScope;
  scope_key: string;
  base_mode: CsCommissionBaseMode;
  calc_mode: CsCommissionCalcMode;
  include_gifts: boolean;
  value_bp: number;
  value_cents: number;
  tiers: CsCommissionTier[] | null;
  period: CsCommissionPeriod;
  note: string;
  effective_at: string | null;
  created_by_admin_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CsCommissionRuleInput {
  rule_no?: string;
  scope: CsCommissionScope;
  scope_key?: string;
  base_mode: CsCommissionBaseMode;
  calc_mode: CsCommissionCalcMode;
  include_gifts?: boolean;
  value_bp?: number;
  value_cents?: number;
  tiers?: CsCommissionTier[];
  period: CsCommissionPeriod;
  note?: string;
  effective_at?: string | null;
}

export interface CsCommissionEntry {
  id: number;
  idem_key: string;
  order_id: number | null;
  gift_order_id: number | null;
  admin_id: number;
  kind: 'service' | 'reversal' | 'gift' | 'gift_reversal';
  after_sale_id: number | null;
  rule_id: number | null;
  rule_no: string;
  rule_version: number;
  calc_mode: CsCommissionCalcMode;
  base_mode: CsCommissionBaseMode;
  base_cents: number;
  matched_tier_bp: number;
  amount_cents: number;
  // 渠道成本与工作室剩余快照，仅 service 明细非零。
  channel_cost_cents: number;
  studio_remainder_cents: number;
  status: CommissionEntryStatus;
  settlement_id: number | null;
  // 争议冻结（P0-8）：冻结与 status 正交（仍为 pending_settlement），
  // 冻结中的明细不得进入结算单、不得置 settled，解冻后恢复可结算。
  frozen_at?: string | null;
  frozen_reason?: string;
  frozen_by_admin_id?: number | null;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CsCommissionSummary {
  pending_settlement_cents: number;
  // 被争议冻结的待结算金额（P0-8）：单独统计，不混进「待结算净额」。
  frozen_cents?: number;
  settled_cents: number;
  monthly_cents: number;
  month_start: string;
  month_end: string;
  next_settlement_at: string;
}

export const listCsCommissionRules = (ruleNo = '') =>
  axios.get<ApiResponse<CsCommissionRule[]>>(`${base}/cs-commission-rules`, {
    params: { rule_no: ruleNo },
  });

export const createCsCommissionRule = (input: CsCommissionRuleInput) =>
  axios.post<ApiResponse<CsCommissionRule>>(
    `${base}/cs-commission-rules`,
    input
  );

export const activateCsCommissionRule = (id: number) =>
  axios.post<ApiResponse<CsCommissionRule>>(
    `${base}/cs-commission-rules/${id}/activate`
  );

export const rollbackCsCommissionRule = (id: number) =>
  axios.post<ApiResponse<CsCommissionRule>>(
    `${base}/cs-commission-rules/${id}/rollback`
  );

export const listCsCommissionEntries = (
  params: {
    admin_id?: number;
    order_no?: string;
    status?: string;
  } = {}
) =>
  axios.get<ApiResponse<CsCommissionEntry[]>>(`${base}/cs-commission-entries`, {
    params,
  });

export const getCsCommissionSummary = (adminId?: number) =>
  axios.get<ApiResponse<CsCommissionSummary>>(`${base}/cs-commission/summary`, {
    params: { admin_id: adminId },
  });

// 客服提成明细的争议冻结 / 解冻（审核报告 ，P0-8）。
// 后端本批已注册路由与权限码（handlers 与 service 同在 cs_commission.go）：
//   POST /admin/cs-commission-entries/:id/freeze    权限码 esports:settlements:cs_entry_freeze
//   POST /admin/cs-commission-entries/:id/unfreeze  权限码 esports:settlements:cs_entry_unfreeze
// 冻结入参 { reason } 必填（trim 后非空，超长按 120 字截断），操作人写入 frozen_by_admin_id；
// 解冻原因可空，带正文时按 { reason } 解析。两者都返回更新后的客服提成明细。
// 冻结仅允许「pending_settlement 且未挂结算单且未冻结」的明细，否则后端返回冲突错误；
// 解冻仅允许已冻结的明细，解冻后恢复可结算。
// 后端路由本批新增，未经联调
export const freezeCsCommissionEntry = (id: number, reason: string) =>
  axios.post<ApiResponse<CsCommissionEntry>>(
    `${base}/cs-commission-entries/${id}/freeze`,
    { reason }
  );

// 后端路由本批新增，未经联调
export const unfreezeCsCommissionEntry = (id: number, reason?: string) =>
  axios.post<ApiResponse<CsCommissionEntry>>(
    `${base}/cs-commission-entries/${id}/unfreeze`,
    reason ? { reason } : {}
  );

export const createCsSettlement = (input: {
  admin_id: number;
  period_start: string;
  period_end: string;
}) => axios.post<ApiResponse<Settlement>>(`${base}/cs-settlements`, input);

// 作废客服提成结算单（P0-8）：明细安全回退到待结算，原单转 void 后不可再发放；
// 作废人不得等于登记人（服务端校验）。
export interface CsSettlementVoidResult {
  settlement_id: number;
  settlement_no: string;
  owner_type: 'player' | 'cs';
  owner_id: number;
  period_start: string;
  period_end: string;
  net_cents: number;
  entry_count: number;
  released_count: number;
  operator_id: number;
  reason: string;
  voided_at: string;
  // 作废后的结算单版本（乐观锁），便于调用方核对并发状态。
  version: number;
}

export const voidCsSettlement = (id: number, reason: string) =>
  axios.post<ApiResponse<CsSettlementVoidResult>>(
    `${base}/cs-settlements/${id}/void`,
    { reason }
  );

// 重开客服提成结算单（P0-8）：按同一客服与同一周期重新生成草稿单，仍须锁定并登记发放。
export interface CsSettlementReopenInput {
  admin_id: number;
  // RFC3339 时间串。
  period_start: string;
  period_end: string;
  reason: string;
}

export const reopenCsSettlement = (input: CsSettlementReopenInput) =>
  axios.post<ApiResponse<Settlement>>(`${base}/cs-settlements/reopen`, input);

// 登记发放：locked → paid，并留外部打款凭证。
export const paySettlement = (id: number, payoutRef: string) =>
  axios.post<ApiResponse<Settlement>>(`${base}/settlements/${id}/pay`, {
    payout_ref: payoutRef,
  });

// ── 基础提现 ──
export type WithdrawalChannel = 'bank_card' | 'wechat' | 'alipay';
export type WithdrawalStatus =
  | 'pending_review'
  | 'approved'
  | 'paid'
  | 'rejected';

export interface EsportsWithdrawal {
  id: number;
  withdrawal_no: string;
  player_id: number;
  idem_key: string;
  amount_cents: number;
  fee_cents: number;
  tax_cents: number;
  net_cents: number;
  channel: WithdrawalChannel;
  account_ref: string;
  status: WithdrawalStatus;
  reject_reason: string;
  reviewed_by_admin_id: number | null;
  reviewed_at: string | null;
  payout_ref: string;
  tax_ref: string;
  paid_by_admin_id: number | null;
  paid_at: string | null;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// 打款执行状态机（补全）：approved → pay_requested → paid / pay_failed。
// 提现单自身状态保持 approved，直到打款成功才置为 paid；失败可重新提交打款。
export type WithdrawalPayoutStatus = 'pay_requested' | 'paid' | 'pay_failed';

export interface EsportsWithdrawalPayout {
  id: number;
  payout_no: string;
  withdrawal_id: number;
  channel: WithdrawalChannel;
  // 外部打款流水号（幂等键），同一流水号只能登记一次。
  transaction_no: string;
  // 实际打款金额（分），须等于提现单的 net_cents。
  amount_cents: number;
  // 完税凭证，打款成功时回填。
  tax_ref: string;
  status: WithdrawalPayoutStatus;
  fail_reason: string;
  submitted_by_admin_id: number | null;
  paid_by_admin_id: number | null;
  paid_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalPayoutRequestInput {
  channel: WithdrawalChannel;
  transaction_no: string;
  // 须等于提现单实际到账额，否则后端返回 400。
  amount_cents: number;
}

export interface PlayerWithdrawalSummary {
  withdrawable_cents: number;
  pending_review_cents: number;
  total_withdrawn_cents: number;
}

export const listWithdrawals = (
  params: { player_id?: number; status?: WithdrawalStatus } = {}
) =>
  axios.get<ApiResponse<EsportsWithdrawal[]>>(`${base}/withdrawals`, {
    params,
  });

export const getWithdrawal = (id: number) =>
  axios.get<ApiResponse<EsportsWithdrawal>>(`${base}/withdrawals/${id}`);

export const reviewWithdrawal = (id: number, approve: boolean, reason = '') =>
  axios.post<ApiResponse<EsportsWithdrawal>>(
    `${base}/withdrawals/${id}/review`,
    { approve, reason }
  );

// 旧版打款入口（兼容保留）：直接登记打款并置为 paid，主流程改用下方打款执行状态机。
export const payWithdrawal = (id: number, payoutRef: string, taxRef = '') =>
  axios.post<ApiResponse<EsportsWithdrawal>>(`${base}/withdrawals/${id}/pay`, {
    payout_ref: payoutRef,
    tax_ref: taxRef,
  });

// 提交打款执行：仅已审核通过的提现单可提交，落为 pay_requested。
export const requestWithdrawalPayout = (
  id: number,
  input: WithdrawalPayoutRequestInput
) =>
  axios.post<ApiResponse<EsportsWithdrawalPayout>>(
    `${base}/withdrawals/${id}/payout-request`,
    input,
    { silentError: true }
  );

// 查看某提现单的打款执行记录，按 ID 倒序（最新在前）。
export const listWithdrawalPayouts = (withdrawalId: number, limit = 50) =>
  axios.get<ApiResponse<EsportsWithdrawalPayout[]>>(
    `${base}/withdrawals/${withdrawalId}/payouts`,
    { params: { limit }, silentError: true }
  );

// 确认打款成功：回填完税凭证，提现单同步置为 paid。
export const markWithdrawalPayoutPaid = (payoutId: number, taxRef = '') =>
  axios.post<ApiResponse<EsportsWithdrawalPayout>>(
    `${base}/withdrawal-payouts/${payoutId}/paid`,
    { tax_ref: taxRef },
    { silentError: true }
  );

// 标记打款失败：提现单保持 approved，可重新提交打款。
export const markWithdrawalPayoutFailed = (payoutId: number, reason: string) =>
  axios.post<ApiResponse<EsportsWithdrawalPayout>>(
    `${base}/withdrawal-payouts/${payoutId}/failed`,
    { reason },
    { silentError: true }
  );

// ── 优先派单权 + 派单候选排序 ──
export type DispatchPriorityPeriod =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly';
export type DispatchPrioritySource =
  | 'ranking'
  | 'points'
  | 'threshold'
  | 'rotation'
  | 'manual';
export type DispatchPriorityStatus =
  | 'pending'
  | 'active'
  | 'revoked'
  | 'expired';

export interface DispatchPriorityGrant {
  id: number;
  game: string;
  player_id: number;
  period: DispatchPriorityPeriod;
  period_start: string;
  period_end: string;
  rank: number;
  source: DispatchPrioritySource;
  status: DispatchPriorityStatus;
  granted_by_admin_id: number | null;
  note: string;
  revoke_reason: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DispatchPriorityGrantInput {
  game: string;
  player_id: number;
  period: DispatchPriorityPeriod;
  source: DispatchPrioritySource;
  rank?: number;
  // true 表示预生成下一期名单。
  next_period?: boolean;
  note?: string;
}

export interface DispatchCandidate {
  player_id: number;
  display_name: string;
  level: string;
  qualification: string;
  presence: string;
  // 客服（或客户）指定陪玩，仅提示置顶，不是优先派单权。
  preferred: boolean;
  // 该候选来自本单的优先通知名单（窗口内可见）；窗口外恒为 false。
  from_priority_notice: boolean;
  rating_average: number;
  rating_samples: number;
  rating_insufficient: boolean;
  active_seats: number;
}

// ── 业务口径：独占优先通知窗口 ──
export type PriorityNoticeStatus = 'none' | 'pending' | 'released' | 'accepted';
export type PriorityNoticeItemStatus =
  | 'notified'
  | 'accepted'
  | 'declined'
  | 'expired';

export interface DispatchPriorityNotice {
  id: number;
  order_id: number;
  player_id: number;
  game: string;
  status: PriorityNoticeItemStatus;
  notified_at: string;
  responded_at: string | null;
  decline_reason: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// 订单上的优先通知窗口字段（随订单返回）。
export interface OrderPriorityFields {
  priority_notice_status: PriorityNoticeStatus;
  priority_notice_until: string | null;
  priority_game: string;
  priority_release_reason: string;
}

export const listOrderPriorityNotices = (orderId: number) =>
  axios.get<ApiResponse<DispatchPriorityNotice[]>>(
    `${base}/orders/${orderId}/priority-notices`
  );

// 客服提前把优先通知窗口释放到抢单大厅。
export const releaseOrderPriority = (orderId: number, reason = '') =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${orderId}/release-priority`,
    { reason }
  );

// 没有优先名单（或窗口已闭合）的普通待派单订单，由客服发布到抢单大厅。
// 首版仅单陪玩订单可发布，多人订单服务端返回参数错误。
export const publishOrderToGrabHall = (orderId: number, reason = '') =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${orderId}/publish-grab`,
    { reason }
  );

export interface DispatchCandidateResult {
  game: string;
  candidates: DispatchCandidate[];
}

export const listDispatchPriority = (
  params: { game?: string; status?: DispatchPriorityStatus } = {}
) =>
  axios.get<ApiResponse<DispatchPriorityGrant[]>>(`${base}/dispatch/priority`, {
    params,
  });

export const grantDispatchPriority = (input: DispatchPriorityGrantInput) =>
  axios.post<ApiResponse<DispatchPriorityGrant>>(
    `${base}/dispatch/priority`,
    input
  );

export const revokeDispatchPriority = (id: number, reason: string) =>
  axios.post<ApiResponse<DispatchPriorityGrant>>(
    `${base}/dispatch/priority/${id}/revoke`,
    { reason }
  );

// 派单候选（首版）：按窗口可见性过滤后的候选，再按评分与在途席位均衡排序。
export const getDispatchCandidates = (
  orderId: number,
  preferredPlayerId?: number
) =>
  axios.get<ApiResponse<DispatchCandidateResult>>(
    `${base}/orders/${orderId}/dispatch-candidates`,
    { params: { preferred_player_id: preferredPlayerId } }
  );

// ── 陪玩转单 ──
export type SeatTransferStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface SeatTransferRequest {
  id: number;
  order_id: number;
  seat_id: number;
  seat_index: number;
  player_id: number;
  reason: string;
  status: SeatTransferStatus;
  idem_key: string;
  decided_by_admin_id: number | null;
  decided_at: string | null;
  decision_note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export const listSeatTransfers = (
  params: {
    status?: SeatTransferStatus;
    order_id?: number;
    player_id?: number;
  } = {}
) =>
  axios.get<ApiResponse<SeatTransferRequest[]>>(`${base}/seat-transfers`, {
    params,
  });

// 客服确认转单：通过则释放席位为待补位，驳回须填原因。
export const decideSeatTransfer = (id: number, approve: boolean, note = '') =>
  axios.post<ApiResponse<SeatTransferRequest>>(
    `${base}/seat-transfers/${id}/decision`,
    { approve, note }
  );

// ── 充值活动（充值活动与赠送） ──

export type CampaignActivityType = 'full_gift' | 'ladder' | 'limited';
// audience=player 时按 audience_player_ids 命中陪玩，奖励可入陪玩猫粮。
export type CampaignAudience = 'all' | 'new_customer' | 'specified' | 'player';
// 奖励目标账户：客户余额 / 陪玩猫粮；留空按客户余额（兼容存量活动）。
export type CampaignTargetAccountType = 'customer_balance' | 'player_catfood';
export type CampaignStackRule = 'stack' | 'exclusive';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface CampaignTier {
  threshold_cents: number;
  bonus_cents: number;
}

export interface RechargeCampaign {
  id: number;
  code: string;
  name: string;
  activity_type: CampaignActivityType;
  tiers: CampaignTier[];
  audience: CampaignAudience;
  // audience=specified 时按客户 ID 命中。
  audience_customer_ids: number[];
  // audience=player 时按陪玩 ID 命中。
  audience_player_ids: number[];
  // 奖励入账账户：customer_balance 入客户余额 / player_catfood 入陪玩猫粮。
  target_account_type: CampaignTargetAccountType;
  stack_rule: CampaignStackRule;
  bonus_valid_days: number;
  starts_at: string;
  ends_at: string;
  status: CampaignStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  code: string;
  name: string;
  activity_type: CampaignActivityType;
  tiers: CampaignTier[];
  audience: CampaignAudience;
  audience_customer_ids: number[];
  audience_player_ids?: number[];
  target_account_type?: CampaignTargetAccountType;
  stack_rule: CampaignStackRule;
  bonus_valid_days: number;
  starts_at: string;
  ends_at: string;
}

export const listCampaigns = (status = '') =>
  axios.get<ApiResponse<RechargeCampaign[]>>(`${base}/campaigns`, {
    params: { status },
  });

export const createCampaign = (input: Omit<CampaignInput, 'code'>) => {
  // 兼容尚未重启的旧后端；新版后端会忽略传入值并重新生成编码。
  const code = `RC-${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
  return axios.post<ApiResponse<RechargeCampaign>>(`${base}/campaigns`, {
    ...input,
    code,
  });
};

// 编辑活动不提交 code 改动（编码创建后不可变），由调用方保持原值。
export const updateCampaign = (
  id: number,
  input: CampaignInput & { expected_version: number }
) => axios.put<ApiResponse<RechargeCampaign>>(`${base}/campaigns/${id}`, input);

export const setCampaignStatus = (
  id: number,
  expectedVersion: number,
  status: CampaignStatus
) =>
  axios.post<ApiResponse<RechargeCampaign>>(`${base}/campaigns/${id}/status`, {
    expected_version: expectedVersion,
    status,
  });

// 按活动充值：仅客户余额账户，后端按实充金额自动匹配活动并计算赠送，返回钱包账户视图。
export const rechargeWalletByCampaign = (
  ownerId: number,
  input: { principal_cents: number; note: string },
  idempotencyKey: string
) =>
  axios.post<ApiResponse<WalletAccount>>(
    `${base}/wallets/${ownerId}/recharge-campaigns`,
    input,
    {
      params: { account_type: 'customer_balance' },
      headers: { 'Idempotency-Key': idempotencyKey },
    }
  );

// ── 技能等级（陪玩等级，）管理 ──
// 配置为专用表驱动（「技能等级」页整体保存，列表序即高低序）；各表单选项与
// H5 文案仍走公开读 /api/v1/esports/skill-levels（skill-levels.ts 封装）。

export interface AdminSkillLevel {
  code: string;
  name: string;
  rank: number;
}

export const getAdminSkillLevels = () =>
  axios.get<ApiResponse<{ items: AdminSkillLevel[]; defaulted: boolean }>>(
    `${base}/skill-levels`
  );

export const saveAdminSkillLevels = (items: { code: string; name: string }[]) =>
  axios.put<ApiResponse<{ items: AdminSkillLevel[] }>>(`${base}/skill-levels`, {
    items,
  });

// ── 会员等级 ──

export type MemberLevelStatus = 'enabled' | 'disabled';

export interface MemberLevel {
  id: number;
  code: string;
  name: string;
  // 成长值门槛，单位与订单金额一致（分），10000 = 累计消费满 100 元。
  growth_threshold: number;
  // 折扣基点：10000 = 原价，9500 = 9.5 折。
  discount_bps: number;
  priority_dispatch: boolean;
  // 专属客服权益：客户绑定固定负责客服、不参与轮转（客服端/企微侧边栏展示标识）。
  dedicated_cs: boolean;
  // 优先预约权益：会员可提交预约意向并在客服工作台置顶处理。
  priority_booking: boolean;
  sort_order: number;
  status: MemberLevelStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MemberLevelInput {
  code: string;
  name: string;
  growth_threshold: number;
  discount_bps: number;
  priority_dispatch: boolean;
  // 编辑时可省略：后端仅在显式传值时更新，未传保持库中原权益。
  dedicated_cs?: boolean;
  priority_booking?: boolean;
  sort_order: number;
}

export type MemberGrowthSourceType = 'order' | 'after_sale' | 'manual' | 'gift';

export interface MemberGrowthLedgerEntry {
  id: number;
  customer_id: number;
  delta: number;
  source_type: MemberGrowthSourceType;
  source_id: string;
  operator_id: number | null;
  note: string;
  created_at: string;
}

export interface MemberLevelOverride {
  id: number;
  customer_id: number;
  level_code: string;
  reason: string;
  operator_id: number | null;
  created_at: string;
}

// 客户当前生效的会员权益快照。
// active=false 表示未定级 / 等级停用 / 规则缺失，此时不得宣称「已生效」。
export interface MemberPrivilege {
  customer_id: number;
  level_code: string;
  level_name: string;
  active: boolean;
  discount_bps: number;
  dedicated_cs: boolean;
  dedicated_channel: boolean;
  offline_event_priority: boolean;
  priority_booking: boolean;
  priority_dispatch: boolean;
}

export interface CustomerMemberDetail {
  customer_id: number;
  level_code: string;
  level_name: string;
  discount_bps: number;
  growth_total: number;
  // 空串表示无待降级；到期时间可能为 null。
  pending_level_code: string;
  downgrade_after: string | null;
  level_changed_at: string | null;
  // 当前等级生效的权益快照（后端为扁平字段，不是嵌套对象）。
  dedicated_cs: boolean;
  priority_booking: boolean;
  priority_dispatch: boolean;
  dedicated_channel: boolean;
  offline_event_priority: boolean;
  // 手动调级覆盖状态（P1-10）：覆盖期内 override_active=true；
  // 到期后由惰性判定回落，override_active 变 false。
  override_level_code: string;
  override_expires_at: string | null;
  override_active: boolean;
  ledger: MemberGrowthLedgerEntry[];
  overrides: MemberLevelOverride[];
}

export const listMemberLevels = () =>
  axios.get<ApiResponse<MemberLevel[]>>(`${base}/member-levels`);

export const createMemberLevel = (input: MemberLevelInput) =>
  axios.post<ApiResponse<MemberLevel>>(`${base}/member-levels`, input);

// 编辑等级不提交 code 改动（编码创建后不可变），由调用方保持原值。
export const updateMemberLevel = (
  id: number,
  input: MemberLevelInput & { expected_version: number }
) => axios.put<ApiResponse<MemberLevel>>(`${base}/member-levels/${id}`, input);

export const setMemberLevelStatus = (
  id: number,
  expectedVersion: number,
  status: MemberLevelStatus
) =>
  axios.post<ApiResponse<MemberLevel>>(`${base}/member-levels/${id}/status`, {
    expected_version: expectedVersion,
    status,
  });

// 删除会员等级（审核报告 ）：仅「已停用且未被客户引用」的等级可删，
// 否则后端返回中文冲突（启用中 → 先停用；被引用 → 改用停用）。
// 后端路由本批新增：DELETE /admin/member-levels/:id（deleteMemberLevelHandler），
// 权限码 esports:members:level_delete；成功返回 { id }。
export const deleteMemberLevel = (id: number) =>
  axios.delete<ApiResponse<{ id: number }>>(`${base}/member-levels/${id}`);

export const getCustomerMember = (customerId: number) =>
  axios.get<ApiResponse<CustomerMemberDetail>>(
    `${base}/customers/${customerId}/member`
  );

// 手动调级：仅留覆盖记录，不改成长值流水。
// override_days / override_until 目前后端请求体尚未接收（setCustomerMemberLevelHandler 只解析
// level_code / reason），这里先行声明为可选，后端支持后即可直接透传。
export interface SetCustomerMemberLevelInput {
  level_code: string;
  reason: string;
  // 覆盖有效期（天）。
  override_days?: number;
  // 覆盖到期时刻（RFC3339），与 override_days 二选一。
  override_until?: string;
}

export const setCustomerMemberLevel = (
  customerId: number,
  levelCode: string,
  reason: string,
  options: Pick<
    SetCustomerMemberLevelInput,
    'override_days' | 'override_until'
  > = {}
) =>
  axios.post<ApiResponse<CustomerMemberDetail>>(
    `${base}/customers/${customerId}/member/level`,
    { level_code: levelCode, reason, ...options }
  );

// ── 礼物 ──

export type GiftStatus = 'draft' | 'on_sale' | 'off_sale';
export type GiftCommissionMode = 'percent' | 'fixed';
export type GiftReviewStatus = 'normal' | 'flagged' | 'approved' | 'rejected';

export interface Gift {
  id: number;
  code: string;
  name: string;
  icon: string;
  price_cents: number;
  category: string;
  commission_mode: GiftCommissionMode;
  // 分成比例，万分比（6000 = 60%）。
  commission_bp: number;
  // 固定分成金额（分）。
  commission_cents: number;
  high_value: boolean;
  require_age: boolean;
  sort_order: number;
  status: GiftStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GiftInput {
  code: string;
  name: string;
  icon: string;
  price_cents: number;
  category: string;
  commission_mode: GiftCommissionMode;
  commission_bp: number;
  commission_cents: number;
  high_value: boolean;
  require_age: boolean;
  sort_order: number;
}

export interface GiftOrder {
  id: number;
  gift_no: string;
  gift_id: number;
  customer_id: number;
  player_id: number;
  player_name: string;
  order_id: number | null;
  quantity: number;
  unit_price_cents: number;
  amount_cents: number;
  principal_cents: number;
  bonus_cents: number;
  payment_source: string;
  commission_mode: GiftCommissionMode;
  commission_bp: number;
  commission_cents: number;
  income_cents: number;
  refund_cents: number;
  refund_status: 'none' | 'partial' | 'full';
  review_status: GiftReviewStatus;
  status: 'paid' | 'refunded';
  version: number;
  created_at: string;
}

export interface GiftIntent {
  id: number;
  customer_id: number;
  gift_id: number;
  gift_name: string;
  gift_version: number;
  player_id: number;
  player_name: string;
  order_id: number | null;
  quantity: number;
  unit_price_cents: number;
  amount_cents: number;
  payment_source: string;
  // 礼物档位与风控快照：下单时锁定的档位与高价值 / 年龄门槛标记。
  gift_tier_id: number;
  gift_tier_code: string;
  high_value: boolean;
  require_age: boolean;
  // 礼物收款：发起收款后的渠道、状态、支付意图号与付款窗口。
  payment_channel: string;
  payment_status: string;
  payment_intent_no: string | null;
  payment_ref: string;
  payment_expires_at: string | null;
  payment_verified_at: string | null;
  payment_verified_by_admin_id: number | null;
  created_by_admin_id: number;
  client_key: string;
  status: 'pending' | 'confirmed' | 'consumed' | 'cancelled';
  version: number;
  confirmation_ref: string;
  expires_at: string;
  confirmed_at: string | null;
  gift_order_id: number | null;
  created_at: string;
  updated_at: string;
}

export const listGiftIntents = () =>
  axios.get<ApiResponse<GiftIntent[]>>(`${base}/gift-intents`);

export const createGiftIntent = (input: {
  customer_id: number;
  gift_id: number;
  player_id: number;
  quantity: number;
  order_no?: string | null;
  payment_source?: 'customer_balance_principal';
  client_key: string;
}) => axios.post<ApiResponse<GiftIntent>>(`${base}/gift-intents`, input);

export const executeGiftIntent = (intentId: number) =>
  axios.post<ApiResponse<GiftOrder>>(`${base}/gift-orders`, {
    intent_id: intentId,
  });

export interface GiftLeaderboardRow {
  owner_id: number;
  owner_name: string;
  amount_cents: number;
  count: number;
}

export const listGifts = (status?: GiftStatus) =>
  axios.get<ApiResponse<Gift[]>>(`${base}/gifts`, { params: { status } });

export const createGift = (input: GiftInput & { status: GiftStatus }) =>
  axios.post<ApiResponse<Gift>>(`${base}/gifts`, input);

// 编辑礼物不提交 code 改动（编码创建后不可变）。
export const updateGift = (
  id: number,
  input: GiftInput & { expected_version: number }
) => axios.put<ApiResponse<Gift>>(`${base}/gifts/${id}`, input);

export const setGiftStatus = (
  id: number,
  expectedVersion: number,
  status: GiftStatus
) =>
  axios.post<ApiResponse<Gift>>(`${base}/gifts/${id}/status`, {
    expected_version: expectedVersion,
    status,
  });

export const listGiftOrders = (params: {
  customer_id?: number;
  player_id?: number;
  review_status?: GiftReviewStatus;
}) => axios.get<ApiResponse<GiftOrder[]>>(`${base}/gift-orders`, { params });

export const refundGift = (id: number, reason: string) =>
  axios.post<ApiResponse<GiftOrder>>(`${base}/gift-orders/${id}/refund`, {
    reason,
  });

// 复核疑似关联礼物：approve 释放分成，reject 不释放。
export const reviewGift = (id: number, decision: 'approve' | 'reject') =>
  axios.post<ApiResponse<GiftOrder>>(`${base}/gift-orders/${id}/review`, {
    decision,
  });

export const getGiftLeaderboard = (
  board: 'customer' | 'player',
  period: 'daily' | 'weekly' | 'monthly'
) =>
  axios.get<ApiResponse<GiftLeaderboardRow[]>>(`${base}/gift-leaderboard`, {
    params: { board, period },
  });

// ── 礼物争议：客户申请 → 客服审核 → 执行退款（支持部分退款） ──

export type GiftDisputeKind =
  | 'not_received'
  | 'wrong_gift'
  | 'quality'
  | 'unauthorized'
  | 'other';
export type GiftDisputeStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'withdrawn';

export interface GiftDispute {
  id: number;
  dispute_no: string;
  gift_order_id: number;
  gift_no: string;
  customer_id: number;
  owner_admin_id: number | null;
  created_by_admin_id: number | null;
  kind: GiftDisputeKind;
  channel: 'customer' | 'admin';
  demand: string;
  evidence_ref: string;
  requested_refund_cents: number;
  approved_refund_cents: number;
  status: GiftDisputeStatus;
  resolution: string;
  reviewed_by_admin_id: number | null;
  reviewed_at: string | null;
  executed_by_admin_id: number | null;
  executed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GiftDisputeInput {
  gift_order_id: number;
  kind: GiftDisputeKind;
  demand: string;
  evidence_ref?: string;
  requested_refund_cents: number;
  customer_id?: number;
}

export const listGiftDisputes = (status?: GiftDisputeStatus) =>
  axios.get<ApiResponse<GiftDispute[]>>(`${base}/gift-disputes`, {
    params: { status },
  });

// 客服代客户建争议单需带 customer_id（须为归属客户）。
export const createGiftDisputeByAdmin = (input: GiftDisputeInput) =>
  axios.post<ApiResponse<GiftDispute>>(`${base}/gift-disputes`, input);

export const reviewGiftDispute = (
  id: number,
  input: {
    approve: boolean;
    approved_refund_cents?: number;
    resolution?: string;
  }
) =>
  axios.post<ApiResponse<GiftDispute>>(
    `${base}/gift-disputes/${id}/review`,
    input
  );

export const executeGiftDispute = (id: number) =>
  axios.post<ApiResponse<GiftDispute>>(`${base}/gift-disputes/${id}/execute`);

// ── 收款账户、收款方式启停与外部到账核销 ──

// 商家码细分渠道（微信 / 支付宝商家码）由后端逐步接入；
// 前端先支持展示、筛选与账户提交，未上线前由后端按渠道校验拒绝。
export type PaymentChannel =
  | 'wechat_work'
  | 'merchant_qr'
  | 'wechat_merchant_qr'
  | 'alipay_merchant_qr'
  | 'corporate_transfer';
export type PaymentAccountStatus =
  | 'pending_review'
  | 'active'
  | 'rejected'
  | 'disabled';

export interface PaymentAccount {
  id: number;
  channel: PaymentChannel;
  subject_name: string;
  account_no: string;
  qr_url: string;
  bank_name: string;
  status: PaymentAccountStatus;
  submit_note: string;
  submitted_by_admin_id: number | null;
  reviewed_by_admin_id: number | null;
  reviewed_at: string | null;
  review_resolution: string;
  disabled_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentAccountInput {
  channel: PaymentChannel;
  subject_name: string;
  account_no?: string;
  qr_url?: string;
  bank_name?: string;
  submit_note?: string;
}

export interface PaymentChannelView {
  channel: PaymentChannel;
  enabled: boolean;
  active_accounts: number;
}

export type OfflinePaymentProofStatus =
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export interface OfflinePaymentProof {
  id: number;
  proof_no: string;
  // 列表视图附带：订单号（管理端统一展示口径）。
  order_no?: string;
  order_id: number;
  intent_id: number;
  account_id: number;
  channel: PaymentChannel;
  transaction_no: string;
  amount_cents: number;
  proof_ref: string;
  note: string;
  status: OfflinePaymentProofStatus;
  submitted_by_admin_id: number | null;
  verified_by_admin_id: number | null;
  verified_at: string | null;
  resolution: string;
  receipt_id: number | null;
  version: number;
  created_at: string;
}

export interface OfflinePaymentProofInput {
  order_no: string;
  account_id: number;
  transaction_no: string;
  amount_cents: number;
  proof_ref: string;
  note?: string;
}

// ── 客服列表（选择器数据源）：独立接口，客服即后台 active 管理员 ──

export interface CsStaff {
  id: number;
  // 客服名：姓名（缺省回落昵称、再回落登录账号）。
  name: string;
}

export const listCsStaff = (keyword = '', limit = 50) =>
  axios.get<ApiResponse<CsStaff[]>>(`${base}/cs-staff`, {
    params: { keyword: keyword || undefined, limit },
  });

export const listPaymentAccounts = (params: {
  channel?: PaymentChannel;
  status?: PaymentAccountStatus;
}) =>
  axios.get<ApiResponse<PaymentAccount[]>>(`${base}/payment-accounts`, {
    params,
  });

export const createPaymentAccount = (input: PaymentAccountInput) =>
  axios.post<ApiResponse<PaymentAccount>>(`${base}/payment-accounts`, input);

export const reviewPaymentAccount = (
  id: number,
  input: { approve: boolean; resolution?: string }
) =>
  axios.post<ApiResponse<PaymentAccount>>(
    `${base}/payment-accounts/${id}/review`,
    input
  );

export const disablePaymentAccount = (id: number) =>
  axios.post<ApiResponse<PaymentAccount>>(
    `${base}/payment-accounts/${id}/disable`
  );

export const listPaymentChannels = () =>
  axios.get<ApiResponse<PaymentChannelView[]>>(`${base}/payment-channels`);

// 上线自检：逐项回报需要外部配置才能用的能力，只读且不含密钥值。
export type ReadinessStatus = 'ready' | 'degraded' | 'missing';

export interface ReadinessCheck {
  key: string;
  name: string;
  status: ReadinessStatus;
  blocking: boolean;
  detail: string;
  action: string;
}

export interface ReadinessReport {
  ready: boolean;
  blockers: number;
  degraded: number;
  generated_at: string;
  checks: ReadinessCheck[];
}

export const fetchReadiness = () =>
  axios.get<ApiResponse<ReadinessReport>>(`${base}/readiness`);

export const setPaymentChannelStatus = (
  channel: PaymentChannel,
  enabled: boolean
) =>
  axios.post<ApiResponse<PaymentChannelView[]>>(
    `${base}/payment-channels/${channel}/status`,
    { enabled }
  );

// 待核验收款单列表：默认返回数组；
// 传 reconcile=true 且指定 order_id 时返回 { items, reconcile }，一并给出该订单的收款自动对账结果
// （，财务只看差异笔）。未指定 order_id 却传 reconcile 会被后端 400。
export interface PaymentReconcileMismatch {
  proof_no: string;
  transaction_no: string;
  channel: PaymentChannel;
  // channel_unmatched（渠道无此回执）/ amount_mismatch（与渠道回执金额不一致）/
  // order_amount_mismatch（与订单应付金额不一致）。
  kind: string;
  proof_cents: number;
  channel_cents: number;
  expected_cents: number;
  detail: string;
}

export interface PaymentReconcileReport {
  order_id: number;
  payable_cents: number;
  compared: number;
  matched: number;
  mismatches: PaymentReconcileMismatch[];
}

export interface OfflinePaymentProofListWithReconcile {
  items: OfflinePaymentProof[];
  reconcile: PaymentReconcileReport;
}

export interface OfflinePaymentProofListParams {
  status?: OfflinePaymentProofStatus;
  // 管理端统一按订单号筛选 / 定位订单。
  order_no?: string;
  limit?: number;
  // 传 true 时必须同时给 order_no。
  reconcile?: boolean;
}

export function listOfflinePaymentProofs(
  params?: OfflinePaymentProofListParams
): Promise<AxiosResponse<ApiResponse<OfflinePaymentProof[]>>>;
export function listOfflinePaymentProofs(
  params: OfflinePaymentProofListParams & { reconcile: true; order_no: string }
): Promise<AxiosResponse<ApiResponse<OfflinePaymentProofListWithReconcile>>>;
export function listOfflinePaymentProofs(
  params: OfflinePaymentProofListParams = {}
): Promise<
  AxiosResponse<
    ApiResponse<OfflinePaymentProof[] | OfflinePaymentProofListWithReconcile>
  >
> {
  return axios.get<
    ApiResponse<OfflinePaymentProof[] | OfflinePaymentProofListWithReconcile>
  >(`${base}/offline-payment-proofs`, { params });
}

export const submitOfflinePaymentProof = (input: OfflinePaymentProofInput) =>
  axios.post<ApiResponse<OfflinePaymentProof>>(
    `${base}/offline-payment-proofs`,
    input
  );

export const verifyOfflinePaymentProof = (id: number) =>
  axios.post<ApiResponse<OfflinePaymentProof>>(
    `${base}/offline-payment-proofs/${id}/verify`
  );

export const rejectOfflinePaymentProof = (id: number, resolution: string) =>
  axios.post<ApiResponse<OfflinePaymentProof>>(
    `${base}/offline-payment-proofs/${id}/reject`,
    { resolution }
  );

// ── 考官端：考核权重、考核任务、申诉复核、客户评价与综合评分 ──

export type AssessmentType = 'entry' | 'upgrade' | 'spot_check' | 'retry';
export type AssessmentDimension =
  | 'game_skill'
  | 'teaching'
  | 'attitude'
  | 'communication'
  | 'compliance'
  | 'stability';
export type AssessmentStatus = 'pending' | 'scheduled' | 'passed' | 'failed';
export type AssessmentAppealStatus =
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected';
export type ReviewStatus = 'normal' | 'disputed' | 'invalid';

export interface AssessmentRule {
  id: number;
  assessment_type: AssessmentType;
  dimension: AssessmentDimension;
  weight_bp: number;
  version: number;
}

export interface Assessment {
  id: number;
  task_no: string;
  player_id: number;
  assessment_type: AssessmentType;
  target_level: string;
  status: AssessmentStatus;
  appeal_status: AssessmentAppealStatus;
  source: 'apply' | 'system';
  examiner_admin_id: number | null;
  scheduled_at: string | null;
  contacted_at: string | null;
  scored_at: string | null;
  total_score: number;
  note: string;
  created_by_admin_id: number | null;
  version: number;
  created_at: string;
}

export interface AssessmentScore {
  id: number;
  assessment_id: number;
  dimension: AssessmentDimension;
  weight_bp: number;
  score: number;
  comment: string;
}

export interface AssessmentAppeal {
  id: number;
  assessment_id: number;
  player_id: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_admin_id: number | null;
  review_note: string;
  reviewed_at: string | null;
}

export interface AssessmentDetail {
  assessment: Assessment;
  scores: AssessmentScore[];
  appeal: AssessmentAppeal | null;
}

export interface AssessmentInput {
  player_id: number;
  assessment_type: AssessmentType;
  target_level?: string;
  note?: string;
  examiner_admin_id?: number | null;
}

export interface AssessmentWeightInput {
  dimension: AssessmentDimension;
  weight_bp: number;
}

export interface AssessmentScoreInput {
  dimension: AssessmentDimension;
  score: number;
  comment: string;
}

export interface PlayerReview {
  id: number;
  order_id: number;
  customer_id: number;
  player_id: number;
  rating: number;
  comment: string;
  verified: boolean;
  status: ReviewStatus;
  version: number;
  created_at: string;
}

export interface PlayerReviewInput {
  order_no: string;
  customer_id: number;
  player_id: number;
  rating: number;
  comment?: string;
}

export interface PlayerRating {
  player_id: number;
  average: number;
  sample_count: number;
  insufficient: boolean;
  rule_version: string;
}

export const listAssessmentRules = (assessmentType: AssessmentType) =>
  axios.get<ApiResponse<AssessmentRule[]>>(`${base}/assessment-rules`, {
    params: { assessment_type: assessmentType },
  });

// 覆盖式写入权重：须覆盖全部六个维度且合计恰为 10000 基点。
export const setAssessmentRules = (
  assessmentType: AssessmentType,
  weights: AssessmentWeightInput[]
) =>
  axios.post<ApiResponse<AssessmentRule[]>>(`${base}/assessment-rules`, {
    assessment_type: assessmentType,
    weights,
  });

export const listAssessments = (params: {
  player_id?: number;
  status?: AssessmentStatus;
  assessment_type?: AssessmentType;
  limit?: number;
}) => axios.get<ApiResponse<Assessment[]>>(`${base}/assessments`, { params });

export const createAssessment = (input: AssessmentInput) =>
  axios.post<ApiResponse<Assessment>>(`${base}/assessments`, input);

export const getAssessmentDetail = (id: number) =>
  axios.get<ApiResponse<AssessmentDetail>>(`${base}/assessments/${id}`);

export const assignAssessment = (
  id: number,
  examinerAdminId: number,
  scheduledAt?: string | null
) =>
  axios.post<ApiResponse<Assessment>>(`${base}/assessments/${id}/assign`, {
    examiner_admin_id: examinerAdminId,
    scheduled_at: scheduledAt ?? null,
  });

// 逐维度打分（评语必填），后端按权重加权总分并判定通过。
export const scoreAssessment = (
  id: number,
  scores: AssessmentScoreInput[],
  note = ''
) =>
  axios.post<ApiResponse<Assessment>>(`${base}/assessments/${id}/score`, {
    scores,
    note,
  });

export const reviewAssessmentAppeal = (
  id: number,
  decision: 'approve' | 'reject',
  note = ''
) =>
  axios.post<ApiResponse<Assessment>>(
    `${base}/assessments/${id}/appeal/review`,
    {
      decision,
      note,
    }
  );

export const listPlayerReviews = (params: {
  player_id?: number;
  order_no?: string;
  status?: ReviewStatus;
}) =>
  axios.get<ApiResponse<PlayerReview[]>>(`${base}/player-reviews`, { params });

// 客服代录评价：verified=false，不计入陪玩综合评分。
export const recordPlayerReview = (input: PlayerReviewInput) =>
  axios.post<ApiResponse<PlayerReview>>(`${base}/player-reviews`, input);

export const setPlayerReviewStatus = (id: number, status: ReviewStatus) =>
  axios.post<ApiResponse<PlayerReview>>(`${base}/player-reviews/${id}/status`, {
    status,
  });

export const getPlayerRating = (playerId: number) =>
  axios.get<ApiResponse<PlayerRating>>(`${base}/players/${playerId}/rating`);

// ── 经营统计报表 ──
export type ReportType =
  | 'owner_overview'
  | 'cs_performance'
  | 'dispatch_efficiency'
  | 'aftersale_quality'
  | 'finance';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportQuery {
  period?: ReportPeriod;
  start?: string;
  end?: string;
  responsible_admin_id?: number;
  created_by_admin_id?: number;
  product_id?: number;
  game?: string;
  channel_source?: CustomerSource;
  entry_point?: EsportsOrder['entry_point'];
  appointment_type?: 'instant' | 'request';
  seat_type?: 'single' | 'multi';
  payment_channel?: string;
  kind?: string;
  fault_party?: string;
  limit?: number;
}

export interface ReportRange {
  start: string;
  end: string;
  period: ReportPeriod;
}

export interface ReportBucket {
  bucket: string;
  order_count: number;
  revenue_cents: number;
  refund_cents: number;
}

export interface ReportOrderDetail {
  id: number;
  order_no: string;
  customer_id: number;
  payable_cents: number;
  refunded_cents: number;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
}

export interface OwnerOverviewReport {
  type: 'owner_overview';
  range: ReportRange;
  summary: {
    order_count: number;
    paid_count: number;
    revenue_cents: number;
    refund_cents: number;
    net_cents: number;
    completed_count: number;
    cancelled_count: number;
    // 加钟收入（P1-16）：已收款加钟单 paid_cents 之和，**已包含在 revenue_cents 内**，
    // 这里单列只为说明取数来源，不要重复累加。
    addon_revenue_cents: number;
  };
  buckets: ReportBucket[];
  details: ReportOrderDetail[];
}

export interface CsPerformanceRow {
  admin_id: number;
  admin_name: string;
  order_count: number;
  revenue_cents: number;
  refund_cents: number;
  net_cents: number;
  // 客服提成净额（，含负数冲回）。
  commission_cents: number;
}

export interface CsPerformanceReport {
  type: 'cs_performance';
  range: ReportRange;
  rows: CsPerformanceRow[];
}

export interface DispatchEfficiencyRow {
  admin_id: number;
  admin_name: string;
  invite_count: number;
  accepted_count: number;
  rejected_count: number;
  expired_count: number;
}

export interface DispatchEfficiencyReport {
  type: 'dispatch_efficiency';
  range: ReportRange;
  summary: {
    invite_count: number;
    accepted_count: number;
    rejected_count: number;
    expired_count: number;
    open_count: number;
    avg_accept_seconds: number;
    // 等待时长：按订单时间线埋点派生的四类平均等待时长（秒）。
    avg_pool_to_invite_seconds: number;
    avg_invite_to_accept_seconds: number;
    avg_accept_to_start_seconds: number;
    avg_pool_to_start_seconds: number;
  };
  rows: DispatchEfficiencyRow[];
}

export interface AfterSaleQualityDetail {
  id: number;
  kind: string;
  status: string;
  fault_party: string;
  refund_cents: number;
  created_at: string;
}

export interface AfterSaleQualityReport {
  type: 'aftersale_quality';
  range: ReportRange;
  summary: {
    total: number;
    completed: number;
    rejected: number;
    withdrawn: number;
    in_progress: number;
    refund_cents: number;
  };
  by_kind: Record<string, number>;
  by_fault_party: Record<string, number>;
  details: AfterSaleQualityDetail[];
}

export interface FinanceChannelRow {
  channel: string;
  amount_cents: number;
  count: number;
}

export interface FinanceReport {
  type: 'finance';
  range: ReportRange;
  wallet: {
    customer_balance: Record<string, number>;
    player_catfood: Record<string, number>;
  };
  settlement: {
    count: number;
    gross_cents: number;
    net_cents: number;
    by_status: Record<string, number>;
  };
  payment_channels: FinanceChannelRow[];
}

export type EsportsReport =
  | OwnerOverviewReport
  | CsPerformanceReport
  | DispatchEfficiencyReport
  | AfterSaleQualityReport
  | FinanceReport;

export const getEsportsReport = (type: ReportType, params: ReportQuery = {}) =>
  axios.get<ApiResponse<EsportsReport>>(`${base}/reports/${type}`, { params });

// 导出报表 CSV：与查看接口同一组筛选参数，后端按同一数据边界与审计口径导出。
export const exportEsportsReport = (
  type: ReportType,
  params: ReportQuery = {}
) =>
  axios.get<Blob>(`${base}/reports/${type}/export`, {
    params,
    responseType: 'blob',
  });

// ── uni-app 客户自助端首页装修 ──
export const PAGE_CHANNEL_CUSTOMER_HOME = 'uni_customer_home';

export type PageComponentType =
  | 'search'
  | 'carousel'
  | 'notice'
  | 'quick_nav'
  | 'category'
  | 'product_list'
  | 'player_recommend'
  | 'activity'
  | 'member_entry'
  | 'support_entry'
  | 'contact_entry'
  | 'orders_entry'
  | 'aftersale_entry'
  | 'image'
  | 'layout';

export interface PageComponent {
  type: PageComponentType;
  visible: boolean;
  props?: Record<string, unknown>;
  // 仅 layout 使用：按列存放子组件，null 表示空列；当前只允许一层。
  children?: (PageComponent | null)[];
}

export type PageDocumentStatus = 'draft' | 'pending' | 'published';

export interface PageDocument {
  id?: number;
  channel: string;
  status: PageDocumentStatus;
  draft_version: number;
  published_version_no: number;
  updated_by: number;
  updated_at?: string;
}

export interface PageDraftPayload {
  document: PageDocument;
  components: PageComponent[];
}

export type PageVersionStatus =
  | 'scheduled'
  | 'pending_review'
  | 'published'
  | 'history';
export type PagePublishMode = 'immediate' | 'scheduled';

export interface PageVersion {
  id: number;
  document_id: number;
  channel: string;
  version_no: number;
  config: { components: PageComponent[] };
  status: PageVersionStatus;
  publish_mode: PagePublishMode;
  scheduled_at?: string | null;
  published_at?: string | null;
  published_by: number;
  rollback_from_version_no: number;
  note: string;
  created_at: string;
}

export interface PageAsset {
  id: number;
  name: string;
  url: string;
  mime: string;
  size_bytes: number;
  width: number;
  height: number;
  created_by: number;
  created_at: string;
}

export const getEsportsPages = () =>
  axios.get<ApiResponse<PageDocument[]>>(`${base}/pages`);

export const getEsportsPage = (channel: string) =>
  axios.get<ApiResponse<PageDraftPayload>>(`${base}/pages/${channel}`);

export const saveEsportsPageDraft = (
  channel: string,
  components: PageComponent[],
  expectedVersion: number
) =>
  axios.put<ApiResponse<PageDocument>>(`${base}/pages/${channel}/draft`, {
    components,
    expected_version: expectedVersion,
  });

export const publishEsportsPage = (
  channel: string,
  payload: { mode: PagePublishMode; scheduled_at?: string; note?: string }
) =>
  axios.post<ApiResponse<PageVersion>>(
    `${base}/pages/${channel}/publish`,
    payload
  );

export const rollbackEsportsPage = (channel: string, versionNo: number) =>
  axios.post<ApiResponse<PageVersion>>(`${base}/pages/${channel}/rollback`, {
    version_no: versionNo,
  });

// 审核发布：approve=true 通过 / false 驳回（驳回须填原因）。
export const reviewEsportsPagePublish = (
  channel: string,
  versionId: number,
  approve: boolean,
  reason = ''
) =>
  axios.post<ApiResponse<PageVersion>>(
    `${base}/pages/${channel}/publish-review/${versionId}/${
      approve ? 'approve' : 'reject'
    }`,
    { reason }
  );

export const getEsportsPageVersions = (channel: string) =>
  axios.get<ApiResponse<PageVersion[]>>(`${base}/pages/${channel}/versions`);

// 素材去重与历史补登记依赖完整列表：后端单次最多 200 条，这里取满。
export const getEsportsPageAssets = () =>
  axios.get<ApiResponse<PageAsset[]>>(`${base}/page-assets`, {
    params: { limit: 200 },
  });

// 新增素材：mime 与 size_bytes 后端强制必填（体积须 > 0 且在上限内），
// 因此这里声明为必填；width / height 可留 0 表示未探测。
export const createEsportsPageAsset = (input: {
  name: string;
  url: string;
  mime: string;
  size_bytes: number;
  width?: number;
  height?: number;
}) => axios.post<ApiResponse<PageAsset>>(`${base}/page-assets`, input);

export const deleteEsportsPageAsset = (id: number) =>
  axios.delete<ApiResponse<{ id: number }>>(`${base}/page-assets/${id}`);

// ── 客服端（PC 工作台 / 移动客服端 / 企微侧边栏共用） ──
export interface CustomerProfileSummary {
  customer: EsportsCustomer;
  principal_cents: number;
  bonus_cents: number;
  balance_cents: number;
  recharged_cents: number;
  consumed_cents: number;
  refunded_cents: number;
  gifted_cents: number;
  growth_total: number;
  order_count: number;
  member_level_code: string;
  member_level_name: string;
  // 客服专属权益标记（会员权益消费点之一）。
  dedicated_cs: boolean;
  // 客户当前生效的会员权益快照：客服卡片据此展示权益。
  member_privilege: MemberPrivilege;
  owner_admin_name: string;
  source: CustomerSource;
  follow_status: CustomerFollowStatus;
}

export interface CustomerProfileInput {
  phone: string;
  // 生日（月-日，如 03-15）；空表示清除。
  birthday: string;
  consumption_preference: string;
  tags: string[];
  follow_status?: CustomerFollowStatus;
  self_order_enabled?: boolean;
}

export type FollowChannel = 'pc' | 'mobile' | 'wecom' | 'phone' | 'other';

export interface CustomerFollowUp {
  id: number;
  customer_id: number;
  admin_id: number;
  channel: FollowChannel;
  summary: string;
  next_follow_at: string | null;
  created_at: string;
}

export interface CustomerFollowUpInput {
  channel?: FollowChannel;
  summary: string;
  next_follow_at?: string;
}

export interface WecomIntakeInput {
  corp_id: string;
  external_id: string;
  display_name?: string;
  phone?: string;
}

export interface WecomIntakeResult {
  customer: EsportsCustomer;
  created: boolean;
}

export interface CsScript {
  id: number;
  title: string;
  category: string;
  content: string;
  sort_order: number;
  status: 'enabled' | 'disabled';
  created_by: number | null;
  version: number;
  created_at: string;
}

export interface CsScriptInput {
  title: string;
  category: string;
  content: string;
  sort_order: number;
  status?: 'enabled' | 'disabled';
  expected_version?: number;
}

export interface CsTodoItem {
  key: string;
  label: string;
  count: number;
}

export interface CsWorkbench {
  my_customers: number;
  order_pool: EsportsDispatchBoard;
  todos: CsTodoItem[];
  performance: Record<string, unknown>;
  range: { start: string; end: string; period: string };
}

export const getEsportsCustomerProfile = (id: number) =>
  axios.get<ApiResponse<CustomerProfileSummary>>(
    `${base}/customers/${id}/profile`
  );

export const updateEsportsCustomerProfile = (
  id: number,
  input: CustomerProfileInput
) =>
  axios.put<ApiResponse<EsportsCustomer>>(
    `${base}/customers/${id}/profile`,
    input
  );

export const getEsportsCustomerFollowUps = (id: number, limit = 50) =>
  axios.get<ApiResponse<CustomerFollowUp[]>>(
    `${base}/customers/${id}/follow-ups`,
    { params: { limit } }
  );

export const createEsportsCustomerFollowUp = (
  id: number,
  input: CustomerFollowUpInput
) =>
  axios.post<ApiResponse<CustomerFollowUp>>(
    `${base}/customers/${id}/follow-ups`,
    input
  );

export const wecomIntakeCustomer = (input: WecomIntakeInput) =>
  axios.post<ApiResponse<WecomIntakeResult>>(
    `${base}/customers/wecom-intake`,
    input
  );

export const getEsportsScripts = (
  params: { category?: string; limit?: number } = {}
) => axios.get<ApiResponse<CsScript[]>>(`${base}/scripts`, { params });

export const createEsportsScript = (input: CsScriptInput) =>
  axios.post<ApiResponse<CsScript>>(`${base}/scripts`, input);

export const updateEsportsScript = (id: number, input: CsScriptInput) =>
  axios.put<ApiResponse<CsScript>>(`${base}/scripts/${id}`, input);

export const setEsportsScriptStatus = (
  id: number,
  status: 'enabled' | 'disabled',
  expectedVersion: number
) =>
  axios.post<ApiResponse<CsScript>>(`${base}/scripts/${id}/status`, {
    status,
    expected_version: expectedVersion,
  });

export const getEsportsCsWorkbench = (params: ReportQuery = {}) =>
  axios.get<ApiResponse<CsWorkbench>>(`${base}/cs/workbench`, { params });

// ── 结单规则（首版）：可配置结单条件与金额复核阈值 ──

export type CloseRuleScope = 'global' | 'game' | 'sku';
export type CloseRuleStatus = 'draft' | 'active' | 'history';

// 结单条件树（结单条件自定义）：组合节点填 op（and / or / not）与 children，
// 叶子节点填 field + operator + value；字段与运算符取值见结单条件状态接口返回的元信息。
export type CloseConditionOperator = '>=' | '>' | '<=' | '<' | '==' | '!=';

export interface CloseConditionNode {
  op?: 'and' | 'or' | 'not';
  children?: CloseConditionNode[];
  field?: string;
  operator?: CloseConditionOperator;
  value?: number | null;
}

export interface CloseConditionFieldSpec {
  key: string;
  label: string;
  kind: 'count' | 'seconds' | 'units' | 'bool';
}

export interface CloseConditionItem {
  field: string;
  label: string;
  operator: CloseConditionOperator;
  expected: number;
  actual: number;
  satisfied: boolean;
  reason: string;
}

export interface CloseConditionStatus {
  satisfied: boolean;
  tree_configured: boolean;
  rule_code: string;
  rule_version: number;
  review_threshold_cents: number;
  items: CloseConditionItem[];
  reasons: string[];
  fields: CloseConditionFieldSpec[];
  operators: CloseConditionOperator[];
}

// 结单条件字段与运算符枚举（结单条件自定义）：与后端
// internal/apps/esports/close_condition.go 的 closeConditionFieldSpecs / closeConditionOperators
// 逐字对齐；后端新增字段或运算符时须同步此处，否则设计器会漏配或提交被拒。
// 深度 / 节点上限同样对齐 normalizeCloseConditionTree 的 closeCondMaxDepth / closeCondMaxNodes。
export const CLOSE_CONDITION_FIELD_SPECS: CloseConditionFieldSpec[] = [
  { key: 'evidence_count', label: '服务凭证张数', kind: 'count' },
  { key: 'service_seconds', label: '系统服务时长（秒）', kind: 'seconds' },
  { key: 'service_units', label: '成员上报服务量', kind: 'units' },
  { key: 'promised_service_units', label: '承诺服务量', kind: 'units' },
  { key: 'addon_units', label: '加钟量', kind: 'units' },
  { key: 'pending_addon_count', label: '待处理加钟数', kind: 'count' },
  { key: 'open_aftersale_count', label: '进行中售后数', kind: 'count' },
];

export const CLOSE_CONDITION_OPERATORS: CloseConditionOperator[] = [
  '>=',
  '>',
  '<=',
  '<',
  '==',
  '!=',
];

export const CLOSE_CONDITION_MAX_DEPTH = 5;
export const CLOSE_CONDITION_MAX_NODES = 50;

// 条件树组合节点支持的逻辑运算：与后端 closeCondOpAnd / closeCondOpOr / closeCondOpNot 对齐。
export type CloseConditionGroupOp = 'and' | 'or' | 'not';

export interface EsportsCloseRule {
  id: number;
  code: string;
  name: string;
  scope: CloseRuleScope;
  scope_key: string;
  min_evidence: number;
  require_duration: boolean;
  require_no_pending_addon: boolean;
  require_no_open_aftersale: boolean;
  review_threshold_cents: number;
  // 通用 AND/OR 条件树；为空表示使用上面的结构化条件项。
  condition_tree: CloseConditionNode | null;
  status: CloseRuleStatus;
  version: number;
  created_by_admin_id: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CloseRuleInput {
  code: string;
  name: string;
  scope: CloseRuleScope;
  scope_key: string;
  min_evidence: number;
  require_duration: boolean;
  require_no_pending_addon: boolean;
  require_no_open_aftersale: boolean;
  review_threshold_cents: number;
  condition_tree?: CloseConditionNode | null;
  note?: string;
}

// 结单条件逐项状态：条件不满足时结单按钮置灰，口径与结单拦截一致。
export const getOrderCloseConditions = (orderId: number) =>
  axios.get<ApiResponse<CloseConditionStatus>>(
    `${base}/orders/${orderId}/close-conditions`
  );

export const listCloseRules = () =>
  axios.get<ApiResponse<EsportsCloseRule[]>>(`${base}/close-rules`);

export const createCloseRule = (input: CloseRuleInput) =>
  axios.post<ApiResponse<EsportsCloseRule>>(`${base}/close-rules`, input);

export const updateCloseRule = (
  id: number,
  expectedVersion: number,
  input: CloseRuleInput
) =>
  axios.put<ApiResponse<EsportsCloseRule>>(`${base}/close-rules/${id}`, {
    expected_version: expectedVersion,
    ...input,
  });

export const activateCloseRule = (id: number) =>
  axios.post<ApiResponse<EsportsCloseRule>>(
    `${base}/close-rules/${id}/activate`
  );

export const rollbackCloseRule = (id: number) =>
  axios.post<ApiResponse<EsportsCloseRule>>(
    `${base}/close-rules/${id}/rollback`
  );

// ── 结单表单设计器：字段库与模板 ──

export type CloseFormFieldType =
  | 'text'
  | 'number'
  | 'money'
  | 'select'
  | 'multiselect'
  | 'datetime'
  | 'image'
  | 'switch'
  | 'reference';

export interface EsportsCloseFormField {
  id: number;
  key: string;
  label: string;
  field_type: CloseFormFieldType;
  required: boolean;
  options: string[] | null;
  max_length: number;
  enabled: boolean;
  sort_order: number;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CloseFormFieldInput {
  key: string;
  label: string;
  field_type: CloseFormFieldType;
  required: boolean;
  options: string[];
  max_length: number;
  sort_order: number;
  note?: string;
}

export interface CloseFormFieldBinding {
  field_key: string;
  required: boolean;
  sort: number;
}

export type CloseFormScope = 'global' | 'game' | 'sku';
export type CloseFormStatus = 'draft' | 'active' | 'history';

export interface EsportsCloseFormTemplate {
  id: number;
  code: string;
  name: string;
  scope: CloseFormScope;
  scope_key: string;
  min_cents: number;
  max_cents: number;
  fields: CloseFormFieldBinding[] | null;
  status: CloseFormStatus;
  version: number;
  created_by_admin_id: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CloseFormTemplateInput {
  code: string;
  name: string;
  scope: CloseFormScope;
  scope_key: string;
  min_cents: number;
  max_cents: number;
  fields: CloseFormFieldBinding[];
  note?: string;
}

export const listCloseFormFields = () =>
  axios.get<ApiResponse<EsportsCloseFormField[]>>(`${base}/close-form-fields`);

export const createCloseFormField = (input: CloseFormFieldInput) =>
  axios.post<ApiResponse<EsportsCloseFormField>>(
    `${base}/close-form-fields`,
    input
  );

export const updateCloseFormField = (
  id: number,
  expectedVersion: number,
  input: CloseFormFieldInput
) =>
  axios.put<ApiResponse<EsportsCloseFormField>>(
    `${base}/close-form-fields/${id}`,
    { expected_version: expectedVersion, ...input }
  );

export const setCloseFormFieldStatus = (id: number, enabled: boolean) =>
  axios.post<ApiResponse<EsportsCloseFormField>>(
    `${base}/close-form-fields/${id}/status`,
    { enabled }
  );

export const listCloseFormTemplates = () =>
  axios.get<ApiResponse<EsportsCloseFormTemplate[]>>(
    `${base}/close-form-templates`
  );

export const createCloseFormTemplate = (input: CloseFormTemplateInput) =>
  axios.post<ApiResponse<EsportsCloseFormTemplate>>(
    `${base}/close-form-templates`,
    input
  );

export const updateCloseFormTemplate = (
  id: number,
  expectedVersion: number,
  input: CloseFormTemplateInput
) =>
  axios.put<ApiResponse<EsportsCloseFormTemplate>>(
    `${base}/close-form-templates/${id}`,
    { expected_version: expectedVersion, ...input }
  );

export const activateCloseFormTemplate = (id: number) =>
  axios.post<ApiResponse<EsportsCloseFormTemplate>>(
    `${base}/close-form-templates/${id}/activate`
  );

export const rollbackCloseFormTemplate = (id: number) =>
  axios.post<ApiResponse<EsportsCloseFormTemplate>>(
    `${base}/close-form-templates/${id}/rollback`
  );

export interface EsportsCloseFormSnapshot {
  id: number;
  order_id: number;
  template_id: number;
  template_code: string;
  template_version: number;
  values: Record<string, unknown> | null;
  note: string;
  submitted_by_admin_id: number | null;
  created_at: string;
}

// 订单结单配置视图：适用模板与字段、最近一次快照、提交规则摘要与未上报成员（供结单弹窗渲染）。
export interface OrderCloseFormView {
  template: EsportsCloseFormTemplate | null;
  fields: EsportsCloseFormField[];
  latest_snapshot: EsportsCloseFormSnapshot | null;
  submit_rule: OrderCloseSubmitSummary | null;
  unsubmitted: UnsubmittedMember[];
  // 结单前必须逐张查看的服务段凭证图片附件 ID（，升序去重；无图片凭证为空数组）。
  // 结单弹窗据此渲染确认清单，确认后原样回传 closeOrder 的 viewedEvidenceAttachmentIds。
  evidence_attachment_ids: number[];
}

export const getOrderCloseForm = (orderId: number) =>
  axios.get<ApiResponse<OrderCloseFormView>>(
    `${base}/orders/${orderId}/close-form`
  );

// ── 结单提交规则：单人 / 多人 / 自定义（代提交、提交比例、未提交处理） ──

export interface EsportsCloseSubmitRule {
  id: number;
  code: string;
  name: string;
  scope: CloseFormScope;
  scope_key: string;
  mode: CloseSubmitMode;
  min_submit_ratio_bp: number;
  allow_substitute: boolean;
  on_missing: CloseSubmitOnMissing;
  status: CloseFormStatus;
  version: number;
  created_by_admin_id: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CloseSubmitRuleInput {
  code: string;
  name: string;
  scope: CloseFormScope;
  scope_key: string;
  mode: CloseSubmitMode;
  min_submit_ratio_bp: number;
  allow_substitute: boolean;
  on_missing: CloseSubmitOnMissing;
  note?: string;
}

export const listCloseSubmitRules = () =>
  axios.get<ApiResponse<EsportsCloseSubmitRule[]>>(
    `${base}/close-submit-rules`
  );

export const createCloseSubmitRule = (input: CloseSubmitRuleInput) =>
  axios.post<ApiResponse<EsportsCloseSubmitRule>>(
    `${base}/close-submit-rules`,
    input
  );

export const updateCloseSubmitRule = (
  id: number,
  expectedVersion: number,
  input: CloseSubmitRuleInput
) =>
  axios.put<ApiResponse<EsportsCloseSubmitRule>>(
    `${base}/close-submit-rules/${id}`,
    { expected_version: expectedVersion, ...input }
  );

export const activateCloseSubmitRule = (id: number) =>
  axios.post<ApiResponse<EsportsCloseSubmitRule>>(
    `${base}/close-submit-rules/${id}/activate`
  );

export const rollbackCloseSubmitRule = (id: number) =>
  axios.post<ApiResponse<EsportsCloseSubmitRule>>(
    `${base}/close-submit-rules/${id}/rollback`
  );

// ── 结单审批流：节点串行编排、审批角色与超时策略 ──

export type CloseApprovalRole = 'admin' | 'super_admin';
export type CloseApprovalStepStatus = 'pending' | 'approved' | 'rejected';

export interface CloseApprovalNode {
  seq: number;
  name: string;
  role: CloseApprovalRole;
  timeout_hours: number;
  auto_pass_on_timeout: boolean;
  involves_funds: boolean;
}

export interface EsportsCloseApprovalFlow {
  id: number;
  code: string;
  name: string;
  scope: CloseFormScope;
  scope_key: string;
  min_cents: number;
  nodes: CloseApprovalNode[] | null;
  status: CloseFormStatus;
  version: number;
  created_by_admin_id: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CloseApprovalFlowInput {
  code: string;
  name: string;
  scope: CloseFormScope;
  scope_key: string;
  min_cents: number;
  nodes: CloseApprovalNode[];
  note?: string;
}

export const listCloseApprovalFlows = () =>
  axios.get<ApiResponse<EsportsCloseApprovalFlow[]>>(
    `${base}/close-approval-flows`
  );

export const createCloseApprovalFlow = (input: CloseApprovalFlowInput) =>
  axios.post<ApiResponse<EsportsCloseApprovalFlow>>(
    `${base}/close-approval-flows`,
    input
  );

export const updateCloseApprovalFlow = (
  id: number,
  expectedVersion: number,
  input: CloseApprovalFlowInput
) =>
  axios.put<ApiResponse<EsportsCloseApprovalFlow>>(
    `${base}/close-approval-flows/${id}`,
    { expected_version: expectedVersion, ...input }
  );

export const activateCloseApprovalFlow = (id: number) =>
  axios.post<ApiResponse<EsportsCloseApprovalFlow>>(
    `${base}/close-approval-flows/${id}/activate`
  );

export const rollbackCloseApprovalFlow = (id: number) =>
  axios.post<ApiResponse<EsportsCloseApprovalFlow>>(
    `${base}/close-approval-flows/${id}/rollback`
  );

export interface CloseApprovalStep {
  seq: number;
  name: string;
  role: CloseApprovalRole;
  status: CloseApprovalStepStatus;
  admin_id: number;
  at: string | null;
  reason: string;
  auto_passed: boolean;
}

export interface EsportsCloseApproval {
  id: number;
  order_id: number;
  flow_id: number;
  flow_code: string;
  flow_version: number;
  current_seq: number;
  status: CloseApprovalStepStatus;
  steps: CloseApprovalStep[] | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OrderCloseApprovalView {
  approval: EsportsCloseApproval | null;
  current_node: CloseApprovalStep | null;
}

export const getOrderCloseApproval = (orderId: number) =>
  axios.get<ApiResponse<OrderCloseApprovalView>>(
    `${base}/orders/${orderId}/close-approval`
  );

// ════ 管理端接线补齐（对应 .dsh-fix/wiring-catalog.md）════
// 路径、方法、路径参数与请求体字段一律以 go-admin/internal/apps/esports/app.go
// 的路由表与同目录 *_handlers.go 实际解析的 JSON 字段为准。

// ── 商品父实体 / 规格组 / 逐席角色 ──
// ── 商品 停服：申请 → 异人审批 → 受影响订单逐单处置 ──
export type SkuSuspensionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'cancelled';
export type SkuSuspensionEffectiveMode = 'immediate' | 'scheduled';
export type SkuSuspensionItemStatus = 'pending' | 'done' | 'failed';
export type SkuSuspensionSuggestedAction =
  | 'cancel_refund'
  | 'reschedule'
  | 'keep';

export interface EsportsSkuSuspension {
  id: number;
  product_id: number;
  requested_by_admin_id: number;
  reason: string;
  effective_mode: SkuSuspensionEffectiveMode;
  effective_at: string | null;
  status: SkuSuspensionStatus;
  reviewed_by_admin_id: number | null;
  review_note: string;
  reviewed_at: string | null;
  affected_order_count: number;
  affected_snapshot: Record<string, unknown> | null;
  applied_at: string | null;
  cancelled_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EsportsSkuSuspensionItem {
  id: number;
  suspension_id: number;
  order_id: number;
  order_no: string;
  order_status: string;
  payment_status: string;
  suggested_action: SkuSuspensionSuggestedAction;
  action: string;
  status: SkuSuspensionItemStatus;
  note: string;
  handled_by_admin_id: number | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkuSuspensionProgress {
  total: number;
  pending: number;
  done: number;
  failed: number;
}

export interface SkuSuspensionReport {
  suspension: EsportsSkuSuspension;
  items: EsportsSkuSuspensionItem[];
  progress: SkuSuspensionProgress;
}

export interface SkuSuspensionRequestInput {
  reason: string;
  // immediate 审批通过即下架；scheduled 到 effective_at 才下架。
  effective_mode: SkuSuspensionEffectiveMode;
  // 仅 scheduled 必填，且须晚于当前时间。
  effective_at?: string;
}

export interface SkuSuspensionDecisionInput {
  approve: boolean;
  note?: string;
}

export interface SkuSuspensionDisposalInput {
  action: SkuSuspensionSuggestedAction;
  note?: string;
  // 仅 action=reschedule 必填。
  start_at?: string;
}

export const requestSkuSuspension = (
  skuId: number,
  input: SkuSuspensionRequestInput
) =>
  axios.post<ApiResponse<EsportsSkuSuspension>>(
    `${base}/products/${skuId}/suspensions`,
    input
  );

export const listSkuSuspensions = (status?: SkuSuspensionStatus) =>
  axios.get<ApiResponse<EsportsSkuSuspension[]>>(
    `${base}/product-suspensions`,
    {
      params: { status },
    }
  );

export const getSkuSuspension = (id: number) =>
  axios.get<ApiResponse<SkuSuspensionReport>>(
    `${base}/product-suspensions/${id}`
  );

export const decideSkuSuspension = (
  id: number,
  input: SkuSuspensionDecisionInput
) =>
  axios.post<ApiResponse<EsportsSkuSuspension>>(
    `${base}/product-suspensions/${id}/decision`,
    input
  );

export const cancelSkuSuspension = (id: number) =>
  axios.post<ApiResponse<EsportsSkuSuspension>>(
    `${base}/product-suspensions/${id}/cancel`
  );

export const disposeSkuSuspensionOrder = (
  suspensionId: number,
  orderId: number,
  input: SkuSuspensionDisposalInput
) =>
  axios.post<ApiResponse<EsportsSkuSuspensionItem>>(
    `${base}/product-suspensions/${suspensionId}/orders/${orderId}/disposal`,
    input
  );

// ── 订单动作：取消试算 / 改期提案 / 收款发起 / 过期档期处置 / 释放回池 ──
export interface CancelPolicy {
  free_hours: number;
  fee_bp: number;
}

export interface CancelQuote {
  order_id: number;
  order_no: string;
  policy: CancelPolicy;
  anchor_at: string;
  free_until: string;
  free_cancel: boolean;
  payable_cents: number;
  refunded_cents: number;
  refund_reserved_cents: number;
  fee_cents: number;
  refund_cents: number;
  cancelable: boolean;
  blocked_reason: string;
}

// 取消试算（公示取消政策）：给出免费窗口、手续费与应退金额。
export const previewCancelOrder = (orderId: number) =>
  axios.get<ApiResponse<CancelQuote>>(
    `${base}/orders/${orderId}/cancel-preview`
  );

export type RescheduleProposalStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'expired'
  | 'withdrawn';
export type RescheduleConfirmerType = 'customer' | 'player';

export interface EsportsRescheduleProposal {
  id: number;
  proposal_no: string;
  order_id: number;
  order_version: number;
  from_start_at: string | null;
  from_service_duration_minutes: number;
  to_start_at: string;
  to_service_duration_minutes: number;
  status: RescheduleProposalStatus;
  expires_at: string;
  proposed_by_admin_id: number;
  reason: string;
  active_order_id: number | null;
  decided_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface EsportsRescheduleConfirmation {
  id: number;
  proposal_id: number;
  order_id: number;
  confirmer_type: RescheduleConfirmerType;
  confirmer_id: number;
  seat_index: number;
  decision: 'confirmed' | 'rejected';
  note: string;
  decided_at: string;
  created_at: string;
}

export interface ReschedulePendingConfirmer {
  type: RescheduleConfirmerType;
  id: number;
  seat_index: number;
}

export interface RescheduleProposalView extends EsportsRescheduleProposal {
  // 仅进行中（pending）提案带确认进度，其余为 null。
  confirmations: EsportsRescheduleConfirmation[] | null;
  pending_confirmers: ReschedulePendingConfirmer[] | null;
}

export interface RescheduleProposalInput {
  expected_version: number;
  start_at: string;
  service_duration_minutes: number;
  reason: string;
}

// 限时改期提案：已付款订单改期须客户与已接单成员逐人确认。
export const listOrderRescheduleProposals = (orderId: number) =>
  axios.get<ApiResponse<RescheduleProposalView[]>>(
    `${base}/orders/${orderId}/reschedule-proposals`
  );

export const proposeOrderReschedule = (
  orderId: number,
  input: RescheduleProposalInput
) =>
  axios.post<ApiResponse<EsportsRescheduleProposal>>(
    `${base}/orders/${orderId}/reschedule-proposals`,
    input
  );

export const withdrawRescheduleProposal = (id: number) =>
  axios.post<ApiResponse<EsportsRescheduleProposal>>(
    `${base}/reschedule-proposals/${id}/withdraw`
  );

// 收款发起：返回渠道收银台地址，未开通渠道后端返回 503。
export interface OrderPaymentStartView {
  intent_no: string;
  channel: string;
  pay_url: string;
  amount_cents: number;
  expires_at: string;
}

export const startOrderPayment = (orderId: number, channel: string) =>
  axios.post<ApiResponse<OrderPaymentStartView>>(
    `${base}/orders/${orderId}/payment/start`,
    { channel }
  );

// 过期档期处置：refund 全额退款 / reschedule 改期，两者受配置白名单约束。
export interface AppointmentDisposalInput {
  action: 'refund' | 'reschedule';
  reason: string;
  start_at?: string;
  expected_version: number;
}

export const disposeExpiredAppointment = (
  orderId: number,
  input: AppointmentDisposalInput
) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${orderId}/appointment/disposal`,
    input
  );

// 档期超时处置的可用方式（只读，后端 appointmentDisposalOptionView）：
// allowed_actions 是当前配置下允许的处置方式（refund / reschedule），
// current_action 是配置生效值（refund / reschedule / both，未配置或非法回落 both），
// expire_at 是本单档期确认截止时间（RFC3339，缺失时回落暂停派单时间，都缺失则为空字符串）。
// 前端据此渲染处置按钮，不再把 refund / reschedule 硬编码进页面。
export type AppointmentDisposalAction = 'refund' | 'reschedule';
export type AppointmentDisposalCurrentAction =
  | AppointmentDisposalAction
  | 'both';

export interface AppointmentDisposalOptions {
  allowed_actions: AppointmentDisposalAction[];
  current_action: AppointmentDisposalCurrentAction;
  expire_at: string;
}

export const getAppointmentDisposalOptions = (id: number) =>
  axios.get<ApiResponse<AppointmentDisposalOptions>>(
    `${base}/orders/${id}/appointment/disposal-options`
  );

// 释放到公共池：客服把待派单订单交回公共池。
export const releaseOrderToPool = (orderId: number, reason: string) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${orderId}/release-pool`,
    { reason }
  );

// ── 服务段代操作：客服代陪玩暂停 / 恢复、留痕更正与提前终止 ──
export interface PlayerServiceTiming {
  order_id: number;
  order_no: string;
  player_id: number;
  seat_index: number;
  status: string;
  started_at: string;
  paused_at: string | null;
  effective_seconds: number;
  paused_seconds: number;
  reported_units: number;
  promised_service_units: number;
  order_promised_service_units: number;
  order_served_units: number;
  order_total_units: number;
  unfulfilled_units: number;
}

export interface ServiceTimingCorrectionInput {
  effective_seconds: number;
  paused_seconds: number;
  // 责任方：陪玩 / 客服 / 客户 / 平台。
  responsibility: string;
  reason: string;
}

// 更正结果：留痕更正前后有效 / 暂停秒数与登记后停工量。
export interface ServiceTimingCorrection {
  order_id: number;
  player_id: number;
  seat_index: number;
  effective_seconds_before: number;
  effective_seconds_after: number;
  paused_seconds_before: number;
  paused_seconds_after: number;
  downtime_seconds: number;
  downtime_count: number;
  responsibility: string;
  reason: string;
  version: number;
}

export interface ServiceTerminationInput {
  terminated_units: number;
  // 责任方必填。
  responsibility: string;
  reason: string;
}

// 终止结果：登记已履约量 / 未履约量与责任方。
export interface ServiceTermination {
  order_id: number;
  player_id: number;
  seat_index: number;
  terminated_units: number;
  unfulfilled_units: number;
  promised_service_units: number;
  fault_party: string;
  effective_seconds: number;
  paused_seconds: number;
  reason: string;
  version: number;
}

export const pauseOrderPlayerService = (
  orderId: number,
  playerId: number,
  reason: string
) =>
  axios.post<ApiResponse<PlayerServiceTiming>>(
    `${base}/orders/${orderId}/players/${playerId}/service/pause`,
    { reason }
  );

export const resumeOrderPlayerService = (
  orderId: number,
  playerId: number,
  reason: string
) =>
  axios.post<ApiResponse<PlayerServiceTiming>>(
    `${base}/orders/${orderId}/players/${playerId}/service/resume`,
    { reason }
  );

export const correctOrderPlayerServiceTiming = (
  orderId: number,
  playerId: number,
  input: ServiceTimingCorrectionInput
) =>
  axios.post<ApiResponse<ServiceTimingCorrection>>(
    `${base}/orders/${orderId}/players/${playerId}/service/timing-correction`,
    input
  );

// 服务段计时只读快照（后端 serviceTimingReadout）：供「时长更正」弹窗预填当前有效时长
// 与可填上限，避免猜数被更正校验拒绝。
// - effective_seconds：当前有效服务秒数（暂停期间冻结；已结束服务段取落库的 system_seconds，
//   即上一次更正后的值）；
// - wall_clock_seconds：服务段墙钟跨度（开始到结束 / 现在）；
// - upper_bound_seconds：更正可填上限 = min(墙钟跨度, 订单标准时长 × 系数)，与更正校验同源；
// - paused_seconds：当前累计暂停秒数（进行中的暂停按当前时刻续算）。
// 目标陪玩在本单没有服务段时后端返回 403（与代暂停 / 更正同一「非本单成员」口径）。
export interface OrderServiceTimingReadout {
  order_id: number;
  player_id: number;
  seat_index: number;
  // 服务段状态（后端 EsportsServiceSegment.status，如 running / paused / finished）。
  status: string;
  effective_seconds: number;
  wall_clock_seconds: number;
  upper_bound_seconds: number;
  paused_seconds: number;
}

export const getOrderServiceTiming = (orderId: number, playerId: number) =>
  axios.get<ApiResponse<OrderServiceTimingReadout>>(
    `${base}/orders/${orderId}/players/${playerId}/service/timing`
  );

export const terminateOrderPlayerService = (
  orderId: number,
  playerId: number,
  input: ServiceTerminationInput
) =>
  axios.post<ApiResponse<ServiceTermination>>(
    `${base}/orders/${orderId}/players/${playerId}/service/terminate`,
    input
  );

// ── 售后自动建单规则 ──
export type AfterSaleRuleSourceType =
  | 'order'
  | 'gift'
  | 'recharge'
  | 'assessment';
export type AfterSaleRuleTriggerEvent =
  | 'order_closed'
  | 'service_segment_finished'
  | 'gift_paid'
  | 'manual';
export type AfterSaleRuleStatus = 'draft' | 'active' | 'disabled';
export type AfterSaleRuleMetric =
  | 'amount_deviation_bp'
  | 'amount_over_cents'
  | 'duration_shortage_minutes'
  | 'duration_shortage_bp'
  | 'none';

export interface EsportsAfterSaleRule {
  id: number;
  code: string;
  name: string;
  source_type: AfterSaleRuleSourceType;
  trigger_event: AfterSaleRuleTriggerEvent;
  metric: AfterSaleRuleMetric;
  // 阈值单位随 metric：基点 / 分 / 分钟；0 表示该规则不设阈值。
  threshold_value: number;
  window_minutes: number;
  scope_game: string;
  scope_product_id: number | null;
  after_sale_kind: AfterSaleKind;
  // 建单通道：system 自动建单 / admin 只推待办由客服确认后建单。
  channel: 'system' | 'admin';
  fault_party: string;
  // 命中是否直接建单（false 表示只留痕 + 待办）。
  auto_create: boolean;
  // 多条规则同时命中时按 priority 从大到小取第一条。
  priority: number;
  note: string;
  status: AfterSaleRuleStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AfterSaleRuleInput {
  code: string;
  name: string;
  source_type: AfterSaleRuleSourceType;
  trigger_event: AfterSaleRuleTriggerEvent;
  metric: AfterSaleRuleMetric;
  threshold_value: number;
  window_minutes: number;
  scope_game: string;
  scope_product_id: number | null;
  after_sale_kind: AfterSaleKind;
  channel: 'system' | 'admin';
  fault_party: string;
  auto_create?: boolean;
  priority: number;
  note: string;
  status: AfterSaleRuleStatus;
  // 编辑时必填（乐观锁），新建可省略。
  version?: number;
}

export interface AfterSaleRuleHit {
  id: number;
  rule_id: number;
  rule_code: string;
  source_type: string;
  source_id: number;
  metric_value: number;
  threshold_value: number;
  after_sale_id: number;
  dedup_key: string;
  created_at: string;
}

export const listAfterSaleRules = (
  params: { status?: AfterSaleRuleStatus; limit?: number } = {}
) =>
  axios.get<ApiResponse<EsportsAfterSaleRule[]>>(`${base}/after-sales/rules`, {
    params,
  });

export const getAfterSaleRule = (id: number) =>
  axios.get<ApiResponse<EsportsAfterSaleRule>>(
    `${base}/after-sales/rules/${id}`
  );

export const createAfterSaleRule = (input: AfterSaleRuleInput) =>
  axios.post<ApiResponse<EsportsAfterSaleRule>>(
    `${base}/after-sales/rules`,
    input
  );

export const updateAfterSaleRule = (
  id: number,
  input: AfterSaleRuleInput & { version: number }
) =>
  axios.put<ApiResponse<EsportsAfterSaleRule>>(
    `${base}/after-sales/rules/${id}`,
    input
  );

// 删除未命中的规则；已命中规则明确拒绝，提示改为停用。
export const deleteAfterSaleRule = (id: number) =>
  axios.delete<ApiResponse<{ id: number; deleted: boolean }>>(
    `${base}/after-sales/rules/${id}`
  );

// 命中留痕（pending=1 只看未自动建单的客服待办命中）。
export const listAfterSaleRuleHits = (
  params: {
    rule_id?: number;
    source_type?: string;
    pending?: boolean;
    limit?: number;
  } = {}
) =>
  axios.get<ApiResponse<AfterSaleRuleHit[]>>(`${base}/after-sales/rule-hits`, {
    params: { ...params, pending: params.pending ? '1' : undefined },
  });

// ── 按充值批次退款执行 ──
export type RechargeRefundExecutionStatus = 'pending' | 'executed';

export interface EsportsRechargeRefundExecution {
  id: number;
  execution_no: string;
  idem_key: string;
  after_sale_id: number;
  account_type: string;
  account_id: string;
  batch_source_type: string;
  batch_source_id: string;
  amount_cents: number;
  status: RechargeRefundExecutionStatus;
  executed_by_admin_id: number | null;
  executed_at: string | null;
  finance_ref: string;
  version: number;
  created_at: string;
  updated_at: string;
}

// 按售后单 + 批次来源拆分生成退款执行明细，重复执行不重复落账。
export const executeAfterSaleRefundByBatch = (afterSaleId: number) =>
  axios.post<ApiResponse<EsportsRechargeRefundExecution[]>>(
    `${base}/after-sales/${afterSaleId}/refund-execute`
  );

// 财务登记外部打款后把执行明细置为 executed。
export const markRechargeRefundExecuted = (id: number, financeRef: string) =>
  axios.post<ApiResponse<EsportsRechargeRefundExecution>>(
    `${base}/recharge-refund-executions/${id}/execute`,
    { finance_ref: financeRef }
  );

// 退款执行批次列表（只读，后端 rechargeRefundExecutionView）：
// status 留空不过滤，只接受 pending / executed（非法值后端中文报错，不静默放行）；
// limit 夹在 1~200，缺省 100。列表项比 POST 返回的 ent 行多了 after_sale_no（关联售后单号，
// 单号缺失时为空字符串），但不含 idem_key / version，故单独建模，避免把两种读模型混用。
export interface RechargeRefundExecutionView {
  id: number;
  execution_no: string;
  status: RechargeRefundExecutionStatus;
  // 该批次本次外部应打款金额（分）。
  amount_cents: number;
  after_sale_id: number;
  after_sale_no: string;
  account_type: string;
  account_id: string;
  batch_source_type: string;
  batch_source_id: string;
  executed_by_admin_id: number | null;
  // pending 时为空。
  executed_at: string | null;
  finance_ref: string;
  created_at: string;
  updated_at: string;
}

export interface RechargeRefundExecutionListParams {
  status?: RechargeRefundExecutionStatus;
  limit?: number;
}

export const listRechargeRefundExecutions = (
  params: RechargeRefundExecutionListParams = {}
) =>
  axios.get<ApiResponse<RechargeRefundExecutionView[]>>(
    `${base}/recharge-refund-executions`,
    { params }
  );

// ── 渠道撤销 / 拒付 ──
export type PaymentReversalKind = 'revoked' | 'chargeback';
export type PaymentReversalStatus = 'pending' | 'handled' | 'rejected';
export type PaymentReversalAction =
  | 'none'
  | 'mark_exception'
  | 'suspend_customer'
  | 'ignore';

export interface EsportsPaymentReversal {
  id: number;
  reversal_no: string;
  receipt_id: number;
  order_id: number;
  channel: string;
  transaction_no: string;
  amount_cents: number;
  kind: PaymentReversalKind;
  status: PaymentReversalStatus;
  reason: string;
  evidence_ref: string;
  submitted_by_admin_id: number | null;
  handled_by_admin_id: number | null;
  handled_at: string | null;
  resolution: string;
  action: PaymentReversalAction;
  version: number;
  created_at: string;
  updated_at: string;
}

// 登记渠道撤销 / 拒付：字段与后端 paymentReversalInput 一一对应。
// 后端校验：receipt_id ≥ 1、amount_cents ≥ 1、reason 4–255 字；
// kind 留空按 revoked；evidence_ref 可为空但不超过 255 字。
export interface PaymentReversalInput {
  // 被撤销的那笔渠道回执（EsportsPaymentReceipt）ID。
  receipt_id: number;
  // revoked 渠道撤销 / chargeback 拒付。
  kind: PaymentReversalKind;
  amount_cents: number;
  reason: string;
  evidence_ref: string;
}

export interface PaymentReversalDecisionInput {
  action: PaymentReversalAction;
  resolution: string;
  risk_reason: string;
}

export const listPaymentReversals = (
  params: {
    order_no?: string;
    status?: PaymentReversalStatus;
    limit?: number;
  } = {}
) =>
  axios.get<ApiResponse<EsportsPaymentReversal[]>>(
    `${base}/payment-reversals`,
    { params }
  );

export const registerPaymentReversal = (input: PaymentReversalInput) =>
  axios.post<ApiResponse<EsportsPaymentReversal>>(
    `${base}/payment-reversals`,
    input
  );

// 处置登记后由非登记人执行（职责分离）。
export const decidePaymentReversal = (
  id: number,
  input: PaymentReversalDecisionInput
) =>
  axios.post<ApiResponse<EsportsPaymentReversal>>(
    `${base}/payment-reversals/${id}/decision`,
    input
  );

// ── 充值意图财务核验 ──
export interface RechargeIntentVerifyInput {
  approve: boolean;
  received_cents: number;
  // 核验说明 8–255 字。
  evidence_note: string;
}

export interface RechargeIntentView {
  intent_no: string;
  intent_status: string;
  customer_id: number;
  principal_cents: number;
  bonus_cents: number;
  rule_snapshot: Record<string, unknown> | null;
  snapshot_at: string;
  payment_channel: string;
  payment_ref: string;
  payable_cents: number;
  pay_window_expires_at: string;
}

export const verifyRechargeIntent = (
  intentNo: string,
  input: RechargeIntentVerifyInput
) =>
  axios.post<ApiResponse<RechargeIntentView>>(
    `${base}/recharge-intents/${intentNo}/verify`,
    input
  );

// ── 外部渠道退款登记（补全） ──
export type ExternalRefundStatus = 'registered' | 'executed';

export interface EsportsExternalRefund {
  id: number;
  refund_no: string;
  channel: string;
  transaction_no: string;
  amount_cents: number;
  // 列表视图附带：订单号。
  order_no?: string;
  order_id: number;
  aftersale_id: number | null;
  status: ExternalRefundStatus;
  reason: string;
  registered_by_admin_id: number | null;
  executed_by_admin_id: number | null;
  executed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalRefundInput {
  channel: string;
  transaction_no: string;
  amount_cents: number;
  order_no: string;
  aftersale_id?: number | null;
  reason: string;
}

export const listExternalRefunds = (
  params: { order_no?: string; status?: ExternalRefundStatus } = {}
) =>
  axios.get<ApiResponse<EsportsExternalRefund[]>>(`${base}/external-refunds`, {
    params,
  });

export const registerExternalRefund = (input: ExternalRefundInput) =>
  axios.post<ApiResponse<EsportsExternalRefund>>(
    `${base}/external-refunds`,
    input
  );

// 财务核验并执行，同时对齐订单退款状态。
export const executeExternalRefund = (id: number) =>
  axios.post<ApiResponse<EsportsExternalRefund>>(
    `${base}/external-refunds/${id}/execute`
  );

// ── 按充值批次的退款试算：余额账户退款试算口径 ──
export interface RechargeRefundBatch {
  batch_source_type: string;
  batch_source_id: string;
  fund_batch: string;
  entry_role: string;
  created_at: string;
  original_cents: number;
  principal_cents: number;
  bonus_cents: number;
  allocated_cents: number;
  remaining_by_allocation_cents: number;
  principal_remaining_cents: number;
  bonus_remaining_cents: number;
  refundable_cents: number;
  bonus_forfeited_cents: number;
  bonus_expires_at?: string | null;
  bonus_expired: boolean;
  over_allocated: boolean;
  split_known: boolean;
}

export interface RechargeRefundQuoteBasis {
  version: string;
  batch_scope: string;
  allocation_rule: string;
  remaining_rule: string;
  refund_rule: string;
  wallet_principal_cents: number;
  wallet_bonus_cents: number;
  batch_principal_in_cents: number;
  batch_bonus_in_cents: number;
}

// 账本核验异常类型（后端 ledger_reconcile.go / ledger_sum_reconcile.go 的常量字面量，
// 与事件 key 一起构成对外契约）：余额为负 / 分摊引用批次缺失 / 批次超分摊 /
// 钱包流水求和与批次账本求和不一致 / 预付账户出账未登记批次。
export type LedgerReconcileAnomalyKind =
  | 'account_negative_balance'
  | 'allocation_batch_missing'
  | 'batch_over_allocated'
  | 'wallet_batch_sum_mismatch'
  | 'wallet_outflow_unbooked';

// 按批次退款试算的异常类型（后端 recharge_refund_quote.go 的常量字面量）：
// 批次超分摊 / 批次无法拆分本金与赠送 / 账户余额大于批次合计（未落批次资金）。
export type RefundQuoteAnomalyKind =
  | 'refund_quote_batch_over_allocated'
  | 'refund_quote_batch_split_unknown'
  | 'refund_quote_unbatched_balance';

// 同一份 ledgerAnomaly 结构同时服务「账本核验异常」与「退款试算异常」两个读模型，
// 故 kind 取两者并集；页面按所属接口判断具体取值。
export type LedgerAnomalyKind =
  | LedgerReconcileAnomalyKind
  | RefundQuoteAnomalyKind;

export interface LedgerAnomaly {
  kind: LedgerAnomalyKind;
  account_type: string;
  account_id: string;
  detail: string;
}

export interface RechargeRefundQuote {
  account_type: string;
  account_id: string;
  quoted_at: string;
  basis: RechargeRefundQuoteBasis;
  batches: RechargeRefundBatch[];
  refundable_principal_cents: number;
  forfeited_bonus_cents: number;
  batch_principal_remaining_cents: number;
  batch_bonus_remaining_cents: number;
  anomalies: LedgerAnomaly[];
}

// 余额账户按批次退款试算（id 为钱包归属人，即客户 ID）。
export const getWalletRefundQuote = (ownerId: number) =>
  axios.get<ApiResponse<RechargeRefundQuote>>(
    `${base}/wallets/${ownerId}/refund-quote`
  );

// ── 账本核验异常 ──
export interface LedgerReconcileAnomaly {
  event_key: string;
  occurred_at: string;
  scanned_accounts: number;
  scanned_allocations: number;
  scanned_batches: number;
  scanned_wallet_sums: number;
  scan_truncated: boolean;
  anomaly_overflow: boolean;
  anomaly_count: number;
  anomalies: LedgerAnomaly[];
}

// 最近的账本核验异常事件（按时间倒序）。后端只接受 ?limit=（夹在 1~200，
// 缺省 20），没有分页 / 偏移参数，也没有 kind 过滤：要按异常类型筛选只能在页面侧
// 对返回项的 anomalies[].kind 做二次过滤。
export const listLedgerReconcileAnomalies = (limit?: number) =>
  axios.get<ApiResponse<LedgerReconcileAnomaly[]>>(
    `${base}/ledger-reconcile-anomalies`,
    { params: { limit } }
  );

// ── 礼物档位与礼物收款 ──
export interface EsportsGiftTier {
  id: number;
  gift_id: number;
  tier_code: string;
  name: string;
  price_cents: number;
  high_value: boolean;
  require_age: boolean;
  is_default: boolean;
  sort_order: number;
  status: 'enabled' | 'disabled';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface GiftTierInput {
  tier_code: string;
  name: string;
  price_cents: number;
  high_value: boolean;
  require_age: boolean;
  is_default: boolean;
  sort_order: number;
  status: 'enabled' | 'disabled';
}

export interface GiftPaymentStartInput {
  channel: string;
  client_key?: string;
}

export interface GiftPaymentStartView {
  intent_id: number;
  payment_intent_no: string;
  channel: string;
  payment_status: string;
  payable_cents: number;
  pay_url: string;
  expires_at: string;
}

export interface GiftPaymentVerifyInput {
  approve: boolean;
  payment_ref: string;
  received_cents: number;
  evidence_note: string;
}

export const listGiftTiers = (
  giftId: number,
  status?: 'enabled' | 'disabled'
) =>
  axios.get<ApiResponse<EsportsGiftTier[]>>(`${base}/gifts/${giftId}/tiers`, {
    params: { status },
  });

export const createGiftTier = (giftId: number, input: GiftTierInput) =>
  axios.post<ApiResponse<EsportsGiftTier>>(
    `${base}/gifts/${giftId}/tiers`,
    input
  );

// 编辑档位：gift_id / tier_code 不可改，须带 expected_version。
export const updateGiftTier = (
  id: number,
  input: GiftTierInput & { expected_version: number }
) => axios.put<ApiResponse<EsportsGiftTier>>(`${base}/gift-tiers/${id}`, input);

// 删除档位：已被礼物单引用时后端拒绝（只能停用）。
export const deleteGiftTier = (id: number, expectedVersion?: number) =>
  axios.delete<ApiResponse<{ id: number; deleted: boolean }>>(
    `${base}/gift-tiers/${id}`,
    { params: { expected_version: expectedVersion } }
  );

// 对礼物确认单发起收款：未开通渠道明确失败。
export const startGiftPayment = (
  intentId: number,
  input: GiftPaymentStartInput
) =>
  axios.post<ApiResponse<GiftPaymentStartView>>(
    `${base}/gift-intents/${intentId}/payment/start`,
    input
  );

// 财务核销礼物收款并成单；驳回时返回 { intent_id, payment_status: 'failed' }。
export const verifyGiftPayment = (
  intentId: number,
  input: GiftPaymentVerifyInput
) =>
  axios.post<
    ApiResponse<GiftOrder | { intent_id: number; payment_status: string }>
  >(`${base}/gift-intents/${intentId}/payment/verify`, input);

// ── 陪玩：可用时段 / 责任信用 / 期望报价复核 ──
export interface PlayerAvailabilitySlot {
  start: string;
  end: string;
  status: string;
  bookable: boolean;
  reason?: string;
  order_no?: string;
}

export interface PlayerAvailabilityView {
  player_id: number;
  player_name: string;
  from: string;
  to: string;
  slot_minutes: number;
  occupied_count: number;
  available_count: number;
  slots: PlayerAvailabilitySlot[];
}

export const getPlayerAvailability = (
  playerId: number,
  params: { from?: string; to?: string; slot_minutes?: number } = {}
) =>
  axios.get<ApiResponse<PlayerAvailabilityView>>(
    `${base}/players/${playerId}/availability`,
    { params }
  );

export type PlayerCreditEventStatus =
  | 'recorded'
  | 'penalty_applied'
  | 'cleared';

export interface EsportsPlayerCreditEvent {
  id: number;
  event_no: string;
  player_id: number;
  order_id: number;
  after_sale_id: number;
  recovery_id: number;
  kind: string;
  amount_cents: number;
  note: string;
  status: PlayerCreditEventStatus;
  recorded_by_admin_id: number | null;
  reviewed_by_admin_id: number | null;
  reviewed_at: string | null;
  review_note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerCreditReviewInput {
  // penalty 确认责任并暂停接单 / clear 判定不构成责任。
  action: 'penalty' | 'clear';
  note: string;
}

export const listPlayerCreditEvents = (
  params: { player_id?: number; status?: PlayerCreditEventStatus } = {}
) =>
  axios.get<ApiResponse<EsportsPlayerCreditEvent[]>>(
    `${base}/player-credit-events`,
    { params }
  );

export const reviewPlayerCreditEvent = (
  id: number,
  input: PlayerCreditReviewInput
) =>
  axios.post<ApiResponse<EsportsPlayerCreditEvent>>(
    `${base}/player-credit-events/${id}/review`,
    input
  );

// 运营复核陪玩期望报价：返回陪玩自助档案视图。
export interface PlayerSelfProfile {
  id: number;
  display_name: string;
  phone: string;
  qualification: string;
  presence: string;
  level: string;
  level_appraised_at: string | null;
  daily_limit: number;
  concurrent_limit: number;
  games: string[];
  service_slot_start_minute: number;
  service_slot_end_minute: number;
  auto_online: boolean;
  accept_price_min_cents: number;
  accept_price_max_cents: number;
  fixed_team_enabled: boolean;
  fixed_team_slot_start_minute: number;
  fixed_team_slot_end_minute: number;
  expected_price_cents: number;
  expected_price_status: ExpectedPriceStatus;
  expected_price_submitted_at: string | null;
  expected_price_reviewed_at: string | null;
  expected_price_review_note: string;
  version: number;
  updated_at: string;
}

export const reviewPlayerExpectedPrice = (
  playerId: number,
  input: { approve: boolean; note: string }
) =>
  axios.post<ApiResponse<PlayerSelfProfile>>(
    `${base}/players/${playerId}/expected-price/review`,
    input
  );

// ── 客服在线状态 ──
export type CsPresence = 'online' | 'busy' | 'offline';

export interface CsPresenceRecord {
  id: number;
  admin_id: number;
  presence: CsPresence;
  last_active_at: string | null;
  last_online_at: string | null;
  last_offline_at: string | null;
  auto_offline_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CsPresenceList {
  offline_timeout_minutes: number;
  admins: DispatchBoardAdmin[];
}

export interface CsPresenceInput {
  presence: CsPresence;
  // 仅超管可代他人打点，留空即本人。
  admin_id?: number;
}

export const listCsPresences = () =>
  axios.get<ApiResponse<CsPresenceList>>(`${base}/cs/presences`);

export const setCsPresence = (input: CsPresenceInput) =>
  axios.post<ApiResponse<CsPresenceRecord>>(`${base}/cs/presence`, input);

// 客户归属转移：追加交接留痕，历史跟进不变。
export const transferCustomerOwner = (
  customerId: number,
  targetAdminId: number,
  reason: string
) =>
  axios.post<ApiResponse<EsportsCustomer>>(
    `${base}/customers/${customerId}/owner-transfer`,
    { target_admin_id: targetAdminId, reason }
  );

// ── 评价申诉 ──
export interface EsportsPlayerReviewAppeal {
  id: number;
  review_id: number;
  appellant_type: string;
  appellant_id: number;
  order_id: number;
  reason: string;
  evidence_ref: string;
  status: string;
  reviewer_admin_id: number | null;
  review_note: string;
  reviewed_at: string | null;
  created_at: string;
}

export const listPlayerReviewAppeals = (params: {
  status?: string;
  limit?: number;
}) =>
  axios.get<ApiResponse<EsportsPlayerReviewAppeal[]>>(
    `${base}/player-review-appeals`,
    { params }
  );

// 复核申诉：通过则重判评价，驳回维持原判。
export const reviewPlayerReviewAppeal = (
  id: number,
  input: { decision: 'approve' | 'reject'; note: string }
) =>
  axios.post<ApiResponse<PlayerReview>>(
    `${base}/player-review-appeals/${id}/review`,
    input
  );

// ── 会员优先预约意向 ──
export interface PriorityBooking {
  id: number;
  customer_id: number;
  customer_name: string;
  player_id: number;
  player_name: string;
  requested_start_at: string | null;
  note: string;
  status: string;
  member_level_code: string;
  member_level_name: string;
  level_sort_order: number;
  created_at: string;
}

export const listPriorityBookings = (limit?: number) =>
  axios.get<ApiResponse<PriorityBooking[]>>(`${base}/priority-bookings`, {
    params: { limit },
  });

// 预约意向处理结果（后端返回意向实体本身，不是优先预约列表视图）。
export interface PriorityBookingIntent {
  id: number;
  customer_id: number;
  player_id: number;
  player_name: string;
  requested_start_at: string | null;
  note: string;
  status: 'pending' | 'processed' | 'cancelled';
  processed_by_admin_id: number | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 处理会员优先预约：只能置为 processed（已处理）或 cancelled（已取消）。
export const processPriorityBooking = (
  id: number,
  input: { status: 'processed' | 'cancelled' }
) =>
  axios.post<ApiResponse<PriorityBookingIntent>>(
    `${base}/priority-bookings/${id}/process`,
    input
  );

// ── 页面装修：预览码 / 底部导航 / 素材引用反查 ──
export interface PageTabbarItem {
  path: string;
  text: string;
  icon: string;
  visible?: boolean;
}

export interface PageTabbar {
  channel: string;
  draft_version: number;
  items: PageTabbarItem[];
}

export interface PagePreviewCode {
  channel: string;
  code: string;
  path: string;
  draft_version: number;
  expires_at: string;
}

export interface PageAssetUsage {
  channel: string;
  version_no: number;
  scope: string;
  component_index: number;
  component_type: string;
  prop_path: string;
}

export interface PageAssetUsages {
  asset_id: number;
  name: string;
  url: string;
  stale: boolean;
  usages: PageAssetUsage[];
}

export const createPagePreviewCode = (channel: string) =>
  axios.post<ApiResponse<PagePreviewCode>>(
    `${base}/pages/${channel}/preview-code`
  );

export const getPageTabbar = (channel: string) =>
  axios.get<ApiResponse<PageTabbar>>(`${base}/pages/${channel}/tabbar`);

export const savePageTabbar = (
  channel: string,
  items: PageTabbarItem[],
  expectedVersion: number
) =>
  axios.put<ApiResponse<PageDocument>>(`${base}/pages/${channel}/tabbar`, {
    items,
    expected_version: expectedVersion,
  });

export const getPageAssetUsages = (id: number) =>
  axios.get<ApiResponse<PageAssetUsages>>(`${base}/page-assets/${id}/usages`);

// ── 报表导出历史 ──
export interface ReportExport {
  id: number;
  report_type: string;
  format: string;
  admin_id: number;
  admin_name: string;
  filter_snapshot: Record<string, unknown> | null;
  row_count: number;
  file_name: string;
  checksum: string;
  created_at: string;
}

// 统一导出历史：非超管仅见本人记录，可按报表类型过滤。
export const listReportExports = (type?: ReportType) =>
  axios.get<ApiResponse<ReportExport[]>>(`${base}/report-exports`, {
    params: { type },
  });

// 某报表类型的导出历史。
export const listReportTypeExports = (type: ReportType) =>
  axios.get<ApiResponse<ReportExport[]>>(`${base}/reports/${type}/exports`);

// 主陪玩的已确认固排（报单时一键带入指定陪玩）：管理端只读。
export interface PlayerTeammateOption {
  player_id: number;
  display_name: string;
  game: string;
}

export const listPlayerTeammatesForAdmin = (playerId: number) =>
  axios.get<ApiResponse<PlayerTeammateOption[]>>(
    `${base}/players/${playerId}/teammates`
  );
