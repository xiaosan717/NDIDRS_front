<template>
  <div class="rooms">
    <div class="page-header">
      <h2>{{ t('rooms.title') }}</h2>
      <div class="header-actions">
        <button class="action-btn" @click="handleExport">{{ t('common.export') }}</button>
        <button class="action-btn" @click="handleImport">{{ t('common.import') }}</button>
        <button class="action-btn primary" @click="showAddDialog = true">{{ t('common.add') }}</button>
      </div>
    </div>

    <div class="search-bar">
      <div class="search-row">
        <el-select v-model="searchForm.building" :placeholder="t('common.pleaseSelect') + t('rooms.building')" class="search-field">
          <el-option v-for="b in buildings" :key="b.buildingName" :label="b.buildingName" :value="b.buildingName" />
        </el-select>
        <input v-model="searchForm.roomNumber" type="text" :placeholder="t('common.pleaseInput') + t('rooms.roomNumber')" class="search-field" />
        <button class="search-btn" @click="handleSearch">{{ t('common.search') }}</button>
        <button class="search-btn" @click="handleReset">{{ t('common.reset') }}</button>
      </div>
    </div>

    <div class="rooms-table">
      <div class="table-header">
        <span>{{ t('rooms.roomNumber') }}</span>
        <span>{{ t('rooms.building') }}</span>
        <span>{{ t('rooms.floor') }}</span>
        <span>{{ t('rooms.capacity') }}</span>
        <span>{{ t('rooms.currentCount') }}</span>
        <span>{{ t('rooms.dormLeader') }}</span>
        <span>{{ t('users.actions') }}</span>
      </div>
      <div v-if="rooms.length === 0" class="empty-row">
        {{ t('common.noData') }}
      </div>
      <div v-for="room in rooms" :key="room.id" class="table-row">
        <span>{{ room.roomNumber }}</span>
        <span>{{ room.building }}</span>
        <span>{{ room.floor }}</span>
        <span>{{ room.capacity }}</span>
        <span>{{ room.currentCount || 0 }}</span>
        <span>{{ room.leaderName || '-' }}</span>
        <span class="actions">
          <button class="action-btn edit" @click="handleEdit(room)">{{ t('common.edit') }}</button>
          <button class="action-btn bind" @click="handleBindLeader(room)">{{ room.leaderId ? t('common.unbind') : t('common.bind') }}</button>
          <button class="action-btn delete" @click="handleDelete(room)">{{ t('common.delete') }}</button>
        </span>
      </div>
    </div>

    <div class="pagination" v-if="total > 0">
      <span class="page-info">{{ t('common.total') }} {{ total }} {{ t('common.records') }}</span>
      <el-pagination
        :current-page="pageNum"
        :page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ editRoom ? t('common.edit') : t('common.add') }} {{ t('rooms.title') }}</h3>
          <span class="close-btn" @click="closeDialog">×</span>
        </div>
        <div class="form-content">
          <div class="form-row">
            <label>{{ t('rooms.building') }} <span class="required">*</span></label>
            <el-select v-model="formData.building" :placeholder="t('common.pleaseSelect')" class="form-field">
              <el-option v-for="b in buildings" :key="b.buildingName" :label="b.buildingName" :value="b.buildingName" />
            </el-select>
          </div>
          <div class="form-row">
            <label>{{ t('rooms.roomNumber') }} <span class="required">*</span></label>
            <input v-model="formData.roomNumber" type="text" :placeholder="t('common.pleaseInput')" class="form-field" />
          </div>
          <div class="form-row">
            <label>{{ t('rooms.floor') }} <span class="required">*</span></label>
            <input v-model.number="formData.floor" type="number" :placeholder="t('common.pleaseInput')" class="form-field" />
          </div>
          <div class="form-row">
            <label>{{ t('rooms.capacity') }}</label>
            <input v-model.number="formData.capacity" type="number" :placeholder="t('common.pleaseInput')" class="form-field" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn cancel" @click="closeDialog">{{ t('common.cancel') }}</button>
          <button class="dialog-btn confirm" @click="handleSave">{{ t('common.save') }}</button>
        </div>
      </div>
    </div>

    <div v-if="showBindDialog" class="dialog-overlay" @click.self="closeBindDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>{{ t('common.bind') }} 寝室长</h3>
          <span class="close-btn" @click="closeBindDialog">×</span>
        </div>
        <div class="form-content">
          <div class="form-row">
            <label>{{ t('rooms.roomNumber') }}</label>
            <span class="form-value">{{ bindRoom?.building }} - {{ bindRoom?.roomNumber }}</span>
          </div>
          <div class="form-row">
            <label>{{ t('users.realName') }} <span class="required">*</span></label>
            <el-select v-model="bindLeaderId" :placeholder="t('common.pleaseSelect')" class="form-field">
              <el-option v-for="stu in roomStudents" :key="stu.id" :label="stu.realName" :value="stu.id" />
            </el-select>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-btn cancel" @click="closeBindDialog">{{ t('common.cancel') }}</button>
          <button class="dialog-btn confirm" @click="handleBind">{{ t('common.bind') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const { t } = useI18n()

const rooms = ref([])
const buildings = ref([])
const roomStudents = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const searchForm = reactive({ building: '', roomNumber: '' })
const showAddDialog = ref(false)
const showBindDialog = ref(false)
const editRoom = ref(null)
const bindRoom = ref(null)
const bindLeaderId = ref(null)

const formData = reactive({
  building: '',
  roomNumber: '',
  floor: 1,
  capacity: 4
})

const loadRooms = async () => {
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      ...searchForm
    }
    const res = await request.get('/rooms', { params })
    if (res.code === 200 && res.data) {
      rooms.value = res.data.records.map(r => ({
        id: r.id,
        roomNumber: r.roomNumber || r.room_number,
        building: r.building,
        floor: r.floor,
        capacity: r.capacity,
        leaderId: r.leader_id || r.leaderId,
        leaderName: r.leaderName || '-'
      }))
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载宿舍列表失败:', error)
    ElMessage.error(t('common.error'))
  }
}

const loadBuildings = async () => {
  try {
    const res = await request.get('/dict/buildings')
    if (res.code === 200 && res.data) {
      buildings.value = res.data
    }
  } catch (error) {
    console.error('加载楼栋列表失败:', error)
  }
}

const handleSearch = () => {
  pageNum.value = 1
  loadRooms()
}

const handleReset = () => {
  searchForm.building = ''
  searchForm.roomNumber = ''
  pageNum.value = 1
  loadRooms()
}

const handleSizeChange = (size) => {
  pageSize.value = size
  pageNum.value = 1
  loadRooms()
}

const handleCurrentChange = (page) => {
  pageNum.value = page
  loadRooms()
}

const handleAdd = () => {
  editRoom.value = null
  formData.building = ''
  formData.roomNumber = ''
  formData.floor = 1
  formData.capacity = 4
  showAddDialog.value = true
}

const handleEdit = (room) => {
  editRoom.value = room
  formData.building = room.building
  formData.roomNumber = room.roomNumber
  formData.floor = room.floor
  formData.capacity = room.capacity
  showAddDialog.value = true
}

const closeDialog = () => {
  showAddDialog.value = false
  editRoom.value = null
}

const handleSave = async () => {
  if (!formData.building || !formData.roomNumber || !formData.floor) {
    ElMessage.warning(t('common.required'))
    return
  }

  try {
    const data = {
      building: formData.building,
      roomNumber: formData.roomNumber,
      floor: formData.floor,
      capacity: formData.capacity
    }

    if (editRoom.value) {
      data.id = editRoom.value.id
      await request.put('/rooms', data)
      ElMessage.success(t('common.saveSuccess'))
    } else {
      await request.post('/rooms', data)
      ElMessage.success(t('common.success'))
    }
    closeDialog()
    loadRooms()
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleDelete = async (room) => {
  if (!confirm(t('common.deleteConfirm'))) return
  try {
    await request.delete(`/rooms/${room.id}`)
    ElMessage.success(t('common.deleteSuccess'))
    loadRooms()
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleBindLeader = async (room) => {
  bindRoom.value = room
  bindLeaderId.value = room.leaderId

  try {
    const res = await request.get('/users/byRoom', {
      params: { building: room.building, room: room.roomNumber }
    })
    if (res.code === 200 && res.data) {
      roomStudents.value = res.data.filter(u => u.role === 'STUDENT' || u.role === 'DORM_LEADER')
    }
    showBindDialog.value = true
  } catch (error) {
    console.error('加载宿舍学生失败:', error)
  }
}

const closeBindDialog = () => {
  showBindDialog.value = false
  bindRoom.value = null
  bindLeaderId.value = null
}

const handleBind = async () => {
  if (!bindLeaderId.value) {
    ElMessage.warning(t('common.pleaseSelect') + t('users.realName'))
    return
  }

  try {
    await request.put(`/rooms/${bindRoom.value.id}/leader`, { leaderId: bindLeaderId.value })
    ElMessage.success(t('common.success'))
    closeBindDialog()
    loadRooms()
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleExport = async () => {
  try {
    const res = await request.get('/rooms/export', { responseType: 'blob' })
    const blob = new Blob([res], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `宿舍列表_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success(t('common.exportSuccess'))
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

const handleImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.csv'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await request.post('/rooms/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.code === 200) {
        ElMessage.success(t('common.importSuccess'))
        loadRooms()
      } else {
        ElMessage.error(res.message)
      }
    } catch (error) {
      ElMessage.error(t('common.error'))
    }
  }
  input.click()
}

onMounted(() => {
  loadRooms()
  loadBuildings()
})
</script>

<style scoped>
.rooms {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #000000;
}

.header-actions {
  display: flex;
  gap: 12px;
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

.action-btn.primary {
  background: #000000;
  color: #ffffff;
  border-color: #000000;
}

.action-btn.primary:hover {
  background: #333333;
}

.search-bar {
  margin-bottom: 20px;
}

.search-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-field {
  padding: 10px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
  min-width: 160px;
}

.search-field:focus {
  outline: none;
  border-color: #000000;
}

.search-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-btn:hover {
  border-color: #000000;
  color: #000000;
}

.rooms-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr 1fr 2fr 2fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr 1fr 2fr 2fr;
  padding: 16px 24px;
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
  color: #888888;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions .action-btn {
  padding: 6px 12px;
  font-size: 12px;
}

.actions .action-btn.edit:hover {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.actions .action-btn.bind:hover {
  background: #e8f5e9;
  border-color: #388e3c;
  color: #388e3c;
}

.actions .action-btn.delete:hover {
  background: #ffebee;
  border-color: #c62828;
  color: #c62828;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.page-info {
  font-size: 14px;
  color: #888888;
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
  max-width: 500px;
  overflow: hidden;
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
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.form-content {
  padding: 24px;
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

.required {
  color: #c62828;
}

.form-field {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  font-size: 14px;
}

.form-field:focus {
  outline: none;
  border-color: #000000;
}

.form-value {
  padding: 10px 0;
  font-size: 14px;
  color: #333;
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
  transition: all 0.2s ease;
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

@media (max-width: 768px) {
  .rooms {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-header h2 {
    font-size: 18px;
  }

  .search-row {
    flex-direction: column;
    gap: 10px;
  }

  .search-field {
    width: 100%;
    min-width: auto;
  }

  .rooms-table {
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
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 10px;
    background: #fafafa;
  }

  .table-row span {
    display: block;
    word-break: break-all;
  }

  .actions {
    flex-wrap: wrap;
  }

  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
