/**
 * 访客肖像映射（兼容层）
 *
 * 角色图片已统一迁移至 characterRegistry.ts 中的 char-01–char-08 编号体系。
 * 本文件保留原有 API（visitorPortraits: Record<string, string>），
 * 但数据源从独立的 visitor-N.png 导入，改为从 characterRegistry 派生。
 *
 * 建议新代码直接使用：
 *   import { portraitByInternalId } from './data/characterRegistry'
 *
 * @deprecated 请优先使用 characterRegistry 中的 portraitByInternalId
 */

import { portraitByInternalId } from './characterRegistry'

/** 内部 id → 肖像图片 URL */
export const visitorPortraits: Record<string, string> = portraitByInternalId
