<template>
  <div class="hazard-report">
    <h2>{{ t('hazardReport.title') }}</h2>
    
    <form @submit.prevent="handleSubmit" class="report-form">
      <div class="form-row">
        <label class="form-label">{{ t('hazardReport.hazardType') }}</label>
        <select v-model="form.hazardType" class="form-select">
          <option value="">{{ t('common.pleaseSelect') }}</option>
          <option value="WATER">{{ t('hazardReport.fire') }}</option>
          <option value="ELECTRIC">{{ t('hazardReport.electrical') }}</option>
          <option value="DOOR_LOCK">{{ t('hazardReport.doorLock') }}</option>
          <option value="FACILITY">{{ t('hazardReport.facility') }}</option>
          <option value="OTHER">{{ t('hazardReport.other') }}</option>
        </select>
      </div>
      
      <div class="form-row">
        <label class="form-label">{{ t('hazardReport.description') }}</label>
        <textarea v-model="form.description" rows="4" class="form-textarea" :placeholder="t('common.pleaseInput') + t('hazardReport.description')"></textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="submit-btn" :disabled="submitting">{{ t('hazardReport.submit') }}</button>
        <button type="button" class="reset-btn" @click="handleReset">{{ t('common.cancel') }}</button>
      </div>
    </form>
    
    <div class="history-section">
      <h3>{{ t('records.title') }}</h3>
      <div class="history-table">
        <div class="table-header">
          <span>{{ t('hazardReport.hazardType') }}</span>
          <span>{{ t('hazardReport.description') }}</span>
          <span>{{ t('hazardHandle.status') }}</span>
        </div>
        <div v-for="(report, index) in hazardHistory" :key="index" class="table-row">
          <span>{{ getTypeText(report.hazardType) }}</span>
          <span>{{ report.description }}</span>
          <span class="status-tag" :class="report.status.toLowerCase()">{{ getStatusText(report.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()
const submitting = ref(false)

const form = reactive({
  hazardType: '',
  description: ''
})

const hazardHistory = ref([])

const fetchHistory = async () => {
  try {
    const res = await request.get('/hazards', { params: { pageNum: 1, pageSize: 50 } })
    if (res.code === 200 && res.data) {
      hazardHistory.value = res.data.records || []
    }
  } catch (error) {
    console.error('加载隐患历史失败', error)
  }
}

onMounted(() => {
  fetchHistory()
})

const getTypeText = (type) => {
  const texts = {
    WATER: t('hazardReport.fire'),
    ELECTRIC: t('hazardReport.electrical'),
    DOOR_LOCK: t('hazardReport.doorLock'),
    FACILITY: t('hazardReport.facility'),
    OTHER: t('hazardReport.other')
  }
  return texts[type] || type
}

const getStatusText = (status) => {
  const texts = {
    REPORTED: t('hazardReport.statusReported'),
    PROCESSING: t('hazardHandle.processing'),
    COMPLETED: t('hazardReport.statusCompleted'),
    REJECTED: t('hazardReport.statusRejected')
  }
  return texts[status] || status
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const data = { ...form, studentId: userStore.user.id, roomId: 1 }
    const res = await request.post('/hazards', data)
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      handleReset()
      await fetchHistory()
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    ElMessage.error(t('common.error'))
  } finally {
    submitting.value = false
  }
}

const handleReset = () => {
  form.hazardType = ''
  form.description = ''
}
</script>

<style scoped>
.hazard-report {
  max-width: 600px;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.hazard-report h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 24px;
  color: #000000;
}

.report-form {
  margin-bottom: 32px;
}

.form-row {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #888888;
  margin-bottom: 8px;
}

.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
}

.form-select:focus {
  outline: none;
  border-color: #000000;
}

.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
}

.form-textarea:focus {
  outline: none;
  border-color: #000000;
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.submit-btn {
  flex: 1;
  padding: 14px;
  background: #000000;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.submit-btn:hover {
  background: #333333;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.reset-btn {
  flex: 1;
  padding: 14px;
  background: none;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  border-color: #000000;
  color: #000000;
}

.history-section {
  border-top: 1px solid #e8e8e8;
  padding-top: 24px;
}

.history-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #000000;
}

.history-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 3fr 1fr;
  padding: 12px 16px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 3fr 1fr;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
}

.table-row:last-child {
  border-bottom: none;
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.status-tag.reported {
  background: #e3f2fd;
  color: #1565c0;
}

.status-tag.processing {
  background: #fff3e0;
  color: #ef6c00;
}

.status-tag.completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.rejected {
  background: #ffebee;
  color: #c62828;
}

@media (max-width: 768px) {
  .hazard-report {
    padding: 16px;
    max-width: 100%;
  }

  .hazard-report h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .report-form {
    margin-bottom: 20px;
  }

  .form-row {
    margin-bottom: 14px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .form-select,
  .form-textarea {
    padding: 10px 12px;
    font-size: 13px;
  }

  .form-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
  }

  .submit-btn,
  .reset-btn {
    padding: 12px;
    font-size: 13px;
  }

  .history-section {
    padding-top: 16px;
  }

  .history-section h3 {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .history-table {
    border: none;
    border-radius: 0;
    overflow: visible;
  }

  .table-header {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px 12px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 13px;
    background: #fafafa;
  }

  .table-row span {
    display: block;
    word-break: break-all;
  }

  .status-tag {
    font-size: 11px;
    padding: 3px 10px;
    width: fit-content;
  }
}
</style>