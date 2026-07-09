<template>
  <router-view />
</template>

<script setup>
</script>

<style>
/* === 全局响应式 === */

/* 移动端适配 */
@media (max-width: 768px) {
  /* Element Plus 组件适配 */
  .el-message {
    min-width: auto !important;
    max-width: 90% !important;
  }

  .el-dialog {
    width: 90% !important;
    margin: 20px auto !important;
  }

  .el-select {
    width: 100% !important;
  }

  .el-select-dropdown {
    max-width: 90% !important;
  }

  .el-table {
    font-size: 12px !important;
  }

  .el-button {
    font-size: 13px !important;
  }

  /* 全局防溢出 */
  body {
    overflow-x: hidden;
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }
}

/* PC端滚动条美化 */
@media (min-width: 769px) {
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-thumb {
    background: #d0d0d0;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }
}
</style>
