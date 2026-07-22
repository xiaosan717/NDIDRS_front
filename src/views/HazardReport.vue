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
      
      <div class="form-row">
        <label class="form-label">{{ t('hazardReport.photos') }}</label>
        <el-upload
          class="upload-area"
          drag
          :show-file-list="false"
          :before-upload="handleBeforeUpload"
          :http-request="handleUploadRequest"
          accept="image/*"
        >
          <div v-if="!uploadedImage" class="upload-placeholder">
            <el-icon class="upload-icon" :size="40"><Camera /></el-icon>
            <span class="upload-text">{{ t('checkReport.uploadHint') }}</span>
          </div>
          <div v-else class="uploaded-preview">
            <img :src="uploadedImage" class="uploaded-image" />
            <el-button class="remove-btn" type="danger" circle size="small" @click.stop="removeImage">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </el-upload>
      </div>
      
      <div class="form-actions">
        <button type="submit" class="submit-btn" :disabled="submitting">{{ t('hazardReport.submit') }}</button>
        <button type="button" class="reset-btn" @click="handleReset">{{ t('common.cancel') }}</button>
      </div>
    </form>
    
    <div class="history-section">
      <h3>{{ t('records.title') }}</h3>
      <div class="status-legend">
        <span class="legend-item"><span class="legend-dot reported"></span>{{ t('hazardHandle.pending') }}</span>
        <span class="legend-item"><span class="legend-dot processing"></span>{{ t('hazardHandle.processing') }}</span>
        <span class="legend-item"><span class="legend-dot rejected"></span>{{ t('hazardHandle.rejected') }}</span>
        <span class="legend-item"><span class="legend-dot completed"></span>{{ t('hazardHandle.resolved') }}</span>
      </div>
      <div class="history-table">
        <div class="table-header">
          <span>{{ t('hazardReport.hazardType') }}</span>
          <span>{{ t('hazardReport.description') }}</span>
          <span>照片</span>
          <span>{{ t('hazardHandle.status') }}</span>
          <span>{{ t('hazardHandle.reportTime') }}</span>
        </div>
        <div v-if="hazardHistory.length === 0" class="empty-row">
          {{ t('dashboard.noData') }}
        </div>
        <div v-for="(report, index) in hazardHistory" :key="index" class="table-row">
          <span>{{ getTypeText(report.hazardType) }}</span>
          <span class="description-cell">{{ report.description }}</span>
          <span>
            <el-image 
              v-if="report.image" 
              :src="report.image" 
              :preview-src-list="[report.image]"
              fit="cover"
              class="hazard-photo"
              preview-teleported
            />
            <span v-else>-</span>
          </span>
          <span class="status-tag" :class="report.status.toLowerCase()">{{ getStatusText(report.status) }}</span>
          <span class="time-cell">{{ formatTime(report.reportTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage, ElIcon } from 'element-plus'
import { Camera, Close } from '@element-plus/icons-vue'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()
const submitting = ref(false)
const fileInput = ref(null)
const uploadedImage = ref('')

const form = reactive({
  hazardType: '',
  description: ''
})

const hazardHistory = ref([])

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
    REPORTED: t('hazardHandle.pending'),
    MANAGER_APPROVED: t('hazardHandle.managerApproved'),
    PROCESSING: t('hazardHandle.processing'),
    COMPLETED: t('hazardHandle.resolved'),
    REJECTED: t('hazardHandle.rejected')
  }
  return texts[status] || status
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleBeforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过10MB')
    return false
  }
  return true
}

const handleUploadRequest = (options) => {
  const { file } = options
  const reader = new FileReader()
  reader.onload = (event) => {
    uploadedImage.value = event.target.result
  }
  reader.readAsDataURL(file)
}

const removeImage = () => {
  uploadedImage.value = ''
}

const loadHazardHistory = async () => {
  try {
    const res = await request.get('/hazards', {
      params: { studentId: userStore.user.id, pageNum: 1, pageSize: 50 }
    })
    if (res.code === 200 && res.data) {
      hazardHistory.value = res.data.records || res.data
    } else {
      hazardHistory.value = []
    }
  } catch (error) {
    console.error('加载隐患历史失败:', error)
    hazardHistory.value = []
  }
}

const handleSubmit = async () => {
  if (!form.hazardType) {
    ElMessage.warning(t('common.pleaseSelect') + t('hazardReport.hazardType'))
    return
  }
  if (!form.description) {
    ElMessage.warning(t('common.pleaseInput') + t('hazardReport.description'))
    return
  }
  
  submitting.value = true
  try {
    const data = { 
      ...form, 
      studentId: userStore.user.id, 
      roomId: 1 
    }
    if (uploadedImage.value) {
      data.image = uploadedImage.value
    }
    const res = await request.post('/hazards', data)
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      handleReset()
      loadHazardHistory()
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
  uploadedImage.value = ''
}

onMounted(() => {
  if (userStore.user?.id) {
    loadHazardHistory()
  }
})
</script>

<style scoped>
.hazard-report {
  max-width: 600px;
  margin: 0 auto;
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

.upload-area {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-icon {
  color: #999;
}

.upload-text {
  font-size: 14px;
  color: #999;
}

.uploaded-preview {
  position: relative;
  display: inline-block;
}

.uploaded-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  display: block;
  margin: 0 auto;
}

.remove-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  z-index: 10;
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

.status-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.reported {
  background: #d4a017;
}

.legend-dot.processing {
  background: #1976d2;
}

.legend-dot.rejected {
  background: #c62828;
}

.legend-dot.completed {
  background: #2e7d32;
}

.history-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 3fr 80px 1fr 1fr;
  padding: 12px 16px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 3fr 80px 1fr 1fr;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: #888;
  font-size: 14px;
}

.description-cell {
  word-break: break-all;
}

.time-cell {
  font-size: 13px;
  color: #888;
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
}

.status-tag.reported {
  background: #fff3e0;
  color: #ef6c00;
}

.status-tag.manager_approved {
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

.hazard-photo {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  cursor: pointer;
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

  .status-legend {
    gap: 12px;
  }
}
</style>
