/**
 * 电竞业务状态字典：后端下发的枚举值统一在这里转中文。
 *
 * 列表 / 详情不要直接渲染 `unpaid`、`pending_payment`、`none` 这类裸枚举值，
 * 一律走这里的函数；新增枚举值时只补本文件，各页面自动跟随。
 * 未识别的值原样返回，避免后端先上线新枚举时前端显示空白。
 */

const paymentLabels: Record<string, string> = {
  unpaid: '未付款',
  partial: '部分付款',
  paid: '已付款',
  exception: '异常',
};

const fulfillmentLabels: Record<string, string> = {
  pending_payment: '待付款',
  pending_dispatch: '待派单',
  pending_acceptance: '待接单',
  grabbing: '抢单中',
  pending_customer_confirm: '待客户确认',
  accepted: '已接单',
  in_service: '服务中',
  pending_close: '待结单',
  pending_close_review: '待复核',
  completed: '已完成',
  cancelled: '已取消',
};

const refundLabels: Record<string, string> = {
  none: '无退款',
  pending_approval: '待审批',
  executing: '退款中',
  partial: '部分退款',
  full: '已全额退款',
  failed: '退款失败',
};

const appointmentLabels: Record<string, string> = {
  instant: '即时',
  request: '待确认档期',
  confirmed: '已确认档期',
  pending_confirm: '待确认档期',
};

const depositLabels: Record<string, string> = {
  none: '未存单',
  frozen: '已存单',
};

const priorityNoticeLabels: Record<string, string> = {
  none: '无',
  pending: '待响应',
  released: '已释放',
  accepted: '已接受',
};

const dispatchSourceLabels: Record<string, string> = {
  assign: '指派',
  grab: '抢单',
  fixed_team: '固排',
  temp_team: '临时组队',
};

const dispatchSeatStatusLabels: Record<string, string> = {
  open: '待指派',
  invited: '已邀请',
  accepted: '已接单',
  rejected: '已拒绝',
  expired: '已过期',
  revoked: '已撤回',
  released: '已释放',
};

const ageStatusLabels: Record<string, string> = {
  unknown: '未核验',
  adult: '已成年',
  minor: '未成年',
};

const translate = (labels: Record<string, string>, value?: string | null) =>
  (value && labels[value]) || value || '—';

/** 支付状态：unpaid / partial / paid / exception。 */
export const paymentStatusText = (value?: string | null) =>
  translate(paymentLabels, value);

/** 履约状态：pending_payment … cancelled。 */
export const fulfillmentStatusText = (value?: string | null) =>
  translate(fulfillmentLabels, value);

/** 退款状态：none / pending_approval / executing / partial / full / failed。 */
export const refundStatusText = (value?: string | null) =>
  translate(refundLabels, value);

/** 预约状态：instant / request / confirmed / pending_confirm。 */
export const appointmentStatusText = (value?: string | null) =>
  translate(appointmentLabels, value);

/** 存单状态：none / frozen。 */
export const depositStatusText = (value?: string | null) =>
  translate(depositLabels, value);

/** 优先通知状态：none / pending / released / accepted。 */
export const priorityNoticeStatusText = (value?: string | null) =>
  translate(priorityNoticeLabels, value);

/** 派单来源：assign / grab / fixed_team / temp_team。 */
export const dispatchSourceText = (value?: string | null) =>
  translate(dispatchSourceLabels, value);

/** 席位的派单状态：open / invited / accepted / rejected / expired / revoked / released。 */
export const dispatchSeatStatusText = (value?: string | null) =>
  translate(dispatchSeatStatusLabels, value);

/** 年龄核验状态：unknown / adult / minor（提交结论只用 adult / minor）。 */
export const ageStatusText = (value?: string | null) =>
  translate(ageStatusLabels, value);
