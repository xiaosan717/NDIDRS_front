<template>
  <div class="leave-apply">
    <h2>{{ t('leaveApply.title') }}</h2>
    
    <form @submit.prevent="handleSubmit" class="apply-form">
      <div class="form-row">
        <label class="form-label">{{ t('leaveApply.leaveType') }}</label>
        <div class="radio-group">
          <label class="radio-item">
            <input type="radio" v-model="form.leaveType" value="EVENING_LATE" />
            <span>{{ t('checkReport.late') }}</span>
          </label>
          <label class="radio-item">
            <input type="radio" v-model="form.leaveType" value="OUTSIDE_STAY" />
            <span>校外住宿</span>
          </label>
        </div>
      </div>
      
      <div class="form-row">
        <label class="form-label">{{ t('leaveApply.startDate') }}</label>
        <input type="datetime-local" v-model="form.startTime" class="form-input" />
      </div>
      
      <div class="form-row">
        <label class="form-label">{{ t('leaveApply.endDate') }}</label>
        <input type="datetime-local" v-model="form.endTime" class="form-input" />
      </div>
      
      <div class="form-row">
        <label class="form-label">{{ t('leaveApply.reason') }}</label>
        <textarea v-model="form.reason" rows="3" class="form-textarea" :placeholder="t('common.pleaseInput') + t('leaveApply.reason')"></textarea>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="submit-btn" :disabled="submitting">{{ t('leaveApply.submit') }}</button>
        <button type="button" class="reset-btn" @click="handleReset">{{ t('common.cancel') }}</button>
      </div>
    </form>
    
    <div class="history-section">
      <h3>{{ t('records.title') }}</h3>
      <div class="history-table">
        <div class="table-header">
          <span>{{ t('leaveApply.leaveType') }}</span>
          <span>{{ t('leaveApply.startDate') }}</span>
          <span>{{ t('leaveApply.endDate') }}</span>
          <span>{{ t('leaveApprove.status') }}</span>
        </div>
        <div v-if="loadingHistory" class="empty-row">
          {{ t('common.loading') }}
        </div>
        <div v-else-if="leaveHistory.length === 0" class="empty-row">
          {{ t('dashboard.noData') }}
        </div>
        <div v-for="record in leaveHistory" :key="record.id" class="table-row">
          <span>{{ getLeaveTypeText(record.leaveType) }}</span>
          <span>{{ formatDateTime(record.startTime) }}</span>
          <span>{{ formatDateTime(record.endTime) }}</span>
          <span class="status-tag" :class="getStatusClass(record.status)">{{ getStatusText(record.status) }}</span>
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
const loadingHistory = ref(false)
const leaveHistory = ref([])

const form = reactive({
  leaveType: 'EVENING_LATE',
  startTime: '',
  endTime: '',
  reason: ''
})

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const pad = (n) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getLeaveTypeText = (type) => {
  if (type === 'EVENING_LATE') return t('checkReport.late')
  if (type === 'OUTSIDE_STAY') return '校外住宿'
  return type || '-'
}

const getStatusText = (status) => {
  const map = {
    PENDING: t('leaveApprove.pending'),
    COUNSELOR_APPROVED: t('leaveApprove.counselorApproved'),
    APPROVED: t('leaveApprove.approved'),
    REJECTED: t('leaveApprove.rejected')
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  if (status === 'COUNSELOR_APPROVED') return 'counselor-approved'
  return (status || '').toLowerCase()
}

const fetchLeaveHistory = async () => {
  loadingHistory.value = true
  try {
    const res = await request.get('/leaves', {
      params: { studentId: userStore.user.id, pageNum: 1, pageSize: 50 }
    })
    if (res.code === 200 && res.data) {
      leaveHistory.value = res.data.records || []
    } else {
      leaveHistory.value = []
    }
  } catch (error) {
    console.error('获取请假历史失败', error)
    ElMessage.error(t('common.error'))
    leaveHistory.value = []
  } finally {
    loadingHistory.value = false
  }
}

const handleSubmit = async () => {
  if (!form.startTime || !form.endTime) {
    ElMessage.warning(t('common.pleaseInput') + t('leaveApply.startDate'))
    return
  }
  submitting.value = true
  try {
    const data = { ...form, studentId: userStore.user.id }
    const res = await request.post('/leaves', data)
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      handleReset()
      fetchLeaveHistory()
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
  form.leaveType = 'EVENING_LATE'
  form.startTime = ''
  form.endTime = ''
  form.reason = ''
}

onMounted(() => {
  if (userStore.user?.id) {
    fetchLeaveHistory()
  }
})
</script>

<style scoped>
.leave-apply {
  max-width: 600px;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.leave-apply h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 24px;
  color: #000000;
}

.apply-form {
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

.radio-group {
  display: flex;
  gap: 24px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
}

.radio-item input[type="radio"] {
  width: 16px;
  height: 16px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
}

.form-input:focus {
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
  grid-template-columns: 1fr 2fr 2fr 1fr;
  padding: 12px 16px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 2fr 2fr 1fr;
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

.status-tag.pending {
  background: #fff3e0;
  color: #ef6c00;
}

.status-tag.approved {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.rejected {
  background: #ffebee;
  color: #c62828;
}

.status-tag.counselor-approved {
  background: #e3f2fd;
  color: #1565c0;
}

@media (max-width: 768px) {
  .leave-apply {
    padding: 16px;
    max-width: 100%;
  }

  .leave-apply h2 {
    font-size: 18px;
    margin-bottom: 16px;
  }

  .apply-form {
    margin-bottom: 20px;
  }

  .form-row {
    margin-bottom: 14px;
  }

  .form-label {
    font-size: 12px;
    margin-bottom: 6px;
  }

  .radio-group {
    flex-direction: column;
    gap: 10px;
  }

  .radio-item {
    font-size: 13px;
  }

  .form-input,
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
  }

  .status-tag {
    font-size: 11px;
    padding: 3px 10px;
  }
}
</style>