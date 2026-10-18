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

export type PlayerLevel = 'novice' | 'skilled' | 'senior' | 'mentor';

export interface EsportsSku {
  id: number;
  code: string;
  title: string;
  service_type: 'play' | 'teaching' | 'entertainment';
  category_id: number | null;
  description: string;
  unit_price_cents: number;
  min_unit_price_cents: number;
  adjustment_approval_bp: number;
  service_units: number;
  service_unit_name: string;
  required_seats: number;
  // 单次服务时长（分钟，§5.5）：用于预约时段重叠与容量判定，0 表示未配置。
  service_duration_minutes: number;
  // 所需技能等级（§5.5）：陪玩等级不得低于该值。
  required_level: PlayerLevel;
  // 结单要求（§15.3）：引用生效结单规则的 code，留空按游戏 / 全局规则回落。
  close_rule_code: string;
  quota_total: number;
  quota_reserved: number;
  quota_sold: number;
  sort_order: number;
  status: 'draft' | 'on_sale' | 'off_sale';
}

export type SkuInput = Omit<EsportsSku, 'id' | 'quota_reserved' | 'quota_sold'>;

// 编辑商品不提交 code（编码创建后不可变）。
export type SkuUpdateInput = Omit<SkuInput, 'code'>;

export type CustomerSource = 'manual' | 'wecom' | 'self' | 'import';

// 风险标记（§13.7）：normal 正常 / watch 疑似滥用复核（自动，不自动处罚）/ restricted 限制自助下单（人工）。
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
  // §8.3 客户档案扩展：手机号、消费偏好、标签、建档来源、跟进状态与最近联系时间。
  phone: string;
  // 生日（月-日，如 03-15），用于生日礼遇待办（§10.4）；空表示未填。
  birthday: string;
  consumption_preference: string;
  tags: string[] | null;
  source: CustomerSource;
  follow_status: CustomerFollowStatus;
  last_contact_at: string | null;
  // 是否允许客户自助下单（§4.1 / §13.7）。
  self_order_enabled: boolean;
  member_level_code: string;
  // 风险标记（§13.7）：normal 正常 / watch 疑似滥用复核（自动，不自动处罚）/ restricted 限制自助下单（人工）。
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
  sku_id: number;
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
  // 加钟累计（§3.3 / §12.5）：由「已确认」的加钟单累加，payable_cents 保持原报价快照。
  addon_cents: number;
  addon_units: number;
  required_seats: number;
  // 所需技能等级快照（§5.5）。
  required_level: PlayerLevel;
  quote_version: number;
  version: number;
  fulfillment_status: string;
  payment_status: string;
  // 付款方式标记（§3.1）：储值卡不作为订单类型，用订单上的独立字段标记。
  payment_channel: string;
  stored_value_card_id: number | null;
  // 优先派单权「独占优先通知」窗口（§5.4 业务口径）。
  priority_notice_status: 'none' | 'pending' | 'released' | 'accepted';
  priority_notice_until: string | null;
  priority_game: string;
  priority_release_reason: string;
  // 客户指定陪玩（§5.4）：有值时订单走指派流程，不进入优先通知窗口。
  preferred_player_id: number | null;
  refund_status: string;
  appointment_status: string;
  // 预约档期（§3.2 / §5.5）：requested_start_at 为预约开始时间，deadline 为档期确认时限。
  requested_start_at: string | null;
  appointment_confirmation_deadline: string | null;
  // 服务时长快照（分钟，§5.5）：0 表示 SKU 未配置，容量判定回落保守口径。
  service_duration_minutes: number;
  // 已知渠道成本（§12.1）：结单计提客服提成时从可分基数扣除。
  channel_cost_cents: number;
  // 单笔手动指定分成规则（§12.3 五级优先级最高一级）：仅未锁定成员规则前可设。
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
  sku_id: number;
  quantity: number;
  // 客户指定陪玩（§5.4）：可选；留空则由客服指派，不留空则不进入优先通知窗口。
  preferred_player_id?: number;
}

// 管理员历史订单补录（entry_point=admin_backfill）：为历史成交生成订单，不计入自助下单流程。
export interface BackfillOrderInput {
  customer_id: number;
  sku_id: number;
  quantity: number;
  // 实际成交单价（分）：留 0 表示按 SKU 当前规格价。
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

export type WalletAccountType =
  | 'customer_balance'
  | 'player_catfood'
  // 储值卡是独立预付账户（§11.3），账户号为卡 ID。
  | 'stored_value_card';

// 钱包展示配置（§11.4）：后端按账户类型下发展示名称 / 图标 / 说明 / 单位与换算倍率。
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
  // 展示配置（§11.4）：后端钱包账户视图返回，旧数据可能缺失。
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
  // 会员订单优先（§10.4）：待派单池 / 公共池中属于会员优先等级客户的订单 ID（后端已置顶）。
  member_priority_order_ids: number[];
  // 公共池脱敏（§5.1 / §8.2）：非超管在公共池只看到脱敏摘要，客户身份与金额被掩码。
  masked_public_pool_ids: number[];
}

const base = '/api/v1/esports/admin';

// 客户风控（§13.7）：风险名单与人工标记 / 解除。
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

export const listSkus = () =>
  axios.get<ApiResponse<EsportsSku[]>>(`${base}/skus`);

export const createSku = (input: SkuInput) =>
  axios.post<ApiResponse<EsportsSku>>(`${base}/skus`, input);

export const updateSku = (id: number, input: SkuUpdateInput) =>
  axios.put<ApiResponse<EsportsSku>>(`${base}/skus/${id}`, input);

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

// 确认预约档期（§3.2 / §5.5）：request → confirmed，含资源核验；未确认档期不允许派单。
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

// 单笔手动指定分成规则（§12.3）：ruleId=0 表示清除，恢复逐级回落。
export const setOrderManualCommissionRule = (id: number, ruleId: number) =>
  axios.put<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/commission-rule`, {
    rule_id: ruleId,
  });

// 存单：把已付款订单冻结存起来；恢复清除冻结标记。
export const depositOrder = (id: number) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/deposit`);

export const restoreOrder = (id: number) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/restore`);

// 批次分摊明细（§4.3 / §11.3）：每笔消费动用了哪些批次。
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

export const listLedgerAllocations = (accountType: string, accountId: string) =>
  axios.get<ApiResponse<LedgerAllocation[]>>(`${base}/ledger-allocations`, {
    params: { account_type: accountType, account_id: accountId },
  });

export const listWallets = (accountType: WalletAccountType, keyword = '') =>
  axios.get<ApiResponse<WalletAccount[]>>(`${base}/wallets`, {
    params: { account_type: accountType, keyword },
  });

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

export const getDispatchBoard = () =>
  axios.get<ApiResponse<EsportsDispatchBoard>>(`${base}/dispatch/board`);

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

// 固排成队（§5.3）：主陪玩 + 其固排一次成队。
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

export interface EsportsPlayer {
  id: number;
  user_id: number;
  display_name: string;
  qualification: 'pending' | 'qualified' | 'suspended';
  presence: 'offline' | 'online' | 'protected_abnormal';
  // 接单上限（§5.5 / §6.4）：0 = 不限。
  daily_limit: number;
  concurrent_limit: number;
  // 接单游戏分区（§5.5 / §6.4）：空表示不限。
  games: string[];
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
  // 接单上限（§5.5 / §6.4）：0 = 不限。
  daily_limit: number;
  concurrent_limit: number;
  // 接单游戏分区（§5.5 / §6.4）：空表示不限。
  games: string[];
}

export interface PlayerDashboard {
  presence: string;
  online: boolean;
  pending_invites: number;
  active_orders: number;
  today_catfood_cents: number;
}

export interface PlayerInvite {
  id: number;
  seat_index: number;
  order_id: number;
  order_no: string;
  customer_id: number;
  sku_id: number;
  payable_cents: number;
  fulfillment_status: string;
  required_seats: number;
  expires_at: string;
}

export const listPlayers = (keyword = '') =>
  axios.get<ApiResponse<EsportsPlayer[]>>(`${base}/players`, {
    params: { keyword },
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

// 陪玩端自助接口供 uni-app 客户端使用，路由前缀为 /api/v1/esports/user。
const userBase = '/api/v1/esports/user';

export const getPlayerDashboard = () =>
  axios.get<ApiResponse<PlayerDashboard>>(`${userBase}/player/dashboard`);

export const setPlayerPresence = (online: boolean) =>
  axios.post<ApiResponse<EsportsPlayer>>(`${userBase}/player/presence`, {
    online,
  });

export const listPlayerInvites = () =>
  axios.get<ApiResponse<PlayerInvite[]>>(`${userBase}/player/invites`);

export const acceptPlayerInvite = (seatId: number) =>
  axios.post<ApiResponse<{ seat_id: number; accepted: boolean }>>(
    `${userBase}/player/invites/${seatId}/accept`
  );

export const rejectPlayerInvite = (seatId: number) =>
  axios.post<ApiResponse<{ seat_id: number; accepted: boolean }>>(
    `${userBase}/player/invites/${seatId}/reject`
  );

export const listGrabHall = () =>
  axios.get<ApiResponse<EsportsOrder[]>>(`${userBase}/player/grab-hall`);

export const grabPlayerOrder = (orderId: number) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${userBase}/player/orders/${orderId}/grab`
  );

export const listPlayerOrders = (bucket = '') =>
  axios.get<ApiResponse<EsportsOrder[]>>(`${userBase}/player/orders`, {
    params: { bucket },
  });

export const startPlayerService = (orderId: number) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${userBase}/player/orders/${orderId}/service/start`
  );

export const finishPlayerService = (
  orderId: number,
  reportedUnits: number,
  reportedSeconds: number,
  evidenceRef: string
) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${userBase}/player/orders/${orderId}/service/finish`,
    {
      reported_units: reportedUnits,
      reported_seconds: reportedSeconds,
      evidence_ref: evidenceRef,
    }
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

// 统一售后来源（§13.1 / §13.3）：订单 / 礼物单 / 储值卡 / 充值流水 / 考核记录。
export type AfterSaleSourceType =
  | 'order'
  | 'gift'
  | 'stored_value_card'
  | 'recharge'
  | 'assessment';

export interface EsportsAfterSale {
  id: number;
  after_sale_no: string;
  source_type: AfterSaleSourceType;
  source_id: number;
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
  // 补履约方案参数（§13.6）：plan_action=makeup_service 时有值。
  makeup_kind: 'none' | 'makeup_time' | 'replace_player';
  makeup_player_id: number | null;
  makeup_seat_index: number | null;
  makeup_units: number;
  makeup_company_pay_cents: number;
  // 阶段时间戳与限时（§13.5）：当前阶段时限小时数与截止时间，超时时前端高亮。
  accepted_at: string | null;
  planned_at: string | null;
  approved_at: string | null;
  sla_limit_hours: number;
  sla_deadline: string | null;
  sla_overdue: boolean;
  // 追偿（§13.4）：赔付由陪玩承担时执行售后另建待审批的追偿明细。
  recovery_player_id: number | null;
  recovery_cents: number;
  // 待客户确认节点（§13.3）：确认渠道区分自助确认与客服代确认。
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
  contact?: string;
  customer_id?: number;
}

export interface AfterSalePlanInput {
  fault_party: AfterSaleFaultParty;
  plan_action: AfterSalePlanAction;
  refund_cents: number;
  resolution: string;
  // 补履约方案参数（§13.6）：plan_action=makeup_service 时必填，其余动作留空。
  makeup_kind?: 'makeup_time' | 'replace_player';
  makeup_player_id?: number;
  makeup_seat_index?: number;
  makeup_units?: number;
  makeup_company_pay_cents?: number;
  // 追偿（§13.4）：赔付由陪玩承担时填承接陪玩与追偿金额（不得超过赔付额）。
  recovery_player_id?: number;
  recovery_cents?: number;
  // 争议涉及陪玩（§13.3 部分退款成员明细冲回）：退款类方案可指定该单实际服务成员，
  // 执行退款时优先冲回该成员的服务与加钟分成；0 表示不指定、按整体比例冲回。
  dispute_player_id?: number;
}

// ── 陪玩追偿明细（§13.4）：售后赔付由陪玩承担时另建的扣回单 ──

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

// 结单提交规则（§3.4）与订单结单配置视图共用的类型：因 closeOrder / OrderCloseFormView 引用而提前声明。
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
export const closeOrder = (
  id: number,
  note: string,
  formValues?: Record<string, unknown>,
  substituteReports?: CloseSubstituteReport[]
) =>
  axios.post<ApiResponse<EsportsOrder>>(`${base}/orders/${id}/close`, {
    note,
    form_values: formValues || {},
    substitute_reports: substituteReports || [],
  });

// 结单复核（§3.4）：金额达复核阈值的订单进入待复核，由非负责客服的管理员通过 / 驳回。
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

// ── 补履约任务（§13.6）：售后方案「补钟 / 换人」执行后产生，由客服开始服务并验收 ──

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

// ── 加钟（§3.3 / §6.2 / §12.5）：客服对服务中订单发起，陪玩确认后累加并生成加钟分成 ──

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
  // 加钟收款（§3.3）：确认后的追加金额由客服收单，首版仅客户余额核销。
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

// 加钟收款（§3.3）：对已确认且未收款的加钟单用客户余额核销追加金额。
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
export type SettlementStatus = 'draft' | 'locked' | 'paid';

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
  // 争议冻结（§12.6）：被争议的明细冻结待结算金额，不参与当期结算。
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
  locked_by_admin_id: number | null;
  locked_at: string | null;
  // 发放（打款）留痕，仅 status=paid 时非空。
  payout_ref: string;
  paid_by_admin_id: number | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementInput {
  player_id: number;
  period_start: string;
  period_end: string;
}

export interface PlayerCommissionSummary {
  pending_settlement_cents: number;
  // 被争议冻结的待结算金额（§12.6）。
  frozen_cents: number;
  settled_cents: number;
  next_settlement_at: string;
  // 生效结算周期与命中层级（player/level/game/global/system_config）。
  settlement_period: string;
  settlement_scope: string;
}

// ── §12.6 结算周期与争议冻结 ──

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
  order_id?: number;
  status?: string;
}) =>
  axios.get<ApiResponse<CommissionEntry[]>>(`${base}/commission-entries`, {
    params,
  });

export const listSettlements = (playerId?: number) =>
  axios.get<ApiResponse<Settlement[]>>(`${base}/settlements`, {
    params: { player_id: playerId },
  });

export const createSettlement = (input: SettlementInput) =>
  axios.post<ApiResponse<Settlement>>(`${base}/settlements`, input);

export const lockSettlement = (id: number) =>
  axios.post<ApiResponse<Settlement>>(`${base}/settlements/${id}/lock`);

export const getSettlement = (id: number) =>
  axios.get<ApiResponse<Settlement>>(`${base}/settlements/${id}`);

// §12.6 结算周期配置：日/周/月/自定义间隔，按 全局 → 游戏 → 等级 → 陪玩 逐级覆盖。
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

// §12.6 争议冻结：人工冻结 / 解冻订单待结算分成明细。
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

// ── §12.2 客服提成 ──
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
  // 渠道成本与工作室剩余快照（§12.1），仅 service 明细非零。
  channel_cost_cents: number;
  studio_remainder_cents: number;
  status: CommissionEntryStatus;
  settlement_id: number | null;
  note: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CsCommissionSummary {
  pending_settlement_cents: number;
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
    order_id?: number;
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

export const createCsSettlement = (input: {
  admin_id: number;
  period_start: string;
  period_end: string;
}) => axios.post<ApiResponse<Settlement>>(`${base}/cs-settlements`, input);

// 登记发放：locked → paid，并留外部打款凭证（§12.2）。
export const paySettlement = (id: number, payoutRef: string) =>
  axios.post<ApiResponse<Settlement>>(`${base}/settlements/${id}/pay`, {
    payout_ref: payoutRef,
  });

// ── §6.3 / §12.6 基础提现 ──
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

// 打款执行状态机（§11.2 补全）：approved → pay_requested → paid / pay_failed。
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

// 提交打款执行（§11.2）：仅已审核通过的提现单可提交，落为 pay_requested。
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

// 确认打款成功（§11.2）：回填完税凭证，提现单同步置为 paid。
export const markWithdrawalPayoutPaid = (payoutId: number, taxRef = '') =>
  axios.post<ApiResponse<EsportsWithdrawalPayout>>(
    `${base}/withdrawal-payouts/${payoutId}/paid`,
    { tax_ref: taxRef },
    { silentError: true }
  );

// 标记打款失败（§11.2）：提现单保持 approved，可重新提交打款。
export const markWithdrawalPayoutFailed = (payoutId: number, reason: string) =>
  axios.post<ApiResponse<EsportsWithdrawalPayout>>(
    `${base}/withdrawal-payouts/${payoutId}/failed`,
    { reason },
    { silentError: true }
  );

// 陪玩端自助：申请提现、我的提现单与提现概览（供 uni-app 客户端）。
export const applyPlayerWithdrawal = (input: {
  amount_cents: number;
  channel: WithdrawalChannel;
  account_ref: string;
  note?: string;
  idempotency_key: string;
}) =>
  axios.post<ApiResponse<EsportsWithdrawal>>(
    `${userBase}/player/withdrawals`,
    input
  );

export const listPlayerWithdrawals = (status = '') =>
  axios.get<ApiResponse<EsportsWithdrawal[]>>(
    `${userBase}/player/withdrawals`,
    {
      params: { status },
    }
  );

export const getPlayerWithdrawalSummary = () =>
  axios.get<ApiResponse<PlayerWithdrawalSummary>>(
    `${userBase}/player/withdrawals/summary`
  );

// ── §5.4 优先派单权 + §5.5 派单候选排序 ──
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

// ── §5.4 业务口径：独占优先通知窗口 ──
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

// 没有优先名单（或窗口已闭合）的普通待派单订单，由客服发布到抢单大厅（§5.2 / §5.6）。
// 首版仅单陪玩订单可发布，多人订单服务端返回参数错误。
export const publishOrderToGrabHall = (orderId: number, reason = '') =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${orderId}/publish-grab`,
    { reason }
  );

// 陪玩端：我的优先通知与拒绝（接受复用 orders/{id}/grab）。
export const listPlayerDispatchNotices = () =>
  axios.get<ApiResponse<DispatchPriorityNotice[]>>(
    `${userBase}/player/dispatch-notices`
  );

export const declinePlayerDispatchNotice = (id: number, reason = '') =>
  axios.post<ApiResponse<DispatchPriorityNotice>>(
    `${userBase}/player/dispatch-notices/${id}/decline`,
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

// 派单候选（§5.5 首版）：按窗口可见性过滤后的候选，再按评分与在途席位均衡排序。
export const getDispatchCandidates = (
  orderId: number,
  preferredPlayerId?: number
) =>
  axios.get<ApiResponse<DispatchCandidateResult>>(
    `${base}/orders/${orderId}/dispatch-candidates`,
    { params: { preferred_player_id: preferredPlayerId } }
  );

// ── §5.7 陪玩转单 ──
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

// 陪玩端：发起转单与撤回（客服确认前）。
export const requestSeatTransfer = (
  orderId: number,
  reason: string,
  idempotencyKey: string
) =>
  axios.post<ApiResponse<SeatTransferRequest>>(
    `${base}/orders/${orderId}/transfer`,
    { reason, idempotency_key: idempotencyKey }
  );

export const cancelSeatTransfer = (id: number) =>
  axios.post<ApiResponse<SeatTransferRequest>>(
    `${base}/user/player/transfer-requests/${id}/cancel`
  );

// 陪玩端分成：本人明细与概览。
export const getPlayerCommissionEntries = (status = '') =>
  axios.get<ApiResponse<CommissionEntry[]>>(`${userBase}/player/commission`, {
    params: { status },
  });

export const getPlayerCommissionSummary = () =>
  axios.get<ApiResponse<PlayerCommissionSummary>>(
    `${userBase}/player/commission/summary`
  );

// ── 充值活动（§4.5 充值活动与赠送） ──

export type CampaignActivityType = 'full_gift' | 'ladder' | 'limited';
export type CampaignAudience = 'all' | 'new_customer' | 'specified';
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
  audience_customer_ids: number[];
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
  stack_rule: CampaignStackRule;
  bonus_valid_days: number;
  starts_at: string;
  ends_at: string;
}

export const listCampaigns = (status = '') =>
  axios.get<ApiResponse<RechargeCampaign[]>>(`${base}/campaigns`, {
    params: { status },
  });

export const createCampaign = (input: CampaignInput) =>
  axios.post<ApiResponse<RechargeCampaign>>(`${base}/campaigns`, input);

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

// ── 会员等级（§10） ──

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
  // 储值卡赠送比例，基点（100 = 1%）。
  prepay_bonus_bps: number;
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
  prepay_bonus_bps: number;
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

export const getCustomerMember = (customerId: number) =>
  axios.get<ApiResponse<CustomerMemberDetail>>(
    `${base}/customers/${customerId}/member`
  );

// 手动调级：仅留覆盖记录，不改成长值流水。
export const setCustomerMemberLevel = (
  customerId: number,
  levelCode: string,
  reason: string
) =>
  axios.post<ApiResponse<CustomerMemberDetail>>(
    `${base}/customers/${customerId}/member/level`,
    { level_code: levelCode, reason }
  );

// ── 礼物（§9） ──

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
  stored_value_card_id: number | null;
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
  stored_value_card_id: number | null;
  stored_value_card_no: string;
  created_by_admin_id: number;
  status: 'pending' | 'confirmed' | 'consumed' | 'cancelled';
  version: number;
  expires_at: string;
  confirmed_at: string | null;
  gift_order_id: number | null;
}

export const listGiftIntents = () =>
  axios.get<ApiResponse<GiftIntent[]>>(`${base}/gift-intents`);

export const createGiftIntent = (input: {
  customer_id: number;
  gift_id: number;
  player_id: number;
  quantity: number;
  order_id?: number | null;
  payment_source?: 'customer_balance_principal' | 'stored_value_card_principal';
  stored_value_card_id?: number;
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

// ── §9.5 礼物争议：客户申请 → 客服审核 → 执行退款（支持部分退款） ──

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

// ── §4.3 收款账户、收款方式启停与外部到账核销 ──

export type PaymentChannel =
  | 'wechat_work'
  | 'merchant_qr'
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
  order_id: number;
  account_id: number;
  transaction_no: string;
  amount_cents: number;
  proof_ref: string;
  note?: string;
}

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

// 上线自检（§18）：逐项回报需要外部配置才能用的能力，只读且不含密钥值。
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

export const listOfflinePaymentProofs = (params: {
  status?: OfflinePaymentProofStatus;
  order_id?: number;
}) =>
  axios.get<ApiResponse<OfflinePaymentProof[]>>(
    `${base}/offline-payment-proofs`,
    {
      params,
    }
  );

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

// ── 考官端（§7）：考核权重、考核任务、申诉复核、客户评价与综合评分 ──

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
  order_id: number;
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
  order_id?: number;
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

// ── §17 经营统计报表 ──
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
  sku_id?: number;
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
  // 客服提成净额（§12.2，含负数冲回）。
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
    // §5.9 等待时长：按订单时间线埋点派生的四类平均等待时长（秒）。
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
    stored_value_card: Record<string, number>;
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

// 导出报表 CSV（§17）：与查看接口同一组筛选参数，后端按同一数据边界与审计口径导出。
export const exportEsportsReport = (
  type: ReportType,
  params: ReportQuery = {}
) =>
  axios.get<Blob>(`${base}/reports/${type}/export`, {
    params,
    responseType: 'blob',
  });

// ── §16 uni-app 客户自助端首页装修 ──
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
  | 'support_entry';

export interface PageComponent {
  type: PageComponentType;
  visible: boolean;
  props?: Record<string, unknown>;
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

// 审核发布（§16.4 / §16.5）：approve=true 通过 / false 驳回（驳回须填原因）。
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

export const getEsportsPageAssets = () =>
  axios.get<ApiResponse<PageAsset[]>>(`${base}/page-assets`);

export const createEsportsPageAsset = (input: {
  name: string;
  url: string;
  mime?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
}) => axios.post<ApiResponse<PageAsset>>(`${base}/page-assets`, input);

export const deleteEsportsPageAsset = (id: number) =>
  axios.delete<ApiResponse<{ id: number }>>(`${base}/page-assets/${id}`);

// ── §8 客服端（PC 工作台 / 移动客服端 / 企微侧边栏共用） ──
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

// ── §4.4 储值卡（预付账户，含 §11.3 储值卡账户） ──
export type StoredValueSource = 'staff' | 'self';
export type StoredValuePaymentChannel =
  | 'wechat_work'
  | 'merchant_qr'
  | 'corporate_transfer'
  | 'customer_balance';
export type StoredValueStatus =
  | 'pending_verification'
  | 'rejected'
  | 'active'
  | 'exhausted'
  | 'refund_pending'
  | 'refunded'
  | 'expired'
  | 'frozen';

export interface EsportsStoredValueCard {
  id: number;
  card_no: string;
  customer_id: number;
  source: StoredValueSource;
  payment_channel: StoredValuePaymentChannel;
  payment_ref: string;
  open_request_key: string | null;
  verified_payment_key: string | null;
  payment_verified_by_admin_id: number | null;
  payment_verified_at: string | null;
  payment_verified_amount_cents: number;
  payment_verification_note: string;
  principal_cents: number;
  bonus_cents: number;
  applicable_scope: number[] | null;
  allow_gifts: boolean;
  contract_confirmed: boolean;
  valid_from: string;
  valid_until: string;
  status: StoredValueStatus;
  opened_by_admin_id: number | null;
  // 开卡所选套餐（§4.4）：可选，手动开卡为空。
  package_id: number | null;
  refund_quote: Record<string, unknown> | null;
  refund_requested_by_admin_id: number | null;
  refund_requested_at: string | null;
  refund_decided_by_admin_id: number | null;
  refunded_cents: number;
  refunded_at: string | null;
  version: number;
  created_at: string;
  // 以下由流水派生，不落库。
  principal_remaining_cents: number;
  bonus_remaining_cents: number;
  balance_cents: number;
  consumed_cents: number;
}

export interface StoredValueCardInput {
  customer_id: number;
  source?: StoredValueSource;
  payment_channel: StoredValuePaymentChannel;
  payment_ref?: string;
  // 选套餐后本金 / 赠送由套餐决定，principal_cents / bonus_cents 可省略（§4.4）。
  package_id?: number;
  principal_cents: number;
  bonus_cents?: number;
  applicable_scope?: number[];
  allow_gifts?: boolean;
  contract_confirmed: boolean;
  valid_until?: string;
  validity_days?: number;
  note?: string;
  idempotency_key: string;
}

export interface EsportsStoredValuePackage {
  id: number;
  code: string;
  name: string;
  principal_cents: number;
  bonus_cents: number;
  status: 'on_sale' | 'off_sale';
  sort_order: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface StoredValuePackageInput {
  code: string;
  name: string;
  principal_cents: number;
  bonus_cents: number;
  sort_order?: number;
}

export interface StoredValueCardDetail {
  card: EsportsStoredValueCard;
  transactions: WalletTx[];
}

export interface StoredValueRefundQuote {
  quote: Record<string, unknown>;
  refundable_cents: number;
}

export const getEsportsStoredValuePackages = (all = false) =>
  axios.get<ApiResponse<EsportsStoredValuePackage[]>>(
    `${base}/stored-value-packages`,
    { params: all ? { all: '1' } : {} }
  );

export const createEsportsStoredValuePackage = (
  input: StoredValuePackageInput
) =>
  axios.post<ApiResponse<EsportsStoredValuePackage>>(
    `${base}/stored-value-packages`,
    input
  );

export const updateEsportsStoredValuePackage = (
  id: number,
  input: StoredValuePackageInput & { version: number }
) =>
  axios.put<ApiResponse<EsportsStoredValuePackage>>(
    `${base}/stored-value-packages/${id}`,
    input
  );

export const setEsportsStoredValuePackageStatus = (
  id: number,
  status: 'on_sale' | 'off_sale'
) =>
  axios.post<ApiResponse<EsportsStoredValuePackage>>(
    `${base}/stored-value-packages/${id}/status`,
    { status }
  );

export const getEsportsStoredValueCards = (
  params: {
    customer_id?: number;
    status?: StoredValueStatus;
    remind_days?: number;
    limit?: number;
  } = {}
) =>
  axios.get<ApiResponse<EsportsStoredValueCard[]>>(
    `${base}/stored-value-cards`,
    { params }
  );

export const getEsportsStoredValueCard = (id: number) =>
  axios.get<ApiResponse<StoredValueCardDetail>>(
    `${base}/stored-value-cards/${id}`
  );

export const createEsportsStoredValueCard = (input: StoredValueCardInput) =>
  axios.post<ApiResponse<EsportsStoredValueCard>>(
    `${base}/stored-value-cards`,
    input
  );

export const verifyEsportsStoredValueCardPayment = (
  id: number,
  input: {
    approve: boolean;
    receipt_ref: string;
    received_cents: number;
    evidence_note: string;
  }
) =>
  axios.post<ApiResponse<EsportsStoredValueCard>>(
    `${base}/stored-value-cards/${id}/payment-verification`,
    input
  );

export const getEsportsStoredValueCardRefundQuote = (id: number) =>
  axios.get<ApiResponse<StoredValueRefundQuote>>(
    `${base}/stored-value-cards/${id}/refund-quote`
  );

export const requestEsportsStoredValueCardRefund = (id: number) =>
  axios.post<ApiResponse<EsportsStoredValueCard>>(
    `${base}/stored-value-cards/${id}/refund-request`
  );

export const decideEsportsStoredValueCardRefund = (
  id: number,
  approve: boolean
) =>
  axios.post<ApiResponse<EsportsStoredValueCard>>(
    `${base}/stored-value-cards/${id}/refund-decision`,
    { approve }
  );

export const payEsportsOrderByStoredValueCard = (
  orderId: number,
  cardId: number
) =>
  axios.post<ApiResponse<EsportsOrder>>(
    `${base}/orders/${orderId}/pay-by-stored-value-card`,
    { card_id: cardId }
  );

// ── 结单规则（§3.4 首版）：可配置结单条件与金额复核阈值 ──

export type CloseRuleScope = 'global' | 'game' | 'sku';
export type CloseRuleStatus = 'draft' | 'active' | 'history';

// 结单条件树（§3.4 结单条件自定义）：组合节点填 op（and / or / not）与 children，
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

// 结单条件字段与运算符枚举（§3.4 结单条件自定义）：与后端
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
  { key: 'stored_value_consistent', label: '储值卡核销一致', kind: 'bool' },
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

// 条件树组合节点支持的逻辑运算（§3.4）：与后端 closeCondOpAnd / closeCondOpOr / closeCondOpNot 对齐。
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

// 结单条件逐项状态（§3.4）：条件不满足时结单按钮置灰，口径与结单拦截一致。
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

// ── 结单表单设计器（§3.4）：字段库与模板 ──

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
}

export const getOrderCloseForm = (orderId: number) =>
  axios.get<ApiResponse<OrderCloseFormView>>(
    `${base}/orders/${orderId}/close-form`
  );

// ── 结单提交规则（§3.4）：单人 / 多人 / 自定义（代提交、提交比例、未提交处理） ──

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

// ── 结单审批流（§3.4）：节点串行编排、审批角色与超时策略 ──

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
