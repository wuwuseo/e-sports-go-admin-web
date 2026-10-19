<template>
  <div class="container page-container">
    <a-card class="general-card" title="商品">
      <a-tabs v-model:active-key="activeTab" @change="loadActive">
        <a-tab-pane key="products" title="商品" />
        <a-tab-pane key="spec-groups" title="规格组" />
        <a-tab-pane key="skus" title="SKU" />
        <a-tab-pane key="categories" title="产品分类" />
        <a-tab-pane key="suspensions" title="SKU 停服" />
      </a-tabs>
      <a-space class="toolbar">
        <a-button :loading="loading" @click="loadActive">刷新</a-button>
        <a-select
          v-if="activeTab === 'suspensions'"
          v-model="suspensionStatusFilter"
          class="status-filter"
          @change="loadActive"
        >
          <a-option value="">全部状态</a-option>
          <a-option value="pending">待审批</a-option>
          <a-option value="approved">已批准待生效</a-option>
          <a-option value="applied">已生效</a-option>
          <a-option value="rejected">已驳回</a-option>
          <a-option value="cancelled">已撤回</a-option>
        </a-select>
        <a-button
          v-if="activeTab === 'products' && canCreateProduct"
          type="primary"
          @click="openProduct()"
          >新建商品</a-button
        >
        <a-button
          v-if="activeTab === 'spec-groups' && canCreateSpecGroup"
          type="primary"
          @click="openSpecGroup()"
          >新建规格组</a-button
        >
        <a-button
          v-if="activeTab === 'skus' && canAddSku"
          type="primary"
          @click="openSku()"
          >新增 SKU</a-button
        >
        <a-button
          v-if="activeTab === 'categories' && canManageCategory"
          type="primary"
          @click="openCategory()"
          >新增分类</a-button
        >
        <a-button
          v-if="activeTab === 'suspensions' && canRequestSuspension"
          type="primary"
          @click="openSuspension()"
          >发起停服申请</a-button
        >
      </a-space>

      <a-table
        v-if="activeTab === 'products'"
        :data="products"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="ID" :width="70" />
          <a-table-column data-index="name" title="商品名称" />
          <a-table-column title="产品分类">
            <template #cell="{ record }">{{
              categoryName(record.category_id)
            }}</template>
          </a-table-column>
          <a-table-column data-index="description" title="描述" />
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <a-tag :color="productStatusColor(record.status)">{{
                productStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column data-index="version" title="版本" :width="70" />
          <a-table-column title="更新时间" :width="180">
            <template #cell="{ record }">{{
              fmtTime(record.updated_at)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-button
                v-if="canUpdateProduct"
                type="text"
                @click="openProduct(record)"
                >编辑</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-table
        v-else-if="activeTab === 'spec-groups'"
        :data="specGroups"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="规格组编码" />
          <a-table-column data-index="name" title="规格组名" />
          <a-table-column title="席位数" :width="90">
            <template #cell="{ record }">{{
              record.seats ? record.seats.length : 0
            }}</template>
          </a-table-column>
          <a-table-column title="每席承诺服务量" :width="130">
            <template #cell="{ record }">{{
              record.per_seat_service_units || '未配置'
            }}</template>
          </a-table-column>
          <a-table-column title="逐席承诺合计" :width="120">
            <template #cell="{ record }">{{ seatTotalText(record) }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'gray'">{{
                record.status === 'enabled' ? '启用' : '停用'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column data-index="version" title="版本" :width="70" />
          <a-table-column title="更新时间" :width="180">
            <template #cell="{ record }">{{
              fmtTime(record.updated_at)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-button
                v-if="canUpdateSpecGroup"
                type="text"
                @click="openSpecGroup(record)"
                >编辑</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-table
        v-else-if="activeTab === 'skus'"
        :data="skus"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="编码" />
          <a-table-column data-index="title" title="商品名" />
          <a-table-column title="分类">
            <template #cell="{ record }">{{
              categoryName(record.category_id)
            }}</template>
          </a-table-column>
          <a-table-column title="每份标价">
            <template #cell="{ record }">{{
              money(record.unit_price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="人工议价底价">
            <template #cell="{ record }">{{
              money(record.min_unit_price_cents || record.unit_price_cents)
            }}</template>
          </a-table-column>
          <a-table-column title="免审调整幅度">
            <template #cell="{ record }"
              >{{ record.adjustment_approval_bp / 100 }}%</template
            >
          </a-table-column>
          <a-table-column title="一份服务量">
            <template #cell="{ record }"
              >{{ record.service_units }}
              {{ record.service_unit_name }}</template
            >
          </a-table-column>
          <a-table-column data-index="required_seats" title="席位" />
          <a-table-column title="每席承诺服务量">
            <template #cell="{ record }">{{ perSeatText(record) }}</template>
          </a-table-column>
          <a-table-column title="名额（已售/总量）">
            <template #cell="{ record }">{{ quotaText(record) }}</template>
          </a-table-column>
          <a-table-column data-index="sort_order" title="排序" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'on_sale' ? 'green' : 'gray'">{{
                statusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="canEditSku" title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="openSku(record)">编辑</a-button>
              <a-button
                v-if="record.status !== 'off_sale'"
                type="text"
                status="warning"
                @click="toggleSale(record, 'off_sale')"
                >下架</a-button
              >
              <a-button
                v-else
                type="text"
                @click="toggleSale(record, 'on_sale')"
                >上架</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-table
        v-else-if="activeTab === 'categories'"
        :data="categories"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="code" title="分类编码" />
          <a-table-column data-index="name" title="分类名" />
          <a-table-column data-index="game" title="关联游戏" />
          <a-table-column data-index="sort_order" title="排序" />
          <a-table-column title="状态">
            <template #cell="{ record }">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'gray'">{{
                record.status === 'enabled' ? '启用' : '停用'
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column v-if="canManageCategory" title="操作">
            <template #cell="{ record }">
              <a-button type="text" @click="openCategory(record)"
                >编辑</a-button
              >
              <a-popconfirm
                content="确认删除该分类？被商品引用的分类无法删除。"
                @ok="removeCategory(record)"
              >
                <a-button type="text" status="danger">删除</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>

      <a-table
        v-else
        :data="suspensions"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #columns>
          <a-table-column data-index="id" title="ID" :width="70" />
          <a-table-column title="SKU">
            <template #cell="{ record }">{{
              skuTitle(record.sku_id)
            }}</template>
          </a-table-column>
          <a-table-column data-index="reason" title="停服原因" />
          <a-table-column title="生效方式" :width="110">
            <template #cell="{ record }">{{
              record.effective_mode === 'scheduled' ? '定时生效' : '立即生效'
            }}</template>
          </a-table-column>
          <a-table-column title="生效时间" :width="180">
            <template #cell="{ record }">{{
              fmtTime(record.effective_at)
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="130">
            <template #cell="{ record }">
              <a-tag :color="suspensionStatusColor(record.status)">{{
                suspensionStatusText(record.status)
              }}</a-tag>
            </template>
          </a-table-column>
          <a-table-column title="受影响订单" :width="110">
            <template #cell="{ record }">{{
              record.affected_order_count
            }}</template>
          </a-table-column>
          <a-table-column title="审批结论" :width="200">
            <template #cell="{ record }">{{ reviewText(record) }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="200">
            <template #cell="{ record }">
              <a-button
                v-if="canViewSuspensionDetail"
                type="text"
                @click="openSuspensionDetail(record)"
                >详情</a-button
              >
              <a-button
                v-if="record.status === 'pending' && canDecideSuspension"
                type="text"
                @click="openDecision(record)"
                >审批</a-button
              >
              <a-popconfirm
                v-if="record.status === 'pending' && canCancelSuspension"
                content="确认撤回该停服申请？撤回后 SKU 保持原状。"
                @ok="cancelSuspension(record)"
              >
                <a-button type="text" status="warning">撤回</a-button>
              </a-popconfirm>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:visible="productVisible"
      :title="productForm.id ? '编辑商品' : '新建商品'"
      :width="960"
      @ok="saveProduct"
    >
      <a-form :model="productForm">
        <a-form-item label="商品名称" required>
          <a-input v-model="productForm.name" :max-length="160" />
        </a-form-item>
        <a-form-item label="产品分类">
          <a-select
            :model-value="productForm.category_id ?? undefined"
            allow-clear
            @update:model-value="onProductCategoryChange"
          >
            <a-option
              v-for="item in categories.filter((c) => c.status === 'enabled')"
              :key="item.id"
              :value="item.id"
              >{{ item.name }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="productForm.description" :max-length="500" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="productForm.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="on_sale">上架</a-option>
            <a-option value="off_sale">下架</a-option>
          </a-select>
        </a-form-item>
      </a-form>

      <div class="section-title">子 SKU（商品 → 规格组 → SKU）</div>
      <a-space class="toolbar">
        <a-button @click="openChildSku()">添加子 SKU</a-button>
      </a-space>
      <a-table
        :data="productSkus"
        row-key="code"
        :pagination="false"
        size="small"
      >
        <template #columns>
          <a-table-column data-index="code" title="编码" />
          <a-table-column data-index="title" title="名称" />
          <a-table-column title="每份标价">
            <template #cell="{ record }">{{
              money(record.unit_price_cents)
            }}</template>
          </a-table-column>
          <a-table-column
            data-index="required_seats"
            title="席位"
            :width="70"
          />
          <a-table-column title="每席承诺服务量" :width="120">
            <template #cell="{ record }">{{
              childPerSeatText(record)
            }}</template>
          </a-table-column>
          <a-table-column title="规格组" :width="150">
            <template #cell="{ record }">{{
              specGroupName(record.spec_group_id)
            }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="80">
            <template #cell="{ record }">{{
              statusText(record.status)
            }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="120">
            <template #cell="{ record, rowIndex }">
              <a-button type="text" @click="openChildSku(rowIndex)"
                >编辑</a-button
              >
              <a-button
                v-if="!record.id"
                type="text"
                status="danger"
                @click="removeChildSku(rowIndex)"
                >移除</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
      <div class="hint"
        >子 SKU 随商品一并提交：新建行在保存商品时落库；已存在的子 SKU
        只提交本次编辑过的行，未改动的行原样保留（该入口不提供删除）。挂规格组时席位数量须与「必需席位」一致。</div
      >
    </a-modal>

    <a-modal
      v-model:visible="childSkuVisible"
      :title="childSkuForm.id ? '编辑子 SKU' : '添加子 SKU'"
      :width="680"
      @ok="saveChildSku"
    >
      <a-form :model="childSkuForm">
        <a-form-item label="编码" required>
          <a-input
            v-model="childSkuForm.code"
            :max-length="80"
            :disabled="Boolean(childSkuForm.id)"
          />
        </a-form-item>
        <a-form-item label="商品名" required>
          <a-input v-model="childSkuForm.title" :max-length="160" />
        </a-form-item>
        <a-form-item label="服务类型" required>
          <a-select v-model="childSkuForm.service_type">
            <a-option value="play">陪玩</a-option>
            <a-option value="teaching">教学</a-option>
            <a-option value="entertainment">娱乐</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="规格组">
          <a-select
            :model-value="childSkuForm.spec_group_id ?? undefined"
            allow-clear
            placeholder="不挂规格组（单人）"
            @update:model-value="onChildSpecGroupChange"
          >
            <a-option
              v-for="group in specGroups.filter((g) => g.status === 'enabled')"
              :key="group.id"
              :value="group.id"
              >{{ group.name }}（{{ group.seats.length }} 席 · 每席
              {{ group.per_seat_service_units }}）</a-option
            >
          </a-select>
          <div class="hint"
            >选择规格组会自动带出席位数与每席承诺服务量；规格组席位数必须与必需席位一致。</div
          >
        </a-form-item>
        <a-form-item label="每份标价（分）" required>
          <a-input-number v-model="childSkuForm.unit_price_cents" :min="1" />
        </a-form-item>
        <a-form-item label="每份最低议价（分）" required>
          <a-input-number
            v-model="childSkuForm.min_unit_price_cents"
            :min="1"
            :max="childSkuForm.unit_price_cents"
          />
        </a-form-item>
        <a-form-item label="免审调整幅度（基点）" required>
          <a-input-number
            v-model="childSkuForm.adjustment_approval_bp"
            :min="1"
            :max="10000"
          />
        </a-form-item>
        <a-form-item label="一份服务量" required>
          <a-input-number v-model="childSkuForm.service_units" :min="1" />
        </a-form-item>
        <a-form-item label="服务单位" required>
          <a-input v-model="childSkuForm.service_unit_name" :max-length="32" />
        </a-form-item>
        <a-form-item label="必需席位" required>
          <a-input-number v-model="childSkuForm.required_seats" :min="1" />
        </a-form-item>
        <a-form-item
          v-if="childSkuForm.required_seats > 1"
          label="每席承诺服务量（必填）"
          required
        >
          <a-input-number
            v-model="childSkuForm.per_seat_service_units"
            :min="1"
          />
          <div class="hint"
            >多人子 SKU 每席承诺的服务量：下单按「每席量 × 席位数 ×
            份数」计承诺量。挂规格组时可留空（跟随规格组），未挂规格组时必须为正整数，否则下单会被拒绝。</div
          >
        </a-form-item>
        <a-form-item label="成本（元）">
          <a-input-number
            :model-value="childSkuForm.cost_yuan ?? undefined"
            :min="0"
            :precision="2"
            allow-clear
            placeholder="未登记"
            @update:model-value="onChildCostChange"
          />
          <div class="hint"
            >成本仅用于毛利口径，未获授权的角色读不到既有成本（按未登记返回）；留空表示不登记成本，编辑时未改动不会提交该字段。</div
          >
        </a-form-item>
        <a-form-item label="单次服务时长（分钟）">
          <a-input-number
            v-model="childSkuForm.service_duration_minutes"
            :min="0"
            :max="1440"
          />
        </a-form-item>
        <a-form-item label="结单要求">
          <a-select
            v-model="childSkuForm.close_rule_code"
            allow-clear
            placeholder="不限（按游戏 / 全局规则）"
          >
            <a-option
              v-for="rule in activeCloseRules"
              :key="rule.id"
              :value="rule.code"
              >{{ rule.name }}（{{ rule.code }} · v{{
                rule.version
              }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="名额总量（-1 不限量）" required>
          <a-input-number v-model="childSkuForm.quota_total" :min="-1" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="childSkuForm.sort_order" />
        </a-form-item>
        <a-form-item label="服务说明">
          <a-textarea v-model="childSkuForm.description" :max-length="500" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="childSkuForm.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="on_sale">上架</a-option>
            <a-option value="off_sale">下架</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="specGroupVisible"
      :title="specGroupForm.id ? '编辑规格组' : '新建规格组'"
      :width="860"
      @ok="saveSpecGroup"
    >
      <a-form :model="specGroupForm">
        <a-form-item label="规格组编码" required>
          <a-input
            v-model="specGroupForm.code"
            :max-length="48"
            :disabled="Boolean(specGroupForm.id)"
          />
          <div class="hint">编码创建后不可修改。</div>
        </a-form-item>
        <a-form-item label="规格组名" required>
          <a-input v-model="specGroupForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="每席承诺服务量（必填）" required>
          <a-input-number
            v-model="specGroupForm.per_seat_service_units"
            :min="1"
          />
          <div class="hint"
            >规格组级口径：逐席承诺量按该值补全，保证「Σ 每席承诺量 = 每席量 ×
            席位数」。</div
          >
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="specGroupForm.status">
            <a-option value="enabled">启用</a-option>
            <a-option value="disabled">停用</a-option>
          </a-select>
        </a-form-item>
      </a-form>
      <div class="section-title"
        >席位定义（§15.5 逐席角色 / 可替换条件 / 规格）</div
      >
      <a-space class="toolbar">
        <a-button @click="addSeat">添加席位</a-button>
      </a-space>
      <a-table
        :data="specGroupForm.seats"
        row-key="seat_index"
        :pagination="false"
        size="small"
      >
        <template #columns>
          <a-table-column title="席位序号" :width="90">
            <template #cell="{ record }">{{ record.seat_index + 1 }}</template>
          </a-table-column>
          <a-table-column title="角色" :width="170">
            <template #cell="{ record }">
              <a-input v-model="record.role" :max-length="48" />
            </template>
          </a-table-column>
          <a-table-column title="可替换" :width="90">
            <template #cell="{ record }">
              <a-switch v-model="record.substitutable" size="small" />
            </template>
          </a-table-column>
          <a-table-column title="规格说明">
            <template #cell="{ record }">
              <a-input v-model="record.spec" :max-length="120" />
            </template>
          </a-table-column>
          <a-table-column title="每席承诺服务量" :width="130">
            <template #cell="{ record }">{{ record.promised_units }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="80">
            <template #cell="{ record }">
              <a-button
                type="text"
                status="danger"
                @click="removeSeat(record.seat_index)"
                >移除</a-button
              >
            </template>
          </a-table-column>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      v-model:visible="skuVisible"
      :title="skuForm.id ? '编辑 SKU' : '新增 SKU'"
      @ok="saveSku"
    >
      <a-form :model="skuForm">
        <a-form-item label="编码" required>
          <a-input v-model="skuForm.code" :disabled="Boolean(skuForm.id)" />
        </a-form-item>
        <a-form-item label="商品名" required>
          <a-input v-model="skuForm.title" :max-length="160" />
        </a-form-item>
        <a-form-item label="产品分类">
          <a-select
            :model-value="skuForm.category_id ?? undefined"
            allow-clear
            @update:model-value="onCategoryChange"
          >
            <a-option
              v-for="item in categories.filter((c) => c.status === 'enabled')"
              :key="item.id"
              :value="item.id"
              >{{ item.name }}</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="服务类型" required>
          <a-select v-model="skuForm.service_type">
            <a-option value="play">陪玩</a-option>
            <a-option value="teaching">教学</a-option>
            <a-option value="entertainment">娱乐</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="所属商品">
          <a-select
            :model-value="skuForm.product_id ?? undefined"
            allow-clear
            placeholder="不关联商品"
            @update:model-value="onSkuProductChange"
          >
            <a-option v-for="item in products" :key="item.id" :value="item.id"
              >{{ item.name }}（{{ productStatusText(item.status) }}）</a-option
            >
          </a-select>
          <div class="hint"
            >关联商品后该 SKU 出现在商品详情下；已下架商品不能再挂载新
            SKU。</div
          >
        </a-form-item>
        <a-form-item label="所属规格组">
          <a-select
            :model-value="skuForm.spec_group_id ?? undefined"
            allow-clear
            placeholder="不关联规格组（单人）"
            @update:model-value="onSkuSpecGroupChange"
          >
            <a-option
              v-for="group in specGroups.filter((g) => g.status === 'enabled')"
              :key="group.id"
              :value="group.id"
              >{{ group.name }}（{{ group.seats.length }} 席 · 每席
              {{ group.per_seat_service_units }}）</a-option
            >
          </a-select>
          <div class="hint"
            >选择规格组会自动带出必需席位与每席承诺服务量；规格组席位数必须与必需席位一致。</div
          >
        </a-form-item>
        <a-form-item label="每份标价（分）" required>
          <a-input-number v-model="skuForm.unit_price_cents" :min="1" />
        </a-form-item>
        <a-form-item label="每份最低议价（分）" required>
          <a-input-number
            v-model="skuForm.min_unit_price_cents"
            :min="1"
            :max="skuForm.unit_price_cents"
          />
        </a-form-item>
        <a-form-item label="免审调整幅度（基点）" required>
          <a-input-number
            v-model="skuForm.adjustment_approval_bp"
            :min="1"
            :max="10000"
          />
          <div class="hint"
            >1000 基点 = 标价小计的 10%；超过该幅度须异人审批。</div
          >
        </a-form-item>
        <a-form-item label="一份服务量" required>
          <a-input-number v-model="skuForm.service_units" :min="1" />
        </a-form-item>
        <a-form-item label="服务单位" required>
          <a-input v-model="skuForm.service_unit_name" :max-length="32" />
        </a-form-item>
        <a-form-item label="必需席位" required>
          <a-input-number v-model="skuForm.required_seats" :min="1" />
        </a-form-item>
        <a-form-item
          v-if="skuForm.required_seats > 1"
          label="每席承诺服务量（必填）"
          required
        >
          <a-input-number v-model="skuForm.per_seat_service_units" :min="1" />
          <div class="hint"
            >多人 SKU 每席承诺的服务量：下单按「每席量 × 席位数 ×
            份数」计承诺量。未配置时后端会拒绝报单，因此多人 SKU
            必须填写正整数。</div
          >
        </a-form-item>
        <a-form-item label="成本（元）">
          <a-input-number
            :model-value="skuForm.cost_yuan ?? undefined"
            :min="0"
            :precision="2"
            allow-clear
            placeholder="未登记"
            @update:model-value="onSkuCostChange"
          />
          <div class="hint"
            >成本仅用于毛利口径，未获授权的角色读不到既有成本（按未登记返回）；留空表示不登记成本，编辑时未改动不会提交该字段。</div
          >
        </a-form-item>
        <a-form-item label="单次服务时长（分钟）">
          <a-input-number
            v-model="skuForm.service_duration_minutes"
            :min="0"
            :max="1440"
          />
        </a-form-item>
        <a-form-item label="所需技能等级">
          <a-select v-model="skuForm.required_level">
            <a-option value="novice">新手（无门槛）</a-option>
            <a-option value="skilled">熟练</a-option>
            <a-option value="senior">资深</a-option>
            <a-option value="mentor">导师</a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="结单要求">
          <a-select
            v-model="skuForm.close_rule_code"
            allow-clear
            placeholder="不限（按游戏 / 全局规则）"
          >
            <a-option
              v-for="rule in activeCloseRules"
              :key="rule.id"
              :value="rule.code"
              >{{ rule.name }}（{{ rule.code }} · v{{
                rule.version
              }}）</a-option
            >
          </a-select>
          <div class="hint">
            关联生效结单规则后，该商品订单按规则的条件树与审批流结单（§15.3
            结单要求）。
          </div>
        </a-form-item>
        <a-form-item label="名额总量（-1 不限量）" required>
          <a-input-number v-model="skuForm.quota_total" :min="-1" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="skuForm.sort_order" />
        </a-form-item>
        <a-form-item label="服务说明">
          <a-textarea v-model="skuForm.description" :max-length="500" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="skuForm.status">
            <a-option value="draft">草稿</a-option>
            <a-option value="on_sale">上架</a-option>
            <a-option value="off_sale">下架</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="categoryVisible"
      :title="categoryForm.id ? '编辑分类' : '新增分类'"
      @ok="saveCategory"
    >
      <a-form :model="categoryForm">
        <a-form-item label="分类编码" required>
          <a-input
            v-model="categoryForm.code"
            :disabled="Boolean(categoryForm.id)"
          />
        </a-form-item>
        <a-form-item label="分类名" required>
          <a-input v-model="categoryForm.name" :max-length="120" />
        </a-form-item>
        <a-form-item label="关联游戏">
          <a-input v-model="categoryForm.game" :max-length="120" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model="categoryForm.sort_order" />
        </a-form-item>
        <a-form-item label="状态" required>
          <a-select v-model="categoryForm.status">
            <a-option value="enabled">启用</a-option>
            <a-option value="disabled">停用</a-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="suspensionVisible"
      title="发起 SKU 停服申请"
      :width="620"
      @ok="saveSuspension"
    >
      <a-form :model="suspensionForm">
        <a-form-item label="停服 SKU" required>
          <a-select
            :model-value="suspensionForm.sku_id ?? undefined"
            placeholder="仅可对在售 SKU 发起停服"
            @update:model-value="onSuspensionSkuChange"
          >
            <a-option
              v-for="item in skus.filter((s) => s.status === 'on_sale')"
              :key="item.id"
              :value="item.id"
              >{{ item.title }}（{{ item.code }}）</a-option
            >
          </a-select>
        </a-form-item>
        <a-form-item label="生效方式" required>
          <a-radio-group v-model="suspensionForm.effective_mode">
            <a-radio value="immediate">立即生效（审批通过即下架）</a-radio>
            <a-radio value="scheduled">定时生效</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="suspensionForm.effective_mode === 'scheduled'"
          label="生效时间"
          required
        >
          <a-date-picker
            v-model="suspensionForm.effective_at"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
          <div class="hint">须晚于当前时间，到点由后台任务自动下架。</div>
        </a-form-item>
        <a-form-item label="停服原因" required>
          <a-textarea v-model="suspensionForm.reason" :max-length="500" />
          <div class="hint"
            >提交后同一 SKU
            只允许一张进行中申请；受影响订单会生成逐单处置清单。</div
          >
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="decisionVisible"
      title="审批停服申请"
      :width="620"
      @ok="submitDecision"
    >
      <a-form :model="decisionForm">
        <a-form-item label="申请">
          <span v-if="decisionTarget"
            >#{{ decisionTarget.id }} · {{ skuTitle(decisionTarget.sku_id) }} ·
            受影响 {{ decisionTarget.affected_order_count }} 单</span
          >
        </a-form-item>
        <a-form-item label="审批结论" required>
          <a-radio-group v-model="decisionForm.approve">
            <a-radio :value="true">通过</a-radio>
            <a-radio :value="false">驳回</a-radio>
          </a-radio-group>
          <div class="hint"
            >立即生效的申请通过后立刻下架 SKU
            并生成逐单处置清单；定时生效的等到生效时间自动下架。申请人不得自审。</div
          >
        </a-form-item>
        <a-form-item label="审批理由" required>
          <a-textarea v-model="decisionForm.note" :max-length="500" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="suspensionDetailVisible"
      title="停服申请详情"
      :width="1000"
      :footer="false"
    >
      <a-descriptions :column="3" size="small" bordered>
        <a-descriptions-item label="申请 ID">{{
          detailSuspension?.id ?? '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="SKU">{{
          detailSuspension ? skuTitle(detailSuspension.sku_id) : '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          {{
            detailSuspension
              ? suspensionStatusText(detailSuspension.status)
              : '-'
          }}
        </a-descriptions-item>
        <a-descriptions-item label="生效方式">{{
          detailSuspension?.effective_mode === 'scheduled'
            ? '定时生效'
            : '立即生效'
        }}</a-descriptions-item>
        <a-descriptions-item label="生效时间">{{
          fmtTime(detailSuspension?.effective_at ?? null)
        }}</a-descriptions-item>
        <a-descriptions-item label="受影响订单">{{
          detailSuspension?.affected_order_count ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="原因" :span="3">{{
          detailSuspension?.reason ?? '-'
        }}</a-descriptions-item>
        <a-descriptions-item label="审批人 / 时间" :span="2">{{
          detailSuspension?.reviewed_by_admin_id
            ? `#${detailSuspension.reviewed_by_admin_id} · ${fmtTime(
                detailSuspension.reviewed_at
              )}`
            : '未审批'
        }}</a-descriptions-item>
        <a-descriptions-item label="审批理由">{{
          detailSuspension?.review_note || '-'
        }}</a-descriptions-item>
      </a-descriptions>
      <a-space class="toolbar detail-toolbar">
        <a-tag color="blue"
          >进度：共 {{ detailProgress.total }} · 待处置
          {{ detailProgress.pending }} · 已完成 {{ detailProgress.done }} · 失败
          {{ detailProgress.failed }}</a-tag
        >
      </a-space>
      <a-table
        :data="detailItems"
        row-key="id"
        :pagination="{ pageSize: 10 }"
        size="small"
      >
        <template #columns>
          <a-table-column data-index="order_no" title="订单号" />
          <a-table-column data-index="order_status" title="履约状态" />
          <a-table-column data-index="payment_status" title="支付状态" />
          <a-table-column title="建议处置" :width="120">
            <template #cell="{ record }">{{
              disposalActionText(record.suggested_action)
            }}</template>
          </a-table-column>
          <a-table-column title="处置记录" :width="160">
            <template #cell="{ record }">
              {{ record.action ? disposalActionText(record.action) : '-' }} /
              {{ itemStatusText(record.status) }}
            </template>
          </a-table-column>
          <a-table-column data-index="note" title="说明" />
          <a-table-column title="操作" :width="120">
            <template #cell="{ record }">
              <a-button
                v-if="
                  canDisposeSuspension &&
                  suspensionApplied &&
                  record.status !== 'done'
                "
                type="text"
                @click="openDisposal(record)"
                >处置</a-button
              >
              <span v-else>-</span>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <div class="hint"
        >逐单处置独立完成，允许部分完成：取消并退款复用取消闭环，改期复用档期提案，保留继续服务只留痕。处置失败的订单可按后端提示改选方式重试。</div
      >
    </a-modal>

    <a-modal
      v-model:visible="disposalVisible"
      title="受影响订单处置"
      :width="600"
      @ok="submitDisposal"
    >
      <a-form :model="disposalForm">
        <a-form-item label="订单">
          <span v-if="disposalTarget"
            >{{ disposalTarget.order_no }} · 建议
            {{ disposalActionText(disposalTarget.suggested_action) }}</span
          >
        </a-form-item>
        <a-form-item label="处置方式" required>
          <a-radio-group v-model="disposalForm.action">
            <a-radio value="cancel_refund">取消并退款</a-radio>
            <a-radio value="reschedule">改期</a-radio>
            <a-radio value="keep">保留继续服务</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item
          v-if="disposalForm.action === 'reschedule'"
          label="改期后的开始时间"
          required
        >
          <a-date-picker
            v-model="disposalForm.start_at"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
          />
          <div class="hint">仅待付款订单可改期，且须晚于当前时间。</div>
        </a-form-item>
        <a-form-item label="处置说明">
          <a-textarea v-model="disposalForm.note" :max-length="255" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import {
    cancelSkuSuspension,
    createCategory,
    createProduct,
    createSku,
    createSpecGroup,
    decideSkuSuspension,
    deleteCategory,
    disposeSkuSuspensionOrder,
    getProduct,
    getSkuSuspension,
    listCategories,
    listCloseRules,
    listProducts,
    listSkus,
    listSkuSuspensions,
    listSpecGroups,
    requestSkuSuspension,
    updateCategory,
    updateProduct,
    updateSku,
    updateSpecGroup,
  } from '../../api';
  import type {
    CategoryInput,
    EsportsCloseRule,
    EsportsProduct,
    EsportsProductCategory,
    EsportsProductSku,
    EsportsSeatSpec,
    EsportsSku,
    EsportsSkuSuspension,
    EsportsSkuSuspensionItem,
    EsportsSpecGroup,
    ProductChildSkuInput,
    ProductInput,
    ProductStatus,
    SkuInput,
    SkuSuspensionReport,
    SkuSuspensionStatus,
    SkuSuspensionSuggestedAction,
    SkuUpdateInput,
    SpecGroupInput,
  } from '../../api';

  // SKU 表单：在 api 的 SkuInput 上把三态字段换成本地表单值（成本用「元」录入，提交时换算为分）。
  type SkuForm = Omit<
    SkuInput,
    'product_id' | 'spec_group_id' | 'cost_cents'
  > & {
    id: number;
    product_id: number | null;
    spec_group_id: number | null;
    cost_yuan: number | null;
  };
  // 子 SKU 行：在 api 的 ProductChildSkuInput 上记录「成本是否本次改动」，
  // 编辑既有子 SKU 时未改动就不提交 cost_cents（无成本读权限的角色读不到既有值，
  // 回传 null 会误清空）。
  type ChildSkuRow = ProductChildSkuInput & { cost_dirty?: boolean };
  // 子 SKU 表单：成本用「元」录入，提交时按 Math.round(元 * 100) 换算为分。
  type ChildSkuForm = Omit<ProductChildSkuInput, 'cost_cents'> & {
    cost_yuan: number | null;
  };
  type ProductForm = {
    id: number;
    name: string;
    category_id: number | null;
    description: string;
    status: ProductStatus;
  };
  type SpecGroupForm = {
    id: number;
    code: string;
    name: string;
    per_seat_service_units: number;
    status: 'enabled' | 'disabled';
    seats: EsportsSeatSpec[];
  };

  const { hasButtonPermission, hasAnyPermission } = usePermission();
  // 本轮的产物 / 规格组 / 停服权限码在 app.go 里只声明了 PermAPI（没有对应 PermButton），
  // 既有 hasButtonPermission 只认 button 类型，这里兼容同码 API 授权，避免非超管被误隐藏。
  const canDo = (code: string) =>
    hasButtonPermission(code) || hasAnyPermission([code]);

  const canAddSku = computed(() => hasButtonPermission('esports:skus:add'));
  const canEditSku = computed(() => hasButtonPermission('esports:skus:edit'));
  const canManageCategory = computed(() =>
    hasButtonPermission('esports:categories:manage')
  );
  const canCreateProduct = computed(() => canDo('esports:products:create'));
  const canUpdateProduct = computed(() => canDo('esports:products:update'));
  const canCreateSpecGroup = computed(() =>
    canDo('esports:spec_groups:create')
  );
  const canUpdateSpecGroup = computed(() =>
    canDo('esports:spec_groups:update')
  );
  const canViewSuspensionDetail = computed(() =>
    canDo('esports:skus:suspension_detail')
  );
  const canRequestSuspension = computed(() =>
    canDo('esports:skus:suspension_request')
  );
  const canDecideSuspension = computed(() =>
    canDo('esports:skus:suspension_decision')
  );
  const canCancelSuspension = computed(() =>
    canDo('esports:skus:suspension_cancel')
  );
  const canDisposeSuspension = computed(() =>
    canDo('esports:skus:suspension_disposal')
  );

  const activeTab = ref('products');
  const loading = ref(false);
  const products = ref<EsportsProduct[]>([]);
  const productSkus = ref<ChildSkuRow[]>([]);
  const specGroups = ref<EsportsSpecGroup[]>([]);
  const skus = ref<EsportsSku[]>([]);
  const categories = ref<EsportsProductCategory[]>([]);
  // 结单要求下拉只列出生效中的结单规则（§15.3）。
  const closeRules = ref<EsportsCloseRule[]>([]);
  const activeCloseRules = computed(() =>
    closeRules.value.filter((rule) => rule.status === 'active')
  );
  const suspensions = ref<EsportsSkuSuspension[]>([]);
  const suspensionStatusFilter = ref<SkuSuspensionStatus | ''>('');
  const suspensionReport = ref<SkuSuspensionReport | null>(null);
  const detailSuspension = computed(
    () => suspensionReport.value?.suspension ?? null
  );
  const detailItems = computed<EsportsSkuSuspensionItem[]>(
    () => suspensionReport.value?.items ?? []
  );
  const detailProgress = computed(
    () =>
      suspensionReport.value?.progress ?? {
        total: 0,
        pending: 0,
        done: 0,
        failed: 0,
      }
  );
  const suspensionApplied = computed(
    () => detailSuspension.value?.status === 'applied'
  );

  const productVisible = ref(false);
  const childSkuVisible = ref(false);
  const specGroupVisible = ref(false);
  const skuVisible = ref(false);
  const categoryVisible = ref(false);
  const suspensionVisible = ref(false);
  const decisionVisible = ref(false);
  const suspensionDetailVisible = ref(false);
  const disposalVisible = ref(false);

  const emptyProductForm = (): ProductForm => ({
    id: 0,
    name: '',
    category_id: null,
    description: '',
    status: 'draft',
  });
  const productForm = reactive<ProductForm>(emptyProductForm());
  const childSkuIndex = ref(-1);
  const dirtyChildIds = ref<number[]>([]);
  // 成本「元」→「分」：四舍五入避免浮点误差；null 表示清空已登记成本。
  const costCents = (yuan: number | null) =>
    yuan === null ? null : Math.round(yuan * 100);
  // 成本「分」→「元」回显：未登记（null / 未传）按空处理。
  const childCostYuan = (cents?: number | null) =>
    typeof cents === 'number' ? cents / 100 : null;
  const emptyChildSkuForm = (): ChildSkuForm => ({
    id: 0,
    code: '',
    title: '',
    service_type: 'play',
    description: '',
    unit_price_cents: 1,
    min_unit_price_cents: 1,
    adjustment_approval_bp: 2000,
    service_units: 1,
    service_unit_name: '小时',
    required_seats: 1,
    per_seat_service_units: 0,
    cost_yuan: null,
    service_duration_minutes: 60,
    close_rule_code: '',
    spec_group_id: null,
    quota_total: -1,
    sort_order: 0,
    status: 'draft',
  });
  const childSkuForm = reactive<ChildSkuForm>(emptyChildSkuForm());
  // 子 SKU 成本三态：打开弹窗时的成本（元）与该行是否已改过成本。
  // 编辑既有子 SKU 未改动时不提交 cost_cents，避免把读不到的既有成本回传成清空。
  const childCostBaseline = ref<number | null>(null);
  const childCostDirty = ref(false);
  watch(
    () => childSkuForm.unit_price_cents,
    (price, previous) => {
      if (!childSkuForm.id && childSkuForm.min_unit_price_cents === previous) {
        childSkuForm.min_unit_price_cents = price;
      }
    }
  );

  const emptySpecGroupForm = (): SpecGroupForm => ({
    id: 0,
    code: '',
    name: '',
    per_seat_service_units: 1,
    status: 'enabled',
    seats: [],
  });
  const specGroupForm = reactive<SpecGroupForm>(emptySpecGroupForm());

  const emptySkuForm = (): SkuForm => ({
    id: 0,
    code: '',
    title: '',
    service_type: 'play',
    category_id: null,
    description: '',
    unit_price_cents: 1,
    min_unit_price_cents: 1,
    adjustment_approval_bp: 2000,
    service_units: 1,
    service_unit_name: '小时',
    required_seats: 1,
    per_seat_service_units: 0,
    product_id: null,
    spec_group_id: null,
    cost_yuan: null,
    service_duration_minutes: 60,
    required_level: 'novice',
    close_rule_code: '',
    quota_total: -1,
    sort_order: 0,
    status: 'draft',
  });
  const skuForm = reactive<SkuForm>(emptySkuForm());
  // 三态基线：打开弹窗时的商品 / 规格组 / 成本值。编辑时只有与基线不同才提交，
  // 避免未改动也回传导致误解除关联或误清空成本（后端：未传 = 保持原值）。
  const skuBaseline = reactive<{
    product_id: number | null;
    spec_group_id: number | null;
    cost_yuan: number | null;
  }>({ product_id: null, spec_group_id: null, cost_yuan: null });
  watch(
    () => skuForm.unit_price_cents,
    (price, previous) => {
      if (!skuForm.id && skuForm.min_unit_price_cents === previous) {
        skuForm.min_unit_price_cents = price;
      }
    }
  );
  // a-select 的 modelValue 不接受 null，这里把「清空」的 undefined 转回 null 以匹配 SkuInput 类型。
  function onCategoryChange(value: unknown) {
    skuForm.category_id = typeof value === 'number' ? value : null;
  }
  function onProductCategoryChange(value: unknown) {
    productForm.category_id = typeof value === 'number' ? value : null;
  }
  function onChildSpecGroupChange(value: unknown) {
    childSkuForm.spec_group_id = typeof value === 'number' ? value : null;
    const group = specGroups.value.find(
      (item) => item.id === childSkuForm.spec_group_id
    );
    if (!group) return;
    // 规格组席位数与每席量是唯一口径，选中即带出，避免与 required_seats 不一致。
    if (group.seats.length > 0) {
      childSkuForm.required_seats = group.seats.length;
    }
    if (group.per_seat_service_units > 0) {
      childSkuForm.per_seat_service_units = group.per_seat_service_units;
    }
  }
  // 子 SKU 成本：clear 时 a-input-number 给 undefined，转回 null 表示清空已登记成本。
  function onChildCostChange(value: unknown) {
    childSkuForm.cost_yuan = typeof value === 'number' ? value : null;
  }
  // SKU 弹窗的所属商品 / 规格组：clear 时 a-select 给 undefined，转回 null 表示「不关联」。
  function onSkuProductChange(value: unknown) {
    skuForm.product_id = typeof value === 'number' ? value : null;
  }
  function onSkuSpecGroupChange(value: unknown) {
    skuForm.spec_group_id = typeof value === 'number' ? value : null;
    const group = specGroups.value.find(
      (item) => item.id === skuForm.spec_group_id
    );
    if (!group) return;
    // 后端 resolveSkuCatalogRefs 会校验「规格组席位数 = required_seats」，
    // 这里选中即校准，减少一次 400。
    if (group.seats.length > 0) {
      skuForm.required_seats = group.seats.length;
    }
    if (group.per_seat_service_units > 0) {
      skuForm.per_seat_service_units = group.per_seat_service_units;
    }
  }
  function onSkuCostChange(value: unknown) {
    skuForm.cost_yuan = typeof value === 'number' ? value : null;
  }

  const emptyCategoryForm = (): CategoryInput & { id: number } => ({
    id: 0,
    code: '',
    name: '',
    game: '',
    sort_order: 0,
    status: 'enabled',
  });
  const categoryForm = reactive(emptyCategoryForm());

  const suspensionForm = reactive<{
    sku_id: number | null;
    reason: string;
    effective_mode: 'immediate' | 'scheduled';
    effective_at: string;
  }>({
    sku_id: null,
    reason: '',
    effective_mode: 'immediate',
    effective_at: '',
  });
  function onSuspensionSkuChange(value: unknown) {
    suspensionForm.sku_id = typeof value === 'number' ? value : null;
  }
  const decisionTarget = ref<EsportsSkuSuspension | null>(null);
  const decisionForm = reactive<{ approve: boolean; note: string }>({
    approve: true,
    note: '',
  });
  const disposalTarget = ref<EsportsSkuSuspensionItem | null>(null);
  const disposalForm = reactive<{
    action: SkuSuspensionSuggestedAction;
    note: string;
    start_at: string;
  }>({ action: 'cancel_refund', note: '', start_at: '' });

  const money = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const fmtTime = (value: string | null) =>
    value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
  const statusText = (status: EsportsSku['status']) =>
    ({ on_sale: '上架', draft: '草稿', off_sale: '下架' }[status]);
  const productStatusText = (status: ProductStatus) => statusText(status);
  const productStatusColor = (status: ProductStatus) =>
    ({ on_sale: 'green', draft: 'orange', off_sale: 'gray' }[status]);
  const categoryName = (id: number | null) =>
    categories.value.find((item) => item.id === id)?.name || '未分类';
  const specGroupName = (id: number | null) =>
    specGroups.value.find((item) => item.id === id)?.name || '未挂规格组';
  const quotaText = (record: EsportsSku) =>
    record.quota_total === -1
      ? `不限（已售 ${record.quota_sold}）`
      : `${record.quota_sold}/${record.quota_total}`;
  const perSeatText = (record: EsportsSku) =>
    record.required_seats > 1
      ? `${record.per_seat_service_units ?? 0} / 席`
      : '—';
  const childPerSeatText = (record: ProductChildSkuInput) =>
    record.required_seats > 1 ? `${record.per_seat_service_units} / 席` : '—';
  const seatTotalText = (record: EsportsSpecGroup) => {
    const seats = record.seats || [];
    if (seats.length === 0) return '—';
    const total = seats.reduce(
      (sum, seat) => sum + (seat.promised_units || 0),
      0
    );
    return `${total}（${seats.length} 席）`;
  };
  const suspensionStatusText = (status: SkuSuspensionStatus) =>
    ({
      pending: '待审批',
      approved: '已批准待生效',
      rejected: '已驳回',
      applied: '已生效',
      cancelled: '已撤回',
    }[status]);
  const suspensionStatusColor = (status: SkuSuspensionStatus) =>
    ({
      pending: 'orange',
      approved: 'blue',
      rejected: 'gray',
      applied: 'green',
      cancelled: 'gray',
    }[status]);
  const reviewText = (record: EsportsSkuSuspension) =>
    record.reviewed_by_admin_id
      ? `#${record.reviewed_by_admin_id} · ${fmtTime(record.reviewed_at)}`
      : '未审批';
  const disposalActionText = (action: string) =>
    ({
      cancel_refund: '取消并退款',
      reschedule: '改期',
      keep: '保留继续服务',
    }[action] || action);
  const itemStatusText = (status: string) =>
    ({ pending: '待处置', done: '已完成', failed: '失败' }[status] || status);
  const skuTitle = (id: number) =>
    skus.value.find((item) => item.id === id)?.title || `#${id}`;
  // 透出后端返回的中文错误信息，取不到时回退默认文案。
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };

  async function loadSuspensions() {
    const [listResult, skuResult] = await Promise.all([
      listSkuSuspensions(suspensionStatusFilter.value || undefined),
      listSkus(),
    ]);
    suspensions.value = listResult.data.data || [];
    skus.value = skuResult.data.data || [];
  }

  async function loadActive() {
    loading.value = true;
    try {
      if (activeTab.value === 'products') {
        const [productResult, categoryResult, groupResult, ruleResult] =
          await Promise.all([
            listProducts(),
            listCategories(),
            listSpecGroups(),
            listCloseRules(),
          ]);
        products.value = productResult.data.data || [];
        categories.value = categoryResult.data.data || [];
        specGroups.value = groupResult.data.data || [];
        closeRules.value = ruleResult.data.data || [];
      } else if (activeTab.value === 'spec-groups') {
        specGroups.value = (await listSpecGroups()).data.data || [];
      } else if (activeTab.value === 'skus') {
        // SKU 弹窗需要「所属商品」「所属规格组」下拉与规格组席位校验口径，
        // 因此 SKU 页签同时拉商品与规格组列表。
        const [
          skuResult,
          categoryResult,
          ruleResult,
          productResult,
          groupResult,
        ] = await Promise.all([
          listSkus(),
          listCategories(),
          listCloseRules(),
          listProducts(),
          listSpecGroups(),
        ]);
        skus.value = skuResult.data.data || [];
        categories.value = categoryResult.data.data || [];
        closeRules.value = ruleResult.data.data || [];
        products.value = productResult.data.data || [];
        specGroups.value = groupResult.data.data || [];
      } else if (activeTab.value === 'categories') {
        categories.value = (await listCategories()).data.data || [];
      } else {
        await loadSuspensions();
      }
    } catch (err) {
      Message.error(errorText(err, '加载失败，请稍后重试'));
    } finally {
      loading.value = false;
    }
  }

  // ── 商品父实体（§15.1：商品 → 规格组 → SKU） ──
  const toChildSkuInput = (sku: EsportsProductSku): ProductChildSkuInput => ({
    id: sku.id,
    code: sku.code,
    title: sku.title,
    service_type: sku.service_type,
    description: sku.description,
    unit_price_cents: sku.unit_price_cents,
    min_unit_price_cents: sku.min_unit_price_cents || sku.unit_price_cents,
    adjustment_approval_bp: sku.adjustment_approval_bp,
    service_units: sku.service_units,
    service_unit_name: sku.service_unit_name,
    required_seats: sku.required_seats,
    per_seat_service_units: sku.per_seat_service_units || 0,
    cost_cents: sku.cost_cents,
    service_duration_minutes: sku.service_duration_minutes,
    close_rule_code: sku.close_rule_code,
    spec_group_id: sku.spec_group_id,
    quota_total: sku.quota_total,
    sort_order: sku.sort_order,
    status: sku.status,
  });

  async function openProduct(record?: EsportsProduct) {
    productSkus.value = [];
    dirtyChildIds.value = [];
    if (record) {
      Object.assign(productForm, {
        id: record.id,
        name: record.name,
        category_id: record.category_id,
        description: record.description,
        status: record.status,
      });
      try {
        const detail = (await getProduct(record.id)).data.data;
        productSkus.value = (detail?.skus || []).map(toChildSkuInput);
      } catch (err) {
        Message.error(errorText(err, '加载商品详情失败'));
        return;
      }
    } else {
      Object.assign(productForm, emptyProductForm());
    }
    productVisible.value = true;
  }

  function productChildPayload(row: ChildSkuRow): ProductChildSkuInput {
    const { cost_dirty: costDirty, ...fields } = row;
    const payload: ProductChildSkuInput = {
      ...fields,
      code: fields.code.trim(),
      title: fields.title.trim(),
      service_unit_name: fields.service_unit_name.trim(),
      description: fields.description.trim(),
      close_rule_code: fields.close_rule_code.trim(),
      // 单人子 SKU 不保留每席量，避免残值被后端当成多人口径。
      per_seat_service_units:
        fields.required_seats > 1 ? fields.per_seat_service_units : 0,
    };
    // 成本三态：新建行直接带（留空 = 未登记）；编辑行只有改过才传，
    // 未改动不传 —— 无成本读权限的角色读到的 null 不得回传成清空。
    if (!row.id || costDirty) {
      payload.cost_cents = fields.cost_cents ?? null;
    } else {
      delete payload.cost_cents;
    }
    return payload;
  }

  function validateChildSku(row: ProductChildSkuInput) {
    if (!row.code.trim() || !row.title.trim()) {
      return '请填写子 SKU 编码与名称';
    }
    if (!row.service_unit_name.trim()) return '请填写服务单位';
    if (row.unit_price_cents < 1) return '每份标价须为正整数（分）';
    if (
      row.min_unit_price_cents < 1 ||
      row.min_unit_price_cents > row.unit_price_cents
    ) {
      return '每份最低议价须在 1 分与标价之间';
    }
    if (row.adjustment_approval_bp < 1 || row.adjustment_approval_bp > 10000) {
      return '免审调整幅度须在 1–10000 基点之间';
    }
    if (row.service_units < 1) return '一份服务量须为正整数';
    if (row.required_seats < 1) return '必需席位须为不小于 1 的整数';
    if (row.quota_total !== -1 && row.quota_total < row.required_seats) {
      return '名额总量不得小于必需席位（-1 表示不限量）';
    }
    const group = specGroups.value.find(
      (item) => item.id === row.spec_group_id
    );
    if (group) {
      if (group.seats.length !== row.required_seats) {
        return `规格组「${group.name}」有 ${group.seats.length} 席，须与必需席位一致`;
      }
      if (
        row.per_seat_service_units > 0 &&
        group.per_seat_service_units > 0 &&
        row.per_seat_service_units !== group.per_seat_service_units
      ) {
        return `每席承诺服务量须与规格组「${group.name}」一致（${group.per_seat_service_units}）`;
      }
    }
    // §15.3-01：多人 SKU 没有规格组兜底时必须显式配置每席量，否则下单会被拒。
    if (row.required_seats > 1 && !group && row.per_seat_service_units < 1) {
      return '多人子 SKU 须填写每席承诺服务量（正整数），否则下单会被拒绝';
    }
    return '';
  }

  function openChildSku(index?: number) {
    childSkuIndex.value = typeof index === 'number' ? index : -1;
    if (typeof index === 'number') {
      const row = productSkus.value[index];
      const {
        cost_cents: rowCostCents,
        cost_dirty: rowCostDirty,
        ...fields
      } = row;
      const rowCostYuan = childCostYuan(rowCostCents);
      Object.assign(childSkuForm, emptyChildSkuForm(), fields, {
        cost_yuan: rowCostYuan,
      });
      childCostBaseline.value = rowCostYuan;
      childCostDirty.value = rowCostDirty ?? false;
    } else {
      Object.assign(childSkuForm, emptyChildSkuForm());
      childCostBaseline.value = null;
      childCostDirty.value = false;
    }
    childSkuVisible.value = true;
  }

  function removeChildSku(index: number) {
    productSkus.value.splice(index, 1);
  }

  function saveChildSku() {
    const { cost_yuan: costYuanValue, ...fields } = childSkuForm;
    if (costYuanValue !== null && costYuanValue < 0) {
      Message.error('成本不能为负（单位：元）');
      return;
    }
    const editing =
      childSkuIndex.value >= 0 ? productSkus.value[childSkuIndex.value] : null;
    // 成本三态：未改动沿用打开弹窗时的原值，清空按 null，填了按分换算。
    const costDirty =
      childCostDirty.value || costYuanValue !== childCostBaseline.value;
    const row: ChildSkuRow = {
      ...fields,
      id: childSkuForm.id,
      cost_cents: costDirty ? costCents(costYuanValue) : editing?.cost_cents,
      cost_dirty: costDirty,
    };
    const payload = productChildPayload(row);
    const error = validateChildSku(payload);
    if (error) {
      Message.error(error);
      return;
    }
    if (childSkuIndex.value >= 0) {
      productSkus.value.splice(childSkuIndex.value, 1, row);
      // 已有子 SKU 只在本次被编辑时才随商品提交：后端 PUT 对未传子 SKU 原样保留，
      // 而传了 cost_cents=null 会清空成本价（未授权角色读不到成本，避免误清）。
      if (payload.id > 0 && !dirtyChildIds.value.includes(payload.id)) {
        dirtyChildIds.value.push(payload.id);
      }
    } else {
      productSkus.value.push(row);
    }
    childSkuVisible.value = false;
  }

  async function saveProduct() {
    if (!productForm.name.trim()) {
      Message.error('请填写商品名称');
      return;
    }
    const rows = productSkus.value
      .filter((row) => !row.id || dirtyChildIds.value.includes(row.id))
      .map(productChildPayload);
    for (let i = 0; i < rows.length; i += 1) {
      const error = validateChildSku(rows[i]);
      if (error) {
        Message.error(`第 ${i + 1} 个子 SKU：${error}`);
        return;
      }
    }
    const payload: ProductInput = {
      name: productForm.name.trim(),
      category_id: productForm.category_id,
      description: productForm.description.trim(),
      status: productForm.status,
      skus: rows,
    };
    try {
      if (productForm.id) {
        await updateProduct(productForm.id, payload);
      } else {
        await createProduct(payload);
      }
      productVisible.value = false;
      Message.success('已保存商品');
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(err, '保存商品失败，请检查分类、规格组与席位是否一致')
      );
    }
  }

  // ── 规格组（§15.5） ──
  function openSpecGroup(record?: EsportsSpecGroup) {
    if (record) {
      Object.assign(specGroupForm, {
        id: record.id,
        code: record.code,
        name: record.name,
        per_seat_service_units: record.per_seat_service_units || 1,
        status: record.status,
        seats: (record.seats || []).map((seat) => ({ ...seat })),
      });
    } else {
      Object.assign(specGroupForm, emptySpecGroupForm());
    }
    specGroupVisible.value = true;
  }

  function addSeat() {
    specGroupForm.seats.push({
      seat_index: specGroupForm.seats.length,
      role: '',
      substitutable: false,
      promised_units: 0,
      spec: '',
    });
  }

  function removeSeat(index: number) {
    specGroupForm.seats.splice(index, 1);
    specGroupForm.seats.forEach((seat, i) => {
      seat.seat_index = i;
    });
  }

  async function saveSpecGroup() {
    if (!specGroupForm.code.trim() || !specGroupForm.name.trim()) {
      Message.error('请填写规格组编码与名称');
      return;
    }
    if (specGroupForm.seats.length === 0) {
      Message.error('请至少添加一个席位');
      return;
    }
    if (specGroupForm.per_seat_service_units < 1) {
      Message.error('每席承诺服务量须为正整数');
      return;
    }
    const seats = specGroupForm.seats.map((seat, index) => ({
      seat_index: index,
      role: seat.role.trim(),
      substitutable: seat.substitutable,
      // 组级每席量是唯一口径，逐席承诺量按它补全，保证 Σ = 每席量 × 席位数。
      promised_units: specGroupForm.per_seat_service_units,
      spec: seat.spec.trim(),
    }));
    if (seats.some((seat) => !seat.role)) {
      Message.error('每个席位都要填写角色');
      return;
    }
    const payload: SpecGroupInput = {
      code: specGroupForm.code.trim(),
      name: specGroupForm.name.trim(),
      seats,
      per_seat_service_units: specGroupForm.per_seat_service_units,
      status: specGroupForm.status,
    };
    try {
      if (specGroupForm.id) {
        await updateSpecGroup(specGroupForm.id, payload);
      } else {
        await createSpecGroup(payload);
      }
      specGroupVisible.value = false;
      Message.success('已保存规格组');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '保存规格组失败，编码可能已存在'));
    }
  }

  // ── SKU（独立商品，含每席承诺服务量与技能等级） ──
  function openSku(record?: EsportsSku) {
    const productId = record?.product_id ?? null;
    const specGroupId = record?.spec_group_id ?? null;
    // 成本按「分」回显为「元」；未授权角色读到的 cost_cents 为 null，按未登记处理。
    const costYuan =
      typeof record?.cost_cents === 'number' ? record.cost_cents / 100 : null;
    Object.assign(
      skuForm,
      emptySkuForm(),
      record
        ? {
            ...record,
            per_seat_service_units: record.per_seat_service_units ?? 0,
          }
        : {},
      { product_id: productId, spec_group_id: specGroupId, cost_yuan: costYuan }
    );
    Object.assign(skuBaseline, {
      product_id: productId,
      spec_group_id: specGroupId,
      cost_yuan: costYuan,
    });
    skuVisible.value = true;
  }

  // 编辑时不提交 code（后端以创建时的编码为准）。
  const skuPayload = (): SkuUpdateInput => {
    const payload: SkuUpdateInput = {
      title: skuForm.title,
      service_type: skuForm.service_type,
      category_id: skuForm.category_id,
      description: skuForm.description,
      unit_price_cents: skuForm.unit_price_cents,
      min_unit_price_cents: skuForm.min_unit_price_cents,
      adjustment_approval_bp: skuForm.adjustment_approval_bp,
      service_units: skuForm.service_units,
      service_unit_name: skuForm.service_unit_name,
      required_seats: skuForm.required_seats,
      per_seat_service_units:
        skuForm.required_seats > 1 ? skuForm.per_seat_service_units : 0,
      service_duration_minutes: skuForm.service_duration_minutes,
      required_level: skuForm.required_level,
      close_rule_code: skuForm.close_rule_code || '',
      quota_total: skuForm.quota_total,
      sort_order: skuForm.sort_order,
      status: skuForm.status,
    };
    // 三态字段（后端：未传 = 保持原值）：
    // - product_id / spec_group_id：改过才传，解除关联传 0；
    // - cost_cents：改过才传，清空传 null，填了按分换算。
    if (skuForm.id) {
      if (skuForm.product_id !== skuBaseline.product_id) {
        payload.product_id = skuForm.product_id ?? 0;
      }
      if (skuForm.spec_group_id !== skuBaseline.spec_group_id) {
        payload.spec_group_id = skuForm.spec_group_id ?? 0;
      }
      if (skuForm.cost_yuan !== skuBaseline.cost_yuan) {
        payload.cost_cents = costCents(skuForm.cost_yuan);
      }
    } else {
      if (skuForm.product_id) payload.product_id = skuForm.product_id;
      if (skuForm.spec_group_id) payload.spec_group_id = skuForm.spec_group_id;
      if (skuForm.cost_yuan !== null) {
        payload.cost_cents = costCents(skuForm.cost_yuan);
      }
    }
    return payload;
  };

  async function saveSku() {
    if (!skuForm.code.trim() || !skuForm.title.trim()) {
      Message.error('请填写商品编码与名称');
      return;
    }
    if (skuForm.cost_yuan !== null && skuForm.cost_yuan < 0) {
      Message.error('成本不能为负（单位：元）');
      return;
    }
    // §15.5：后端 resolveSkuCatalogRefs 要求规格组席位数与必需席位一致，先拦一道。
    const group = specGroups.value.find(
      (item) => item.id === skuForm.spec_group_id
    );
    if (
      group &&
      group.seats.length > 0 &&
      group.seats.length !== skuForm.required_seats
    ) {
      Message.error(
        `规格组「${group.name}」有 ${group.seats.length} 席，须与必需席位一致`
      );
      return;
    }
    // §15.3-01：多人 SKU 缺每席承诺服务量时后端下单必拒，这里先拦一道。
    if (skuForm.required_seats > 1 && skuForm.per_seat_service_units < 1) {
      Message.error(
        '多人 SKU 须填写每席承诺服务量（正整数），否则下单会被拒绝'
      );
      return;
    }
    try {
      if (skuForm.id) {
        await updateSku(skuForm.id, skuPayload());
      } else {
        const payload = { code: skuForm.code, ...skuPayload() };
        await createSku(payload);
      }
      skuVisible.value = false;
      Message.success('已保存');
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(err, '保存商品失败，请检查名额是否低于已占用数量')
      );
    }
  }

  // 上下架复用编辑接口，仅切换状态字段。
  async function toggleSale(record: EsportsSku, status: EsportsSku['status']) {
    const payload: SkuUpdateInput = {
      title: record.title,
      service_type: record.service_type,
      category_id: record.category_id,
      description: record.description,
      unit_price_cents: record.unit_price_cents,
      min_unit_price_cents:
        record.min_unit_price_cents || record.unit_price_cents,
      adjustment_approval_bp: record.adjustment_approval_bp,
      service_units: record.service_units,
      service_unit_name: record.service_unit_name,
      required_seats: record.required_seats,
      per_seat_service_units: record.per_seat_service_units ?? 0,
      service_duration_minutes: record.service_duration_minutes || 0,
      required_level: record.required_level,
      close_rule_code: record.close_rule_code,
      quota_total: record.quota_total,
      sort_order: record.sort_order,
      status,
    };
    try {
      await updateSku(record.id, payload);
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '上下架失败，请稍后重试'));
    }
  }

  // ── 产品分类 ──
  function openCategory(record?: EsportsProductCategory) {
    Object.assign(categoryForm, record ? { ...record } : emptyCategoryForm());
    categoryVisible.value = true;
  }

  async function saveCategory() {
    if (!categoryForm.code.trim() || !categoryForm.name.trim()) {
      Message.error('请填写分类编码与名称');
      return;
    }
    const payload: CategoryInput = {
      code: categoryForm.code,
      name: categoryForm.name,
      game: categoryForm.game,
      sort_order: categoryForm.sort_order,
      status: categoryForm.status,
    };
    try {
      if (categoryForm.id) {
        await updateCategory(categoryForm.id, payload);
      } else {
        await createCategory(payload);
      }
      categoryVisible.value = false;
      Message.success('已保存');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '保存分类失败，编码可能已存在'));
    }
  }

  async function removeCategory(record: EsportsProductCategory) {
    try {
      await deleteCategory(record.id);
      Message.success('已删除');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '删除失败，分类可能已被商品引用'));
    }
  }

  // ── SKU 停服（§15.7：申请 → 异人审批 → 逐单处置） ──
  async function openSuspension() {
    Object.assign(suspensionForm, {
      sku_id: null,
      reason: '',
      effective_mode: 'immediate',
      effective_at: '',
    });
    if (skus.value.length === 0) {
      try {
        skus.value = (await listSkus()).data.data || [];
      } catch (err) {
        Message.error(errorText(err, '加载 SKU 列表失败'));
        return;
      }
    }
    suspensionVisible.value = true;
  }

  async function saveSuspension() {
    if (!suspensionForm.sku_id) {
      Message.error('请选择要停服的 SKU');
      return;
    }
    const reason = suspensionForm.reason.trim();
    if (!reason) {
      Message.error('请填写停服原因');
      return;
    }
    const scheduled = suspensionForm.effective_mode === 'scheduled';
    if (scheduled && !suspensionForm.effective_at) {
      Message.error('定时生效须选择生效时间');
      return;
    }
    if (scheduled && new Date(suspensionForm.effective_at) <= new Date()) {
      Message.error('生效时间须晚于当前时间');
      return;
    }
    try {
      await requestSkuSuspension(suspensionForm.sku_id, {
        reason,
        effective_mode: suspensionForm.effective_mode,
        effective_at: scheduled
          ? new Date(suspensionForm.effective_at).toISOString()
          : undefined,
      });
      suspensionVisible.value = false;
      Message.success('已提交停服申请，等待异人审批');
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(
          err,
          '发起失败：仅可对在售 SKU 发起，且同一 SKU 只允许一张进行中申请'
        )
      );
    }
  }

  async function loadSuspensionDetail(id: number) {
    try {
      suspensionReport.value = (await getSkuSuspension(id)).data.data;
    } catch (err) {
      Message.error(errorText(err, '加载停服详情失败'));
    }
  }

  function openDecision(record: EsportsSkuSuspension) {
    decisionTarget.value = record;
    Object.assign(decisionForm, { approve: true, note: '' });
    decisionVisible.value = true;
  }

  async function submitDecision() {
    if (!decisionTarget.value) return;
    const note = decisionForm.note.trim();
    if (!note) {
      Message.error('请填写审批理由');
      return;
    }
    try {
      await decideSkuSuspension(decisionTarget.value.id, {
        approve: decisionForm.approve,
        note,
      });
      decisionVisible.value = false;
      Message.success('已提交审批结论');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '审批失败：申请人不得自审，或状态已变化'));
    }
  }

  async function cancelSuspension(record: EsportsSkuSuspension) {
    try {
      await cancelSkuSuspension(record.id);
      Message.success('已撤回停服申请');
      await loadActive();
    } catch (err) {
      Message.error(errorText(err, '撤回失败：申请已审批或状态已变化'));
    }
  }

  async function openSuspensionDetail(record: EsportsSkuSuspension) {
    suspensionReport.value = null;
    await loadSuspensionDetail(record.id);
    suspensionDetailVisible.value = true;
  }

  function openDisposal(item: EsportsSkuSuspensionItem) {
    disposalTarget.value = item;
    Object.assign(disposalForm, {
      action: item.suggested_action,
      note: '',
      start_at: '',
    });
    disposalVisible.value = true;
  }

  async function submitDisposal() {
    const suspension = detailSuspension.value;
    const item = disposalTarget.value;
    if (!suspension || !item) return;
    const reschedule = disposalForm.action === 'reschedule';
    if (reschedule && !disposalForm.start_at) {
      Message.error('改期须选择新的开始时间');
      return;
    }
    if (reschedule && new Date(disposalForm.start_at) <= new Date()) {
      Message.error('改期时间须晚于当前时间');
      return;
    }
    try {
      await disposeSkuSuspensionOrder(suspension.id, item.order_id, {
        action: disposalForm.action,
        note: disposalForm.note.trim(),
        start_at: reschedule
          ? new Date(disposalForm.start_at).toISOString()
          : undefined,
      });
      disposalVisible.value = false;
      Message.success('已提交处置');
      await loadSuspensionDetail(suspension.id);
      await loadActive();
    } catch (err) {
      Message.error(
        errorText(err, '处置失败：已开工订单不可直接取消，可改选改期或保留')
      );
      await loadSuspensionDetail(suspension.id);
    }
  }

  onMounted(loadActive);
</script>

<style scoped>
  .toolbar {
    margin-bottom: 16px;
  }

  .status-filter {
    width: 160px;
  }

  .section-title {
    margin: 8px 0;
    font-weight: 600;
  }

  .hint {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .detail-toolbar {
    margin-top: 12px;
  }
</style>
