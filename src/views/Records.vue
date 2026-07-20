<template>
  <div class="records">
    <h2 class="page-title">{{ t('records.title') }}</h2>
    
    <div class="filter-bar">
      <el-select v-model="filterStatus" :placeholder="t('records.filterStatus')" clearable class="filter-select" @change="fetchRecords(1)">
        <el-option label="" value="" />
        <el-option :label="t('checkReport.allPresent')" value="IN_ROOM" />
        <el-option :label="t('records.leave')" value="LEAVE" />
        <el-option :label="t('checkReport.late')" value="LATE" />
        <el-option :label="t('checkReport.absent')" value="ABSENT" />
      </el-select>
    </div>
    
    <div class="records-table">
      <div class="table-header">
        <span>{{ t('records.time') }}</span>
        <span>{{ t('dashboard.content') }}</span>
        <span>{{ t('checkReport.room') }}</span>
        <span>{{ t('checkReport.status') }}</span>
        <span>{{ t('checkReport.notes') }}</span>
        <span>{{ t('records.submitTime') }}</span>
      </div>
      <div v-for="(record, index) in records" :key="index" class="table-row">
        <span>{{ record.checkDate }}</span>
        <span>{{ record.studentName }}</span>
        <span>{{ record.roomNumber }}</span>
        <span class="status-tag" :class="record.status.toLowerCase()">{{ getStatusText(record.status) }}</span>
        <span>{{ record.remark || '-' }}</span>
        <span>{{ formatTime(record.submitTime) }}</span>
      </div>
      <div v-if="records.length === 0" class="empty-row">
        {{ t('dashboard.noData') }}
      </div>
    </div>
    
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import request from '../utils/request'

const { t } = useI18n()

const records = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const filterStatus = ref('')

const fetchRecords = async (page = 1) => {
  try {
    const params = {
      pageNum: page,
      pageSize: pageSize.value
    }
    if (filterStatus.value) {
      params.status = filterStatus.value
    }
    const res = await request.get('/checkRecords', { params })
    if (res.code === 200) {
      records.value = res.data.records
      total.value = res.data.total
      currentPage.value = page
    }
  } catch (error) {
    console.error('获取记录失败', error)
  }
}

const getStatusText = (status) => {
  const texts = {
    IN_ROOM: t('checkReport.allPresent'),
    LEAVE: t('records.leave'),
    LATE: t('checkReport.late'),
    ABSENT: t('checkReport.absent'),
    NOT_REPORTED: t('checkReport.notReported')
  }
  return texts[status] || status
}

const formatTime = (time) => {
  if (!time) return '-'
  return time.substring(11, 16)
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchRecords(1)
}

const handleCurrentChange = (val) => {
  fetchRecords(val)
}

onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
.records {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px;
  color: #000000;
}

.filter-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.filter-select {
  width: 180px;
}

.records-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 2fr 1fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 2fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
}

.table-row:last-child {
  border-bottom: none;
}

.empty-row {
  padding: 40px;
  text-align: center;
  color: #999999;
  font-size: 14px;
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  width: fit-content;
}

.status-tag.in_room {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-tag.leave {
  background: #e3f2fd;
  color: #1565c0;
}

.status-tag.late {
  background: #fff3e0;
  color: #ef6c00;
}

.status-tag.absent {
  background: #ffebee;
  color: #c62828;
}

.status-tag.not_reported {
  background: #f5f5f5;
  color: #9e9e9e;
}

.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-pagination.is-background .el-pager li:not(.is-active):hover) {
  color: #000000;
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: #000000;
}

@media (max-width: 768px) {
  .records {
    padding: 16px;
  }

  .page-title {
    font-size: 18px;
    margin-bottom: 14px;
  }

  .filter-bar {
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }

  .filter-select {
    width: 100%;
  }

  .records-table {
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

  .empty-row {
    padding: 24px 12px;
    font-size: 13px;
  }

  .status-tag {
    font-size: 11px;
    padding: 3px 10px;
  }

  .pagination-wrapper {
    margin-top: 16px;
    justify-content: center;
  }

  :deep(.el-pagination) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }

  :deep(.el-pagination .el-pagination__sizes) {
    width: 100%;
    justify-content: center;
  }

  :deep(.el-pagination .el-pagination__jump) {
    margin: 0;
  }
}
</style>
