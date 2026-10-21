<template>
  <div class="container page-container">
    <a-card class="general-card" title="页面装修">
      <a-space class="toolbar" wrap>
        <!-- 首页版本 / 渠道选择（§16.2-02）：切换后编辑与发布目标随之改变。 -->
        <a-select
          v-model="channel"
          :style="{ width: '200px' }"
          placeholder="选择首页版本"
          @change="onChannelChange"
        >
          <a-option
            v-for="item in pageDocs"
            :key="item.channel"
            :value="item.channel"
          >
            {{ channelLabel(item.channel) }}（{{
              item.published_version_no
                ? `生效 v${item.published_version_no}`
                : '未发布'
            }}）
          </a-option>
        </a-select>
        <a-tag color="arcoblue">{{ channelLabel(channel) }}</a-tag>
        <a-tag :color="statusColor(doc.status)">{{
          statusLabel(doc.status)
        }}</a-tag>
        <span class="hint"
          >草稿版本 {{ doc.draft_version }} · 生效版本
          {{ doc.published_version_no || '未发布' }}</span
        >
        <a-button :loading="loading" @click="load">刷新</a-button>
        <a-button :loading="saving" type="primary" @click="saveDraft"
          >保存草稿</a-button
        >
        <a-button @click="previewVisible = true">预览</a-button>
        <!-- 设备预览码（§16.4-02）：生成指向当前草稿的短期预览码，供客户端真机扫码查看。 -->
        <a-button
          v-if="canPreviewCode"
          :loading="previewCodeLoading"
          @click="generatePreviewCode"
          >生成预览码</a-button
        >
        <!-- 发布申请 → 异人审核（§16.4 / §16.5）：运营提交申请，有发布权限者审核，回滚同权限。 -->
        <a-button v-if="canSubmit" :loading="publishing" @click="publishNow"
          >提交发布</a-button
        >
        <a-date-picker
          v-if="canSubmit"
          v-model="scheduledAt"
          show-time
          placeholder="定时发布时间"
          :style="{ width: '200px' }"
        />
        <a-button
          v-if="canSubmit"
          :loading="publishing"
          @click="publishScheduled"
          >定时发布</a-button
        >
        <a-select
          v-if="canRollback"
          v-model="rollbackVersion"
          placeholder="回滚到版本"
          allow-clear
          :style="{ width: '160px' }"
        >
          <a-option
            v-for="version in versions"
            :key="version.id"
            :value="version.version_no"
            >v{{ version.version_no }}（{{
              statusLabel(version.status)
            }}）</a-option
          >
        </a-select>
        <a-button v-if="canRollback" :loading="publishing" @click="rollback"
          >回滚</a-button
        >
      </a-space>

      <!-- 后端校验原文（域名白名单 / 图片探测失败 / 体积或类型超限）常驻展示，
           避免 toast 一闪而过把可操作的错误信息吞掉。 -->
      <a-alert
        v-if="pageError"
        class="toolbar"
        type="error"
        closable
        @close="pageError = ''"
      >
        <template #title>保存 / 发布校验未通过（后端原文）</template>
        {{ pageError }}
      </a-alert>

      <a-tabs v-model:active-key="activeTab" @change="onTabChange">
        <a-tab-pane key="design" title="装修">
          <div class="designer">
            <div class="palette">
              <div class="section-title">组件库</div>
              <!-- 布局容器：1×1 / 1×2 / 1×3 列，每列放一个已有组件。 -->
              <div class="palette-group">布局</div>
              <div
                v-for="preset in layoutPresets"
                :key="preset.columns"
                class="palette-item"
              >
                <a-button long @click="addLayout(preset.columns)">{{
                  preset.label
                }}</a-button>
                <div class="palette-usage">{{ preset.usage }}</div>
                <div class="palette-source">数据源：内部组件（每列 1 个）</div>
              </div>
              <!-- 组件库按分类分组并标注用途 / 适用数据源（§16.2-03）。 -->
              <template v-for="group in componentGroups" :key="group.title">
                <div class="palette-group">{{ group.title }}</div>
                <div
                  v-for="item in group.items"
                  :key="item.type"
                  class="palette-item"
                >
                  <a-button long @click="addComponent(item.type)">{{
                    item.label
                  }}</a-button>
                  <div class="palette-usage">{{ item.usage }}</div>
                  <div class="palette-source"
                    >数据源：{{ item.dataSource }}</div
                  >
                </div>
              </template>
            </div>

            <div class="canvas">
              <div class="section-title"
                >手机画布（{{ components.length }}）· 拖拽排序</div
              >
              <div class="canvas-split">
                <!-- 实时预览（§16.4）：复用客户端渲染规则的手机画布，草稿改动即时同步。 -->
                <div class="live-preview">
                  <div class="live-preview-head">
                    <span class="live-preview-title">实时预览</span>
                    <span class="live-preview-sync">
                      <i class="live-dot" />实时同步
                    </span>
                  </div>
                  <a-select
                    v-model="previewDeviceKey"
                    class="live-preview-device"
                    size="mini"
                    placeholder="手机类型"
                  >
                    <a-option
                      v-for="device in previewDevices"
                      :key="device.key"
                      :value="device.key"
                    >
                      {{ device.label }} · {{ device.width }}×{{
                        device.height
                      }}
                    </a-option>
                  </a-select>
                  <div ref="livePreviewBody" class="live-preview-body">
                    <PagePreview
                      :components="components"
                      :selected-key="selectedPath"
                      :device="previewDevice"
                      :scale="previewScale"
                      selectable
                      @select="selectByPath"
                    />
                  </div>
                  <div class="live-preview-hint">
                    机型仅影响预览；属性、排序与显隐改动即时同步，点击预览区块可选中对应组件。
                  </div>
                </div>
                <div class="canvas-list">
                  <a-empty
                    v-if="!components.length"
                    description="从左侧组件库添加组件"
                  />
                  <div
                    v-for="(component, index) in components"
                    :key="index"
                    class="canvas-item"
                    :class="{
                      'active': index === selectedIndex,
                      'drag-over': index === dragOverIndex,
                      'canvas-layout': component.type === 'layout',
                    }"
                    draggable="true"
                    @dragstart="onDragStart(index, $event)"
                    @dragover.prevent="dragOverIndex = index"
                    @drop.prevent="onDrop(index)"
                    @dragend="onDragEnd"
                    @click="selectComponent(index)"
                  >
                    <template v-if="component.type === 'layout'">
                      <div class="canvas-layout-head">
                        <span class="drag-handle">⠿</span>
                        <span class="canvas-label">{{
                          layoutLabel(component)
                        }}</span>
                        <a-switch
                          v-model="component.visible"
                          size="small"
                          @click.stop
                        />
                        <div class="canvas-actions" @click.stop>
                          <a-button
                            size="mini"
                            :disabled="index === 0"
                            @click="move(index, -1)"
                            >上移</a-button
                          >
                          <a-button
                            size="mini"
                            :disabled="index === components.length - 1"
                            @click="move(index, 1)"
                            >下移</a-button
                          >
                          <a-button size="mini" @click="duplicate(index)"
                            >复制</a-button
                          >
                          <a-button
                            size="mini"
                            status="danger"
                            @click="remove(index)"
                            >删除</a-button
                          >
                        </div>
                      </div>
                      <div class="canvas-layout-grid" @click.stop>
                        <div
                          v-for="columnIndex in layoutColumns(component)"
                          :key="columnIndex"
                          class="canvas-slot"
                        >
                          <div
                            v-if="
                              layoutChildAt(component, columnIndex - 1) !== null
                            "
                            class="canvas-slot-item"
                            :class="{
                              active: isChildSelected(index, columnIndex - 1),
                            }"
                            @click="selectChild(index, columnIndex - 1)"
                          >
                            <span class="canvas-slot-label">{{
                              componentLabelOf(
                                layoutChildAt(component, columnIndex - 1)
                              )
                            }}</span>
                            <a-button
                              size="mini"
                              status="danger"
                              @click.stop="removeChild(index, columnIndex - 1)"
                              >移除</a-button
                            >
                          </div>
                          <a-select
                            v-else
                            size="mini"
                            placeholder="+ 添加组件"
                            class="canvas-slot-add"
                            @change="
                              (value) =>
                                addChildFromSelect(
                                  index,
                                  columnIndex - 1,
                                  value
                                )
                            "
                          >
                            <a-option
                              v-for="item in componentTypes"
                              :key="item.type"
                              :value="item.type"
                              >{{ item.label }}</a-option
                            >
                          </a-select>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <span class="drag-handle">⠿</span>
                      <span class="canvas-label">{{
                        componentLabel(component.type)
                      }}</span>
                      <a-switch
                        v-model="component.visible"
                        size="small"
                        @click.stop
                      />
                      <div class="canvas-actions" @click.stop>
                        <a-button
                          size="mini"
                          :disabled="index === 0"
                          @click="move(index, -1)"
                          >上移</a-button
                        >
                        <a-button
                          size="mini"
                          :disabled="index === components.length - 1"
                          @click="move(index, 1)"
                          >下移</a-button
                        >
                        <a-button size="mini" @click="duplicate(index)"
                          >复制</a-button
                        >
                        <a-button
                          size="mini"
                          status="danger"
                          @click="remove(index)"
                          >删除</a-button
                        >
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="inspector">
              <div class="section-title">属性</div>
              <a-empty
                v-if="!selectedComponent"
                description="选中组件后编辑属性"
              />
              <template v-else>
                <a-descriptions :column="1" size="small">
                  <a-descriptions-item label="类型">{{
                    componentLabelOf(selectedComponent)
                  }}</a-descriptions-item>
                  <a-descriptions-item
                    v-if="selectedChildIndex >= 0"
                    label="位置"
                    >{{ layoutLabel(components[selectedIndex]) }} · 第
                    {{ selectedChildIndex + 1 }} 列</a-descriptions-item
                  >
                </a-descriptions>
                <a-empty
                  v-if="!currentSchema.length"
                  description="该组件无自由属性"
                />
                <div
                  v-for="field in currentSchema"
                  :key="field.key"
                  class="prop-field"
                >
                  <label class="prop-label">{{ field.label }}</label>

                  <a-input
                    v-if="field.kind === 'text'"
                    :model-value="stringField(field.key)"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <a-textarea
                    v-else-if="field.kind === 'textarea'"
                    :model-value="stringField(field.key)"
                    :placeholder="field.placeholder"
                    :auto-size="{ minRows: 2, maxRows: 5 }"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <a-select
                    v-else-if="field.kind === 'select'"
                    :model-value="stringField(field.key)"
                    @update:model-value="(v) => setField(field.key, v)"
                  >
                    <a-option
                      v-for="opt in field.options || []"
                      :key="opt.value"
                      :value="opt.value"
                      >{{ opt.label }}</a-option
                    >
                  </a-select>

                  <a-input-number
                    v-else-if="field.kind === 'number'"
                    :model-value="numberField(field.key)"
                    :min="field.min"
                    :max="field.max"
                    :placeholder="field.placeholder"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <input
                    v-else-if="field.kind === 'color'"
                    type="color"
                    class="prop-color"
                    :value="stringField(field.key) || '#165dff'"
                    @input="onColorInput(field.key, $event)"
                  />

                  <a-input
                    v-else-if="field.kind === 'numberList'"
                    :model-value="stringField(field.key)"
                    placeholder="例如 1,2,3"
                    @update:model-value="(v) => setField(field.key, v)"
                  />

                  <div v-else-if="field.kind === 'image'" class="prop-images">
                    <div class="prop-image-row">
                      <a-input
                        :model-value="stringField(field.key)"
                        placeholder="public/...（附件表路径）或 https://"
                        @update:model-value="(v) => setField(field.key, v)"
                      />
                      <a-button
                        size="mini"
                        @click="openCropperForField(field.key)"
                        >裁剪</a-button
                      >
                      <AttachmentSelector
                        accept="image/*"
                        default-directory="public/esports-page"
                        @select="
                          (selection) =>
                            chooseAttachmentForField(field.key, selection)
                        "
                      >
                        <template #trigger="{ open }">
                          <a-button size="mini" type="outline" @click="open"
                            >上传</a-button
                          >
                        </template>
                      </AttachmentSelector>
                    </div>
                    <div class="prop-image-hint">
                      本地图片保存为附件表相对路径 public/...，渲染时自动转成
                      /uploads/...；外部图片发布前会校验
                      https、域名白名单与可访问性
                    </div>
                    <div
                      v-if="imageIssue(stringField(field.key))"
                      class="prop-warn"
                    >
                      {{ imageIssue(stringField(field.key)) }}
                    </div>
                  </div>

                  <div
                    v-else-if="field.kind === 'carouselItems'"
                    class="prop-images"
                  >
                    <div class="palette-usage">
                      轮播图按「图片 +
                      跳转链接」逐张配置，每张图各有一条独立链接； 图片须为
                      https:// 或附件表相对路径
                      public/...，跳转支持已注册站内页面或白名单内 HTTPS 域名。
                    </div>
                    <div
                      v-for="(item, i) in carouselItemList()"
                      :key="i"
                      class="prop-image-block"
                    >
                      <div class="prop-item-label">第 {{ i + 1 }} 张</div>
                      <div class="prop-image-row">
                        <a-input
                          :model-value="item.image"
                          placeholder="图片：public/... 或 https://"
                          @update:model-value="
                            (v) => updateCarouselItem(i, { image: v })
                          "
                        />
                        <a-button
                          size="mini"
                          @click="openCropperForCarouselItem(i)"
                          >裁剪</a-button
                        >
                        <AttachmentSelector
                          accept="image/*"
                          default-directory="public/esports-page"
                          @select="
                            (selection) =>
                              chooseAttachmentForCarouselItem(i, selection)
                          "
                        >
                          <template #trigger="{ open }">
                            <a-button size="mini" type="outline" @click="open"
                              >上传</a-button
                            >
                          </template>
                        </AttachmentSelector>
                        <a-button
                          size="mini"
                          status="danger"
                          @click="removeCarouselItem(i)"
                          >删</a-button
                        >
                      </div>
                      <div class="prop-image-row">
                        <a-input
                          :model-value="item.link"
                          :placeholder="`第 ${
                            i + 1
                          } 张的跳转链接（可选）：站内 /pages/... 或 https://...`"
                          @update:model-value="
                            (v) => updateCarouselItem(i, { link: v })
                          "
                        />
                      </div>
                      <div v-if="imageIssue(item.image)" class="prop-warn">
                        第 {{ i + 1 }} 张：{{ imageIssue(item.image) }}
                      </div>
                      <div v-if="linkIssue(item.link)" class="prop-warn">
                        第 {{ i + 1 }} 张跳转：{{ linkIssue(item.link) }}
                      </div>
                    </div>
                    <a-button
                      size="mini"
                      type="outline"
                      @click="addCarouselItem"
                      >添加轮播图</a-button
                    >
                  </div>

                  <div v-else-if="field.kind === 'images'" class="prop-images">
                    <div class="palette-usage">
                      每张图片都须为 https:// 外部地址或附件表相对路径
                      public/...；外部域名须在 app.esports.page_allowed_domains
                      白名单内，发布前会逐张探测可访问性，失败时展示后端返回的中文原文。
                    </div>
                    <div
                      v-for="(url, i) in imageList()"
                      :key="i"
                      class="prop-image-block"
                    >
                      <div class="prop-image-row">
                        <a-input
                          :model-value="url"
                          placeholder="public/... 或 https://"
                          @update:model-value="(v) => updateImage(i, v)"
                        />
                        <a-button size="mini" @click="openCropperForImages(i)"
                          >裁剪</a-button
                        >
                        <a-button
                          size="mini"
                          status="danger"
                          @click="removeImage(i)"
                          >删</a-button
                        >
                      </div>
                      <!-- 每个元素给出同一套发布校验提示，本地规则不满足时立即标黄。 -->
                      <div class="prop-image-hint">
                        第 {{ i + 1 }} 张：https + 域名白名单 +
                        可访问探测（发布前校验）
                      </div>
                      <div v-if="imageIssue(url)" class="prop-warn">
                        第 {{ i + 1 }} 张：{{ imageIssue(url) }}
                      </div>
                    </div>
                    <a-space>
                      <a-button size="mini" type="outline" @click="addImage"
                        >添加图片</a-button
                      >
                      <a-button
                        size="mini"
                        type="outline"
                        @click="openCropperForImages(-1)"
                        >上传裁剪</a-button
                      >
                      <AttachmentSelector
                        accept="image/*"
                        multiple
                        default-directory="public/esports-page"
                        @select="chooseAttachmentsForImages"
                      >
                        <template #trigger="{ open }">
                          <a-button size="mini" type="outline" @click="open"
                            >上传</a-button
                          >
                        </template>
                      </AttachmentSelector>
                    </a-space>
                    <!-- 发布 / 保存失败时，后端对具体轮播项的中文报错原样展示在这里。 -->
                    <a-alert
                      v-if="pageError"
                      type="error"
                      class="prop-image-error"
                    >
                      <template #title>轮播图校验未通过（后端原文）</template>
                      {{ pageError }}
                    </a-alert>
                  </div>

                  <div v-else-if="field.kind === 'navItems'" class="prop-nav">
                    <div
                      v-for="(item, i) in navItemList()"
                      :key="i"
                      class="prop-nav-row"
                    >
                      <a-input
                        :model-value="item.name"
                        placeholder="名称"
                        @update:model-value="(v) => updateNavItem(i, 'name', v)"
                      />
                      <a-input
                        :model-value="item.icon"
                        placeholder="图标：https:// 或 icon-code"
                        @update:model-value="(v) => updateNavItem(i, 'icon', v)"
                      />
                      <a-select
                        :model-value="item.target"
                        :style="{ width: '120px' }"
                        @update:model-value="
                          (v) =>
                            updateNavItem(
                              i,
                              'target',
                              typeof v === 'string' ? v : ''
                            )
                        "
                      >
                        <a-option
                          v-for="opt in navTargetOptions"
                          :key="opt.value"
                          :value="opt.value"
                          >{{ opt.label }}</a-option
                        >
                      </a-select>
                      <!-- 顺序即数组顺序，客户端按该顺序渲染宫格（§16.3-04）。 -->
                      <a-button
                        size="mini"
                        :disabled="i === 0"
                        @click="moveNavItem(i, -1)"
                        >上移</a-button
                      >
                      <a-button
                        size="mini"
                        :disabled="i === navItemList().length - 1"
                        @click="moveNavItem(i, 1)"
                        >下移</a-button
                      >
                      <a-button
                        size="mini"
                        status="danger"
                        @click="removeNavItem(i)"
                        >删</a-button
                      >
                    </div>
                    <a-button size="mini" type="outline" @click="addNavItem"
                      >添加导航项</a-button
                    >
                    <div class="palette-usage">
                      图标支持 https:// 图片地址、站内
                      /path，或客户端内置图标短标识（如 icon-cs）。
                    </div>
                  </div>
                </div>
                <div class="prop-hint">属性实时写入草稿，保存草稿后生效</div>
              </template>
            </div>
          </div>
        </a-tab-pane>

        <!-- 底部导航（§16.3-12）：数量 / 路径 / 顺序由客户端构建期固定，后台只能改文案、图标与显隐。 -->
        <a-tab-pane key="tabbar" title="底部导航">
          <a-space class="toolbar" wrap>
            <a-button :loading="tabbarLoading" @click="loadTabbar(true)"
              >刷新</a-button
            >
            <a-button
              v-if="canTabbarEdit"
              type="primary"
              :loading="tabbarSaving"
              @click="saveTabbar"
              >保存底部导航</a-button
            >
            <a-typography-text type="secondary">
              草稿版本 v{{
                tabbarDraftVersion
              }}；保存后需「提交发布」并审核通过才对客户端生效。
            </a-typography-text>
          </a-space>
          <a-alert type="info" class="sub-card">
            导航项数量、路径与顺序由客户端 pages.json
            构建期固定（/pages/index/index、/pages/order/list、/pages/mine/index），
            后台只允许修改文案（1~12
            字）、图标与是否显示；任何增删、改路径或换序都会被后端拒绝。
          </a-alert>
          <a-spin :loading="tabbarLoading" style="width: 100%">
            <a-empty
              v-if="!tabbarItems.length"
              description="暂无底部导航配置，点「刷新」重试"
            />
            <div
              v-for="(item, index) in tabbarItems"
              :key="item.path"
              class="tabbar-row"
            >
              <span class="tabbar-path"
                >第 {{ index + 1 }} 项 · {{ item.path }}</span
              >
              <a-input
                :model-value="item.text"
                placeholder="文案（1~12 字）"
                :max-length="12"
                class="tabbar-text"
                @update:model-value="
                  (v) => updateTabbarItem(index, 'text', String(v))
                "
              />
              <a-input
                :model-value="item.icon"
                placeholder="图标：https:// 或站内 /path"
                class="tabbar-icon"
                @update:model-value="
                  (v) => updateTabbarItem(index, 'icon', String(v))
                "
              />
              <a-checkbox
                :model-value="item.visible !== false"
                @update:model-value="
                  (v) => updateTabbarItem(index, 'visible', Boolean(v))
                "
                >显示</a-checkbox
              >
            </div>
          </a-spin>
        </a-tab-pane>

        <a-tab-pane key="versions" title="发布记录">
          <!-- 版本差异视图（§16.2-07）：任选两版查看组件级差异。 -->
          <a-space class="toolbar" wrap>
            <a-select
              v-model="diffLeftNo"
              placeholder="版本 A"
              :style="{ width: '150px' }"
              allow-clear
            >
              <a-option
                v-for="item in versions"
                :key="item.id"
                :value="item.version_no"
                >v{{ item.version_no }}</a-option
              >
            </a-select>
            <a-select
              v-model="diffRightNo"
              placeholder="版本 B"
              :style="{ width: '150px' }"
              allow-clear
            >
              <a-option
                v-for="item in versions"
                :key="item.id"
                :value="item.version_no"
                >v{{ item.version_no }}</a-option
              >
            </a-select>
            <a-button @click="swapDiffVersions">对调</a-button>
            <a-typography-text type="secondary">
              {{
                diffSummary ||
                '选择两个版本后展示新增 / 删除 / 变更的组件级差异'
              }}
            </a-typography-text>
          </a-space>
          <a-table
            v-if="diffRows.length"
            :data="diffRows"
            row-key="key"
            :pagination="false"
            size="small"
            class="sub-card"
          >
            <template #columns>
              <a-table-column data-index="position" title="位置" :width="70" />
              <a-table-column title="差异类型" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="diffColor(record.kind)">{{
                    diffKindLabel(record.kind)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column data-index="component" title="组件" />
              <a-table-column data-index="detail" title="变更明细" />
            </template>
          </a-table>
          <a-table :data="versions" row-key="id" :pagination="{ pageSize: 10 }">
            <template #columns>
              <a-table-column title="版本">
                <template #cell="{ record }">v{{ record.version_no }}</template>
              </a-table-column>
              <a-table-column title="状态">
                <template #cell="{ record }">
                  <a-tag :color="statusColor(record.status)">{{
                    statusLabel(record.status)
                  }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="发布方式">
                <template #cell="{ record }">{{
                  record.publish_mode === 'scheduled' ? '定时' : '立即'
                }}</template>
              </a-table-column>
              <a-table-column title="发布人">
                <template #cell="{ record }">{{
                  publisherLabel(record.published_by)
                }}</template>
              </a-table-column>
              <a-table-column title="目标渠道">
                <template #cell="{ record }">{{
                  channelLabel(record.channel)
                }}</template>
              </a-table-column>
              <a-table-column title="发布/计划时间">
                <template #cell="{ record }">{{
                  fmtTime(record.published_at || record.scheduled_at)
                }}</template>
              </a-table-column>
              <a-table-column title="回滚来源">
                <template #cell="{ record }">{{
                  record.rollback_from_version_no
                    ? `v${record.rollback_from_version_no}`
                    : '-'
                }}</template>
              </a-table-column>
              <a-table-column data-index="note" title="备注" />
              <a-table-column data-index="created_at" title="生成时间">
                <template #cell="{ record }">{{
                  fmtTime(record.created_at)
                }}</template>
              </a-table-column>
              <a-table-column title="操作">
                <template #cell="{ record }">
                  <template v-if="record.status === 'pending_review'">
                    <a-space v-if="canReview">
                      <a-button
                        size="mini"
                        type="primary"
                        :loading="publishing"
                        @click="approvePublish(record.id)"
                        >通过</a-button
                      >
                      <a-button
                        size="mini"
                        status="danger"
                        :loading="publishing"
                        @click="rejectPublish(record.id)"
                        >驳回</a-button
                      >
                    </a-space>
                    <span v-else>-</span>
                  </template>
                  <span v-else>-</span>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>

        <a-tab-pane key="assets" title="素材库">
          <a-space class="toolbar" wrap>
            <a-input
              v-model="assetForm.name"
              placeholder="素材名称"
              :style="{ width: '160px' }"
            />
            <a-input
              v-model="assetForm.url"
              placeholder="public/... 或 https://"
              :style="{ width: '280px' }"
            />
            <a-input-number
              v-model="assetForm.width"
              placeholder="宽"
              :min="1"
              :max="4096"
              :style="{ width: '100px' }"
            />
            <a-input-number
              v-model="assetForm.height"
              placeholder="高"
              :min="1"
              :max="4096"
              :style="{ width: '100px' }"
            />
            <a-button type="primary" @click="createAsset">新增素材</a-button>
            <!-- 选择本地文件后自动读取 file.type / file.size 并上传，避免漏传 mime 与 size_bytes。 -->
            <a-button @click="pickAssetFile">选择本地图片</a-button>
            <input
              ref="assetFileInput"
              type="file"
              class="asset-file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              @change="onAssetFilePicked"
            />
            <a-button @click="openCropperForAsset">上传并裁剪</a-button>
          </a-space>
          <a-typography-text type="secondary" class="asset-meta">
            当前文件：类型 {{ assetForm.mime || '未读取' }} · 大小
            {{
              assetForm.sizeBytes ? formatBytes(assetForm.sizeBytes) : '未读取'
            }}。新增素材必须带 mime 与 size_bytes（上限 10MB，仅支持 JPEG / PNG
            / WebP / GIF），手工填写的地址无法校验体积，需先选择本地文件。
          </a-typography-text>
          <a-table :data="assets" row-key="id" :pagination="{ pageSize: 10 }">
            <template #columns>
              <a-table-column title="预览" :width="90">
                <template #cell="{ record }">
                  <a-image
                    v-if="record.url"
                    :src="pageImagePublicUrl(record.url)"
                    :alt="record.name"
                    width="64"
                    height="44"
                    fit="cover"
                  />
                  <span v-else>-</span>
                </template>
              </a-table-column>
              <a-table-column
                data-index="name"
                title="名称"
                :ellipsis="true"
                :tooltip="true"
              />
              <a-table-column
                data-index="url"
                title="地址"
                :ellipsis="true"
                :tooltip="true"
              />
              <a-table-column title="类型" :width="120">
                <template #cell="{ record }">{{ record.mime || '-' }}</template>
              </a-table-column>
              <a-table-column title="大小" :width="110">
                <template #cell="{ record }">{{
                  formatBytes(record.size_bytes)
                }}</template>
              </a-table-column>
              <a-table-column title="尺寸">
                <template #cell="{ record }"
                  >{{ record.width }}×{{ record.height }}</template
                >
              </a-table-column>
              <a-table-column title="操作">
                <template #cell="{ record }">
                  <a-button
                    size="mini"
                    status="danger"
                    @click="removeAsset(record.id)"
                    >删除</a-button
                  >
                </template>
              </a-table-column>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 真实预览（手机画布，复用客户端渲染规则） -->
    <a-modal
      v-model:visible="previewVisible"
      :footer="false"
      :width="420"
      title="手机端预览"
    >
      <PagePreview :components="components" />
    </a-modal>

    <!-- 设备预览码（§16.4-02）：展示预览码 / 预览路径 / 有效期，客户端扫码兑换草稿配置。 -->
    <a-modal
      v-model:visible="previewCodeVisible"
      title="设备预览码"
      :footer="false"
      :width="560"
    >
      <a-empty v-if="!previewCode" description="暂无预览码" />
      <template v-else>
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="渠道">{{
            previewCode.channel
          }}</a-descriptions-item>
          <a-descriptions-item label="草稿版本"
            >v{{ previewCode.draft_version }}</a-descriptions-item
          >
          <a-descriptions-item label="有效期至">{{
            previewCode.expires_at
          }}</a-descriptions-item>
          <a-descriptions-item label="预览码">
            <a-typography-paragraph copyable class="preview-code">
              {{ previewCode.code }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="预览路径">
            <a-typography-paragraph copyable>
              {{ previewCode.path }}
            </a-typography-paragraph>
          </a-descriptions-item>
          <a-descriptions-item label="客户端兑换">
            公开接口 GET /api/v1/esports{{
              previewCode.path
            }}（无需登录，只返回草稿配置）
          </a-descriptions-item>
        </a-descriptions>
        <a-typography-text type="secondary" class="modal-tip">
          预览码有效期 30 分钟且指向当前草稿版本；重新保存草稿后需重新生成。
          若提示签名密钥未配置，请先在系统配置中设置
          app.esports.page_preview_secret。
        </a-typography-text>
      </template>
    </a-modal>

    <!-- 图片上传裁剪 -->
    <ImageCropper
      :visible="cropperVisible"
      @confirm="onCropperConfirm"
      @cancel="cropperVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
  import { Message } from '@arco-design/web-vue';
  import usePermission from '@/hooks/permission';
  import { getAdmins } from '@/api/user';
  import { getAttachmentAccessUrl, uploadAttachment } from '@/api/attachment';
  import AttachmentSelector from '@/components/attachment-selector/index.vue';
  import type { AttachmentResponse } from '@/types/api';
  import {
    PAGE_CHANNEL_CUSTOMER_HOME,
    createEsportsPageAsset,
    createPagePreviewCode,
    deleteEsportsPageAsset,
    getEsportsPage,
    getEsportsPageAssets,
    getEsportsPages,
    getEsportsPageVersions,
    getPageTabbar,
    publishEsportsPage,
    reviewEsportsPagePublish,
    rollbackEsportsPage,
    saveEsportsPageDraft,
    savePageTabbar,
  } from '../../api';
  import type {
    PageAsset,
    PageComponent,
    PageComponentType,
    PageDocument,
    PagePreviewCode,
    PageTabbarItem,
    PageVersion,
  } from '../../api';
  import ImageCropper from '../../components/page-designer/ImageCropper.vue';
  import PagePreview from '../../components/page-designer/PagePreview.vue';

  // ── 可视化属性面板 schema（§16.2） ──
  type PropFieldKind =
    | 'text'
    | 'textarea'
    | 'number'
    | 'color'
    | 'numberList'
    | 'select'
    | 'image'
    | 'images'
    | 'carouselItems'
    | 'navItems';

  interface PropField {
    key: string;
    label: string;
    kind: PropFieldKind;
    placeholder?: string;
    min?: number;
    max?: number;
    options?: { label: string; value: string }[];
  }

  interface NavItemDraft {
    name: string;
    target: string;
    // 图标（§16.3-04）：https:// / 站内 /path / 内置图标短标识（如 icon-cs）。
    icon: string;
  }

  // 轮播项（§16.3-02）：每张图独立配置点击跳转，后端以 items 承载。
  interface CarouselItemDraft {
    image: string;
    link: string;
  }

  // 组件库分组与用途 / 数据源说明（§16.2-03）：与后端 pagePropsWhitelist 的键保持一一对应。
  interface ComponentMeta {
    type: PageComponentType;
    label: string;
    usage: string;
    dataSource: string;
  }
  interface ComponentGroup {
    title: string;
    items: ComponentMeta[];
  }

  const componentGroups: ComponentGroup[] = [
    {
      title: '基础',
      items: [
        {
          type: 'search',
          label: '顶部搜索',
          usage: '首页顶部搜索入口，可配占位文案、热门词与搜索范围',
          dataSource: '手动配置（占位文案 / 热门词 / 范围）',
        },
        {
          type: 'notice',
          label: '公告条',
          usage: '滚动公告，可配图标、文字颜色与生效有效期',
          dataSource: '手动配置（文本）',
        },
        {
          type: 'carousel',
          label: '轮播图',
          usage:
            '顶部轮播，每张图片各自配置图片与点击跳转，另可设切换间隔与生效有效期',
          dataSource: '素材库 / 手动配置图片地址',
        },
        {
          type: 'image',
          label: '图片',
          usage: '单图展示，可配置图片地址与点击跳转',
          dataSource: '素材库 / 手动配置图片地址',
        },
      ],
    },
    {
      title: '内容与商品',
      items: [
        {
          type: 'category',
          label: '游戏/服务分类',
          usage: '分类导航，可配标题、分类项、展示数量与布局',
          dataSource: '商品分类（服务端分类数据）',
        },
        {
          type: 'product_list',
          label: '商品/套餐列表',
          usage: '商品列表，可配标题、数量、指定 SKU 与排序 / 筛选',
          dataSource: '在售 SKU（可取数规则 rule_code）',
        },
        {
          type: 'player_recommend',
          label: '陪玩推荐',
          usage: '陪玩推荐位，可按游戏、等级、在线与可预约筛选',
          dataSource: '陪玩档案（资质 / 在线状态）',
        },
        {
          type: 'activity',
          label: '活动专区',
          usage: '活动图片与展示时间，可关联指定活动',
          dataSource: '活动（campaign）',
        },
      ],
    },
    {
      title: '入口',
      items: [
        {
          type: 'quick_nav',
          label: '快捷导航宫格',
          usage: '宫格入口，逐项配置名称 / 图标 / 跳转目标，顺序即展示顺序',
          dataSource: '手动配置（客户端已注册页面）',
        },
        {
          type: 'member_entry',
          label: '会员/余额入口',
          usage: '会员与余额入口，可配标题、副标题与展示样式',
          dataSource: '会员等级 / 钱包余额',
        },
        {
          type: 'contact_entry',
          label: '联系客服',
          usage: '联系归属客服',
          dataSource: '归属客服',
        },
        {
          type: 'orders_entry',
          label: '我的订单',
          usage: '查看订单与待付款项',
          dataSource: '客户订单',
        },
        {
          type: 'aftersale_entry',
          label: '我的售后',
          usage: '查询售后进度',
          dataSource: '客户售后单',
        },
      ],
    },
  ];
  const componentTypes: ComponentMeta[] = componentGroups.flatMap(
    (group) => group.items
  );

  const navTargetOptions: { label: string; value: string }[] = [
    { label: '商品分类', value: 'category' },
    { label: '我的订单', value: 'orders' },
    { label: '会员', value: 'member' },
    { label: '联系客服', value: 'support' },
  ];

  const propSchemas: Record<PageComponentType, PropField[]> = {
    search: [{ key: 'placeholder', label: '搜索占位文案', kind: 'text' }],
    carousel: [
      { key: 'items', label: '轮播图片与跳转', kind: 'carouselItems' },
      {
        key: 'interval',
        label: '轮播间隔（毫秒）',
        kind: 'number',
        min: 1000,
        max: 30000,
      },
    ],
    image: [
      { key: 'image', label: '图片地址', kind: 'image' },
      {
        key: 'link',
        label: '点击跳转（可选）',
        kind: 'text',
        placeholder: '站内 /pages/... 或 https://...',
      },
      {
        key: 'fit',
        label: '填充方式',
        kind: 'select',
        options: [
          { label: '宽度撑满（高度自适应）', value: 'widthFix' },
          { label: '裁剪填满', value: 'aspectFill' },
          { label: '完整显示', value: 'aspectFit' },
        ],
      },
      {
        key: 'height',
        label: '高度（px，宽度撑满时忽略）',
        kind: 'number',
        min: 60,
        max: 600,
      },
      { key: 'radius', label: '圆角（px）', kind: 'number', min: 0, max: 48 },
      {
        key: 'spacing',
        label: '上下间距（px）',
        kind: 'number',
        min: 0,
        max: 80,
      },
    ],
    notice: [
      { key: 'text', label: '公告文本', kind: 'textarea' },
      { key: 'color', label: '文字颜色', kind: 'color' },
    ],
    quick_nav: [{ key: 'items', label: '导航项', kind: 'navItems' }],
    category: [
      { key: 'title', label: '标题', kind: 'text' },
      { key: 'items', label: '分类项', kind: 'navItems' },
    ],
    product_list: [
      { key: 'title', label: '标题', kind: 'text' },
      {
        key: 'limit',
        label: '展示数量（0 不限）',
        kind: 'number',
        min: 0,
        max: 50,
      },
      { key: 'sku_ids', label: '指定 SKU（逗号分隔）', kind: 'numberList' },
    ],
    player_recommend: [
      { key: 'title', label: '标题', kind: 'text' },
      { key: 'empty_text', label: '空数据兜底文案', kind: 'textarea' },
    ],
    activity: [
      { key: 'title', label: '标题', kind: 'text' },
      { key: 'campaign_id', label: '关联活动 ID', kind: 'number', min: 1 },
      { key: 'empty_text', label: '空数据兜底文案', kind: 'textarea' },
    ],
    member_entry: [{ key: 'title', label: '标题', kind: 'text' }],
    support_entry: [],
    contact_entry: [],
    orders_entry: [],
    aftersale_entry: [],
    // 列数由布局预设决定；以下样式属性可在选中布局时调整。
    layout: [
      {
        key: 'gap',
        label: '列间距（px）',
        kind: 'number',
        min: 0,
        max: 80,
        placeholder: '默认 8',
      },
      {
        key: 'padding',
        label: '内边距（px）',
        kind: 'number',
        min: 0,
        max: 80,
        placeholder: '默认 0',
      },
      {
        key: 'margin_top',
        label: '上外边距（px）',
        kind: 'number',
        min: 0,
        max: 80,
        placeholder: '默认 0',
      },
      {
        key: 'margin_right',
        label: '右外边距（px）',
        kind: 'number',
        min: 0,
        max: 80,
        placeholder: '默认 0',
      },
      {
        key: 'margin_bottom',
        label: '下外边距（px）',
        kind: 'number',
        min: 0,
        max: 80,
        placeholder: '默认 0',
      },
      {
        key: 'margin_left',
        label: '左外边距（px）',
        kind: 'number',
        min: 0,
        max: 80,
        placeholder: '默认 0',
      },
      {
        key: 'background_color',
        label: '背景色',
        kind: 'text',
        placeholder: '#FFFFFF，留空为透明',
      },
      {
        key: 'radius',
        label: '圆角（px）',
        kind: 'number',
        min: 0,
        max: 48,
        placeholder: '默认 10',
      },
    ],
  };

  // 组件库的布局分组：三种列容器，添加后在画布中为每列挑选一个组件。
  const layoutPresets: { label: string; columns: number; usage: string }[] = [
    { label: '1×1 布局', columns: 1, usage: '单列容器，可放入 1 个组件' },
    { label: '1×2 布局', columns: 2, usage: '左右两列，每列 1 个组件' },
    { label: '1×3 布局', columns: 3, usage: '三列并排，每列 1 个组件' },
  ];

  // 首页版本 / 渠道（§16.2-02）：默认客户自助端首页，可由 GET /admin/pages 返回的文档切换。
  const channel = ref(PAGE_CHANNEL_CUSTOMER_HOME);
  const pageDocs = ref<PageDocument[]>([]);
  const channelLabels: Record<string, string> = {
    [PAGE_CHANNEL_CUSTOMER_HOME]: '客户自助端首页',
  };
  const channelLabel = (value: string) => channelLabels[value] || value;
  const loading = ref(false);
  const saving = ref(false);
  const publishing = ref(false);
  const activeTab = ref('design');
  const previewVisible = ref(false);
  const cropperVisible = ref(false);

  // 实时预览机型（§16.4）：按逻辑分辨率（CSS 像素）排版后整体缩放，390/430 宽的换行与栅格仍然真实。
  interface PreviewDevice {
    key: string;
    label: string;
    width: number;
    height: number;
  }
  const previewDevices: PreviewDevice[] = [
    {
      key: 'iphone-pro-max',
      label: 'iPhone 16 / 17 / 18 Pro Max',
      width: 440,
      height: 956,
    },
    { key: 'iphone-17', label: 'iPhone 17 / 17 Pro', width: 402, height: 874 },
    {
      key: 'huawei-mate80',
      label: '华为 Mate 80 Pro',
      width: 400,
      height: 885,
    },
    { key: 'xiaomi-15-16', label: '小米 15 / 16', width: 400, height: 890 },
    {
      key: 'huawei-mate70',
      label: '华为 Mate 70 Pro',
      width: 411,
      height: 885,
    },
    { key: 'iphone-air', label: 'iPhone Air', width: 420, height: 912 },
    {
      key: 'iphone-plus',
      label: 'iPhone 15 / 16 Plus',
      width: 430,
      height: 932,
    },
    { key: 'iphone-15-16', label: 'iPhone 15 / 16', width: 393, height: 852 },
    { key: 'android-412', label: 'Android 大屏', width: 412, height: 915 },
    { key: 'iphone-14', label: 'iPhone 14', width: 390, height: 844 },
    { key: 'iphone-se', label: 'iPhone SE', width: 375, height: 667 },
    { key: 'android-360', label: 'Android 常规', width: 360, height: 800 },
  ];
  const previewDeviceKey = ref('iphone-17');
  const previewDevice = computed(
    () =>
      previewDevices.find((device) => device.key === previewDeviceKey.value) ||
      previewDevices[0]
  );
  // 所有机型统一按最宽机型缩放：切换机型时手机宽度/比例变化可见，而不是每次都撑满预览栏。
  // 20 为手机左右边框（每边 10px），与 PagePreview 保持一致。
  const PREVIEW_WIDEST_PHONE =
    Math.max(...previewDevices.map((device) => device.width)) + 20;
  // 量测当前可用宽度，窄屏上下排列时也能自适应。
  const livePreviewBody = ref<HTMLElement | null>(null);
  const livePreviewBodyWidth = ref(294);
  let livePreviewObserver: ResizeObserver | null = null;
  const previewScale = computed(() => {
    const available = livePreviewBodyWidth.value;
    return available ? Math.min(1, available / PREVIEW_WIDEST_PHONE) : 1;
  });

  // 发布权限（§16.5）：运营提交发布申请，有发布权限者（异人）审核发布，回滚同权限。
  const { hasButtonPermission } = usePermission();
  const canSubmit = computed(() =>
    hasButtonPermission('esports:pages:publish_submit')
  );
  const canReview = computed(() =>
    hasButtonPermission('esports:pages:publish_review')
  );
  const canRollback = computed(() =>
    hasButtonPermission('esports:pages:rollback_btn')
  );
  // 底部导航 / 设备预览码权限：复用后端 app.go 已声明的 PermAPI code。
  const canTabbarEdit = computed(() =>
    hasButtonPermission('esports:pages:tabbar_update')
  );
  const canPreviewCode = computed(() =>
    hasButtonPermission('esports:pages:preview_code')
  );
  // 后端校验原文（域名白名单 / 探测失败 / 体积类型超限）常驻展示，避免 toast 一闪而过。
  const pageError = ref('');

  const doc = ref<PageDocument>({
    channel: channel.value,
    status: 'draft',
    draft_version: 0,
    published_version_no: 0,
    updated_by: 0,
  });
  const components = ref<PageComponent[]>([]);
  const versions = ref<PageVersion[]>([]);
  const assets = ref<PageAsset[]>([]);
  // 正在登记的素材地址：同一张图并发选择时避免重复创建素材记录。
  const registeringAssetUrls = new Set<string>();
  const selectedIndex = ref(-1);
  // -1 表示选中布局本身 / 顶层普通组件；>=0 表示选中布局中的某一列。
  const selectedChildIndex = ref(-1);
  const scheduledAt = ref<number>();
  const rollbackVersion = ref<number>();
  // 底部导航（§16.3-12）：路径与数量由客户端构建期固定，这里只编辑文案 / 图标 / 显隐。
  const tabbarItems = ref<PageTabbarItem[]>([]);
  const tabbarDraftVersion = ref(0);
  const tabbarLoading = ref(false);
  const tabbarSaving = ref(false);
  const tabbarLoaded = ref(false);
  // 设备预览码（§16.4-02）：一次性生成、30 分钟有效，仅展示不落库。
  const previewCodeVisible = ref(false);
  const previewCodeLoading = ref(false);
  const previewCode = ref<PagePreviewCode | null>(null);
  // 发布记录的两版差异选择（§16.2-07）：由版本号定位到该版 config.components 逐组件比对。
  const diffLeftNo = ref<number>();
  const diffRightNo = ref<number>();
  // 发布人昵称映射（§16.2-07）：published_by 是管理员 ID，取后台管理员列表回填展示名。
  const adminNames = ref<Record<number, string>>({});
  const publisherLabel = (adminId: number) =>
    adminId ? adminNames.value[adminId] || `#${adminId}` : '—';

  const componentLabel = (type: PageComponentType) =>
    componentTypes.find((item) => item.type === type)?.label ||
    (type === 'support_entry' ? '客服与订单入口（旧版）' : type);

  const expandLegacySupportEntry = (list: PageComponent[]): PageComponent[] =>
    list.map((comp) =>
      comp.type === 'support_entry'
        ? {
            type: 'layout',
            visible: comp.visible,
            props: { columns: 3 },
            children: [
              { type: 'contact_entry', visible: true },
              { type: 'orders_entry', visible: true },
              { type: 'aftersale_entry', visible: true },
            ],
          }
        : comp
    );

  // 布局列数、子组件与选中路径：布局只允许一层，子组件沿用与顶层相同的属性面板。
  const layoutColumns = (comp: PageComponent | null | undefined): number => {
    const value = Number(comp?.props?.columns);
    return Number.isFinite(value) && value >= 1 && value <= 3
      ? Math.floor(value)
      : 1;
  };
  const layoutLabel = (comp: PageComponent | null | undefined) =>
    `1×${layoutColumns(comp)} 布局`;
  const layoutChildAt = (
    comp: PageComponent | null | undefined,
    columnIndex: number
  ): PageComponent | null => comp?.children?.[columnIndex] || null;
  const componentLabelOf = (comp: PageComponent | null | undefined) => {
    if (!comp) return '';
    return comp.type === 'layout'
      ? layoutLabel(comp)
      : componentLabel(comp.type);
  };
  const selectedComponent = computed<PageComponent | null>(() => {
    const comp = components.value[selectedIndex.value];
    if (!comp) return null;
    if (selectedChildIndex.value < 0) return comp;
    return layoutChildAt(comp, selectedChildIndex.value);
  });
  const selectedPath = computed(() => {
    if (selectedIndex.value < 0) return '';
    return selectedChildIndex.value < 0
      ? String(selectedIndex.value)
      : `${selectedIndex.value}.${selectedChildIndex.value}`;
  });

  const statusLabels: Record<string, string> = {
    draft: '草稿',
    pending: '待发布',
    pending_review: '待审核',
    published: '已发布',
    scheduled: '定时待发布',
    history: '历史版本',
  };
  const statusLabel = (value: string) => statusLabels[value] || value;
  const statusColors: Record<string, string> = {
    published: 'green',
    pending: 'orange',
    pending_review: 'arcoblue',
    scheduled: 'orange',
  };
  const statusColor = (value: string) => statusColors[value] || 'gray';

  const fmtTime = (value?: string | null) =>
    value ? new Date(value).toLocaleString() : '-';
  const errorText = (err: unknown, fallback: string) => {
    const { response } = err as { response?: { data?: { message?: string } } };
    return response?.data?.message || fallback;
  };
  // 记录后端返回的校验原文：常驻展示在页面顶部与轮播图属性区，避免 toast 一闪而过被吞掉。
  const reportPageError = (err: unknown, fallback: string) => {
    pageError.value = errorText(err, fallback);
    Message.error(pageError.value);
  };

  // 素材限制与后端 pageAssetAllowedMimes / pageAssetMaxBytes 一致（P1-20）：
  // mime 必填且只允许图片白名单，size_bytes 必填且不超过 10 MiB。
  const ASSET_MIME_WHITELIST = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  const ASSET_MAX_BYTES = 10 * 1024 * 1024;
  const assetForm = reactive({
    name: '',
    url: '',
    width: 0,
    height: 0,
    // 由文件选择 / 裁剪结果自动带出 file.type 与 file.size，缺一不可（否则后端 400）。
    mime: '',
    sizeBytes: 0,
  });
  const assetFileInput = ref<HTMLInputElement | null>(null);
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes < 1) return '-';
    return bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(2)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  // ── 可视化属性表单（就地编辑，提交时组装为 props） ──
  const form = reactive<Record<string, unknown>>({});

  const currentSchema = computed<PropField[]>(() => {
    if (!selectedComponent.value) return [];
    return propSchemas[selectedComponent.value.type] || [];
  });

  function deserializeField(field: PropField, raw: unknown): unknown {
    switch (field.kind) {
      case 'number':
        return typeof raw === 'number' ? raw : undefined;
      case 'images':
        return Array.isArray(raw)
          ? raw.filter((v): v is string => typeof v === 'string')
          : [];
      case 'carouselItems':
        return Array.isArray(raw)
          ? raw.map((v) => {
              const o = (v ?? {}) as Record<string, unknown>;
              return {
                image: typeof o.image === 'string' ? o.image : '',
                link: typeof o.link === 'string' ? o.link : '',
              };
            })
          : [];
      case 'navItems':
        return Array.isArray(raw)
          ? raw.map((v) => {
              const o = (v ?? {}) as Record<string, unknown>;
              return {
                name: typeof o.name === 'string' ? o.name : '',
                target: typeof o.target === 'string' ? o.target : '',
                icon: typeof o.icon === 'string' ? o.icon : '',
              };
            })
          : [];
      case 'numberList':
        return Array.isArray(raw) ? raw.map((v) => String(v)).join(',') : '';
      default:
        return typeof raw === 'string' ? raw : '';
    }
  }

  function serializeField(field: PropField, value: unknown): unknown {
    switch (field.kind) {
      case 'text':
      case 'textarea':
      case 'color':
      case 'select':
      case 'image': {
        const s = typeof value === 'string' ? value.trim() : '';
        return s === '' ? undefined : s;
      }
      case 'number': {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        return undefined;
      }
      case 'numberList': {
        const s = typeof value === 'string' ? value : '';
        const nums = s
          .split(/[,，\s]+/)
          .map((p) => parseInt(p, 10))
          .filter((n) => Number.isInteger(n) && n > 0);
        return nums.length ? nums : undefined;
      }
      case 'images': {
        const list = (Array.isArray(value) ? value : []).filter(
          (v): v is string => typeof v === 'string' && v !== ''
        );
        return list.length ? list : undefined;
      }
      case 'carouselItems': {
        const list = (Array.isArray(value) ? value : [])
          .map((v) => (v ?? {}) as CarouselItemDraft)
          .filter((v) => typeof v.image === 'string' && v.image.trim() !== '');
        return list.length
          ? list.map((v) => {
              const link = typeof v.link === 'string' ? v.link.trim() : '';
              return { image: v.image.trim(), ...(link ? { link } : {}) };
            })
          : undefined;
      }
      case 'navItems': {
        const list = (Array.isArray(value) ? value : [])
          .map((v) => (v ?? {}) as NavItemDraft)
          .filter((v) => typeof v.name === 'string' && v.name.trim() !== '');
        return list.length
          ? list.map((v) => {
              // 顺序即数组顺序（§16.3-04）：宫格按此顺序渲染；图标留空不写入，避免存空串。
              const icon = typeof v.icon === 'string' ? v.icon.trim() : '';
              return {
                name: v.name.trim(),
                target: v.target || '',
                ...(icon ? { icon } : {}),
              };
            })
          : undefined;
      }
      default:
        return undefined;
    }
  }

  function loadForm() {
    Object.keys(form).forEach((k) => delete form[k]);
    const comp = selectedComponent.value;
    if (!comp) return;
    const props = comp.props || {};
    (propSchemas[comp.type] || []).forEach((field) => {
      const legacySpacing =
        comp.type === 'layout' &&
        (field.key === 'margin_top' || field.key === 'margin_bottom')
          ? props.spacing
          : undefined;
      // 旧轮播草稿只有 images 数组：转成 items 行载入，跳转链接留空。
      const legacyCarouselItems =
        comp.type === 'carousel' && field.key === 'items'
          ? props.items ??
            (Array.isArray(props.images)
              ? props.images
                  .filter((v): v is string => typeof v === 'string')
                  .map((image) => ({ image, link: '' }))
              : undefined)
          : undefined;
      form[field.key] = deserializeField(
        field,
        props[field.key] ?? legacySpacing ?? legacyCarouselItems
      );
    });
  }

  function syncForm() {
    const comp = selectedComponent.value;
    if (!comp) return;
    const props: Record<string, unknown> =
      comp.type === 'layout' ? { columns: layoutColumns(comp) } : {};
    currentSchema.value.forEach((field) => {
      const serialized = serializeField(field, form[field.key]);
      if (serialized !== undefined) props[field.key] = serialized;
    });
    if (selectedChildIndex.value >= 0) {
      const layout = components.value[selectedIndex.value];
      const children = [...(layout.children || [])];
      children[selectedChildIndex.value] = { ...comp, props };
      components.value[selectedIndex.value] = { ...layout, children };
      return;
    }
    components.value[selectedIndex.value] = { ...comp, props };
  }

  function stringField(key: string): string {
    const v = form[key];
    return typeof v === 'string' ? v : '';
  }
  function numberField(key: string): number | undefined {
    const v = form[key];
    return typeof v === 'number' ? v : undefined;
  }
  function setField(key: string, value: unknown) {
    form[key] = value;
    syncForm();
  }
  function onColorInput(key: string, event: Event) {
    setField(key, (event.target as HTMLInputElement).value);
  }

  function imageList(): string[] {
    const v = form.images;
    return Array.isArray(v) ? (v as string[]) : [];
  }
  function setImages(list: string[]) {
    form.images = list;
    syncForm();
  }
  function addImage() {
    setImages([...imageList(), '']);
  }
  function updateImage(index: number, url: string) {
    const list = imageList();
    list[index] = url;
    setImages(list);
  }
  function removeImage(index: number) {
    const list = imageList();
    list.splice(index, 1);
    setImages(list);
  }

  // 轮播项：新配置写 items（{image, link}）；旧草稿只有 images 时按图片生成，
  // 第一次编辑即迁移为 items 并移除 images。
  function carouselItemList(): CarouselItemDraft[] {
    const value = form.items;
    if (Array.isArray(value) && value.length > 0) {
      return (value as CarouselItemDraft[]).map((item) => ({
        image: typeof item?.image === 'string' ? item.image : '',
        link: typeof item?.link === 'string' ? item.link : '',
      }));
    }
    return imageList().map((image) => ({ image, link: '' }));
  }
  function setCarouselItems(list: CarouselItemDraft[]) {
    form.items = list;
    delete form.images;
    syncForm();
  }
  function addCarouselItem() {
    setCarouselItems([...carouselItemList(), { image: '', link: '' }]);
  }
  function updateCarouselItem(
    index: number,
    patch: Partial<CarouselItemDraft>
  ) {
    setCarouselItems(
      carouselItemList().map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  }
  function removeCarouselItem(index: number) {
    const list = carouselItemList().slice();
    list.splice(index, 1);
    setCarouselItems(list);
  }
  // 轮播图本地可判定规则（与后端一致）：只允许 https 外部地址、附件表 public/ 存储路径
  // 或旧版站内 / 路径。域名白名单与可访问性只能由后端判定，失败时由 pageError 原样展示后端中文提示。
  // 附件表 path 是存储相对路径（public/...）；页面组件保存同一形式，
  // 渲染时再由 pageImageUrl / PreviewBlock 解析成 /uploads/... 公开地址。
  // 旧 /uploads/... 会归一成 public/...；非法路径（父目录、空段、反斜杠）返回空串。
  function pageImageStoragePath(raw: string): string {
    const value = (raw || '').trim();
    const normalized = value.startsWith('/uploads/')
      ? `public/${value.slice('/uploads/'.length)}`
      : value;
    if (!normalized.startsWith('public/') || normalized.endsWith('/')) {
      return '';
    }
    if (
      normalized.includes('..') ||
      normalized.includes('//') ||
      normalized.includes('\\')
    ) {
      return '';
    }
    return /^public\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(normalized)
      ? normalized
      : '';
  }

  // 组件里保存的是附件表路径 public/...；需要真正加载图片时转成 /uploads/... 公开地址。
  function pageImagePublicUrl(raw: string): string {
    const path = pageImageStoragePath(raw);
    return path
      ? `/uploads/${path.slice('public/'.length)}`
      : (raw || '').trim();
  }

  function imageIssue(url: string) {
    const value = (url || '').trim();
    if (!value) return '地址为空，客户端会渲染成空图';
    if (value.startsWith('public/')) {
      return pageImageStoragePath(value)
        ? ''
        : '附件存储路径非法（仅允许 public/ 下、不含 .. 的相对路径）';
    }
    if (value.startsWith('/')) return '';
    if (!/^https:\/\//i.test(value)) {
      return '仅支持 https://、附件表 public/ 路径或站内 / 路径（http 与协议相对地址会被后端拒绝）';
    }
    return '';
  }

  // 轮播项跳转链接：留空表示该图不可点；填写时须为站内 / 路径或 https 地址。
  // 与后端 validatePageLink 的口径一致，域名白名单仍由后端在发布时判定。
  function linkIssue(link: string) {
    const value = (link || '').trim();
    if (!value) return '';
    if (value.startsWith('/')) return '';
    if (!/^https:\/\//i.test(value)) {
      return '仅支持站内 / 路径或 https:// 地址（http 与协议相对地址会被后端拒绝）';
    }
    return '';
  }

  function navItemList(): NavItemDraft[] {
    const v = form.items;
    return Array.isArray(v) ? (v as NavItemDraft[]) : [];
  }
  function setNavItems(list: NavItemDraft[]) {
    form.items = list;
    syncForm();
  }
  function addNavItem() {
    setNavItems([...navItemList(), { name: '', target: 'orders', icon: '' }]);
  }
  function updateNavItem(
    index: number,
    key: 'name' | 'target' | 'icon',
    value: string
  ) {
    const list = navItemList();
    list[index] = { ...list[index], [key]: value };
    setNavItems(list);
  }
  // 调整宫格顺序（§16.3-04）：数组顺序即客户端渲染顺序。
  function moveNavItem(index: number, delta: number) {
    const target = index + delta;
    const list = navItemList();
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setNavItems(list);
  }
  function removeNavItem(index: number) {
    const list = navItemList();
    list.splice(index, 1);
    setNavItems(list);
  }

  // ── 拖拽排序（HTML5 原生 drag，纵向模块编排） ──
  const dragOverIndex = ref(-1);
  let dragIndex = -1;

  function onDragStart(index: number, event: DragEvent) {
    dragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  function onDrop(target: number) {
    if (dragIndex < 0 || dragIndex === target) {
      dragOverIndex.value = -1;
      return;
    }
    const list = components.value;
    const [item] = list.splice(dragIndex, 1);
    list.splice(target, 0, item);
    selectedIndex.value = target;
    selectedChildIndex.value = -1;
    dragOverIndex.value = -1;
  }
  function onDragEnd() {
    dragIndex = -1;
    dragOverIndex.value = -1;
  }

  // ── 图片上传裁剪（复用附件上传 + canvas 裁剪） ──
  let cropperCallback: ((blob: Blob) => void) | null = null;
  function openCropper(callback: (blob: Blob) => void) {
    cropperCallback = callback;
    cropperVisible.value = true;
  }
  function onCropperConfirm(blob: Blob) {
    cropperVisible.value = false;
    cropperCallback?.(blob);
  }

  // 装修配置只接受「站内相对路径」或「https 绝对地址」：本地存储返回的
  // /uploads/... 与 CDN/S3 返回的 https 地址原样保存；http 绝对地址只有属于
  // 当前站点时才能安全退化成路径（否则客户端拿不到图片）。
  function pageImageStorageUrl(raw: string): string {
    const value = (raw || '').trim();
    if (!value) return '';
    if (value.startsWith('/')) {
      return value.startsWith('//') ? '' : value;
    }
    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'https:') return value;
      if (parsed.protocol === 'http:' && parsed.host === window.location.host) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return '';
    }
    return '';
  }

  // 附件库选择：只接受公开附件，并保存与附件表一致的存储相对路径（public/...）。
  async function resolveAttachmentPageImage(item: AttachmentResponse) {
    const label = item.original_name || item.name || `#${item.id}`;
    try {
      const accessRes = await getAttachmentAccessUrl(item.id);
      const access = accessRes.data?.data;
      if (!access?.public) {
        Message.error(`「${label}」不在公开目录，不能用于装修`);
        return null;
      }
      const accessUrl = pageImageStorageUrl(access.url);
      if (!accessUrl) {
        Message.error(`「${label}」的公开地址不可用`);
        return null;
      }
      // 本地公开附件优先保存附件表 path；CDN/S3 的 https 地址无法映射到 /uploads，保留原地址。
      const localPath = accessUrl.startsWith('/uploads/')
        ? pageImageStoragePath(item.path) || pageImageStoragePath(accessUrl)
        : '';
      return localPath || accessUrl;
    } catch {
      Message.error(`获取「${label}」的图片地址失败`);
      return null;
    }
  }

  function normalizeAssetMime(mime: string): string {
    const value = (mime || '').trim().toLowerCase();
    return value === 'image/jpg' ? 'image/jpeg' : value;
  }

  function fileNameFromUrl(url: string): string {
    try {
      const path = new URL(url, window.location.origin).pathname;
      return decodeURIComponent(path.split('/').pop() || '') || '装修图片';
    } catch {
      return '装修图片';
    }
  }

  function imageDimensions(
    url: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      if (!url) {
        resolve({ width: 0, height: 0 });
        return;
      }
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = pageImagePublicUrl(url);
    });
  }

  function blobDimensions(
    blob: Blob
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  // 素材 URL 统一按附件表存储路径（public/...）展示与去重；/uploads/... 视为同一地址。
  function pageAssetURLKey(raw: string): string {
    return pageImageStoragePath(raw) || (raw || '').trim();
  }

  function normalizePageAsset(asset: PageAsset): PageAsset {
    const path = pageImageStoragePath(asset.url);
    return path ? { ...asset, url: path } : asset;
  }

  function normalizePageAssets(list: PageAsset[]): PageAsset[] {
    return list.map(normalizePageAsset);
  }

  // 组件内上传 / 选择的图片同步登记到素材库（§16.2-06）：这些入口不经过
  // 「新增素材」表单，若不在这里登记，素材库就看不到运营实际在用的图片。
  // 同一地址只登记一次；登记失败不阻塞图片使用，只给出提示。
  async function registerPageAsset(
    input: {
      name: string;
      url: string;
      mime: string;
      sizeBytes: number;
      width: number;
      height: number;
    },
    options: { quiet?: boolean } = {}
  ): Promise<PageAsset | null> {
    const url = input.url.trim();
    const mime = normalizeAssetMime(input.mime);
    if (!url || !ASSET_MIME_WHITELIST.includes(mime)) return null;
    if (input.sizeBytes < 1 || input.sizeBytes > ASSET_MAX_BYTES) return null;
    const key = pageAssetURLKey(url);
    const existing = assets.value.find(
      (asset) => pageAssetURLKey(asset.url) === key
    );
    if (existing) return existing;
    if (registeringAssetUrls.has(url)) return null;
    registeringAssetUrls.add(url);
    try {
      const name =
        (input.name || '').trim().slice(0, 160) ||
        fileNameFromUrl(url).slice(0, 160);
      const created = normalizePageAsset(
        (
          await createEsportsPageAsset({
            name,
            url,
            mime,
            size_bytes: Math.round(input.sizeBytes),
            width: Math.round(input.width) || 0,
            height: Math.round(input.height) || 0,
          })
        ).data.data
      );
      // 后端按地址幂等，可能返回素材库里已有的记录，避免重复插入同一行。
      if (!assets.value.some((asset) => asset.id === created.id)) {
        assets.value = [created, ...assets.value];
      }
      return created;
    } catch (err) {
      // 图片地址已可用于装修，素材登记失败只提示，不回滚已选图片。
      if (!options.quiet) {
        Message.warning(errorText(err, '图片已使用，但登记到素材库失败'));
      }
      return null;
    } finally {
      registeringAssetUrls.delete(url);
    }
  }

  async function registerAttachmentAsset(
    item: AttachmentResponse,
    url: string
  ) {
    const dims = await imageDimensions(url);
    await registerPageAsset({
      name: item.original_name || item.name || fileNameFromUrl(url),
      url,
      mime: item.mime_type,
      sizeBytes: item.size,
      width: dims.width,
      height: dims.height,
    });
  }

  // 历史草稿补登记：上传早于素材登记逻辑的本地图片不会出现在素材库，
  // 加载后按当前配置扫描 /uploads 图片，读取真实类型 / 体积 / 尺寸后补录。
  function componentImageUrls(comp: PageComponent): string[] {
    const props = comp.props || {};
    const urls: string[] = [];
    const push = (value: unknown) => {
      if (typeof value === 'string' && value.trim()) urls.push(value.trim());
    };
    push(props.image);
    if (Array.isArray(props.images)) props.images.forEach(push);
    if (comp.type === 'carousel' && Array.isArray(props.items)) {
      props.items.forEach((item) => {
        const record = (item || {}) as Record<string, unknown>;
        push(record.image);
      });
    }
    return urls;
  }

  function collectPageImageUrls(comps: PageComponent[]): string[] {
    return comps.flatMap((comp) => {
      if (!comp || comp.visible === false) return [];
      if (comp.type === 'layout') {
        return collectPageImageUrls(
          (comp.children || []).filter((child): child is PageComponent =>
            Boolean(child)
          )
        );
      }
      return componentImageUrls(comp);
    });
  }

  async function syncComponentImagesToAssets() {
    const urls = Array.from(new Set(collectPageImageUrls(components.value)));
    await Promise.all(
      urls.map(async (url) => {
        // 仅补登记本地公开图片；外部 https 读不到体积 / 类型，由上传入口登记。
        const storagePath = pageImageStoragePath(url);
        if (!storagePath) return;
        if (
          assets.value.some(
            (asset) => pageAssetURLKey(asset.url) === storagePath
          )
        ) {
          return;
        }
        try {
          // 旧 /uploads/... 与新的 public/... 都按附件表路径保存，读取时再转公开 URL。
          const publicUrl = `/uploads/${storagePath.slice('public/'.length)}`;
          const response = await fetch(publicUrl);
          if (!response.ok) return;
          const blob = await response.blob();
          const mime = normalizeAssetMime(blob.type);
          if (!ASSET_MIME_WHITELIST.includes(mime)) return;
          const dims = await blobDimensions(blob);
          await registerPageAsset(
            {
              name: fileNameFromUrl(storagePath),
              url: storagePath,
              mime,
              sizeBytes: blob.size,
              width: dims.width,
              height: dims.height,
            },
            { quiet: true }
          );
        } catch {
          // 补登记失败不打扰编辑；下次进入页面会再试。
        }
      })
    );
  }

  async function chooseAttachmentForField(
    key: string,
    selection: AttachmentResponse | AttachmentResponse[]
  ) {
    const item = Array.isArray(selection) ? selection[0] : selection;
    if (!item) return;
    const url = await resolveAttachmentPageImage(item);
    if (url) {
      setField(key, url);
      await registerAttachmentAsset(item, url);
    }
  }

  async function chooseAttachmentsForImages(
    selection: AttachmentResponse | AttachmentResponse[]
  ) {
    const items = Array.isArray(selection) ? selection : [selection];
    const resolved = await Promise.all(
      items.map(async (item) => ({
        item,
        url: await resolveAttachmentPageImage(item),
      }))
    );
    const picked = resolved.filter(
      (entry): entry is { item: AttachmentResponse; url: string } =>
        Boolean(entry.url)
    );
    if (!picked.length) return;
    setImages([...imageList(), ...picked.map((entry) => entry.url)]);
    await Promise.all(
      picked.map((entry) => registerAttachmentAsset(entry.item, entry.url))
    );
  }

  async function uploadImageBlob(blob: Blob): Promise<string | null> {
    // 裁剪弹窗确认后立即关闭，上传在后台进行；没有提示时大图上传会像「卡住」。
    const uploading = Message.loading({
      content: '图片上传中…',
      duration: 0,
    });
    try {
      const mime = blob.type || 'image/png';
      if (!ASSET_MIME_WHITELIST.includes(mime) || blob.size > ASSET_MAX_BYTES) {
        Message.error('仅支持不超过 10MB 的 JPEG / PNG / WebP / GIF 图片');
        return null;
      }
      // 附件按内容和文件名去重；每次使用新文件名，避免命中旧的私有目录附件。
      const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
      const uploadName = `page-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;
      const file = new File([blob], uploadName, { type: mime });
      const res = await uploadAttachment(
        file,
        undefined,
        'public/esports-page'
      );
      // 简单上传后端直接返回附件对象（data.id），分片上传才包在 data.attachment 里。
      const data = res.data?.data as
        | { attachment?: { id: number }; id?: number }
        | undefined;
      const attachmentId = data?.attachment?.id ?? data?.id;
      if (typeof attachmentId !== 'number') {
        Message.error('上传失败，未返回附件');
        return null;
      }
      // 取原始访问地址：attachment-access.service 会按当前页面 origin 归一化成
      // 绝对地址；本地公开图片最终保存附件表同款 public/... 存储路径。
      const accessRes = await getAttachmentAccessUrl(attachmentId);
      const access = accessRes.data?.data;
      if (!access?.public) {
        Message.error('装修图片未存入公开目录，请重试');
        return null;
      }
      const accessUrl = pageImageStorageUrl(access.url);
      if (!accessUrl) {
        Message.error('公开图片地址不可用，请检查附件公开域名配置');
        return null;
      }
      // 本地公开图片保存附件表同款 public/...；CDN/S3 https 保留原地址。
      const storedPath = accessUrl.startsWith('/uploads/')
        ? pageImageStoragePath(accessUrl)
        : '';
      return storedPath || accessUrl;
    } catch (err) {
      Message.error(errorText(err, '图片上传失败'));
      return null;
    } finally {
      uploading.close();
    }
  }

  // 组件内裁剪上传：先复用附件上传，再把结果登记到素材库，保证素材库与实际在用图片一致。
  async function uploadComponentImage(blob: Blob): Promise<string | null> {
    const url = await uploadImageBlob(blob);
    if (!url) return null;
    const mime = normalizeAssetMime(blob.type || 'image/png');
    const dims = await blobDimensions(blob);
    const extension =
      mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] || 'png';
    await registerPageAsset({
      name: `装修图片-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}.${extension}`,
      url,
      mime,
      sizeBytes: blob.size,
      width: dims.width,
      height: dims.height,
    });
    return url;
  }

  function openCropperForCarouselItem(index: number) {
    openCropper(async (blob) => {
      const url = await uploadComponentImage(blob);
      if (url) updateCarouselItem(index, { image: url });
    });
  }

  async function chooseAttachmentForCarouselItem(
    index: number,
    selection: AttachmentResponse | AttachmentResponse[]
  ) {
    const item = Array.isArray(selection) ? selection[0] : selection;
    if (!item) return;
    const url = await resolveAttachmentPageImage(item);
    if (url) {
      updateCarouselItem(index, { image: url });
      await registerAttachmentAsset(item, url);
    }
  }

  function openCropperForImages(index: number) {
    openCropper(async (blob) => {
      const url = await uploadComponentImage(blob);
      if (!url) return;
      const list = imageList();
      if (index >= 0 && index < list.length) {
        list[index] = url;
        setImages(list);
      } else {
        setImages([...list, url]);
      }
    });
  }

  // 单图字段（图片组件）裁剪后直接回填该图片地址。
  function openCropperForField(key: string) {
    openCropper(async (blob) => {
      const url = await uploadComponentImage(blob);
      if (url) setField(key, url);
    });
  }

  function openCropperForAsset() {
    openCropper(async (blob) => {
      const name = `素材-${Date.now()}.png`;
      const url = await uploadImageBlob(blob);
      if (!url) return;
      const dims = await blobDimensions(blob);
      assetForm.name = name;
      assetForm.url = url;
      assetForm.width = dims.width || 1;
      assetForm.height = dims.height || 1;
      // 裁剪结果是 canvas 导出的图片，同样要带上 mime 与 size_bytes。
      const blobMime = (blob.type || '').toLowerCase();
      assetForm.mime = ASSET_MIME_WHITELIST.includes(blobMime)
        ? blobMime
        : 'image/png';
      assetForm.sizeBytes = blob.size;
    });
  }

  function pickAssetFile() {
    assetFileInput.value?.click();
  }

  // 选择本地图片后自动读取 file.type / file.size（并上传取地址与尺寸），
  // 避免新增素材漏传 mime / size_bytes 被后端 400 拒绝。
  async function onAssetFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // 清空 value，允许再次选择同一个文件。
    input.value = '';
    if (!file) return;
    const mime = (file.type || '').toLowerCase();
    if (!ASSET_MIME_WHITELIST.includes(mime)) {
      Message.warning('仅支持 JPEG / PNG / WebP / GIF 图片');
      return;
    }
    if (file.size < 1 || file.size > ASSET_MAX_BYTES) {
      Message.warning('图片体积须大于 0 且不超过 10MB');
      return;
    }
    const url = await uploadImageBlob(file);
    if (!url) return;
    const dims = await blobDimensions(file);
    assetForm.name = file.name || assetForm.name;
    assetForm.url = url;
    assetForm.width = dims.width || 1;
    assetForm.height = dims.height || 1;
    assetForm.mime = mime;
    assetForm.sizeBytes = file.size;
    Message.success(
      `已读取类型 ${mime}、大小 ${formatBytes(file.size)}，确认后点「新增素材」`
    );
  }

  // ── 加载与组件操作 ──
  // 加载装修文档列表（§16.2-02）：作为「首页版本 / 渠道」下拉的数据源；选中渠道不在列表中时
  // 追加当前渠道，避免下拉为空导致无法编辑。
  const loadPageDocs = async () => {
    try {
      const items = (await getEsportsPages()).data.data || [];
      const known = items.some((item) => item.channel === channel.value);
      pageDocs.value = known
        ? items
        : [
            ...items,
            {
              channel: channel.value,
              status: 'draft' as const,
              draft_version: 0,
              published_version_no: 0,
              updated_by: 0,
            },
          ];
    } catch (err) {
      pageDocs.value = [];
      Message.error(errorText(err, '加载首页版本列表失败'));
    }
  };

  // 发布人昵称（§16.2-07）：取后台管理员列表建立 ID → 展示名映射，取不到时回落 #ID。
  const loadAdminNames = async () => {
    try {
      const result = await getAdmins({ page: 1, page_size: 200 });
      const names: Record<number, string> = {};
      (result.data.data?.data || []).forEach((admin) => {
        names[admin.id] = admin.username || `#${admin.id}`;
      });
      adminNames.value = names;
    } catch {
      adminNames.value = {};
    }
  };

  const load = async () => {
    loading.value = true;
    try {
      const [page, versionList, assetList] = await Promise.all([
        getEsportsPage(channel.value),
        getEsportsPageVersions(channel.value),
        getEsportsPageAssets(),
      ]);
      doc.value = page.data.data.document;
      components.value = expandLegacySupportEntry(page.data.data.components);
      versions.value = versionList.data.data;
      assets.value = normalizePageAssets(assetList.data.data);
      selectedIndex.value = -1;
      selectedChildIndex.value = -1;
      diffLeftNo.value = undefined;
      diffRightNo.value = undefined;
      await loadPageDocs();
      // 旧草稿里已上传但未登记的本地图片：加载后补录，避免素材库与实际配置脱节。
      syncComponentImagesToAssets();
    } catch (err) {
      Message.error(errorText(err, '加载装修配置失败'));
    } finally {
      loading.value = false;
    }
  };

  // 切换渠道 / 首页版本：编辑与发布目标随 channel 改变，重新拉取该渠道的文档、版本与素材；
  // 底部导航与预览码都绑定渠道，一并失效。
  const onChannelChange = () => {
    selectedIndex.value = -1;
    selectedChildIndex.value = -1;
    pageError.value = '';
    tabbarItems.value = [];
    tabbarDraftVersion.value = 0;
    tabbarLoaded.value = false;
    previewCode.value = null;
    load();
  };

  // ── 发布记录版本差异（§16.2-07）：按组件位置比对，列出新增 / 删除 / 变更与变更字段 ──
  const componentsOf = (versionNo?: number): PageComponent[] => {
    if (!versionNo) return [];
    const version = versions.value.find(
      (item) => item.version_no === versionNo
    );
    return version?.config?.components || [];
  };
  const diffRows = computed(() => {
    if (!diffLeftNo.value || !diffRightNo.value) return [];
    const left = componentsOf(diffLeftNo.value);
    const right = componentsOf(diffRightNo.value);
    const rows: {
      key: string;
      position: number;
      kind: 'added' | 'removed' | 'changed';
      component: string;
      detail: string;
    }[] = [];
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
      const a = left[i];
      const b = right[i];
      const position = i + 1;
      if (!a && b) {
        rows.push({
          key: `a-${i}`,
          position,
          kind: 'added',
          component: componentLabelOf(b),
          detail: `版本 B 新增组件（可见：${b.visible ? '是' : '否'}）`,
        });
      } else if (a && !b) {
        rows.push({
          key: `r-${i}`,
          position,
          kind: 'removed',
          component: componentLabelOf(a),
          detail: '版本 B 已删除该组件',
        });
      } else if (a && b) {
        if (a.type !== b.type) {
          rows.push({
            key: `t-${i}`,
            position,
            kind: 'changed',
            component: componentLabelOf(b),
            detail: `组件类型由 ${componentLabelOf(a)} 改为 ${componentLabelOf(
              b
            )}`,
          });
        } else {
          const changedKeys: string[] = [];
          if (a.visible !== b.visible) {
            changedKeys.push(
              `显隐 ${a.visible ? '显示' : '隐藏'} → ${
                b.visible ? '显示' : '隐藏'
              }`
            );
          }
          if (
            JSON.stringify(a.children || []) !==
            JSON.stringify(b.children || [])
          ) {
            changedKeys.push('布局内组件变更');
          }
          const propsA = a.props || {};
          const propsB = b.props || {};
          const keys = new Set([
            ...Object.keys(propsA),
            ...Object.keys(propsB),
          ]);
          keys.forEach((key) => {
            if (JSON.stringify(propsA[key]) !== JSON.stringify(propsB[key])) {
              changedKeys.push(
                `${key}: ${JSON.stringify(
                  propsA[key] ?? null
                )} → ${JSON.stringify(propsB[key] ?? null)}`
              );
            }
          });
          if (changedKeys.length) {
            rows.push({
              key: `c-${i}`,
              position,
              kind: 'changed',
              component: componentLabelOf(b),
              detail: changedKeys.join('；'),
            });
          }
        }
      }
    }
    return rows;
  });
  const diffSummary = computed(() => {
    if (!diffLeftNo.value || !diffRightNo.value) return '';
    const added = diffRows.value.filter((row) => row.kind === 'added').length;
    const removed = diffRows.value.filter(
      (row) => row.kind === 'removed'
    ).length;
    const changed = diffRows.value.filter(
      (row) => row.kind === 'changed'
    ).length;
    return diffRows.value.length
      ? `v${diffLeftNo.value} → v${diffRightNo.value}：新增 ${added}、删除 ${removed}、变更 ${changed} 个组件`
      : `v${diffLeftNo.value} 与 v${diffRightNo.value} 的组件配置一致`;
  });
  const diffKindLabel = (kind: string) => {
    switch (kind) {
      case 'added':
        return '新增';
      case 'removed':
        return '删除';
      default:
        return '变更';
    }
  };
  const diffColor = (kind: string) => {
    switch (kind) {
      case 'added':
        return 'green';
      case 'removed':
        return 'red';
      default:
        return 'orange';
    }
  };
  const swapDiffVersions = () => {
    const left = diffLeftNo.value;
    diffLeftNo.value = diffRightNo.value;
    diffRightNo.value = left;
  };

  const selectComponent = (index: number) => {
    selectedIndex.value = index;
    selectedChildIndex.value = -1;
    loadForm();
  };
  const selectChild = (index: number, childIndex: number) => {
    selectedIndex.value = index;
    selectedChildIndex.value = childIndex;
    loadForm();
  };
  const selectByPath = (path: string) => {
    const [top, child] = path.split('.').map((part) => Number(part));
    if (!Number.isInteger(top) || top < 0 || top >= components.value.length) {
      return;
    }
    if (Number.isInteger(child)) {
      selectChild(top, child);
    } else {
      selectComponent(top);
    }
  };
  const isChildSelected = (index: number, childIndex: number) =>
    selectedIndex.value === index && selectedChildIndex.value === childIndex;
  const addLayout = (columns: number) => {
    components.value.push({
      type: 'layout',
      visible: true,
      props: { columns },
      children: Array.from({ length: columns }, () => null),
    });
    selectComponent(components.value.length - 1);
  };
  const addChild = (
    layoutIndex: number,
    columnIndex: number,
    type: PageComponentType
  ) => {
    const layout = components.value[layoutIndex];
    if (!layout || layout.type !== 'layout') return;
    const columns = layoutColumns(layout);
    if (columnIndex < 0 || columnIndex >= columns) return;
    const children = [...(layout.children || [])];
    while (children.length < columns) children.push(null);
    children[columnIndex] = { type, visible: true };
    components.value[layoutIndex] = { ...layout, children };
    selectChild(layoutIndex, columnIndex);
  };
  const addChildFromSelect = (
    layoutIndex: number,
    columnIndex: number,
    value: unknown
  ) => {
    if (typeof value === 'string') {
      addChild(layoutIndex, columnIndex, value as PageComponentType);
    }
  };
  const removeChild = (layoutIndex: number, columnIndex: number) => {
    const layout = components.value[layoutIndex];
    if (!layout || layout.type !== 'layout') return;
    const children = [...(layout.children || [])];
    children[columnIndex] = null;
    components.value[layoutIndex] = { ...layout, children };
    if (isChildSelected(layoutIndex, columnIndex)) {
      selectedChildIndex.value = -1;
      loadForm();
    }
  };
  const addComponent = (type: PageComponentType) => {
    components.value.push({ type, visible: true });
    selectComponent(components.value.length - 1);
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    const list = components.value;
    [list[index], list[target]] = [list[target], list[index]];
    selectedIndex.value = target;
    selectedChildIndex.value = -1;
  };
  const duplicate = (index: number) => {
    const copy = JSON.parse(
      JSON.stringify(components.value[index])
    ) as PageComponent;
    components.value.splice(index + 1, 0, copy);
    selectComponent(index + 1);
  };
  const remove = (index: number) => {
    components.value.splice(index, 1);
    selectedIndex.value = -1;
    selectedChildIndex.value = -1;
  };

  const saveDraft = async () => {
    saving.value = true;
    try {
      const res = await saveEsportsPageDraft(
        channel.value,
        components.value,
        doc.value.draft_version
      );
      doc.value = { ...doc.value, ...res.data.data };
      pageError.value = '';
      Message.success('草稿已保存');
    } catch (err) {
      reportPageError(err, '保存草稿失败，请刷新后重试');
    } finally {
      saving.value = false;
    }
  };

  const publishNow = async () => {
    publishing.value = true;
    try {
      await publishEsportsPage(channel.value, { mode: 'immediate' });
      pageError.value = '';
      Message.success('已提交发布申请，待审核');
      await load();
    } catch (err) {
      reportPageError(err, '发布失败');
    } finally {
      publishing.value = false;
    }
  };

  const publishScheduled = async () => {
    if (!scheduledAt.value) {
      Message.warning('请选择定时发布时间');
      return;
    }
    publishing.value = true;
    try {
      await publishEsportsPage(channel.value, {
        mode: 'scheduled',
        scheduled_at: new Date(scheduledAt.value).toISOString(),
      });
      pageError.value = '';
      Message.success('已提交定时发布申请，待审核');
      await load();
    } catch (err) {
      reportPageError(err, '定时发布失败');
    } finally {
      publishing.value = false;
    }
  };

  const rollback = async () => {
    if (!rollbackVersion.value) {
      Message.warning('请选择回滚目标版本');
      return;
    }
    publishing.value = true;
    try {
      await rollbackEsportsPage(channel.value, rollbackVersion.value);
      pageError.value = '';
      Message.success('已回滚');
      rollbackVersion.value = undefined;
      await load();
    } catch (err) {
      reportPageError(err, '回滚失败');
    } finally {
      publishing.value = false;
    }
  };

  const approvePublish = async (versionId: number) => {
    publishing.value = true;
    try {
      await reviewEsportsPagePublish(channel.value, versionId, true);
      Message.success('已通过发布');
      await load();
    } catch (err) {
      Message.error(errorText(err, '审核失败'));
    } finally {
      publishing.value = false;
    }
  };
  const rejectPublish = async (versionId: number) => {
    publishing.value = true;
    try {
      await reviewEsportsPagePublish(
        channel.value,
        versionId,
        false,
        '不符合发布规范'
      );
      Message.success('已驳回发布申请');
      await load();
    } catch (err) {
      Message.error(errorText(err, '驳回失败'));
    } finally {
      publishing.value = false;
    }
  };

  const createAsset = async () => {
    const name = assetForm.name.trim();
    const url = assetForm.url.trim();
    if (!name) {
      Message.warning('请填写素材名称');
      return;
    }
    if (!url) {
      Message.warning('请填写素材地址');
      return;
    }
    const localPath = pageImageStoragePath(url);
    if (!/^https:\/\//i.test(url) && !url.startsWith('/') && !localPath) {
      Message.warning(
        '素材地址仅支持 https 链接或附件表相对路径（public/...）'
      );
      return;
    }
    // 后端已收紧为「mime + size_bytes 必填」，先选文件读取真实类型与体积再提交。
    const mime = assetForm.mime.trim().toLowerCase();
    if (!mime || !ASSET_MIME_WHITELIST.includes(mime)) {
      Message.warning(
        '请先选择本地图片文件以读取类型（仅支持 JPEG / PNG / WebP / GIF）'
      );
      return;
    }
    if (assetForm.sizeBytes < 1 || assetForm.sizeBytes > ASSET_MAX_BYTES) {
      Message.warning(
        '请先选择本地图片文件以读取大小（须大于 0 且不超过 10MB）'
      );
      return;
    }
    const { width, height } = assetForm;
    if (width < 1 || width > 4096 || height < 1 || height > 4096) {
      Message.warning('素材尺寸须在 1~4096 之间');
      return;
    }
    try {
      await createEsportsPageAsset({
        name,
        url: localPath || url,
        mime,
        size_bytes: assetForm.sizeBytes,
        width,
        height,
      });
      assetForm.name = '';
      assetForm.url = '';
      assetForm.width = 0;
      assetForm.height = 0;
      assetForm.mime = '';
      assetForm.sizeBytes = 0;
      assets.value = normalizePageAssets(
        (await getEsportsPageAssets()).data.data
      );
      Message.success('素材已登记');
    } catch (err) {
      Message.error(errorText(err, '新增素材失败'));
    }
  };
  const removeAsset = async (id: number) => {
    try {
      await deleteEsportsPageAsset(id);
      assets.value = normalizePageAssets(
        (await getEsportsPageAssets()).data.data
      );
      Message.success('素材已删除');
    } catch (err) {
      Message.error(errorText(err, '删除素材失败'));
    }
  };

  // ── 底部导航（§16.3-12）：读取草稿里的导航项，按文案 / 图标 / 显隐编辑后回写草稿 ──
  const loadTabbar = async (force = false) => {
    if (tabbarLoading.value) return;
    if (tabbarLoaded.value && !force) return;
    tabbarLoading.value = true;
    try {
      const { data } = (await getPageTabbar(channel.value)).data;
      tabbarDraftVersion.value = data?.draft_version || 0;
      tabbarItems.value = (data?.items || []).map((item) => ({
        path: item.path,
        text: item.text,
        icon: item.icon || '',
        // 后端 visible=false 才隐藏，未声明视为显示。
        visible: item.visible !== false,
      }));
      tabbarLoaded.value = true;
    } catch (err) {
      Message.error(errorText(err, '加载底部导航失败'));
    } finally {
      tabbarLoading.value = false;
    }
  };

  function updateTabbarItem(
    index: number,
    key: 'text' | 'icon' | 'visible',
    value: string | boolean
  ) {
    const current = tabbarItems.value[index];
    if (!current) return;
    if (key === 'text') {
      tabbarItems.value[index] = { ...current, text: String(value) };
    } else if (key === 'icon') {
      tabbarItems.value[index] = { ...current, icon: String(value) };
    } else {
      tabbarItems.value[index] = { ...current, visible: Boolean(value) };
    }
  }

  const saveTabbar = async () => {
    if (!tabbarItems.value.length) {
      Message.warning('没有可保存的导航项，请先刷新');
      return;
    }
    const badText = tabbarItems.value.findIndex((item) => {
      const text = (item.text || '').trim();
      return text.length < 1 || text.length > 12;
    });
    if (badText >= 0) {
      Message.warning(`第 ${badText + 1} 项文案须为 1~12 个字`);
      return;
    }
    const badIcon = tabbarItems.value.findIndex((item) => {
      const icon = (item.icon || '').trim();
      return icon !== '' && !/^https:\/\//i.test(icon) && !icon.startsWith('/');
    });
    if (badIcon >= 0) {
      Message.warning(
        `第 ${
          badIcon + 1
        } 项图标仅支持 https 链接或站内相对路径（不支持短标识）`
      );
      return;
    }
    tabbarSaving.value = true;
    try {
      const updated = (
        await savePageTabbar(
          channel.value,
          tabbarItems.value.map((item) => ({
            path: item.path,
            text: (item.text || '').trim(),
            icon: (item.icon || '').trim(),
            visible: item.visible !== false,
          })),
          tabbarDraftVersion.value
        )
      ).data.data;
      if (updated) {
        doc.value = { ...doc.value, ...updated };
        tabbarDraftVersion.value = updated.draft_version;
      }
      Message.success('底部导航已保存到草稿，提交发布并经审核后对客户端生效');
      await loadTabbar(true);
    } catch (err) {
      Message.error(
        errorText(
          err,
          '保存底部导航失败：草稿版本已变化或导航项不合法，请刷新后重试'
        )
      );
    } finally {
      tabbarSaving.value = false;
    }
  };

  // ── 设备预览码（§16.4-02）：生成指向当前草稿的 30 分钟预览码 ──
  const generatePreviewCode = async () => {
    previewCodeLoading.value = true;
    try {
      const { data } = (await createPagePreviewCode(channel.value)).data;
      previewCode.value = data || null;
      previewCodeVisible.value = true;
      if (!data) Message.warning('后端未返回预览码');
    } catch (err) {
      Message.error(
        errorText(
          err,
          '生成预览码失败：请先在系统配置中设置 app.esports.page_preview_secret，并确认该渠道已保存草稿'
        )
      );
    } finally {
      previewCodeLoading.value = false;
    }
  };

  // 切换页签时按需加载底部导航，避免首屏多余请求。
  const onTabChange = (key: string | number) => {
    if (key === 'tabbar') loadTabbar();
  };

  onMounted(async () => {
    if (livePreviewBody.value && typeof ResizeObserver !== 'undefined') {
      livePreviewObserver = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width;
        if (width) livePreviewBodyWidth.value = width;
      });
      livePreviewObserver.observe(livePreviewBody.value);
    }
    await Promise.all([load(), loadAdminNames()]);
  });

  onBeforeUnmount(() => {
    livePreviewObserver?.disconnect();
    livePreviewObserver = null;
  });
</script>

<style scoped>
  .toolbar {
    margin-bottom: 12px;
  }

  .hint {
    color: var(--color-text-3);
  }

  .designer {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .palette {
    flex: none;
    width: 180px;
  }

  .palette-item {
    margin-bottom: 8px;
  }

  .palette-group {
    margin: 10px 0 6px;
    color: var(--color-text-2);
    font-weight: 600;
    font-size: 12px;
    border-bottom: 1px solid var(--color-border-2);
  }

  .palette-usage {
    margin-top: 2px;
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
  }

  .palette-source {
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.4;
  }

  .canvas {
    flex: 1;
    min-width: 0;
  }

  .canvas-split {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .live-preview {
    position: sticky;
    top: 16px;
    flex: none;
    width: 320px;
    padding: 12px;
    background: var(--color-fill-1);
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
  }

  .live-preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .live-preview-title {
    color: var(--color-text-1);
    font-weight: 600;
    font-size: 13px;
  }

  .live-preview-sync {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    color: var(--color-text-3);
    font-size: 12px;
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: rgb(var(--success-6));
    border-radius: 50%;
  }

  .live-preview-device {
    width: 100%;
    margin-bottom: 8px;
  }

  .live-preview-body {
    display: flex;
    justify-content: center;
  }

  .live-preview-hint {
    margin-top: 8px;
    color: var(--color-text-3);
    font-size: 12px;
    line-height: 1.5;
  }

  .canvas-list {
    flex: 1;
    min-width: 0;
  }

  .canvas-item {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    padding: 8px 12px;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .canvas-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
    margin-left: auto;
  }

  .canvas-item.canvas-layout {
    flex-direction: column;
    align-items: stretch;
    cursor: default;
  }

  .canvas-layout-head {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .canvas-layout-grid {
    display: grid;
    gap: 8px;
  }

  .canvas-slot {
    min-height: 48px;
    padding: 6px;
    background: var(--color-fill-1);
    border: 1px dashed var(--color-border-2);
    border-radius: 4px;
  }

  .canvas-slot-item {
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
    min-height: 34px;
    padding: 4px 6px;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .canvas-slot-item.active {
    border-color: rgb(var(--primary-6));
  }

  .canvas-slot-label {
    overflow: hidden;
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .canvas-slot-add {
    width: 100%;
  }

  .canvas-item.active {
    border-color: rgb(var(--primary-6));
  }

  .canvas-item.drag-over {
    background: var(--color-primary-light-1);
    border-color: rgb(var(--primary-6));
  }

  .drag-handle {
    color: var(--color-text-3);
    cursor: grab;
    user-select: none;
  }

  .canvas-label {
    flex: 1;
    min-width: 84px;
    font-weight: 500;
  }

  /* 窄屏下预览与画布列表改为上下排列，避免四栏挤压导致按钮换行溢出。 */
  @media (max-width: 1399px) {
    .canvas-split {
      flex-direction: column;
    }

    .live-preview {
      position: static;
      width: 320px;
      max-width: 100%;
    }

    /* 窄屏上下排列时限制预览高度，避免整块画布被推到首屏之外。 */
    .live-preview-body {
      max-height: 360px;
      overflow-y: auto;
      scrollbar-gutter: stable;
    }

    .canvas-list {
      width: 100%;
    }
  }

  .inspector {
    flex: none;
    width: 300px;
  }

  .section-title {
    margin: 8px 0;
    color: var(--color-text-3);
    font-weight: 500;
  }

  .sub-card {
    margin-bottom: 12px;
  }

  .prop-field {
    margin-bottom: 10px;
  }

  .prop-label {
    display: block;
    margin-bottom: 4px;
    color: var(--color-text-2);
    font-size: 12px;
  }

  .prop-color {
    width: 100%;
    height: 32px;
    padding: 2px;
    background: none;
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    cursor: pointer;
  }

  .prop-images,
  .prop-nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .prop-image-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .prop-item-label {
    color: var(--color-text-2);
    font-weight: 600;
    font-size: 12px;
  }

  .prop-image-hint {
    color: var(--color-text-3);
    font-size: 12px;
  }

  .prop-warn {
    color: rgb(var(--warning-6));
    font-size: 12px;
  }

  .prop-image-error {
    margin-top: 6px;
  }

  .asset-file {
    display: none;
  }

  .asset-meta {
    display: block;
    margin-bottom: 12px;
    font-size: 12px;
  }

  .tabbar-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .tabbar-path {
    flex: none;
    width: 250px;
    color: var(--color-text-2);
    font-size: 12px;
  }

  .tabbar-text {
    width: 160px;
  }

  .tabbar-icon {
    flex: 1;
  }

  .preview-code {
    margin: 0;
    word-break: break-all;
  }

  .modal-tip {
    display: block;
    margin-top: 12px;
  }

  .prop-image-row,
  .prop-nav-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .prop-image-row .arco-input,
  .prop-nav-row .arco-input {
    flex: 1;
  }

  .prop-hint {
    margin-top: 8px;
    color: var(--color-text-3);
    font-size: 12px;
  }
</style>
