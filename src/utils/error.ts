/**
 * 从后端统一响应体里提取可展示的错误文案。
 *
 * 约定：后端业务错误形如 `{ code, message }`，axios 会把它放在
 * `error.response.data`；没有响应（网络中断 / 超时）时退回调用方给的兜底文案。
 * 各业务页面不要各自复制这段解析。
 */
export const errorText = (err: unknown, fallback: string) => {
  const { response } = err as {
    response?: { data?: { message?: string } };
  };
  return response?.data?.message || fallback;
};

export default errorText;
