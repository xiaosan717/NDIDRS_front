<template>
  <div class="config">
    <div class="page-header">
      <h2>{{ t('config.title') }}</h2>
    </div>

    <div class="config-table">
      <div class="table-header">
        <span>{{ t('config.key') }}</span>
        <span>{{ t('config.value') }}</span>
        <span>{{ t('config.desc') }}</span>
        <span>{{ t('users.actions') }}</span>
      </div>
      <div v-for="config in configs" :key="config.id" class="table-row">
        <span>{{ config.configKey }}</span>
        <span>
          <span v-if="!editingId || editingId !== config.id">{{ config.configValue }}</span>
          <input v-else v-model="config.configValue" type="text" class="edit-input" />
        </span>
        <span>{{ config.configDesc }}</span>
        <span class="actions">
          <template v-if="!editingId || editingId !== config.id">
            <button class="action-btn edit" @click="handleEdit(config)">{{ t('common.edit') }}</button>
          </template>
          <template v-else>
            <button class="action-btn confirm" @click="handleSave(config)">{{ t('common.confirm') }}</button>
            <button class="action-btn cancel" @click="handleCancel(config)">{{ t('common.cancel') }}</button>
          </template>
        </span>
      </div>
    </div>

    <div class="config-info">
      <h3>{{ t('config.description') }}</h3>
      <ul>
        <li>{{ t('config.checkDeadline') }}：{{ configs.find(c => c.configKey === 'check_deadline')?.configValue || '23:00' }}</li>
        <li>{{ t('config.warningThreshold') }}：{{ configs.find(c => c.configKey === 'warning_threshold')?.configValue || '3' }}</li>
        <li>{{ t('config.lateThreshold') }}：{{ configs.find(c => c.configKey === 'late_threshold')?.configValue || '23:00' }}</li>
        <li>{{ t('config.autoRemindTime') }}：{{ configs.find(c => c.configKey === 'auto_remind_time')?.configValue || '22:30' }}</li>
      </ul>
    </div>

    <div class="operation-logs">
      <h3>{{ t('config.operationLogs') }}</h3>
      <div class="search-bar">
        <div class="search-row">
          <el-select v-model="logSearch.module" :placeholder="t('config.module')" class="search-field">
            <el-option :label="t('common.all')" value="" />
          <el-option :label="t('config.systemConfig')" value="系统配置" />
          <el-option :label="t('users.title')" value="用户管理" />
          <el-option :label="t('rooms.title')" value="宿舍管理" />
          <el-option :label="t('checkReport.title')" value="查寝管理" />
          </el-select>
          <el-select v-model="logSearch.type" :placeholder="t('config.operationType')" class="search-field">
                <el-option :label="t('common.all')" value="" />
                <el-option :label="t('common.insert')" value="INSERT" />
                <el-option :label="t('common.update')" value="UPDATE" />
                <el-option :label="t('common.delete')" value="DELETE" />
                <el-option :label="t('common.select')" value="SELECT" />
              </el-select>
          <button class="search-btn" @click="loadLogs">{{ t('common.search') }}</button>
        </div>
      </div>
      <div class="logs-table">
        <div class="table-header">
          <span>{{ t('users.username') }}</span>
          <span>{{ t('config.module') }}</span>
          <span>{{ t('config.operationType') }}</span>
          <span>{{ t('config.operationDesc') }}</span>
          <span>{{ t('config.operationTime') }}</span>
        </div>
        <div v-if="logs.length === 0" class="empty-row">
          {{ t('common.noData') }}
        </div>
        <div v-for="log in logs" :key="log.id" class="table-row">
          <span>{{ log.userName || '-' }}</span>
          <span>{{ log.operationModule || '-' }}</span>
          <span>{{ getOperationTypeText(log.operationType) }}</span>
          <span>{{ log.operationDesc || '-' }}</span>
          <span>{{ formatTime(log.operationTime) }}</span>
        </div>
      </div>
      <div class="pagination" v-if="logTotal > 0">
        <span class="page-info">{{ t('common.total') }} {{ logTotal }} {{ t('common.records') }}</span>
        <el-pagination
          :current-page="logPageNum"
          :page-size="logPageSize"
          :total="logTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleLogSizeChange"
          @current-change="handleLogCurrentChange"
        />
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

const configs = ref([])
const editingId = ref(null)
const originalValues = ref({})

const logs = ref([])
const logTotal = ref(0)
const logPageNum = ref(1)
const logPageSize = ref(10)
const logSearch = reactive({ module: '', type: '' })

const loadConfigs = async () => {
  try {
    const res = await request.get('/config')
    if (res.code === 200 && res.data) {
      configs.value = res.data.map(c => ({
        id: c.id,
        configKey: c.configKey || c.config_key,
        configValue: c.configValue || c.config_value,
        configDesc: c.configDesc || c.config_desc
      }))
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    configs.value = [
      { id: 1, configKey: 'check_deadline', configValue: '23:00', configDesc: '查寝截止时间' },
      { id: 2, configKey: 'warning_threshold', configValue: '3', configDesc: '连续未归预警阈值' },
      { id: 3, configKey: 'late_threshold', configValue: '23:00', configDesc: '晚归判定时间' },
      { id: 4, configKey: 'auto_remind_time', configValue: '22:30', configDesc: '自动提醒时间' }
    ]
  }
}

const loadLogs = async () => {
  try {
    const params = {
      pageNum: logPageNum.value,
      pageSize: logPageSize.value,
      operationModule: logSearch.module || undefined,
      operationType: logSearch.type || undefined
    }
    const res = await request.get('/logs', { params })
    if (res.code === 200 && res.data) {
      logs.value = res.data.records || res.data
      logTotal.value = res.data.total || res.data.length || 0
    }
  } catch (error) {
    console.error('加载操作日志失败:', error)
  }
}

const getOperationTypeText = (type) => {
  const texts = {
    INSERT: t('common.insert'),
    UPDATE: t('common.update'),
    DELETE: t('common.delete'),
    SELECT: t('common.select')
  }
  return texts[type] || type || '-'
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const handleLogSizeChange = (size) => {
  logPageSize.value = size
  logPageNum.value = 1
  loadLogs()
}

const handleLogCurrentChange = (page) => {
  logPageNum.value = page
  loadLogs()
}

const handleEdit = (config) => {
  editingId.value = config.id
  originalValues.value[config.id] = config.configValue
}

const handleCancel = (config) => {
  config.configValue = originalValues.value[config.id]
  editingId.value = null
}

const handleSave = async (config) => {
  if (!config.configValue.trim()) {
    ElMessage.warning(t('common.required'))
    return
  }

  if (config.configKey === 'check_deadline' || config.configKey === 'late_threshold' || config.configKey === 'auto_remind_time') {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(config.configValue)) {
      ElMessage.warning(t('config.timeFormatError'))
      return
    }
  }

  if (config.configKey === 'warning_threshold') {
    const num = parseInt(config.configValue)
    if (isNaN(num) || num < 1 || num > 30) {
      ElMessage.warning(t('config.thresholdError'))
      return
    }
  }

  try {
    await request.put('/config', {
      id: config.id,
      configKey: config.configKey,
      configValue: config.configValue.trim()
    })
    ElMessage.success(t('common.saveSuccess'))
    editingId.value = null
    delete originalValues.value[config.id]
    loadLogs()
  } catch (error) {
    ElMessage.error(t('common.error'))
  }
}

onMounted(() => {
  loadConfigs()
  loadLogs()
})
</script>

<style scoped>
.config {
  padding: 32px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e8e8e8;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #000000;
}

.config-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  margin-bottom: 24px;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 3fr 1fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
  align-items: center;
}

.table-row:last-child {
  border-bottom: none;
}

.edit-input {
  padding: 8px 12px;
  border: 1px solid #1976d2;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}

.edit-input:focus {
  outline: none;
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  background: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  border-color: #000000;
}

.action-btn.edit:hover {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.action-btn.confirm:hover {
  background: #e8f5e9;
  border-color: #388e3c;
  color: #388e3c;
}

.action-btn.cancel:hover {
  background: #ffebee;
  border-color: #c62828;
  color: #c62828;
}

.config-info {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 32px;
}

.config-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}

.config-info ul {
  margin: 0;
  padding-left: 20px;
}

.config-info li {
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.operation-logs {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e8e8e8;
}

.operation-logs h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px;
}

.logs-table {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e8e8e8;
  margin-bottom: 20px;
}

.logs-table .table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr 2fr;
  padding: 16px 24px;
  background: #f8f8f8;
  font-size: 12px;
  font-weight: 600;
  color: #888888;
}

.logs-table .table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 2fr 2fr;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #333333;
  align-items: center;
}

.logs-table .table-row:last-child {
  border-bottom: none;
}

@media (max-width: 768px) {
  .config {
    padding: 16px;
  }

  .page-header h2 {
    font-size: 18px;
  }

  .config-table {
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

  .config-info {
    padding: 16px;
  }

  .config-info h3 {
    font-size: 14px;
    margin-bottom: 12px;
  }

  .config-info li {
    font-size: 13px;
  }
}
</style>
