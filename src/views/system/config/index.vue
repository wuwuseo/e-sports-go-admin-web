<template>
  <div class="container">
    <a-card class="general-card">
      <template #title>
        <div class="page-header">
          <span>{{ $t('menu.system.config') }}</span>
          <span class="page-desc">{{ $t('system.config.description') }}</span>
        </div>
      </template>

      <a-spin :loading="initLoading" style="width: 100%; min-height: 300px">
        <template v-if="!initLoading">
          <a-empty
            v-if="groups.length === 0"
            :description="$t('system.config.empty')"
          />

          <template v-else>
            <a-tabs
              v-model:active-key="activeTab"
              style="margin-bottom: 24px"
              @change="handleTabChange"
            >
              <!-- 正常分组tab -->
              <a-tab-pane v-for="group in groups" :key="group.key">
                <template #title>
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span>{{ group.label }}</span>
                  </div>
                </template>

                <a-spin
                  :loading="groupLoading[group.key]"
                  style="width: 100%; min-height: 200px"
                >
                  <!-- 空状态 -->
                  <a-empty
                    v-if="
                      !groupLoading[group.key] &&
                      getConfigsByGroup(group.key).length === 0
                    "
                  />

                  <!-- 配置表单 -->
                  <a-form
                    v-else
                    layout="vertical"
                    :model="formModels[group.key] || {}"
                  >
                    <template
                      v-for="(item, index) in getConfigsByGroup(group.key)"
                      :key="item.id"
                    >
                      <!-- 分隔线 -->
                      <a-divider v-if="index === 0" :style="{ marginTop: 0 }" />

                      <!-- String / Number 类型 -->
                      <a-form-item
                        v-if="item.type === 'string' || item.type === 'number'"
                        :extra="item.remark"
                      >
                        <template #label>
                          <div
                            style="
                              display: flex;
                              align-items: center;
                              justify-content: space-between;
                              width: 100%;
                            "
                          >
                            <span>{{ item.name }}</span>
                            <a-button
                              type="text"
                              size="mini"
                              @click="openEditModal(item)"
                            >
                              <template #icon><icon-edit /></template>
                            </a-button>
                          </div>
                        </template>
                        <a-input
                          v-model="formModels[group.key][item.key]"
                          :placeholder="item.remark || `请输入${item.name}`"
                          allow-clear
                        />
                      </a-form-item>

                      <!-- Boolean 类型 -->
                      <a-form-item v-else-if="item.type === 'boolean'">
                        <template #label>
                          <div
                            style="
                              display: flex;
                              align-items: center;
                              justify-content: space-between;
                              width: 100%;
                            "
                          >
                            <span>{{ item.name }}</span>
                            <a-button
                              type="text"
                              size="mini"
                              @click="openEditModal(item)"
                            >
                              <template #icon><icon-edit /></template>
                            </a-button>
                          </div>
                        </template>
                        <a-switch
                          :model-value="formModels[group.key][item.key] === '1'"
                          @change="
                            (val) => {
                              formModels[group.key][item.key] = val ? '1' : '0';
                            }
                          "
                        />
                      </a-form-item>

                      <!-- JSON 类型 - 键值对表格 -->
                      <a-form-item v-else-if="item.type === 'json'">
                        <template #label>
                          <div
                            style="
                              display: flex;
                              align-items: center;
                              justify-content: space-between;
                              width: 100%;
                            "
                          >
                            <span>{{ item.name }}</span>
                            <a-button
                              type="text"
                              size="mini"
                              @click="openEditModal(item)"
                            >
                              <template #icon><icon-edit /></template>
                            </a-button>
                          </div>
                        </template>
                        <div class="kv-table-wrapper">
                          <a-table
                            :data="getKvData(group.key, item.key)"
                            :pagination="false"
                            :bordered="{ cell: true }"
                            size="small"
                          >
                            <template #columns>
                              <a-table-column
                                :title="$t('system.config.kv.key')"
                                data-index="key"
                                :width="200"
                              >
                                <template #cell="{ record }">
                                  <a-input v-model="record.key" size="small" />
                                </template>
                              </a-table-column>
                              <a-table-column
                                :title="$t('system.config.kv.value')"
                                data-index="value"
                              >
                                <template #cell="{ record }">
                                  <a-input
                                    v-model="record.value"
                                    size="small"
                                  />
                                </template>
                              </a-table-column>
                              <a-table-column
                                :title="$t('system.config.operations')"
                                :width="80"
                                align="center"
                              >
                                <template #cell="{ rowIndex }">
                                  <a-button
                                    type="text"
                                    status="danger"
                                    size="mini"
                                    @click="
                                      removeKvRow(group.key, item.key, rowIndex)
                                    "
                                  >
                                    <template #icon><icon-delete /></template>
                                  </a-button>
                                </template>
                              </a-table-column>
                            </template>
                          </a-table>
                          <a-button
                            type="outline"
                            size="small"
                            status="success"
                            style="margin-top: 8px"
                            @click="addKvRow(group.key, item.key)"
                          >
                            <template #icon><icon-plus /></template>
                            {{ $t('system.config.kv.add') }}
                          </a-button>
                        </div>
                      </a-form-item>

                      <!-- Array 类型 - 一维数组列表 -->
                      <a-form-item v-else-if="item.type === 'array'">
                        <template #label>
                          <div
                            style="
                              display: flex;
                              align-items: center;
                              justify-content: space-between;
                              width: 100%;
                            "
                          >
                            <span>{{ item.name }}</span>
                            <a-button
                              type="text"
                              size="mini"
                              @click="openEditModal(item)"
                            >
                              <template #icon><icon-edit /></template>
                            </a-button>
                          </div>
                        </template>
                        <div class="array-list-wrapper">
                          <a-table
                            :data="getArrayData(group.key, item.key)"
                            :pagination="false"
                            :bordered="{ cell: true }"
                            size="small"
                          >
                            <template #columns>
                              <a-table-column
                                :title="'#'"
                                :width="60"
                                align="center"
                              >
                                <template #cell="{ rowIndex }">
                                  {{ rowIndex + 1 }}
                                </template>
                              </a-table-column>
                              <a-table-column
                                :title="$t('system.config.array.value')"
                              >
                                <template #cell="{ record }">
                                  <a-input
                                    v-model="record.value"
                                    size="small"
                                    :placeholder="
                                      $t('system.config.array.value')
                                    "
                                  />
                                </template>
                              </a-table-column>
                              <a-table-column
                                :title="$t('system.config.operations')"
                                :width="80"
                                align="center"
                              >
                                <template #cell="{ rowIndex }">
                                  <a-button
                                    type="text"
                                    status="danger"
                                    size="mini"
                                    @click="
                                      removeArrayItem(
                                        group.key,
                                        item.key,
                                        rowIndex
                                      )
                                    "
                                  >
                                    <template #icon><icon-delete /></template>
                                  </a-button>
                                </template>
                              </a-table-column>
                            </template>
                          </a-table>
                          <a-button
                            type="outline"
                            size="small"
                            status="success"
                            style="margin-top: 8px"
                            @click="addArrayItem(group.key, item.key)"
                          >
                            <template #icon><icon-plus /></template>
                            {{ $t('system.config.array.add') }}
                          </a-button>
                        </div>
                      </a-form-item>

                      <!-- Array2D 类型 - 二维数组表格 -->
                      <a-form-item v-else-if="item.type === 'array2d'">
                        <template #label>
                          <div
                            style="
                              display: flex;
                              align-items: center;
                              justify-content: space-between;
                              width: 100%;
                            "
                          >
                            <span>{{ item.name }}</span>
                            <a-button
                              type="text"
                              size="mini"
                              @click="openEditModal(item)"
                            >
                              <template #icon><icon-edit /></template>
                            </a-button>
                          </div>
                        </template>
                        <div class="array2d-table-wrapper">
                          <a-table
                            :data="getArray2dData(group.key, item.key)"
                            :pagination="false"
                            :bordered="{ cell: true }"
                            size="small"
                          >
                            <template #columns>
                              <a-table-column
                                :title="'#'"
                                :width="60"
                                align="center"
                              >
                                <template #cell="{ rowIndex }">
                                  {{ rowIndex + 1 }}
                                </template>
                              </a-table-column>
                              <a-table-column
                                :title="$t('system.config.kv.key')"
                                :width="150"
                              >
                                <template #cell="{ record }">
                                  <a-input
                                    v-model="record.key"
                                    size="small"
                                    :placeholder="$t('system.config.kv.key')"
                                  />
                                </template>
                              </a-table-column>
                              <a-table-column
                                v-for="(col, colIndex) in getArray2dMaxCols(
                                  group.key,
                                  item.key
                                )"
                                :key="colIndex"
                                :title="`${$t('system.config.array2d.col')} ${
                                  colIndex + 1
                                }`"
                              >
                                <template #cell="{ record }">
                                  <div
                                    style="
                                      display: flex;
                                      gap: 8px;
                                      align-items: center;
                                    "
                                  >
                                    <a-select
                                      v-model="record.values[colIndex].type"
                                      size="mini"
                                      style="width: 100px"
                                    >
                                      <a-option value="string">String</a-option>
                                      <a-option value="number">Number</a-option>
                                      <a-option value="boolean"
                                        >Boolean</a-option
                                      >
                                      <a-option value="json">JSON</a-option>
                                      <a-option value="array">Array</a-option>
                                      <a-option value="array2d"
                                        >Array2D</a-option
                                      >
                                    </a-select>
                                    <a-switch
                                      v-if="
                                        record.values[colIndex].type ===
                                        'boolean'
                                      "
                                      :model-value="
                                        record.values[colIndex].value === 'true'
                                      "
                                      size="small"
                                      @change="(val: string | number | boolean) => { record.values[colIndex].value = String(val); }"
                                    />
                                    <template
                                      v-else-if="
                                        record.values[colIndex].type === 'array'
                                      "
                                    >
                                      <div
                                        style="
                                          flex: 1;
                                          display: flex;
                                          flex-direction: column;
                                          gap: 4px;
                                        "
                                      >
                                        <div
                                          v-for="(
                                            arrayItem, itemIndex
                                          ) in record.values[colIndex].list ||
                                          []"
                                          :key="itemIndex"
                                          style="display: flex; gap: 4px"
                                        >
                                          <a-input
                                            v-model="arrayItem.value"
                                            size="mini"
                                            :placeholder="
                                              $t('system.config.array.item')
                                            "
                                            style="flex: 1"
                                          />
                                          <a-button
                                            type="text"
                                            status="danger"
                                            size="mini"
                                            @click="
                                              removeArrayValueItem(
                                                record.values[colIndex],
                                                itemIndex
                                              )
                                            "
                                          >
                                            <template #icon>
                                              <icon-delete />
                                            </template>
                                          </a-button>
                                        </div>
                                        <a-button
                                          type="text"
                                          size="mini"
                                          style="align-self: flex-start"
                                          @click="
                                            addArrayValueItem(
                                              record.values[colIndex]
                                            )
                                          "
                                        >
                                          <template #icon>
                                            <icon-plus />
                                          </template>
                                          {{ $t('system.config.array.add') }}
                                        </a-button>
                                      </div>
                                    </template>
                                    <a-textarea
                                      v-else-if="
                                        record.values[colIndex].type === 'json'
                                      "
                                      v-model="record.values[colIndex].value"
                                      size="mini"
                                      :placeholder="`${$t(
                                        'system.config.kv.value'
                                      )}`"
                                      :auto-size="{ minRows: 1, maxRows: 3 }"
                                      style="flex: 1"
                                    />
                                    <template
                                      v-else-if="
                                        record.values[colIndex].type ===
                                        'array2d'
                                      "
                                    >
                                      <div
                                        style="
                                          flex: 1;
                                          max-height: 200px;
                                          overflow-y: auto;
                                        "
                                      >
                                        <a-table
                                          v-if="
                                            (
                                              record.values[colIndex].subData ||
                                              []
                                            ).length > 0
                                          "
                                          :data="
                                            record.values[colIndex].subData ||
                                            []
                                          "
                                          :pagination="false"
                                          :bordered="{ cell: true }"
                                          size="mini"
                                          style="margin-bottom: 4px"
                                        >
                                          <template #columns>
                                            <a-table-column
                                              :title="'#'"
                                              :width="40"
                                              align="center"
                                            >
                                              <template #cell="{ rowIndex }">
                                                {{ rowIndex + 1 }}
                                              </template>
                                            </a-table-column>
                                            <a-table-column
                                              :title="
                                                $t('system.config.kv.key')
                                              "
                                              :width="100"
                                            >
                                              <template
                                                #cell="{ record: subRecord }"
                                              >
                                                <a-input
                                                  v-model="subRecord.key"
                                                  size="mini"
                                                  :placeholder="
                                                    $t('system.config.kv.key')
                                                  "
                                                />
                                              </template>
                                            </a-table-column>
                                            <a-table-column
                                              :title="
                                                $t('system.config.form.type')
                                              "
                                              :width="80"
                                            >
                                              <template
                                                #cell="{ record: subRecord }"
                                              >
                                                <a-select
                                                  v-model="subRecord.type"
                                                  size="mini"
                                                  style="width: 80px"
                                                >
                                                  <a-option value="string"
                                                    >String</a-option
                                                  >
                                                  <a-option value="number"
                                                    >Number</a-option
                                                  >
                                                  <a-option value="boolean"
                                                    >Boolean</a-option
                                                  >
                                                  <a-option value="json"
                                                    >JSON</a-option
                                                  >
                                                </a-select>
                                              </template>
                                            </a-table-column>
                                            <a-table-column
                                              :title="
                                                $t('system.config.kv.value')
                                              "
                                            >
                                              <template
                                                #cell="{ record: subRecord }"
                                              >
                                                <a-switch
                                                  v-if="
                                                    subRecord.type === 'boolean'
                                                  "
                                                  :model-value="
                                                    subRecord.value === 'true'
                                                  "
                                                  size="small"
                                                  @change="(val: string | number | boolean) => { subRecord.value = String(val); }"
                                                />
                                                <a-textarea
                                                  v-else-if="
                                                    subRecord.type === 'json'
                                                  "
                                                  v-model="subRecord.value"
                                                  size="mini"
                                                  :placeholder="
                                                    $t('system.config.kv.value')
                                                  "
                                                  :auto-size="{
                                                    minRows: 1,
                                                    maxRows: 2,
                                                  }"
                                                  style="flex: 1"
                                                />
                                                <a-input-number
                                                  v-else-if="
                                                    subRecord.type === 'number'
                                                  "
                                                  v-model="subRecord.value"
                                                  size="mini"
                                                  :placeholder="
                                                    $t('system.config.kv.value')
                                                  "
                                                />
                                                <a-input
                                                  v-else
                                                  v-model="subRecord.value"
                                                  size="mini"
                                                  :placeholder="
                                                    $t('system.config.kv.value')
                                                  "
                                                />
                                              </template>
                                            </a-table-column>
                                            <a-table-column
                                              :title="
                                                $t('system.config.operations')
                                              "
                                              :width="60"
                                              align="center"
                                            >
                                              <template #cell="{ rowIndex }">
                                                <a-button
                                                  type="text"
                                                  status="danger"
                                                  size="mini"
                                                  @click="
                                                    removeNestedArray2dItem(
                                                      record.values[colIndex],
                                                      rowIndex
                                                    )
                                                  "
                                                >
                                                  <template #icon
                                                    ><icon-delete
                                                  /></template>
                                                </a-button>
                                              </template>
                                            </a-table-column>
                                          </template>
                                        </a-table>
                                        <a-button
                                          type="text"
                                          size="mini"
                                          style="align-self: flex-start"
                                          @click="
                                            addNestedArray2dItem(
                                              record.values[colIndex]
                                            )
                                          "
                                        >
                                          <template #icon
                                            ><icon-plus
                                          /></template>
                                          {{ $t('system.config.array.add') }}
                                        </a-button>
                                      </div>
                                    </template>
                                    <a-input-number
                                      v-else-if="
                                        record.values[colIndex].type ===
                                        'number'
                                      "
                                      v-model="record.values[colIndex].value"
                                      size="mini"
                                      :placeholder="`${$t(
                                        'system.config.kv.value'
                                      )}`"
                                      style="flex: 1"
                                    />
                                    <a-input
                                      v-else
                                      v-model="record.values[colIndex].value"
                                      size="mini"
                                      :placeholder="`${$t(
                                        'system.config.kv.value'
                                      )}`"
                                      style="flex: 1"
                                    />
                                  </div>
                                </template>
                              </a-table-column>
                              <a-table-column
                                :title="$t('system.config.operations')"
                                :width="120"
                                align="center"
                              >
                                <template #cell="{ rowIndex }">
                                  <a-space>
                                    <a-button
                                      type="text"
                                      size="mini"
                                      @click="
                                        addArray2dCol(
                                          group.key,
                                          item.key,
                                          rowIndex
                                        )
                                      "
                                    >
                                      <template #icon><icon-plus /></template>
                                    </a-button>
                                    <a-button
                                      type="text"
                                      status="danger"
                                      size="mini"
                                      @click="
                                        removeArray2dRow(
                                          group.key,
                                          item.key,
                                          rowIndex
                                        )
                                      "
                                    >
                                      <template #icon><icon-delete /></template>
                                    </a-button>
                                  </a-space>
                                </template>
                              </a-table-column>
                            </template>
                          </a-table>
                          <a-button
                            type="outline"
                            size="small"
                            status="success"
                            style="margin-top: 8px"
                            @click="addArray2dRow(group.key, item.key)"
                          >
                            <template #icon><icon-plus /></template>
                            {{ $t('system.config.array2d.addRow') }}
                          </a-button>
                        </div>
                      </a-form-item>
                    </template>
                  </a-form>

                  <!-- 新建配置按钮（每个tab都显示） -->
                  <div style="margin-top: 16px">
                    <a-button
                      type="outline"
                      size="small"
                      @click="openCreateModal"
                    >
                      <template #icon><icon-plus /></template>
                      {{ $t('system.config.create') }}
                    </a-button>
                  </div>
                </a-spin>
              </a-tab-pane>

              <!-- 新增分组的占位tab（不显示内容） -->
              <a-tab-pane key="add-group">
                <template #title>
                  <a-button
                    type="text"
                    size="mini"
                    @click="openCreateGroupModal"
                  >
                    <template #icon><icon-plus /></template>
                  </a-button>
                </template>
              </a-tab-pane>
            </a-tabs>

            <!-- 底部操作按钮 -->
            <div class="bottom-actions">
              <a-space>
                <a-button
                  type="primary"
                  size="large"
                  :loading="saving"
                  @click="handleSave"
                >
                  {{ $t('system.config.save') }}
                </a-button>
                <a-button size="large" @click="handleReset">
                  {{ $t('system.config.reset') }}
                </a-button>
              </a-space>
            </div>
          </template>
        </template>
      </a-spin>
    </a-card>

    <!-- 创建配置对话框 -->
    <a-modal
      :visible="createModalVisible"
      :title="$t('system.config.form.title.create')"
      :confirm-loading="creating"
      @ok="handleCreate"
      @cancel="createModalVisible = false"
    >
      <a-form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        layout="vertical"
      >
        <a-form-item :label="$t('system.config.form.name')" required>
          <a-input
            v-model="createForm.name"
            :placeholder="$t('system.config.form.name.placeholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.config.form.key')" required>
          <a-input
            v-model="createForm.key"
            :placeholder="$t('system.config.form.key.placeholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.config.form.type')">
          <a-select v-model="createForm.type" style="width: 100%">
            <a-option value="string">String</a-option>
            <a-option value="number">Number</a-option>
            <a-option value="boolean">Boolean</a-option>
            <a-option value="json">JSON</a-option>
            <a-option value="array">Array</a-option>
            <a-option value="array2d">Array2D</a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('system.config.form.value')">
          <a-textarea
            v-if="
              createForm.type !== 'boolean' &&
              createForm.type !== 'array2d' &&
              createForm.type !== 'array'
            "
            v-model="createForm.value"
            :placeholder="$t('system.config.form.value.placeholder')"
            :auto-size="{ minRows: 2, maxRows: 6 }"
          />
          <a-switch
            v-else-if="createForm.type === 'boolean'"
            :model-value="createForm.value === '1'"
            @change="
              (val) => {
                createForm.value = val ? '1' : '0';
              }
            "
          />
          <div v-else-if="createForm.type === 'array'">
            <a-table
              :data="createArrayData"
              :pagination="false"
              :bordered="{ cell: true }"
              size="small"
              style="margin-bottom: 8px"
            >
              <template #columns>
                <a-table-column :title="'#'" :width="60" align="center">
                  <template #cell="{ rowIndex }">
                    {{ rowIndex + 1 }}
                  </template>
                </a-table-column>
                <a-table-column :title="$t('system.config.array.item')">
                  <template #cell="{ record }">
                    <a-input
                      v-model="record.value"
                      size="small"
                      :placeholder="$t('system.config.array.item')"
                    />
                  </template>
                </a-table-column>
                <a-table-column
                  :title="$t('system.config.operations')"
                  :width="80"
                  align="center"
                >
                  <template #cell="{ rowIndex }">
                    <a-button
                      type="text"
                      status="danger"
                      size="mini"
                      @click="removeCreateArrayItem(rowIndex)"
                    >
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <a-button type="outline" size="small" @click="addCreateArrayItem">
              <template #icon><icon-plus /></template>
              {{ $t('system.config.array.add') }}
            </a-button>
          </div>
          <div v-else>
            <a-table
              :data="createArray2dData"
              :pagination="false"
              :bordered="{ cell: true }"
              size="small"
              style="margin-bottom: 8px"
            >
              <template #columns>
                <a-table-column :title="'#'" :width="60" align="center">
                  <template #cell="{ rowIndex }">
                    {{ rowIndex + 1 }}
                  </template>
                </a-table-column>
                <a-table-column
                  :title="$t('system.config.kv.key')"
                  :width="120"
                >
                  <template #cell="{ record }">
                    <a-input
                      v-model="record.key"
                      size="mini"
                      :placeholder="$t('system.config.kv.key')"
                    />
                  </template>
                </a-table-column>
                <a-table-column
                  v-for="(col, colIndex) in createArray2dMaxCols"
                  :key="colIndex"
                  :title="`${$t('system.config.array2d.col')} ${colIndex + 1}`"
                >
                  <template #cell="{ record }">
                    <div style="display: flex; gap: 4px; align-items: center">
                      <a-select
                        v-model="record.values[colIndex].type"
                        size="mini"
                        style="width: 80px"
                      >
                        <a-option value="string">String</a-option>
                        <a-option value="number">Number</a-option>
                        <a-option value="boolean">Boolean</a-option>
                        <a-option value="json">JSON</a-option>
                      </a-select>
                      <a-switch
                        v-if="record.values[colIndex].type === 'boolean'"
                        :model-value="record.values[colIndex].value === 'true'"
                        size="small"
                        @change="(val: string | number | boolean) => { record.values[colIndex].value = String(val); }"
                      />
                      <a-textarea
                        v-else-if="record.values[colIndex].type === 'json'"
                        v-model="record.values[colIndex].value"
                        size="mini"
                        :placeholder="`${$t('system.config.kv.value')}`"
                        :auto-size="{ minRows: 1, maxRows: 3 }"
                        style="flex: 1"
                      />
                      <a-input-number
                        v-else-if="record.values[colIndex].type === 'number'"
                        v-model="record.values[colIndex].value"
                        size="mini"
                        :placeholder="`${$t('system.config.kv.value')}`"
                        style="flex: 1"
                      />
                      <a-input
                        v-else
                        v-model="record.values[colIndex].value"
                        size="mini"
                        :placeholder="`${$t('system.config.kv.value')}`"
                        style="flex: 1"
                      />
                    </div>
                  </template>
                </a-table-column>
                <a-table-column
                  :title="$t('system.config.operations')"
                  :width="100"
                  align="center"
                >
                  <template #cell="{ rowIndex }">
                    <a-space>
                      <a-button
                        type="text"
                        size="mini"
                        @click="addCreateArray2dCol(rowIndex)"
                      >
                        <template #icon><icon-plus /></template>
                      </a-button>
                      <a-button
                        type="text"
                        status="danger"
                        size="mini"
                        @click="removeCreateArray2dRow(rowIndex)"
                      >
                        <template #icon><icon-delete /></template>
                      </a-button>
                    </a-space>
                  </template>
                </a-table-column>
              </template>
            </a-table>
            <a-button type="outline" size="small" @click="addCreateArray2dRow">
              <template #icon><icon-plus /></template>
              {{ $t('system.config.array2d.addRow') }}
            </a-button>
          </div>
        </a-form-item>
        <a-form-item :label="$t('system.config.form.remark')">
          <a-textarea
            v-model="createForm.remark"
            :placeholder="$t('system.config.form.remark.placeholder')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 创建分组对话框 -->
    <a-modal
      :visible="createGroupModalVisible"
      :title="$t('system.config.group.create')"
      :confirm-loading="creatingGroup"
      @ok="handleCreateGroup"
      @cancel="createGroupModalVisible = false"
    >
      <a-form
        ref="createGroupFormRef"
        :model="createGroupForm"
        :rules="createGroupFormRules"
        layout="vertical"
      >
        <a-form-item :label="$t('system.config.group.label')" required>
          <a-input
            v-model="createGroupForm.label"
            :placeholder="$t('system.config.group.label.placeholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.config.group.value')" required>
          <a-input
            v-model="createGroupForm.value"
            :placeholder="$t('system.config.group.value.placeholder')"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 编辑配置对话框 -->
    <a-modal
      :visible="editModalVisible"
      :title="$t('system.config.form.title.edit')"
      :confirm-loading="editing"
      @ok="handleEdit"
      @cancel="editModalVisible = false"
    >
      <a-form
        ref="editFormRef"
        :model="editForm"
        :rules="editFormRules"
        layout="vertical"
      >
        <a-form-item :label="$t('system.config.form.name')" required>
          <a-input
            v-model="editForm.name"
            :placeholder="$t('system.config.form.name.placeholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.config.form.key')" required>
          <a-input
            v-model="editForm.key"
            :placeholder="$t('system.config.form.key.placeholder')"
          />
        </a-form-item>
        <a-form-item :label="$t('system.config.form.type')">
          <a-select v-model="editForm.type" style="width: 100%">
            <a-option value="string">String</a-option>
            <a-option value="number">Number</a-option>
            <a-option value="boolean">Boolean</a-option>
            <a-option value="json">JSON</a-option>
            <a-option value="array">Array</a-option>
            <a-option value="array2d">Array2D</a-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="$t('system.config.form.value')">
          <a-textarea
            v-if="editForm.type !== 'boolean'"
            v-model="editForm.value"
            :placeholder="$t('system.config.form.value.placeholder')"
            :auto-size="{ minRows: 2, maxRows: 6 }"
          />
          <a-switch
            v-else
            :model-value="editForm.value === '1'"
            @change="
              (val) => {
                editForm.value = val ? '1' : '0';
              }
            "
          />
        </a-form-item>
        <a-form-item :label="$t('system.config.form.remark')">
          <a-textarea
            v-model="editForm.remark"
            :placeholder="$t('system.config.form.remark.placeholder')"
            :auto-size="{ minRows: 2, maxRows: 4 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
  import { ref, reactive, computed, watch, onMounted } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import { useI18n } from 'vue-i18n';
  import type {
    ConfigResponse,
    ConfigGroup,
    CreateConfigRequest,
    ConfigValueType,
  } from '@/types/api';
  import {
    getConfigByGroup,
    updateConfig,
    getConfigGroups,
    createConfig,
  } from '@/api/config';
  import { createDictData } from '@/api/dict-data';

  const { t } = useI18n();

  // 分组定义：key 对应后端的 group 字段值，label 为显示名称
  const groups = ref<Array<{ key: string; label: string }>>([]);

  // 每个分组加载中的状态
  const groupLoading = reactive<Record<string, boolean>>({});

  // 每个分组的原始配置数据 (用于重置)
  const rawConfigs = reactive<Record<string, ConfigResponse[]>>({});

  // 每个分组的表单模型 { groupKey: { configKey: value } }
  const formModels = reactive<Record<string, Record<string, string>>>({});

  // 每个分组 JSON 类型的键值对数据 { groupKey: { configKey: Array<{key, value}> } }
  const kvStore = reactive<
    Record<string, Record<string, Array<{ key: string; value: string }>>>
  >({});

  // 每个分组 Array 类型的数据 { groupKey: { configKey: Array<{ value: string }> } }
  const arrayStore = reactive<
    Record<string, Record<string, Array<{ value: string }>>>
  >({});

  // 每个分组 Array2D 类型的数据 { groupKey: { configKey: Array<{key: string, values: Array<{value, type}>}> } }
  const array2dStore = reactive<
    Record<
      string,
      Record<
        string,
        Array<{
          key: string;
          values: Array<{ value: string; type: ConfigValueType }>;
        }>
      >
    >
  >({});

  const activeTab = ref('');
  const saving = ref(false);
  const initLoading = ref(true);

  // 创建配置对话框
  const createModalVisible = ref(false);
  const createForm = reactive<CreateConfigRequest>({
    name: '',
    key: '',
    value: '',
    type: 'string',
    group: '',
    status: 1,
    remark: '',
  });
  const createFormRef = ref();
  const creating = ref(false);

  // 创建分组对话框
  const createGroupModalVisible = ref(false);
  const createGroupForm = reactive({
    label: '',
    value: '',
  });
  const creatingGroup = ref(false);
  const createGroupFormRef = ref();

  // 创建对话框中的 Array 数据
  const createArrayData = ref<Array<{ value: string }>>([{ value: '' }]);

  // 添加创建对话框中 Array 的项
  const addCreateArrayItem = () => {
    createArrayData.value.push({ value: '' });
  };

  // 删除创建对话框中 Array 的项
  const removeCreateArrayItem = (index: number) => {
    createArrayData.value.splice(index, 1);
  };

  // 序列化创建对话框中的 Array 数据
  const serializeCreateArray = (): string => {
    return JSON.stringify(
      createArrayData.value.map((item) => item.value).filter((v) => v)
    );
  };

  // 重置创建对话框中的 Array 数据
  const resetCreateArray = () => {
    createArrayData.value = [{ value: '' }];
  };

  // 创建对话框中的 Array2D 数据
  const createArray2dData = ref<
    Array<{
      key: string;
      values: Array<{ value: string; type: ConfigValueType }>;
    }>
  >([{ key: '', values: [{ value: '', type: 'string' }] }]);

  // 获取创建对话框中 Array2D 的最大列数
  const createArray2dMaxCols = computed(() => {
    if (createArray2dData.value.length === 0) return 1;
    return Math.max(...createArray2dData.value.map((row) => row.values.length));
  });

  // 添加创建对话框中 Array2D 的行
  const addCreateArray2dRow = () => {
    const maxCols = createArray2dMaxCols.value;
    createArray2dData.value.push({
      key: '',
      values: new Array(maxCols)
        .fill(null)
        .map(() => ({ value: '', type: 'string' as ConfigValueType })),
    });
  };

  // 删除创建对话框中 Array2D 的行
  const removeCreateArray2dRow = (index: number) => {
    createArray2dData.value.splice(index, 1);
  };

  // 为创建对话框中 Array2D 的指定行添加列
  const addCreateArray2dCol = (rowIndex: number) => {
    createArray2dData.value[rowIndex].values.push({
      value: '',
      type: 'string' as ConfigValueType,
    });
    const newColCount = createArray2dData.value[rowIndex].values.length;
    createArray2dData.value.forEach((row) => {
      while (row.values.length < newColCount) {
        row.values.push({
          value: '',
          type: 'string' as ConfigValueType,
        });
      }
    });
  };

  // 序列化创建对话框中的 Array2D 数据
  const serializeCreateArray2d = (): string => {
    const result: Record<string, any> = {};
    createArray2dData.value.forEach((row) => {
      if (!row.key) return;
      const val = row.values[0];
      if (!val) {
        result[row.key] = '';
        return;
      }
      switch (val.type) {
        case 'array':
          result[row.key] = (val as any).list
            ? (val as any).list.map((item: any) => item.value)
            : [];
          break;
        case 'array2d':
          result[row.key] = {};
          if ((val as any).subData) {
            (val as any).subData.forEach((sd: any) => {
              if (sd.key) {
                result[row.key][sd.key] = sd.value;
              }
            });
          }
          break;
        case 'number':
          result[row.key] = val.value ? Number(val.value) : 0;
          break;
        case 'boolean':
          result[row.key] = val.value === 'true';
          break;
        default:
          result[row.key] = val.value;
      }
    });
    return JSON.stringify(result);
  };

  // 重置创建对话框中的 Array2D 数据
  const resetCreateArray2d = () => {
    createArray2dData.value = [
      { key: '', values: [{ value: '', type: 'string' }] },
    ];
  };

  // 添加数组值项
  const addArrayValueItem = (valueItem: any) => {
    if (!valueItem.list) {
      valueItem.list = [];
    }
    valueItem.list.push({ value: '' });
  };

  // 删除数组值项
  const removeArrayValueItem = (valueItem: any, index: number) => {
    if (valueItem.list) {
      valueItem.list.splice(index, 1);
    }
  };

  // 添加嵌套 Array2D 项
  const addNestedArray2dItem = (valueItem: any) => {
    if (!valueItem.subData) {
      valueItem.subData = [];
    }
    valueItem.subData.push({ key: '', value: '', type: 'string' });
  };

  // 删除嵌套 Array2D 项
  const removeNestedArray2dItem = (valueItem: any, index: number) => {
    if (valueItem.subData) {
      valueItem.subData.splice(index, 1);
    }
  };

  // 编辑配置对话框
  const editModalVisible = ref(false);
  const editForm = reactive<CreateConfigRequest>({
    name: '',
    key: '',
    value: '',
    type: 'string',
    group: '',
    status: 1,
    remark: '',
  });
  const editFormRef = ref();
  const editing = ref(false);
  const editingId = ref(0);

  // 创建配置表单验证规则
  const createFormRules = computed(() => ({
    name: [{ required: true, message: t('system.config.form.name.required') }],
    key: [{ required: true, message: t('system.config.form.key.required') }],
  }));

  // 创建分组表单验证规则
  const createGroupFormRules = computed(() => ({
    label: [{ required: true, message: t('system.config.group.required') }],
    value: [{ required: true, message: t('system.config.group.required') }],
  }));

  // 编辑配置表单验证规则
  const editFormRules = computed(() => ({
    name: [{ required: true, message: t('system.config.form.name.required') }],
    key: [{ required: true, message: t('system.config.form.key.required') }],
  }));

  // 监听 activeTab，如果选中了 add-group，就自动切换回第一个分组
  watch(activeTab, (newVal) => {
    if (newVal === 'add-group' && groups.value.length > 0) {
      activeTab.value = groups.value[0].key;
    }
  });

  // 获取指定分组的配置列表
  const getConfigsByGroup = (groupKey: string): ConfigResponse[] => {
    return rawConfigs[groupKey] || [];
  };

  // 获取指定分组下指定配置键的 KV 数据
  const getKvData = (
    groupKey: string,
    configKey: string
  ): Array<{ key: string; value: string }> => {
    return kvStore[groupKey]?.[configKey] || [];
  };

  // 获取指定分组下指定配置键的 Array 数据
  const getArrayData = (
    groupKey: string,
    configKey: string
  ): Array<{ value: string }> => {
    return arrayStore[groupKey]?.[configKey] || [];
  };

  // 获取指定分组下指定配置键的 Array2D 数据
  const getArray2dData = (
    groupKey: string,
    configKey: string
  ): Array<{
    key: string;
    values: Array<{ value: string; type: ConfigValueType }>;
  }> => {
    return array2dStore[groupKey]?.[configKey] || [];
  };

  // 获取 Array2D 的最大列数
  const getArray2dMaxCols = (groupKey: string, configKey: string): number => {
    const data = getArray2dData(groupKey, configKey);
    return data.length > 0
      ? Math.max(...data.map((row) => row.values.length))
      : 1;
  };

  // 解析 JSON 字符串为 KV 数组
  const parseKvData = (
    value: string
  ): Array<{ key: string; value: string }> => {
    try {
      const parsed = JSON.parse(value || '[]');
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          key: item.key ?? item.key_name ?? '',
          value: item.value ?? item.key_value ?? '',
        }));
      }
      // 如果是对象格式，转为键值对数组
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([k, v]) => ({
          key: k,
          value: String(v ?? ''),
        }));
      }
    } catch {
      // ignore
    }
    return [];
  };

  // 序列化 KV 数组为 JSON 字符串
  const serializeKvData = (
    data: Array<{ key: string; value: string }>
  ): string => {
    return JSON.stringify(data.filter((item) => item.key || item.value));
  };

  // 解析 JSON 字符串为 Array 数据
  const parseArrayData = (value: string): Array<{ value: string }> => {
    try {
      const parsed = JSON.parse(value || '[]');
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          value: String(item ?? ''),
        }));
      }
    } catch {
      // ignore
    }
    return [];
  };

  // 序列化 Array 数据为 JSON 字符串
  const serializeArrayData = (data: Array<{ value: string }>): string => {
    return JSON.stringify(data.map((item) => item.value).filter((v) => v));
  };

  // 解析 JSON 字符串为 Array2D 数据 {key, values[{value,type}]}
  const parseArray2dData = (
    value: string
  ): Array<{
    key: string;
    values: Array<{ value: string; type: ConfigValueType }>;
  }> => {
    try {
      const parsed = JSON.parse(value || '{}');
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return Object.entries(parsed).map(([key, val]: [string, any]) => {
          let type: ConfigValueType = 'string';
          let valueStr = '';
          let list: any[] | undefined;
          let subData: any[] | undefined;

          if (Array.isArray(val)) {
            type = 'array';
            list = val.map((item: any) => ({ value: String(item ?? '') }));
          } else if (typeof val === 'object' && val !== null) {
            type = 'array2d';
            subData = Object.entries(val).map(
              ([sdKey, sdVal]: [string, any]) => ({
                key: sdKey,
                value: String(sdVal ?? ''),
                type: 'string' as ConfigValueType,
              })
            );
          } else if (typeof val === 'number') {
            type = 'number';
            valueStr = String(val);
          } else if (typeof val === 'boolean') {
            type = 'boolean';
            valueStr = String(val);
          } else {
            valueStr = String(val ?? '');
          }

          const valueObj: any = {
            value: valueStr,
            type,
          };
          if (list) {
            valueObj.list = list;
          }
          if (subData) {
            valueObj.subData = subData;
          }

          return {
            key,
            values: [valueObj],
          };
        });
      }
      // 兼容旧格式
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          if (typeof item === 'object' && item !== null && 'key' in item) {
            return {
              key: String(item.key ?? ''),
              values: Array.isArray(item.values)
                ? item.values.map((v: any) => {
                    if (typeof v === 'object' && v !== null) {
                      const type = (v.type as ConfigValueType) || 'string';
                      const val = {
                        value: String(v.value ?? ''),
                        type,
                      };
                      // 如果是 array 类型，解析 list
                      if (type === 'array' && v.list) {
                        (val as any).list = v.list;
                      }
                      // 如果是 array2d 类型，解析 subData
                      if (type === 'array2d' && v.subData) {
                        (val as any).subData = v.subData.map((sd: any) => ({
                          key: String(sd.key ?? ''),
                          value: String(sd.value ?? ''),
                          type: (sd.type as ConfigValueType) || 'string',
                        }));
                      }
                      return val;
                    }
                    const val = {
                      value: String(v ?? ''),
                      type: 'string' as ConfigValueType,
                    };
                    return val;
                  })
                : [],
            };
          }
          if (Array.isArray(item)) {
            return {
              key: '',
              values: item.map((v: any) => {
                if (typeof v === 'object' && v !== null) {
                  const type = (v.type as ConfigValueType) || 'string';
                  const val = {
                    value: String(v.value ?? ''),
                    type,
                  };
                  // 如果是 array 类型，解析 list
                  if (type === 'array' && v.list) {
                    (val as any).list = v.list;
                  }
                  return val;
                }
                const val = {
                  value: String(v ?? ''),
                  type: 'string' as ConfigValueType,
                };
                return val;
              }),
            };
          }
          return {
            key: '',
            values: [
              {
                value: String(item ?? ''),
                type: 'string' as ConfigValueType,
              },
            ],
          };
        });
      }
    } catch {
      // ignore
    }
    return [];
  };

  // 序列化 Array2D 数据为 JSON 字符串
  const serializeArray2dData = (
    data: Array<{
      key: string;
      values: Array<{ value: string; type: ConfigValueType }>;
    }>
  ): string => {
    const result: Record<string, any> = {};
    data.forEach((row) => {
      if (!row.key) return;
      const val = row.values[0];
      if (!val) {
        result[row.key] = '';
        return;
      }
      switch (val.type) {
        case 'array':
          result[row.key] = (val as any).list
            ? (val as any).list.map((item: any) => item.value)
            : [];
          break;
        case 'array2d':
          result[row.key] = {};
          if ((val as any).subData) {
            (val as any).subData.forEach((sd: any) => {
              if (sd.key) {
                result[row.key][sd.key] = sd.value;
              }
            });
          }
          break;
        case 'number':
          result[row.key] = val.value ? Number(val.value) : 0;
          break;
        case 'boolean':
          result[row.key] = val.value === 'true';
          break;
        default:
          result[row.key] = val.value;
      }
    });
    return JSON.stringify(result);
  };

  // 添加 Array 元素
  const addArrayItem = (groupKey: string, configKey: string) => {
    if (!arrayStore[groupKey]) {
      arrayStore[groupKey] = {};
    }
    if (!arrayStore[groupKey][configKey]) {
      arrayStore[groupKey][configKey] = [];
    }
    arrayStore[groupKey][configKey].push({ value: '' });
  };

  // 删除 Array 元素
  const removeArrayItem = (
    groupKey: string,
    configKey: string,
    index: number
  ) => {
    const arr = arrayStore[groupKey]?.[configKey];
    if (arr) {
      arr.splice(index, 1);
    }
  };

  // 添加 Array2D 行
  const addArray2dRow = (groupKey: string, configKey: string) => {
    if (!array2dStore[groupKey]) {
      array2dStore[groupKey] = {};
    }
    if (!array2dStore[groupKey][configKey]) {
      array2dStore[groupKey][configKey] = [];
    }
    const maxCols = getArray2dMaxCols(groupKey, configKey);
    array2dStore[groupKey][configKey].push({
      key: '',
      values: new Array(maxCols)
        .fill(null)
        .map(() => ({ value: '', type: 'string' as ConfigValueType })),
    });
  };

  // 删除 Array2D 行
  const removeArray2dRow = (
    groupKey: string,
    configKey: string,
    index: number
  ) => {
    const arr = array2dStore[groupKey]?.[configKey];
    if (arr) {
      arr.splice(index, 1);
    }
  };

  // 为指定行添加一列（同步更新所有行）
  const addArray2dCol = (
    groupKey: string,
    configKey: string,
    rowIndex: number
  ) => {
    const arr = array2dStore[groupKey]?.[configKey];
    if (arr && arr[rowIndex]) {
      arr[rowIndex].values.push({
        value: '',
        type: 'string' as ConfigValueType,
      });
      const newColCount = arr[rowIndex].values.length;
      arr.forEach((row) => {
        while (row.values.length < newColCount) {
          row.values.push({
            value: '',
            type: 'string' as ConfigValueType,
          });
        }
      });
    }
  };

  // 加载指定分组的配置
  const loadGroupConfigs = async (groupKey: string) => {
    groupLoading[groupKey] = true;
    try {
      const { data } = await getConfigByGroup(groupKey);
      const items: ConfigResponse[] = data.data || [];
      rawConfigs[groupKey] = items;

      // 初始化表单模型
      const model: Record<string, string> = {};
      const kvMap: Record<string, Array<{ key: string; value: string }>> = {};
      const arrayMap: Record<string, Array<{ value: string }>> = {};
      const array2dMap: Record<
        string,
        Array<{
          key: string;
          values: Array<{ value: string; type: ConfigValueType }>;
        }>
      > = {};

      items.forEach((item) => {
        if (item.type === 'json') {
          kvMap[item.key] = parseKvData(item.value);
          model[item.key] = item.value;
        } else if (item.type === 'array') {
          arrayMap[item.key] = parseArrayData(item.value);
          model[item.key] = item.value;
        } else if (item.type === 'array2d') {
          array2dMap[item.key] = parseArray2dData(item.value);
          model[item.key] = item.value;
        } else {
          model[item.key] = item.value || '';
        }
      });

      formModels[groupKey] = model;
      kvStore[groupKey] = kvMap;
      arrayStore[groupKey] = arrayMap;
      array2dStore[groupKey] = array2dMap;
    } catch {
      Message.error(t('system.config.loadError'));
    } finally {
      groupLoading[groupKey] = false;
    }
  };

  // 加载所有分组的配置元信息（仅用于构建分组列表）
  const loadAllGroups = async () => {
    initLoading.value = true;
    try {
      // 从 API 获取分组选项
      const { data } = await getConfigGroups();
      const configGroups: ConfigGroup[] = data.data || [];

      // 构建分组列表
      groups.value = configGroups.map((group) => ({
        key: group.value,
        label: group.label,
      }));

      if (groups.value.length > 0) {
        activeTab.value = groups.value[0].key;
        // 加载第一个分组的配置
        await loadGroupConfigs(groups.value[0].key);
      }
    } catch {
      Message.error(t('system.config.loadError'));
    } finally {
      initLoading.value = false;
    }
  };

  // 切换标签页
  const handleTabChange = async (tabKey: string | number) => {
    const key = String(tabKey);

    // 如果点击了 add-group tab，不切换，直接打开弹窗
    if (key === 'add-group') {
      openCreateGroupModal();
      return;
    }

    activeTab.value = key;
    // 如果该分组尚未加载，则加载
    if (!rawConfigs[key]) {
      await loadGroupConfigs(key);
    }
  };

  // 添加 KV 行
  const addKvRow = (groupKey: string, configKey: string) => {
    if (!kvStore[groupKey]) {
      kvStore[groupKey] = {};
    }
    if (!kvStore[groupKey][configKey]) {
      kvStore[groupKey][configKey] = [];
    }
    kvStore[groupKey][configKey].push({ key: '', value: '' });
  };

  // 删除 KV 行
  const removeKvRow = (groupKey: string, configKey: string, index: number) => {
    const arr = kvStore[groupKey]?.[configKey];
    if (arr) {
      arr.splice(index, 1);
    }
  };

  // 保存所有修改的配置
  const handleSave = async () => {
    saving.value = true;
    try {
      const updatePromises: Promise<any>[] = [];

      Object.keys(rawConfigs).forEach((groupKey) => {
        const items = rawConfigs[groupKey] || [];
        const model = formModels[groupKey];

        items.forEach((item) => {
          let newValue: string;

          if (item.type === 'json') {
            // JSON 类型：从 KV store 序列化
            const kvData = kvStore[groupKey]?.[item.key];
            newValue = kvData ? serializeKvData(kvData) : '';
          } else if (item.type === 'array') {
            // Array 类型：从 arrayStore 序列化
            const arrayData = arrayStore[groupKey]?.[item.key];
            newValue = arrayData ? serializeArrayData(arrayData) : '[]';
          } else if (item.type === 'array2d') {
            // Array2D 类型：从 array2dStore 序列化
            const array2dData = array2dStore[groupKey]?.[item.key];
            newValue = array2dData ? serializeArray2dData(array2dData) : '[]';
          } else {
            newValue = model?.[item.key] ?? '';
          }

          // 只在值发生变化时提交
          if (newValue !== item.value) {
            updatePromises.push(updateConfig(item.id, { value: newValue }));
          }
        });
      });

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        Message.success(t('system.config.saveSuccess'));
        // 重新加载当前标签页
        if (activeTab.value && activeTab.value !== 'add-group') {
          await loadGroupConfigs(activeTab.value);
        }
      } else {
        Message.info(t('system.config.noChange'));
      }
    } catch {
      // error handled by interceptor
    } finally {
      saving.value = false;
    }
  };

  // 重置当前标签页
  const handleReset = async () => {
    if (activeTab.value && activeTab.value !== 'add-group') {
      await loadGroupConfigs(activeTab.value);
      Message.info(t('system.config.reset'));
    }
  };

  // 打开创建配置对话框
  const openCreateModal = () => {
    if (activeTab.value && activeTab.value !== 'add-group') {
      createForm.group = activeTab.value;
    }
    createForm.name = '';
    createForm.key = '';
    createForm.value = '';
    createForm.type = 'string';
    createForm.status = 1;
    createForm.remark = '';
    createModalVisible.value = true;
  };

  // 提交创建配置
  const handleCreate = async () => {
    const errors = await createFormRef.value?.validate();
    if (errors) return;

    creating.value = true;
    try {
      const requestData = { ...createForm };
      if (createForm.type === 'array') {
        requestData.value = serializeCreateArray();
      } else if (createForm.type === 'array2d') {
        requestData.value = serializeCreateArray2d();
      }
      await createConfig(requestData);
      Message.success(t('system.config.createSuccess'));
      createModalVisible.value = false;
      resetCreateArray();
      resetCreateArray2d();
      // 重新加载当前分组
      if (activeTab.value && activeTab.value !== 'add-group') {
        await loadGroupConfigs(activeTab.value);
      }
    } catch {
      // error handled by interceptor
    } finally {
      creating.value = false;
    }
  };

  // 打开创建分组对话框
  const openCreateGroupModal = () => {
    createGroupForm.label = '';
    createGroupForm.value = '';
    createGroupModalVisible.value = true;
  };

  // 提交创建分组
  const handleCreateGroup = async () => {
    const errors = await createGroupFormRef.value?.validate();
    if (errors) return;

    creatingGroup.value = true;
    try {
      // 通过字典数据接口创建分组
      await createDictData({
        dict_type: 'sys_config_group',
        label: createGroupForm.label,
        value: createGroupForm.value,
        sort: groups.value.length + 1,
        status: 1,
      });
      Message.success(t('system.config.group.createSuccess'));
      createGroupModalVisible.value = false;
      // 重新加载分组
      await loadAllGroups();
      // 自动选中新创建的分组
      if (groups.value.length > 0) {
        activeTab.value = createGroupForm.value;
      }
    } catch {
      // error handled by interceptor
    } finally {
      creatingGroup.value = false;
    }
  };

  // 打开编辑配置对话框
  const openEditModal = (item: ConfigResponse) => {
    editingId.value = item.id;
    editForm.name = item.name;
    editForm.key = item.key;
    editForm.value = item.value;
    editForm.type = item.type;
    editForm.group = item.group;
    editForm.status = item.status;
    editForm.remark = item.remark || '';
    editModalVisible.value = true;
  };

  // 提交编辑配置
  const handleEdit = async () => {
    const errors = await editFormRef.value?.validate();
    if (errors) return;

    editing.value = true;
    try {
      await updateConfig(editingId.value, editForm);
      Message.success(t('system.config.editSuccess'));
      editModalVisible.value = false;
      // 重新加载当前分组
      if (activeTab.value && activeTab.value !== 'add-group') {
        await loadGroupConfigs(activeTab.value);
      }
    } catch {
      // error handled by interceptor
    } finally {
      editing.value = false;
    }
  };

  onMounted(() => {
    loadAllGroups();
  });
</script>

<script lang="ts">
  export default {
    name: 'SystemConfig',
  };
</script>

<style scoped lang="less">
  .container {
    padding: 0;

    :deep(.general-card) {
      .page-header {
        display: flex;
        align-items: baseline;
        gap: 12px;

        .page-desc {
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-3);
        }
      }
    }

    .kv-table-wrapper {
      width: 100%;
    }

    .bottom-actions {
      display: flex;
      justify-content: center;
      padding-top: 16px;
      border-top: 1px solid var(--color-border-2);
      margin-top: 8px;
    }

    :deep(.arco-form-item) {
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
</style>
