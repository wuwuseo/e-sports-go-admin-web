<template>
  <div class="container page-container">
    <a-card class="general-card" title="结单表单（§3.4）">
      <a-tabs v-model:active-key="activeTab">
        <!-- 字段库 -->
        <a-tab-pane key="fields" title="字段库">
          <a-space class="toolbar">
            <a-button v-if="canManage" type="primary" @click="openFieldCreate"
              >新建字段</a-button
            >
            <a-button :loading="fieldsLoading" @click="loadFields"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            字段可被多个模板复用；停用后新模板不可再引用，已生效模板不受影响。
          </a-typography-text>
          <a-table
            :data="fields"
            :loading="fieldsLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="key" title="字段标识" />
              <a-table-column data-index="label" title="显示名" />
              <a-table-column title="类型">
                <template #cell="{ record }">{{
                  fieldTypeLabel(record.field_type)
                }}</template>
              </a-table-column>
              <a-table-column title="必填">
                <template #cell="{ record }">{{
                  record.required ? '是' : '否'
                }}</template>
              </a-table-column>
              <a-table-column title="选项">
                <template #cell="{ record }">{{
                  (record.options || []).join(' / ') || '—'
                }}</template>
              </a-table-column>
              <a-table-column title="最大长度">
                <template #cell="{ record }">{{
                  record.max_length > 0 ? record.max_length : '不限'
                }}</template>
              </a-table-column>
              <a-table-column data-index="sort_order" title="排序" />
              <a-table-column title="状态 / 版本">
                <template #cell="{ record }"
                  >{{ record.enabled ? '启用' : '停用' }} / v{{
                    record.version
                  }}</template
                >
              </a-table-column>
              <a-table-column title="操作" :width="160">
                <template #cell="{ record }">
                  <a-button
                    v-if="canManage"
                    type="text"
                    @click="openFieldEdit(record)"
                    >编辑</a-button
                  >
                  <a-button
                    v-if="canManage"
                    type="text"
                    status="warning"
                    @click="toggleField(record)"
                    >{{ record.enabled ? '停用' : '启用' }}</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 表单模板 -->
        <a-tab-pane key="templates" title="表单模板">
          <a-space class="toolbar">
            <a-button
              v-if="canManage"
              type="primary"
              @click="openTemplateCreate"
              >新建模板</a-button
            >
            <a-button :loading="templatesLoading" @click="loadTemplates"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            按 商品 &gt; 游戏分区 &gt; 全局
            +金额区间命中订单；同层取版本最高，且仅草稿可生效，
            改模板生成新版本，回滚以历史版本为模板生成更高版本。
          </a-typography-text>
          <a-table
            :data="templates"
            :loading="templatesLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="code" title="模板编号" />
              <a-table-column data-index="name" title="名称" />
              <a-table-column title="适用范围">
                <template #cell="{ record }">{{
                  templateScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="金额区间">
                <template #cell="{ record }">{{
                  amountRangeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="字段">
                <template #cell="{ record }"
                  >{{ (record.fields || []).length }} 个</template
                >
              </a-table-column>
              <a-table-column title="版本 / 状态">
                <template #cell="{ record }"
                  >v{{ record.version }} /
                  {{ templateStatusLabel(record.status) }}</template
                >
              </a-table-column>
              <a-table-column title="操作" :width="200">
                <template #cell="{ record }">
                  <template v-if="canManage && record.status === 'draft'">
                    <a-button type="text" @click="openTemplateEdit(record)"
                      >编辑</a-button
                    >
                    <a-popconfirm
                      content="确认让该草稿模板生效？同层现有生效版本会转为历史版本。"
                      @ok="doActivateTemplate(record)"
                    >
                      <a-button type="text" status="success">生效</a-button>
                    </a-popconfirm>
                  </template>
                  <a-popconfirm
                    v-else-if="canManage && record.status === 'history'"
                    content="确认以该历史版本为模板回滚？会生成并生效一个更高版本。"
                    @ok="doRollbackTemplate(record)"
                  >
                    <a-button type="text">回滚</a-button>
                  </a-popconfirm>
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 提交规则 -->
        <a-tab-pane key="submit" title="提交规则">
          <a-space class="toolbar">
            <a-button v-if="canManage" type="primary" @click="openSubmitCreate"
              >新建提交规则</a-button
            >
            <a-button :loading="submitLoading" @click="loadSubmitRules"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            规定结单前「陪玩个人服务段上报」需多少成员完成：单人提交只需 1
            名成员、多人提交须所有实际服务成员逐人提交、自定义按提交比例向上取整；
            未达标可禁止结单、放行并催办或视为已提交。按 商品 &gt; 游戏分区 &gt;
            全局选层，同层取版本最高。
          </a-typography-text>
          <a-table
            :data="submitRules"
            :loading="submitLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="code" title="规则编号" />
              <a-table-column data-index="name" title="名称" />
              <a-table-column title="适用范围">
                <template #cell="{ record }">{{
                  submitScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="模式">
                <template #cell="{ record }">{{
                  submitModeLabel(record.mode)
                }}</template>
              </a-table-column>
              <a-table-column title="提交比例">
                <template #cell="{ record }">{{
                  record.mode === 'custom'
                    ? `${(record.min_submit_ratio_bp / 100).toFixed(2)}%`
                    : '—'
                }}</template>
              </a-table-column>
              <a-table-column title="代提交 / 未达标">
                <template #cell="{ record }"
                  >{{ record.allow_substitute ? '允许' : '不允许' }} /
                  {{ submitOnMissingLabel(record.on_missing) }}</template
                >
              </a-table-column>
              <a-table-column title="版本 / 状态">
                <template #cell="{ record }"
                  >v{{ record.version }} /
                  {{ templateStatusLabel(record.status) }}</template
                >
              </a-table-column>
              <a-table-column title="操作" :width="200">
                <template #cell="{ record }">
                  <template v-if="canManage && record.status === 'draft'">
                    <a-button type="text" @click="openSubmitEdit(record)"
                      >编辑</a-button
                    >
                    <a-popconfirm
                      content="确认让该草稿提交规则生效？同层现有生效版本会转为历史版本。"
                      @ok="doActivateSubmitRule(record)"
                    >
                      <a-button type="text" status="success">生效</a-button>
                    </a-popconfirm>
                  </template>
                  <a-popconfirm
                    v-else-if="canManage && record.status === 'history'"
                    content="确认以该历史版本为模板回滚？会生成并生效一个更高版本。"
                    @ok="doRollbackSubmitRule(record)"
                  >
                    <a-button type="text">回滚</a-button>
                  </a-popconfirm>
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <!-- 审批流 -->
        <a-tab-pane key="approval" title="审批流">
          <a-space class="toolbar">
            <a-button
              v-if="canManage"
              type="primary"
              @click="openApprovalCreate"
              >新建审批流</a-button
            >
            <a-button :loading="approvalLoading" @click="loadApprovalFlows"
              >刷新</a-button
            >
          </a-space>
          <a-typography-text type="secondary" class="tip">
            节点串行审批：订单应付达「触发金额」时进入待复核，逐个节点审批，末节点通过才真正结单；
            节点可配审批角色（任一管理员 / 超级管理员）与超时策略，涉及资金 /
            争议的节点禁止超时自动通过。
            未配置审批流时回落结单规则的金额复核阈值（等价内置单节点「管理员复核」）。
          </a-typography-text>
          <a-table
            :data="approvalFlows"
            :loading="approvalLoading"
            row-key="id"
            :pagination="{ pageSize: 10 }"
          >
            <template #columns>
              <a-table-column data-index="code" title="流程编号" />
              <a-table-column data-index="name" title="名称" />
              <a-table-column title="适用范围">
                <template #cell="{ record }">{{
                  submitScopeLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="触发金额">
                <template #cell="{ record }">{{
                  record.min_cents > 0
                    ? amountText(record.min_cents)
                    : '所有结单'
                }}</template>
              </a-table-column>
              <a-table-column title="节点">
                <template #cell="{ record }">{{
                  approvalNodesLabel(record)
                }}</template>
              </a-table-column>
              <a-table-column title="版本 / 状态">
                <template #cell="{ record }"
                  >v{{ record.version }} /
                  {{ templateStatusLabel(record.status) }}</template
                >
              </a-table-column>
              <a-table-column title="操作" :width="200">
                <template #cell="{ record }">
                  <template v-if="canManage && record.status === 'draft'">
                    <a-button type="text" @click="openApprovalEdit(record)"
                      >编辑</a-button
                    >
                    <a-popconfirm
                      content="确认让该草稿审批流生效？同层现有生效版本会转为历史版本。"
                      @ok="doActivateApprovalFlow(record)"
                    >
                      <a-button type="text" status="success">生效</a-button>
                    </a-popconfirm>
                  </template>
                  <a-popconfirm
                    v-else-if="canManage && record.status === 'history'"
                    content="确认以该历史版本为模板回滚？会生成并生效一个更高版本。"
                    @ok="doRollbackApprovalFlow(record)"
                  >
                    <a-button type="text">回滚</a-button>
                  </a-popconfirm>
                  <span v-else>—</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      v-model:visible="fieldVisible"
      :title="fieldEditing ? '编辑字段' : '新建字段'"
      @ok="submitField"
      @cancel="fieldVisible = false"
    >
      <a-form :model="fieldForm">
        <a-form-item label="字段标识 key" required>
          <a-input
            v-model="fieldForm.key"
            :max-length="48"
            :disabled="fieldEditing !== null"
            placeholder="小写字母开头，仅字母 / 数字 / 下划线"
          />
        </a-form-item>
        <a-form-item label="显示名" required>
          <a-input v-model="fieldForm.label" :max-length="64" />
        </a-form-item>
        <a-form-item label="字段类型" required>
          <a-select v-model="fieldForm.fieldType">
            <a-option
              v-for="(label, value) in fieldTypeLabels"
              :key="value"
              :value="value"
              >{{ label }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="默认必填">
          <a-switch v-model="fieldForm.required" />
        </a-form-item>
        <a-form-item
          v-if="
            fieldForm.fieldType === 'select' ||
            fieldForm.fieldType === 'multiselect'
          "
          label="选项（每行一个）"
          required
        >
          <a-textarea
            v-model="fieldForm.optionsText"
            :auto-size="{ minRows: 3 }"
          />
        </a-form-item>
        <a-form-item
          v-if="fieldForm.fieldType === 'text'"
          label="最大长度（0 = 不限）"
        >
          <a-input-number v-model="fieldForm.maxLength" :min="0" :max="2000" />
        </a-form-item>
        <a-form-item label="排序值">
          <a-input-number v-model="fieldForm.sortOrder" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="fieldForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="templateVisible"
      :title="
        templateEditing
          ? '编辑结单表单模板（§3.4）'
          : '新建结单表单模板（§3.4）'
      "
      @ok="submitTemplate"
      @cancel="templateVisible = false"
    >
      <a-form :model="templateForm">
        <a-form-item label="模板编号" required>
          <a-input
            v-model="templateForm.code"
            :max-length="48"
            :disabled="templateEditing !== null"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="templateForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select
            v-model="templateForm.scope"
            @change="onTemplateScopeChange"
          >
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="sku">按 商品</a-option>
            <a-option value="order_type">按订单类型（即时 / 预约）</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="templateForm.scope === 'order_type'"
          label="订单类型"
          required
        >
          <a-select v-model="templateForm.scopeKey">
            <a-option value="instant">即时单（instant）</a-option>
            <a-option value="request">预约单（request）</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-else-if="templateForm.scope !== 'global'"
          label="范围键"
          required
        >
          <a-input
            v-model="templateForm.scopeKey"
            :max-length="64"
            placeholder="游戏分区名或 商品 编号"
          />
        </a-form-item>
        <a-form-item label="金额下限（元，0 = 不限）">
          <a-input-number v-model="templateForm.minYuan" :min="0" />
        </a-form-item>
        <a-form-item label="金额上限（元，0 = 不限）">
          <a-input-number v-model="templateForm.maxYuan" :min="0" />
        </a-form-item>
        <a-form-item label="绑定字段" required>
          <a-select
            :model-value="boundKeys"
            multiple
            placeholder="从字段库选择字段"
            @change="onBoundKeysChange"
          >
            <a-option
              v-for="item in enabledFields"
              :key="item.key"
              :value="item.key"
              >{{ item.label }}（{{
                fieldTypeLabel(item.field_type)
              }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item
          v-for="(binding, index) in templateForm.bindings"
          :key="binding.fieldKey"
          :label="`第 ${index + 1} 项：${fieldLabelOf(binding.fieldKey)}`"
        >
          <a-space>
            <a-checkbox v-model="binding.required">必填</a-checkbox>
            <a-button size="mini" @click="moveBinding(index, -1)"
              >上移</a-button
            >
            <a-button size="mini" @click="moveBinding(index, 1)">下移</a-button>
          </a-space>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="templateForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="submitVisible"
      :title="
        submitEditing ? '编辑结单提交规则（§3.4）' : '新建结单提交规则（§3.4）'
      "
      @ok="submitSubmitRule"
      @cancel="submitVisible = false"
    >
      <a-form :model="submitForm">
        <a-form-item label="规则编号" required>
          <a-input
            v-model="submitForm.code"
            :max-length="48"
            :disabled="submitEditing !== null"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="submitForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select v-model="submitForm.scope">
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="sku">按 商品</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="submitForm.scope !== 'global'"
          label="范围键"
          required
        >
          <a-input
            v-model="submitForm.scopeKey"
            :max-length="64"
            placeholder="游戏分区名或 商品 编号"
          />
        </a-form-item>
        <a-form-item label="提交模式" required>
          <a-select v-model="submitForm.mode">
            <a-option value="single">单人提交（任一成员）</a-option>
            <a-option value="multi">多人提交（所有服务成员逐人）</a-option>
            <a-option value="custom">自定义（按提交比例）</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="submitForm.mode === 'custom'"
          label="最低提交比例（%）"
          required
        >
          <a-input-number
            v-model="submitForm.ratioPercent"
            :min="0.01"
            :max="100"
            :precision="2"
          />
        </a-form-item>
        <a-form-item label="允许客服代提交">
          <a-space direction="vertical">
            <a-switch v-model="submitForm.allowSubstitute" />
            <a-typography-text type="secondary"
              >开启后客服可在结单时代未上报成员补填服务量与凭证。</a-typography-text
            >
          </a-space>
        </a-form-item>
        <a-form-item label="未达标处理" required>
          <a-select v-model="submitForm.onMissing">
            <a-option value="block">禁止结单</a-option>
            <a-option value="remind">放行并催办提醒</a-option>
            <a-option value="auto_accept">视为已提交</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="submitForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="approvalVisible"
      :title="
        approvalEditing ? '编辑结单审批流（§3.4）' : '新建结单审批流（§3.4）'
      "
      width="640px"
      @ok="submitApprovalFlow"
      @cancel="approvalVisible = false"
    >
      <a-form :model="approvalForm">
        <a-form-item label="流程编号" required>
          <a-input
            v-model="approvalForm.code"
            :max-length="48"
            :disabled="approvalEditing !== null"
          />
        </a-form-item>
        <a-form-item label="名称" required>
          <a-input v-model="approvalForm.name" :max-length="64" />
        </a-form-item>
        <a-form-item label="适用范围" required>
          <a-select v-model="approvalForm.scope">
            <a-option value="global">全局</a-option>
            <a-option value="game">按游戏分区</a-option>
            <a-option value="sku">按 商品</a-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="approvalForm.scope !== 'global'"
          label="范围键"
          required
        >
          <a-input
            v-model="approvalForm.scopeKey"
            :max-length="64"
            placeholder="游戏分区名或 商品 编号"
          />
        </a-form-item>
        <a-form-item label="触发金额（元，0 = 所有结单）">
          <a-input-number v-model="approvalForm.minYuan" :min="0" />
        </a-form-item>
        <a-form-item label="审批节点（串行）" required>
          <a-space direction="vertical" fill>
            <a-card
              v-for="(node, index) in approvalForm.nodes"
              :key="index"
              size="small"
            >
              <a-space direction="vertical" fill>
                <a-space>
                  <span>第 {{ index + 1 }} 节点</span>
                  <a-button size="mini" @click="moveNode(index, -1)"
                    >上移</a-button
                  >
                  <a-button size="mini" @click="moveNode(index, 1)"
                    >下移</a-button
                  >
                  <a-button
                    size="mini"
                    status="danger"
                    @click="removeNode(index)"
                    >删除</a-button
                  >
                </a-space>
                <a-input
                  v-model="node.name"
                  :max-length="64"
                  placeholder="节点名称（如 客服主管复核）"
                />
                <a-select v-model="node.role">
                  <a-option value="admin">任一管理员（不得自审）</a-option>
                  <a-option value="super_admin">超级管理员</a-option>
                </a-select>
                <a-input-number
                  v-model="node.timeoutHours"
                  :min="0"
                  :max="720"
                  placeholder="超时小时（0 = 不限）"
                />
                <a-space>
                  <a-checkbox v-model="node.involvesFunds"
                    >资金 / 争议节点</a-checkbox
                  >
                  <a-checkbox
                    v-model="node.autoPassOnTimeout"
                    :disabled="node.involvesFunds"
                    >超时自动通过</a-checkbox
                  >
                </a-space>
              </a-space>
            </a-card>
            <a-button @click="addNode">添加节点</a-button>
          </a-space>
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model="approvalForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    activateCloseApprovalFlow,
    activateCloseFormTemplate,
    activateCloseSubmitRule,
    createCloseApprovalFlow,
    createCloseFormField,
    createCloseFormTemplate,
    createCloseSubmitRule,
    listCloseApprovalFlows,
    listCloseFormFields,
    listCloseFormTemplates,
    listCloseSubmitRules,
    rollbackCloseApprovalFlow,
    rollbackCloseFormTemplate,
    rollbackCloseSubmitRule,
    setCloseFormFieldStatus,
    updateCloseApprovalFlow,
    updateCloseFormField,
    updateCloseFormTemplate,
    updateCloseSubmitRule,
  } from '../../api';
  import type {
    CloseApprovalFlowInput,
    CloseApprovalRole,
    CloseFormFieldType,
    CloseFormScope,
    CloseFormStatus,
    CloseFormTemplateInput,
    CloseSubmitMode,
    CloseSubmitOnMissing,
    CloseSubmitRuleInput,
    EsportsCloseApprovalFlow,
    EsportsCloseFormField,
    EsportsCloseFormTemplate,
    EsportsCloseSubmitRule,
  } from '../../api';

  // 模板适用范围在后端 schema（esports_close_form.scope）里多一个 order_type（§3.4-07），
  // api.ts 的 CloseFormScope 尚未声明（本轮不改 api.ts），这里在视图内扩展。
  // 提交规则 / 审批流的 scope 枚举仍只有 global / game / sku。
  type CloseFormScopeExt = CloseFormScope | 'order_type';
  const orderTypeScopeKeys = ['instant', 'request'];

  const fieldTypeLabels: Record<CloseFormFieldType, string> = {
    text: '文本',
    number: '数字',
    money: '金额（只读）',
    select: '单选',
    multiselect: '多选',
    datetime: '日期时间',
    image: '图片',
    switch: '开关',
    reference: '关联',
  };
  const templateStatusLabels: Record<CloseFormStatus, string> = {
    draft: '草稿',
    active: '生效中',
    history: '历史版本',
  };
  const fieldTypeLabel = (value: CloseFormFieldType) =>
    fieldTypeLabels[value] || value;
  const templateStatusLabel = (value: CloseFormStatus) =>
    templateStatusLabels[value] || value;
  const submitModeLabels: Record<CloseSubmitMode, string> = {
    single: '单人提交',
    multi: '多人提交',
    custom: '自定义比例',
  };
  const submitOnMissingLabels: Record<CloseSubmitOnMissing, string> = {
    block: '禁止结单',
    remind: '放行并催办',
    auto_accept: '视为已提交',
  };
  const submitModeLabel = (value: CloseSubmitMode) =>
    submitModeLabels[value] || value;
  const submitOnMissingLabel = (value: CloseSubmitOnMissing) =>
    submitOnMissingLabels[value] || value;
  const submitScopeLabel = (item: {
    scope: CloseFormScope;
    scope_key: string;
  }) =>
    item.scope === 'global'
      ? '全局'
      : `${item.scope === 'game' ? '游戏分区' : '商品'}：${item.scope_key}`;
  const approvalRoleLabels: Record<CloseApprovalRole, string> = {
    admin: '任一管理员',
    super_admin: '超级管理员',
  };
  const approvalRoleLabel = (value: CloseApprovalRole) =>
    approvalRoleLabels[value] || value;
  const amountText = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  // 节点链展示：序号.名称（角色）。
  const approvalNodesLabel = (item: EsportsCloseApprovalFlow) =>
    (item.nodes || [])
      .map(
        (node) =>
          `${node.seq}.${node.name}（${approvalRoleLabel(node.role)}${
            node.involves_funds ? '，资金' : ''
          }）`
      )
      .join(' → ') || '—';
  const templateScopeLabel = (item: EsportsCloseFormTemplate) => {
    const scope = item.scope as CloseFormScopeExt;
    if (scope === 'global') return '全局';
    if (scope === 'order_type')
      return `订单类型：${
        item.scope_key === 'request' ? '预约单' : '即时单'
      }（${item.scope_key}）`;
    return `${scope === 'game' ? '游戏分区' : '商品'}：${item.scope_key}`;
  };
  const amountRangeLabel = (item: EsportsCloseFormTemplate) => {
    const min =
      item.min_cents > 0 ? `¥${(item.min_cents / 100).toFixed(2)}` : '不限';
    const max =
      item.max_cents > 0 ? `¥${(item.max_cents / 100).toFixed(2)}` : '不限';
    return `${min} ~ ${max}`;
  };
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  const { hasButtonPermission } = usePermission();
  const canManage = computed(() =>
    hasButtonPermission('esports:close_forms:manage')
  );

  const activeTab = ref('fields');

  // ── 字段库 ──
  const fields = ref<EsportsCloseFormField[]>([]);
  const fieldsLoading = ref(false);
  const fieldVisible = ref(false);
  const fieldEditing = ref<EsportsCloseFormField | null>(null);
  const fieldForm = reactive({
    key: '',
    label: '',
    fieldType: 'text' as CloseFormFieldType,
    required: false,
    optionsText: '',
    maxLength: 0,
    sortOrder: 0,
    note: '',
  });
  const enabledFields = computed(() =>
    fields.value.filter((item) => item.enabled)
  );
  const fieldLabelOf = (key: string) =>
    fields.value.find((item) => item.key === key)?.label || key;

  // 模板列表状态在此提前声明，供列表加载函数共用（满足 no-use-before-define）。
  const templates = ref<EsportsCloseFormTemplate[]>([]);
  const templatesLoading = ref(false);

  async function loadFields() {
    fieldsLoading.value = true;
    try {
      fields.value = (await listCloseFormFields()).data.data || [];
    } catch {
      Message.error('加载字段库失败，请稍后重试');
    } finally {
      fieldsLoading.value = false;
    }
  }

  async function loadTemplates() {
    templatesLoading.value = true;
    try {
      templates.value = (await listCloseFormTemplates()).data.data || [];
    } catch {
      Message.error('加载表单模板失败，请稍后重试');
    } finally {
      templatesLoading.value = false;
    }
  }

  function resetFieldForm() {
    fieldForm.key = '';
    fieldForm.label = '';
    fieldForm.fieldType = 'text';
    fieldForm.required = false;
    fieldForm.optionsText = '';
    fieldForm.maxLength = 0;
    fieldForm.sortOrder = 0;
    fieldForm.note = '';
  }

  function openFieldCreate() {
    fieldEditing.value = null;
    resetFieldForm();
    fieldVisible.value = true;
  }

  function openFieldEdit(record: EsportsCloseFormField) {
    fieldEditing.value = record;
    fieldForm.key = record.key;
    fieldForm.label = record.label;
    fieldForm.fieldType = record.field_type;
    fieldForm.required = record.required;
    fieldForm.optionsText = (record.options || []).join('\n');
    fieldForm.maxLength = record.max_length;
    fieldForm.sortOrder = record.sort_order;
    fieldForm.note = record.note;
    fieldVisible.value = true;
  }

  const parseOptions = () =>
    fieldForm.optionsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '');

  async function submitField() {
    if (!fieldForm.key.trim() || !fieldForm.label.trim()) {
      Message.warning('请填写字段标识与显示名');
      return;
    }
    const payload = {
      key: fieldForm.key.trim(),
      label: fieldForm.label.trim(),
      field_type: fieldForm.fieldType,
      required: fieldForm.required,
      options: parseOptions(),
      max_length: fieldForm.maxLength,
      sort_order: fieldForm.sortOrder,
      note: fieldForm.note.trim(),
    };
    try {
      if (fieldEditing.value) {
        await updateCloseFormField(
          fieldEditing.value.id,
          fieldEditing.value.version,
          payload
        );
      } else {
        await createCloseFormField(payload);
      }
      fieldVisible.value = false;
      Message.success('已保存字段');
      await Promise.all([loadFields(), loadTemplates()]);
    } catch (err) {
      Message.error(errorText(err, '保存失败：标识重复或参数非法'));
    }
  }

  async function toggleField(record: EsportsCloseFormField) {
    try {
      await setCloseFormFieldStatus(record.id, !record.enabled);
      Message.success(record.enabled ? '已停用' : '已启用');
      await loadFields();
    } catch (err) {
      Message.error(errorText(err, '操作失败，请刷新后重试'));
    }
  }

  // ── 表单模板 ──
  const templateVisible = ref(false);
  const templateEditing = ref<EsportsCloseFormTemplate | null>(null);
  const templateForm = reactive({
    code: '',
    name: '',
    scope: 'global' as CloseFormScopeExt,
    scopeKey: '',
    minYuan: 0,
    maxYuan: 0,
    bindings: [] as { fieldKey: string; required: boolean }[],
    note: '',
  });
  const boundKeys = computed(() =>
    templateForm.bindings.map((binding) => binding.fieldKey)
  );

  function onBoundKeysChange(value: unknown) {
    const next = (Array.isArray(value) ? value : []).map((key) => String(key));
    const kept = templateForm.bindings.filter((binding) =>
      next.includes(binding.fieldKey)
    );
    next.forEach((key) => {
      if (!kept.some((binding) => binding.fieldKey === key)) {
        kept.push({ fieldKey: key, required: false });
      }
    });
    templateForm.bindings = kept;
  }

  function moveBinding(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= templateForm.bindings.length) return;
    const list = templateForm.bindings;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
  }

  function openTemplateCreate() {
    templateEditing.value = null;
    templateForm.code = '';
    templateForm.name = '';
    templateForm.scope = 'global';
    templateForm.scopeKey = '';
    templateForm.minYuan = 0;
    templateForm.maxYuan = 0;
    templateForm.bindings = [];
    templateForm.note = '';
    templateVisible.value = true;
  }

  // 编辑草稿：后端只允许 draft 修改（生效后须「新建同 code 新版本」或回滚）。
  function openTemplateEdit(record: EsportsCloseFormTemplate) {
    templateEditing.value = record;
    templateForm.code = record.code;
    templateForm.name = record.name;
    templateForm.scope = record.scope as CloseFormScopeExt;
    templateForm.scopeKey = record.scope_key;
    templateForm.minYuan = record.min_cents / 100;
    templateForm.maxYuan = record.max_cents / 100;
    templateForm.bindings = (record.fields || [])
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((binding) => ({
        fieldKey: binding.field_key,
        required: binding.required,
      }));
    templateForm.note = record.note;
    templateVisible.value = true;
  }

  // 切换范围时清掉旧的 scope_key，避免把 商品 编号当成订单类型提交被后端拒绝。
  function onTemplateScopeChange() {
    if (templateForm.scope === 'global') {
      templateForm.scopeKey = '';
    } else if (templateForm.scope === 'order_type') {
      if (!orderTypeScopeKeys.includes(templateForm.scopeKey))
        templateForm.scopeKey = 'instant';
    } else {
      templateForm.scopeKey = '';
    }
  }

  async function submitTemplate() {
    if (!templateForm.code.trim() || !templateForm.name.trim()) {
      Message.warning('请填写模板编号与名称');
      return;
    }
    if (templateForm.scope !== 'global' && !templateForm.scopeKey.trim()) {
      Message.warning(
        templateForm.scope === 'order_type' ? '请选择订单类型' : '请填写范围键'
      );
      return;
    }
    if (templateForm.bindings.length === 0) {
      Message.warning('请至少绑定一个字段');
      return;
    }
    const payload: CloseFormTemplateInput = {
      code: templateForm.code.trim(),
      name: templateForm.name.trim(),
      // 模板 scope 在后端已支持 order_type，api.ts 的联合类型尚未包含，此处显式断言。
      scope: templateForm.scope as CloseFormScope,
      scope_key: templateForm.scopeKey.trim(),
      min_cents: Math.round(templateForm.minYuan * 100),
      max_cents: Math.round(templateForm.maxYuan * 100),
      fields: templateForm.bindings.map((binding, index) => ({
        field_key: binding.fieldKey,
        required: binding.required,
        sort: index + 1,
      })),
      note: templateForm.note.trim(),
    };
    try {
      if (templateEditing.value) {
        await updateCloseFormTemplate(
          templateEditing.value.id,
          templateEditing.value.version,
          { ...payload, code: templateEditing.value.code }
        );
        Message.success('已保存模板草稿（须「生效」后才作用于结单）');
      } else {
        await createCloseFormTemplate(payload);
        Message.success('已创建草稿模板，需“生效”后才会作用于结单');
      }
      templateVisible.value = false;
      await loadTemplates();
    } catch (err) {
      Message.error(
        errorText(err, '保存失败：仅草稿可编辑，或字段已停用 / 参数非法')
      );
    }
  }

  async function doActivateTemplate(record: EsportsCloseFormTemplate) {
    try {
      await activateCloseFormTemplate(record.id);
      Message.success('已生效');
      await loadTemplates();
    } catch (err) {
      Message.error(errorText(err, '生效失败：仅草稿可生效'));
    }
  }

  async function doRollbackTemplate(record: EsportsCloseFormTemplate) {
    try {
      await rollbackCloseFormTemplate(record.id);
      Message.success('已回滚并生效新版本');
      await loadTemplates();
    } catch (err) {
      Message.error(errorText(err, '回滚失败，请刷新后重试'));
    }
  }

  // ── 提交规则（§3.4） ──
  const submitRules = ref<EsportsCloseSubmitRule[]>([]);
  const submitLoading = ref(false);
  const submitVisible = ref(false);
  const submitEditing = ref<EsportsCloseSubmitRule | null>(null);
  const submitForm = reactive({
    code: '',
    name: '',
    scope: 'global' as CloseFormScope,
    scopeKey: '',
    mode: 'multi' as CloseSubmitMode,
    ratioPercent: 100,
    allowSubstitute: false,
    onMissing: 'block' as CloseSubmitOnMissing,
    note: '',
  });

  async function loadSubmitRules() {
    submitLoading.value = true;
    try {
      submitRules.value = (await listCloseSubmitRules()).data.data || [];
    } catch {
      Message.error('加载提交规则失败，请稍后重试');
    } finally {
      submitLoading.value = false;
    }
  }

  function openSubmitCreate() {
    submitEditing.value = null;
    submitForm.code = '';
    submitForm.name = '';
    submitForm.scope = 'global';
    submitForm.scopeKey = '';
    submitForm.mode = 'multi';
    submitForm.ratioPercent = 100;
    submitForm.allowSubstitute = false;
    submitForm.onMissing = 'block';
    submitForm.note = '';
    submitVisible.value = true;
  }

  // 编辑草稿提交规则：code 不可改，须带 expected_version（后端只允许 draft 修改）。
  function openSubmitEdit(record: EsportsCloseSubmitRule) {
    submitEditing.value = record;
    submitForm.code = record.code;
    submitForm.name = record.name;
    submitForm.scope = record.scope;
    submitForm.scopeKey = record.scope_key;
    submitForm.mode = record.mode;
    submitForm.ratioPercent = record.min_submit_ratio_bp / 100;
    submitForm.allowSubstitute = record.allow_substitute;
    submitForm.onMissing = record.on_missing;
    submitForm.note = record.note;
    submitVisible.value = true;
  }

  async function submitSubmitRule() {
    if (!submitForm.code.trim() || !submitForm.name.trim()) {
      Message.warning('请填写规则编号与名称');
      return;
    }
    if (submitForm.scope !== 'global' && !submitForm.scopeKey.trim()) {
      Message.warning('请填写范围键');
      return;
    }
    const payload: CloseSubmitRuleInput = {
      code: submitForm.code.trim(),
      name: submitForm.name.trim(),
      scope: submitForm.scope,
      scope_key: submitForm.scopeKey.trim(),
      mode: submitForm.mode,
      min_submit_ratio_bp:
        submitForm.mode === 'custom'
          ? Math.round(submitForm.ratioPercent * 100)
          : 0,
      allow_substitute: submitForm.allowSubstitute,
      on_missing: submitForm.onMissing,
      note: submitForm.note.trim(),
    };
    try {
      if (submitEditing.value) {
        await updateCloseSubmitRule(
          submitEditing.value.id,
          submitEditing.value.version,
          { ...payload, code: submitEditing.value.code }
        );
        Message.success('已保存规则草稿（须「生效」后才作用于结单）');
      } else {
        await createCloseSubmitRule(payload);
        Message.success('已创建草稿规则，需“生效”后才会作用于结单');
      }
      submitVisible.value = false;
      await loadSubmitRules();
    } catch (err) {
      Message.error(
        errorText(err, '保存失败：仅草稿可编辑，或自定义模式须填提交比例')
      );
    }
  }

  async function doActivateSubmitRule(record: EsportsCloseSubmitRule) {
    try {
      await activateCloseSubmitRule(record.id);
      Message.success('已生效');
      await loadSubmitRules();
    } catch (err) {
      Message.error(errorText(err, '生效失败：仅草稿可生效'));
    }
  }

  async function doRollbackSubmitRule(record: EsportsCloseSubmitRule) {
    try {
      await rollbackCloseSubmitRule(record.id);
      Message.success('已回滚并生效新版本');
      await loadSubmitRules();
    } catch (err) {
      Message.error(errorText(err, '回滚失败，请刷新后重试'));
    }
  }

  // ── 审批流（§3.4） ──
  const approvalFlows = ref<EsportsCloseApprovalFlow[]>([]);
  const approvalLoading = ref(false);
  const approvalVisible = ref(false);
  const approvalEditing = ref<EsportsCloseApprovalFlow | null>(null);
  const approvalForm = reactive<{
    code: string;
    name: string;
    scope: CloseFormScope;
    scopeKey: string;
    minYuan: number;
    nodes: {
      name: string;
      role: CloseApprovalRole;
      timeoutHours: number;
      autoPassOnTimeout: boolean;
      involvesFunds: boolean;
    }[];
    note: string;
  }>({
    code: '',
    name: '',
    scope: 'global',
    scopeKey: '',
    minYuan: 0,
    nodes: [],
    note: '',
  });

  function emptyNode() {
    return {
      name: '',
      role: 'admin' as CloseApprovalRole,
      timeoutHours: 0,
      autoPassOnTimeout: false,
      involvesFunds: false,
    };
  }

  function addNode() {
    approvalForm.nodes.push(emptyNode());
  }

  function removeNode(index: number) {
    approvalForm.nodes.splice(index, 1);
  }

  function moveNode(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= approvalForm.nodes.length) return;
    const [item] = approvalForm.nodes.splice(index, 1);
    approvalForm.nodes.splice(target, 0, item);
  }

  async function loadApprovalFlows() {
    approvalLoading.value = true;
    try {
      approvalFlows.value = (await listCloseApprovalFlows()).data.data || [];
    } catch {
      Message.error('加载审批流失败，请稍后重试');
    } finally {
      approvalLoading.value = false;
    }
  }

  function openApprovalCreate() {
    approvalEditing.value = null;
    approvalForm.code = '';
    approvalForm.name = '';
    approvalForm.scope = 'global';
    approvalForm.scopeKey = '';
    approvalForm.minYuan = 0;
    approvalForm.nodes = [emptyNode()];
    approvalForm.note = '';
    approvalVisible.value = true;
  }

  // 编辑草稿审批流：节点回填为可编辑行，code 不可改，须带 expected_version。
  function openApprovalEdit(record: EsportsCloseApprovalFlow) {
    approvalEditing.value = record;
    approvalForm.code = record.code;
    approvalForm.name = record.name;
    approvalForm.scope = record.scope;
    approvalForm.scopeKey = record.scope_key;
    approvalForm.minYuan = record.min_cents / 100;
    approvalForm.nodes = (record.nodes || [])
      .slice()
      .sort((a, b) => a.seq - b.seq)
      .map((node) => ({
        name: node.name,
        role: node.role,
        timeoutHours: node.timeout_hours,
        autoPassOnTimeout: node.auto_pass_on_timeout,
        involvesFunds: node.involves_funds,
      }));
    approvalForm.note = record.note;
    approvalVisible.value = true;
  }

  async function submitApprovalFlow() {
    if (!approvalForm.code.trim() || !approvalForm.name.trim()) {
      Message.warning('请填写流程编号与名称');
      return;
    }
    if (approvalForm.scope !== 'global' && !approvalForm.scopeKey.trim()) {
      Message.warning('请填写范围键');
      return;
    }
    if (approvalForm.nodes.length === 0) {
      Message.warning('请至少添加一个审批节点');
      return;
    }
    if (approvalForm.nodes.some((node) => !node.name.trim())) {
      Message.warning('请填写每个节点的名称');
      return;
    }
    const payload: CloseApprovalFlowInput = {
      code: approvalForm.code.trim(),
      name: approvalForm.name.trim(),
      scope: approvalForm.scope,
      scope_key: approvalForm.scopeKey.trim(),
      min_cents: Math.round(approvalForm.minYuan * 100),
      nodes: approvalForm.nodes.map((node, index) => ({
        seq: index + 1,
        name: node.name.trim(),
        role: node.role,
        timeout_hours: node.timeoutHours,
        auto_pass_on_timeout: node.autoPassOnTimeout,
        involves_funds: node.involvesFunds,
      })),
      note: approvalForm.note.trim(),
    };
    try {
      if (approvalEditing.value) {
        await updateCloseApprovalFlow(
          approvalEditing.value.id,
          approvalEditing.value.version,
          { ...payload, code: approvalEditing.value.code }
        );
        Message.success('已保存审批流草稿（须「生效」后才作用于结单）');
      } else {
        await createCloseApprovalFlow(payload);
        Message.success('已创建草稿审批流，需“生效”后才会作用于结单');
      }
      approvalVisible.value = false;
      await loadApprovalFlows();
    } catch (err) {
      Message.error(
        errorText(err, '保存失败：仅草稿可编辑，资金节点不能自动通过')
      );
    }
  }

  async function doActivateApprovalFlow(record: EsportsCloseApprovalFlow) {
    try {
      await activateCloseApprovalFlow(record.id);
      Message.success('已生效');
      await loadApprovalFlows();
    } catch (err) {
      Message.error(errorText(err, '生效失败：仅草稿可生效'));
    }
  }

  async function doRollbackApprovalFlow(record: EsportsCloseApprovalFlow) {
    try {
      await rollbackCloseApprovalFlow(record.id);
      Message.success('已回滚并生效新版本');
      await loadApprovalFlows();
    } catch (err) {
      Message.error(errorText(err, '回滚失败，请刷新后重试'));
    }
  }

  onMounted(() => {
    loadFields();
    loadTemplates();
    loadSubmitRules();
    loadApprovalFlows();
  });
</script>

<style scoped lang="less">
  .toolbar {
    margin-bottom: 12px;
  }

  .tip {
    display: block;
    margin-bottom: 12px;
  }
</style>
