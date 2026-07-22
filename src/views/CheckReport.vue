<template>
  <div class="check-report">
    <div class="report-header">
      <h2>{{ t('checkReport.title') }}</h2>
      <div class="header-info">
        <span>{{ t('checkReport.checkTime') }}: {{ today }}</span>
      </div>
    </div>

    <div v-if="showWarning" class="deadline-warning">
      <el-icon class="warning-icon" :size="18"><AlarmClock /></el-icon>
      <span class="warning-text">{{ t('checkReport.deadlineWarning', { deadline: deadlineTime, remaining: remainingTime }) }}</span>
    </div>

    <div class="header-actions">
      <el-button @click="showHistory = true">{{ t('checkReport.viewHistory') }}</el-button>
      <el-button @click="showDelegate = true">{{ t('checkReport.delegate') }}</el-button>
    </div>

    <div v-if="isManager" class="unchecked-warning" :class="{'unchecked-warning-all-done': uncheckedRooms.length === 0}">
      <div class="warning-header">
        <el-icon class="warning-icon" :size="18">
          <Warning v-if="uncheckedRooms.length > 0" />
          <CircleCheck v-else />
        </el-icon>
        <span class="warning-title">{{ uncheckedRooms.length > 0 ? t('checkReport.uncheckedToday') : t('checkReport.allChecked') }}</span>
        <span class="warning-count" :class="{'all-done': uncheckedRooms.length === 0}">
          {{ uncheckedRooms.length > 0 ? uncheckedRooms.length + t('checkReport.roomUnit') : t('checkReport.allCompleted') }}
        </span>
      </div>
      <div v-if="uncheckedRooms.length > 0" class="unchecked-list">
        <div
          v-for="room in uncheckedRooms"
          :key="room.id"
          class="unchecked-item"
          @click="selectUncheckedRoom(room)"
        >
          <span>{{ room.roomNumber }}</span>
          <span class="floor-info">{{ room.floor }}{{ t('checkReport.floorUnit') }}</span>
          <span class="go-btn">{{ t('checkReport.goReport') }}</span>
          <el-icon><ArrowRight /></el-icon>
        </div>
      </div>
      <div v-else class="all-done-text">{{ t('checkReport.allCheckedDesc') }}</div>
    </div>

    <div class="room-selector" v-if="needSelectRoom && isManager">
      <div class="selector-row">
        <el-select v-model="selectedRoomId" :placeholder="t('checkReport.selectRoom')" class="select-field" @change="onRoomSelect" filterable>
          <el-option v-for="r in roomList" :key="r.id" :label="r.roomNumber" :value="r.id" />
        </el-select>
      </div>
    </div>

    <div v-if="currentRoom.roomNumber" class="current-room-info">
      <span>{{ t('checkReport.room') }}: {{ currentRoom.building }} - {{ currentRoom.roomNumber }}</span>
    </div>

    <div class="photo-upload" v-if="currentRoom.roomNumber">
      <label class="form-label">{{ t('checkReport.photos') }}</label>
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

    <div v-if="roomMembers.length > 0" class="report-table">
      <div class="table-header">
        <span>{{ t('users.realName') }}</span>
        <span>{{ t('users.className') }}</span>
        <span>{{ t('checkReport.status') }}</span>
        <span>{{ t('checkReport.notes') }}</span>
      </div>
      <div v-for="member in roomMembers" :key="member.id" class="table-row">
        <span>{{ member.realName }}</span>
        <span>{{ member.className || '-' }}</span>
        <span>
          <select v-model="member.status" @change="handleStatusChange(member)" class="status-select">
            <option value="IN_ROOM">{{ t('checkReport.allPresent') }}</option>
            <option value="LEAVE">{{ t('records.leave') }}</option>
            <option value="LATE">{{ t('checkReport.late') }}</option>
            <option value="ABSENT">{{ t('checkReport.absent') }}</option>
          </select>
        </span>
        <span>
          <input v-model="member.remark" type="text" :placeholder="t('checkReport.notes')" class="remark-input" />
        </span>
      </div>
    </div>

    <div v-if="roomMembers.length === 0 && !loading" class="empty-tip">
      {{ currentRoom.roomNumber ? t('checkReport.noStudents') : t('checkReport.selectRoom') }}
    </div>

    <div v-if="roomMembers.length > 0" class="submit-area">
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting">{{ t('common.submit') }}</button>
      <button class="reset-btn" @click="handleReset">{{ t('common.cancel') }}</button>
    </div>

    <div v-if="showHistory" class="dialog-overlay" @click.self="showHistory = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ t('checkReport.history') }}</h3>
          <el-icon class="close-btn" :size="20" @click="showHistory = false"><Close /></el-icon>
        </div>
        <div class="form-content">
          <div class="search-row">
            <input v-model="historyDate" type="date" class="search-field" />
            <button class="search-btn" @click="loadHistory">{{ t('common.search') }}</button>
          </div>
          <div v-if="historyRecords.length > 0" class="history-list">
            <div v-for="record in historyRecords" :key="record.id" class="history-item">
              <div class="history-header">
                <span>{{ record.studentName }}</span>
                <span :class="getStatusClass(record.status)">{{ getStatusText(record.status) }}</span>
              </div>
              <div class="history-body">
                <span>{{ t('checkReport.notes') }}: {{ record.remark || '-' }}</span>
                <span>{{ t('checkReport.submitTime') }}: {{ formatTime(record.submitTime) }}</span>
              </div>
              <div v-if="record.image" class="history-photo">
                <el-image 
                  :src="record.image" 
                  :preview-src-list="[record.image]"
                  fit="cover"
                  class="history-photo-img"
                  preview-teleported
                />
              </div>
            </div>
          </div>
          <div v-else class="empty-row">
            {{ t('common.noData') }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDelegate" class="dialog-overlay" @click.self="showDelegate = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ t('checkReport.delegate') }}</h3>
          <el-icon class="close-btn" :size="20" @click="showDelegate = false"><Close /></el-icon>
        </div>
        <div class="form-content">
          <div class="form-row">
            <label>{{ t('checkReport.delegateMember') }}</label>
            <el-select v-model="delegateMemberId" :placeholder="t('common.pleaseSelect')" class="form-field">
              <el-option v-for="member in delegateMembers" :key="member.id" :label="member.realName" :value="member.id" />
            </el-select>
          </div>
          <div class="form-row">
            <label>{{ t('checkReport.delegateDate') }}</label>
            <input v-model="delegateDate" type="date" class="form-field" />
          </div>
          <div class="delegate-info">
            <p>{{ t('checkReport.delegateTip') }}</p>
          </div>
          <div class="dialog-footer">
            <button class="dialog-btn cancel" @click="showDelegate = false">{{ t('common.cancel') }}</button>
            <button class="dialog-btn confirm" @click="handleDelegate">{{ t('common.submit') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage, ElIcon } from 'element-plus'
import { AlarmClock, Warning, CircleCheck, ArrowRight, Camera, Close } from '@element-plus/icons-vue'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()
const submitting = ref(false)
const loading = ref(false)
const fileInput = ref(null)

const today = new Date().toISOString().split('T')[0]
const historyDate = ref(today)
const uploadedImage = ref('')
const showHistory = ref(false)
const showDelegate = ref(false)
const delegateMemberId = ref(null)
const delegateDate = ref(today)
const historyRecords = ref([])
const showWarning = ref(false)
const deadlineTime = ref('23:00')
const remainingTime = ref('')

let warningTimer = null

const currentRoom = reactive({
  id: null,
  roomNumber: '',
  building: '',
  floor: 1
})

const roomMembers = ref([])
const roomList = ref([])
const selectedRoomId = ref(null)
const uncheckedRooms = ref([])
const delegateMembers = ref([])

const needSelectRoom = computed(() => {
  return userStore.user?.role === 'DORM_MANAGER'
})

const isManager = computed(() => {
  return userStore.user?.role === 'DORM_MANAGER'
})

const loadRooms = async (building) => {
  try {
    const res = await request.get('/dict/rooms', { params: { buildingName: building } })
    if (res.code === 200 && res.data) {
      roomList.value = res.data
    }
  } catch (e) {
    console.error('加载宿舍列表失败', e)
  }
}

const loadUncheckedRooms = async (building) => {
  try {
    const res = await request.get('/checkRecords/uncheckedRooms', { params: { building } })
    if (res.code === 200 && res.data) {
      uncheckedRooms.value = res.data
    } else {
      uncheckedRooms.value = []
    }
  } catch (e) {
    console.error('加载未填报宿舍列表失败:', e)
    uncheckedRooms.value = []
  }
}

const loadDeadlineConfig = async () => {
  try {
    const res = await request.get('/config')
    if (res.code === 200 && res.data) {
      const deadline = res.data.find(c => c.configKey === 'check_deadline' || c.config_key === 'check_deadline')
      if (deadline) {
        deadlineTime.value = deadline.configValue || deadline.config_value || '23:00'
      }
    }
    checkDeadlineWarning()
  } catch (e) {
    console.error('加载配置失败', e)
  }
}

const checkDeadlineWarning = () => {
  const now = new Date()
  const [deadlineHour, deadlineMinute] = deadlineTime.value.split(':').map(Number)
  const deadline = new Date()
  deadline.setHours(deadlineHour, deadlineMinute, 0, 0)
  
  const diff = deadline - now
  if (diff > 0 && diff < 30 * 60 * 1000) {
    showWarning.value = true
    const minutes = Math.floor(diff / 60000)
    remainingTime.value = `${minutes}分钟`
  } else if (diff <= 0) {
    showWarning.value = true
    remainingTime.value = '已超时'
  } else {
    showWarning.value = false
  }
}

const selectUncheckedRoom = (room) => {
  selectedRoomId.value = room.id
  onRoomSelect(room.id)
}

const onRoomSelect = async (roomId) => {
  if (!roomId) return
  
  const room = roomList.value.find(r => r.id === roomId)
  if (!room) return
  
  currentRoom.id = room.id
  currentRoom.roomNumber = room.roomNumber
  currentRoom.building = room.building

  loading.value = true
  try {
    const res = await request.get('/users/byRoom', {
      params: {
        building: room.building,
        room: room.roomNumber
      }
    })
    if (res.code === 200 && res.data) {
      roomMembers.value = res.data.map(u => ({
        id: u.id,
        realName: u.realName,
        className: u.className || '',
        status: 'IN_ROOM',
        remark: ''
      }))
      delegateMembers.value = roomMembers.value.filter(m => m.id !== userStore.user?.id)
    } else {
      roomMembers.value = []
      delegateMembers.value = []
    }
  } catch (error) {
    console.error('加载宿舍成员失败:', error)
    ElMessage.error(t('common.error'))
    roomMembers.value = []
    delegateMembers.value = []
  } finally {
    loading.value = false
  }
}

const loadDormLeaderRoom = async () => {
  const user = userStore.user
  if (!user || !user.building || !user.room) return

  currentRoom.building = user.building
  currentRoom.roomNumber = user.room

  if (roomList.value.length === 0) {
    await loadRooms(user.building)
  }

  const room = roomList.value.find(r => r.roomNumber === user.room && r.building === user.building)
  if (room) {
    currentRoom.id = room.id
    selectedRoomId.value = room.id
  } else {
    try {
      const res = await request.get('/dict/rooms', {
        params: { buildingName: user.building, roomNumber: user.room }
      })
      if (res.code === 200 && res.data && res.data.length > 0) {
        currentRoom.id = res.data[0].id
      }
    } catch (e) {
      console.error('获取宿舍ID失败', e)
    }
  }

  loading.value = true
  try {
    const res = await request.get('/users/byRoom', {
      params: { building: user.building, room: user.room }
    })
    if (res.code === 200 && res.data) {
      roomMembers.value = res.data.map(u => ({
        id: u.id,
        realName: u.realName,
        className: u.className || '',
        status: 'IN_ROOM',
        remark: ''
      }))
      delegateMembers.value = roomMembers.value.filter(m => m.id !== userStore.user?.id)
    }
  } catch (error) {
    console.error('加载宿舍成员失败:', error)
  } finally {
    loading.value = false
  }
}

const handleStatusChange = (row) => {
  if (row.status === 'LATE' || row.status === 'ABSENT') {
    if (!row.remark) {
      ElMessage.warning(t('common.pleaseInput') + t('checkReport.notes'))
    }
  }
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

const loadHistory = async () => {
  try {
    const params = {
      checkDate: historyDate.value
    }
    if (currentRoom.id) {
      params.roomId = currentRoom.id
    }
    const res = await request.get('/checkRecords', { params })
    if (res.code === 200 && res.data) {
      historyRecords.value = res.data.records || res.data
    }
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
}

const handleDelegate = async () => {
  if (!delegateMemberId.value) {
    ElMessage.warning(t('checkReport.pleaseSelectDelegate'))
    return
  }
  if (!delegateDate.value) {
    ElMessage.warning(t('checkReport.pleaseSelectDate'))
    return
  }
  
  try {
    await request.post('/checkRecords/delegate', {
      roomId: currentRoom.id,
      delegateId: delegateMemberId.value,
      delegateDate: delegateDate.value
    })
    ElMessage.success(t('common.success'))
    showDelegate.value = false
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
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

const getStatusText = (status) => {
  const texts = {
    IN_ROOM: t('checkReport.allPresent'),
    LEAVE: t('records.leave'),
    LATE: t('checkReport.late'),
    ABSENT: t('checkReport.absent')
  }
  return texts[status] || status
}

const getStatusClass = (status) => {
  return `status-${status.toLowerCase()}`
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const records = roomMembers.value.map(member => ({
      roomId: currentRoom.id,
      studentId: member.id,
      status: member.status,
      remark: member.remark,
      submitterId: userStore.user.id
    }))
    
    const data = { records }
    if (uploadedImage.value) {
      data.image = uploadedImage.value
    }
    
    const res = await request.post('/checkRecords/batch', data)
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
      uploadedImage.value = ''
      loadUncheckedRooms(currentRoom.building)
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
  roomMembers.value.forEach(member => {
    member.status = 'IN_ROOM'
    member.remark = ''
  })
  uploadedImage.value = ''
}

onMounted(() => {
  const role = userStore.user?.role
  const building = userStore.user?.building
  
  loadDeadlineConfig()
  warningTimer = setInterval(checkDeadlineWarning, 60000)
  
  if (role === 'DORM_MANAGER' && building) {
    loadRooms(building)
    loadUncheckedRooms(building)
  } else if (role === 'DORM_LEADER') {
    loadRooms(building)
    loadDormLeaderRoom()
  }
})

onUnmounted(() => {
  if (warningTimer) {
    clearInterval(warningTimer)
  }
})
</script>

<style scoped>
.check-report {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.report-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #000000;
}

.header-info {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: #888888;
}

.header-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.action-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: #000000;
  color: #000000;
}

.deadline-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff9e6;
  border: 1px solid #ffd666;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.warning-icon {
  font-size: 18px;
}

.warning-text {
  font-size: 14px;
  color: #d4a017;
  font-weight: 600;
}

.unchecked-warning {
  background: #fff9e6;
  border: 1px solid #ffd666;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.unchecked-warning-all-done {
  background: #f0f9eb;
  border: 1px solid #b7eb8f;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.warning-title {
  font-size: 16px;
  font-weight: 600;
  color: #d4a017;
}

.unchecked-warning-all-done .warning-title {
  color: #52c41a;
}

.warning-count {
  background: #ffd666;
  color: #8b6914;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  margin-left: auto;
}

.warning-count.all-done {
  background: #b7eb8f;
  color: #389e0d;
}

.unchecked-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.unchecked-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #ffd666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.unchecked-item:hover {
  background: #fff3cd;
  border-color: #ffc107;
  transform: translateY(-2px);
}

.unchecked-item span:first-child {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.floor-info {
  font-size: 12px;
  color: #999;
}

.go-btn {
  font-size: 12px;
  color: #d4a017;
  font-weight: 600;
}

.all-done-text {
  font-size: 14px;
  color: #52c41a;
  text-align: center;
  padding: 8px 0;
}

.room-selector {
  margin-bottom: 24px;
}

.selector-row {
  display: flex;
  gap: 16px;
}

.select-field {
  width: 200px;
}

.select-field :deep(.el-select__wrapper) {
  border-radius: 8px;
  border: 1px solid #e8e8e8;
  box-shadow: none;
}

.current-room-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f8f8;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
}

.photo-upload {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #888888;
  margin-bottom: 8px;
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

.empty-tip {
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.report-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  margin-bottom: 24px;
}

.table-header {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 1fr 3fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1.5fr 1.5fr 1fr 3fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.status-select {
  padding: 8px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  background: #ffffff;
  cursor: pointer;
  width: 100%;
}

.status-select:focus {
  outline: none;
  border-color: #000000;
}

.remark-input {
  width: 100%;
  padding: 8px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
}

.remark-input:focus {
  outline: none;
  border-color: #000000;
}

.submit-area {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.submit-btn {
  padding: 12px 32px;
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
  padding: 12px 32px;
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

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog-content {
  background: #ffffff;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  overflow: hidden;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  cursor: pointer;
  color: #999;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #333;
}

.form-content {
  padding: 24px;
}

.search-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-field {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
}

.search-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.search-btn:hover {
  border-color: #000000;
}

.history-list {
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.history-header span:first-child {
  font-weight: 600;
}

.history-body {
  display: flex;
  gap: 20px;
  font-size: 13px;
  color: #666;
}

.history-photo {
  margin-top: 8px;
}

.history-photo-img {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  cursor: pointer;
}

.form-row {
  margin-bottom: 16px;
}

.form-row label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.form-field {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
}

.delegate-info {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.delegate-info p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #f0f0f0;
}

.dialog-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.dialog-btn.cancel:hover {
  border-color: #000000;
}

.dialog-btn.confirm {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.dialog-btn.confirm:hover {
  background: #333333;
}

.status-in_room {
  color: #2e7d32;
}

.status-leave {
  color: #1976d2;
}

.status-late {
  color: #d4a017;
}

.status-absent {
  color: #c62828;
}

@media (max-width: 768px) {
  .check-report {
    padding: 16px;
    max-width: 100%;
  }

  .report-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
  }

  .report-header h2 {
    font-size: 18px;
  }

  .header-info {
    font-size: 13px;
    gap: 12px;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .deadline-warning {
    padding: 10px 12px;
    margin-bottom: 14px;
  }

  .warning-text {
    font-size: 13px;
  }

  .unchecked-warning {
    padding: 14px;
    margin-bottom: 16px;
  }

  .warning-header {
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  }

  .warning-icon {
    font-size: 18px;
  }

  .warning-title {
    font-size: 14px;
  }

  .warning-count {
    font-size: 12px;
    padding: 3px 10px;
  }

  .unchecked-list {
    flex-direction: column;
    gap: 8px;
  }

  .unchecked-item {
    padding: 10px 12px;
  }

  .unchecked-item span:first-child {
    font-size: 13px;
  }

  .room-selector {
    margin-bottom: 16px;
  }

  .selector-row {
    flex-direction: column;
    gap: 10px;
  }

  .select-field {
    width: 100%;
  }

  .current-room-info {
    padding: 10px 12px;
    font-size: 13px;
    margin-bottom: 12px;
  }

  .photo-upload {
    margin-bottom: 16px;
  }

  .upload-area {
    padding: 20px;
  }

  .upload-icon {
    font-size: 30px;
  }

  .empty-tip {
    padding: 24px 12px;
    font-size: 13px;
  }

  .report-table {
    margin-bottom: 16px;
    border: none;
    border-radius: 0;
  }

  .table-header {
    display: none;
  }

  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 14px 12px;
    border-bottom: 1px solid #e8e8e8;
    background: #fafafa;
    margin-bottom: 8px;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
    font-size: 13px;
  }

  .table-row span {
    display: block;
  }

  .status-select {
    padding: 8px 10px;
    font-size: 13px;
  }

  .remark-input {
    padding: 8px 10px;
    font-size: 13px;
  }

  .submit-area {
    flex-direction: column-reverse;
    gap: 10px;
  }

  .submit-btn,
  .reset-btn {
    width: 100%;
    padding: 12px;
    font-size: 13px;
  }

  .search-row {
    flex-direction: column;
    gap: 10px;
  }

  .history-body {
    flex-direction: column;
    gap: 6px;
  }
}
</style>