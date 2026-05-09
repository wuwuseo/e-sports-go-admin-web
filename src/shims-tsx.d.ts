// shims-tsx.d.ts — 为 .vue 文件中 <script lang="tsx"> 提供 JSX 类型支持
declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: any;
  }
}
