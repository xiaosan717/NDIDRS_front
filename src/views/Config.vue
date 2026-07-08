<template>
  <div class="config">
    <h2>{{ t('config.title') }}</h2>
    
    <div class="config-table">
      <div class="table-header">
        <span>配置项</span>
        <span>配置值</span>
        <span>说明</span>
      </div>
      <div v-for="config in configs" :key="config.id" class="table-row">
        <span>{{ config.configKey }}</span>
        <span>{{ config.configValue }}</span>
        <span>{{ config.configDesc }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const configs = [
  { id: 1, configKey: 'check_deadline', configValue: '23:00', configDesc: '查寝截止时间' },
  { id: 2, configKey: 'warning_threshold', configValue: '3', configDesc: '预警阈值' },
  { id: 3, configKey: 'late_threshold', configValue: '23:00', configDesc: '晚归判定时间' },
  { id: 4, configKey: 'auto_remind_time', configValue: '22:30', configDesc: '自动提醒时间' }
]
</script>

<style scoped>
.config {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.config h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #000000;
}

.config-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
}

.table-row:last-child {
  border-bottom: none;
}
</style>