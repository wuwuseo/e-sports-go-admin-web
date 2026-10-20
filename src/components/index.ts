import { App } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GraphicComponent,
} from 'echarts/components';
import Chart from './chart/index.vue';
import Breadcrumb from './breadcrumb/index.vue';
import AttachmentSelector from './attachment-selector/index.vue';
import RichTextEditor from './rich-text-editor/index.vue';
import IconWallet from './icons/icon-wallet.vue';

// Manually introduce ECharts modules to reduce packing size

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  GraphicComponent,
]);

export default {
  install(Vue: App) {
    Vue.component('Chart', Chart);
    Vue.component('Breadcrumb', Breadcrumb);
    Vue.component('AttachmentSelector', AttachmentSelector);
    Vue.component('RichTextEditor', RichTextEditor);
    // 后端菜单使用 icon-wallet 标识，Arco 图标库未提供，需本地补齐
    Vue.component('IconWallet', IconWallet);
  },
};
