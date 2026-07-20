<template>
  <div class="check-report">
    <div class="report-header">
      <h2>{{ t('checkReport.title') }}</h2>
      <div class="header-info">
        <span>{{ t('checkReport.checkTime') }}: {{ today }}</span>
      </div>
    </div>

    <!-- 宿管未填报宿舍提示 -->
    <div v-if="isManager" class="unchecked-warning" :class="{'unchecked-warning-all-done': uncheckedRooms.length === 0}">
      <div class="warning-header">
        <span class="warning-icon">{{ uncheckedRooms.length > 0 ? '⚠' : '✓' }}</span>
        <span class="warning-title">{{ uncheckedRooms.length > 0 ? t('checkReport.uncheckedTitle') : t('checkReport.allCheckedTitle') }}</span>
        <span class="warning-count" :class="{'all-done': uncheckedRooms.length === 0}">
          {{ uncheckedRooms.length > 0 ? uncheckedRooms.length : t('checkReport.allCheckedDone') }}
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
          <span class="floor-info">{{ room.floor }}{{ t('checkReport.floor_unit') }}</span>
          <span class="go-btn">{{ t('checkReport.goReport') }}</span>
        </div>
      </div>
      <div v-else class="all-done-text">{{ t('checkReport.allCheckedText') }}</div>
    </div>

    <!-- 宿管选择宿舍 -->
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

    <div v-if="roomMembers.length > 0" class="report-table">
      <div class="table-header">
        <span>{{ t('users.realName') }}</span>
        <span>{{ t('checkReport.className') }}</span>
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
      {{ currentRoom.roomNumber ? t('checkReport.noStudents') : t('checkReport.pleaseSelectRoom') }}
    </div>

    <div v-if="roomMembers.length > 0" class="submit-area">
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting">{{ t('common.submit') }}</button>
      <button class="reset-btn" @click="handleReset">{{ t('common.cancel') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()
const userStore = useUserStore()
const submitting = ref(false)
const loading = ref(false)

const today = new Date().toISOString().split('T')[0]

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
    console.log('正在加载未填报宿舍, building:', building)
    const res = await request.get('/checkRecords/uncheckedRooms', { params: { building } })
    console.log('未填报宿舍响应完整:', JSON.stringify(res))
    console.log('未填报宿舍响应 - code:', res.code, 'message:', res.message)
    if (res.code === 200 && res.data) {
      uncheckedRooms.value = res.data
      console.log('未填报宿舍数量:', uncheckedRooms.value.length)
      if (uncheckedRooms.value.length > 0) {
        console.log('未填报宿舍列表:', JSON.stringify(uncheckedRooms.value))
      }
    } else {
      console.error('未填报宿舍响应异常 - code:', res.code, 'message:', res.message)
      uncheckedRooms.value = []
    }
  } catch (e) {
    console.error('加载未填报宿舍列表失败:', e.response ? JSON.stringify(e.response.data) : e.message)
    uncheckedRooms.value = []
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
    } else {
      roomMembers.value = []
    }
  } catch (error) {
    console.error('加载宿舍成员失败:', error)
    ElMessage.error(t('common.error'))
    roomMembers.value = []
  } finally {
    loading.value = false
  }
}

const loadDormLeaderRoom = async () => {
  const user = userStore.user
  if (!user || !user.building || !user.room) return

  currentRoom.building = user.building
  currentRoom.roomNumber = user.room

  // 先确保 roomList 已加载
  if (roomList.value.length === 0) {
    await loadRooms(user.building)
  }

  // 从 roomList 中查找正确的 room_id
  const room = roomList.value.find(r => r.roomNumber === user.room && r.building === user.building)
  if (room) {
    currentRoom.id = room.id
    selectedRoomId.value = room.id
  } else {
    // 如果找不到,从API获取room_id
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

  // 自动加载本宿舍成员
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
    const res = await request.post('/checkRecords/batch', records)
    if (res.code === 200) {
      ElMessage.success(t('common.success'))
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
}

onMounted(() => {
  const role = userStore.user?.role
  const building = userStore.user?.building
  
  if (role === 'DORM_MANAGER' && building) {
    loadRooms(building)
    loadUncheckedRooms(building)
  } else if (role === 'DORM_LEADER') {
    loadRooms(building)
    loadDormLeaderRoom()
  }
})
</script>

<style scoped>
.check-report {
  max-width: 900px;
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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

.warning-icon {
  font-size: 20px;
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

@media (max-width: 768px) {
  .check-report {
    padding: 16px;
    max-width: 100%;
  }

  .report-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
  }

  .report-header h2 {
    font-size: 18px;
  }

  .header-info {
    font-size: 13px;
    gap: 12px;
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
}
</style>
