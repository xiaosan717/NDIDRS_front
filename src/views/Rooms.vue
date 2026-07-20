<template>
  <div class="rooms">
    <h2>{{ t('rooms.title') }}</h2>
    
    <div class="rooms-table">
      <div class="table-header">
        <span>{{ t('rooms.roomNumber') }}</span>
        <span>{{ t('rooms.building') }}</span>
        <span>{{ t('rooms.floor') }}</span>
        <span>{{ t('rooms.dormLeader') }}</span>
        <span>{{ t('rooms.capacity') }}</span>
      </div>
      <div v-for="room in rooms" :key="room.id" class="table-row">
        <span>{{ room.roomNumber }}</span>
        <span>{{ room.building }}</span>
        <span>{{ room.floor }}</span>
        <span>{{ room.leaderName || '-' }}</span>
        <span>{{ room.capacity }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '../utils/request'
import { ElMessage } from 'element-plus'

const { t } = useI18n()

const rooms = ref([])

const loadRooms = async () => {
  try {
    const res = await request.get('/rooms', {
      params: { pageNum: 1, pageSize: 100 }
    })
    if (res.code === 200 && res.data) {
      rooms.value = res.data.records.map(r => ({
        id: r.id,
        roomNumber: r.roomNumber || r.room_number,
        building: r.building,
        floor: r.floor,
        leaderName: '-',
        capacity: r.capacity
      }))
    }
  } catch (error) {
    console.error('加载宿舍列表失败:', error)
    ElMessage.error(t('common.error'))
  }
}

onMounted(() => {
  loadRooms()
})
</script>

<style scoped>
.rooms {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.rooms h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #000000;
}

.rooms-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 2fr 1fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 2fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
}

.table-row:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .rooms {
    padding: 16px;
  }

  .rooms h2 {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .rooms-table {
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
    margin-bottom: 10px;
    font-size: 13px;
    background: #fafafa;
  }

  .table-row span {
    display: block;
    word-break: break-all;
  }
}
</style>