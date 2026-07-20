<template>
  <div class="config">
    <h2>{{ t('config.title') }}</h2>
    
    <div class="config-table">
      <div class="table-header">
        <span>{{ t('config.configKey') }}</span>
        <span>{{ t('config.configValue') }}</span>
        <span>{{ t('config.configDesc') }}</span>
      </div>
      <div v-for="config in configs" :key="config.id" class="table-row">
        <span>{{ config.configKeyLabel }}</span>
        <span>{{ config.configValue }}</span>
        <span>{{ config.configDesc }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const configs = computed(() => [
  { id: 1, configKey: 'check_deadline', configKeyLabel: t('config.checkDeadlineKey'), configValue: '23:00', configDesc: t('config.checkDeadlineDesc') },
  { id: 2, configKey: 'warning_threshold', configKeyLabel: t('config.warningThresholdKey'), configValue: '3', configDesc: t('config.warningThresholdDesc') },
  { id: 3, configKey: 'late_threshold', configKeyLabel: t('config.lateThresholdKey'), configValue: '23:00', configDesc: t('config.lateThresholdDesc') },
  { id: 4, configKey: 'auto_remind_time', configKeyLabel: t('config.autoRemindKey'), configValue: '22:30', configDesc: t('config.autoRemindDesc') }
])
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