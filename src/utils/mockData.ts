import type {
  MonitoringPoint,
  WaterQualityRecord,
  AlertRecord,
  SamplingTask,
  PatrolRecord,
  ThresholdConfig,
} from '../types'

export const monitoringPoints: MonitoringPoint[] = [
  {
    id: 'mp-001',
    name: '翠湖泉眼',
    location: { lat: 24.9853, lng: 110.2987 },
    status: 'online',
    area: '翠湖景区',
    lastReport: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'mp-002',
    name: '龙潭取水口',
    location: { lat: 25.0124, lng: 110.3256 },
    status: 'alert',
    area: '龙潭峡谷',
    lastReport: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'mp-003',
    name: '碧溪源头',
    location: { lat: 24.9567, lng: 110.2789 },
    status: 'online',
    area: '碧溪保护区',
    lastReport: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
  {
    id: 'mp-004',
    name: '白云泉站',
    location: { lat: 25.0432, lng: 110.3567 },
    status: 'offline',
    area: '白云山景区',
    lastReport: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mp-005',
    name: '清泉汇流处',
    location: { lat: 24.9234, lng: 110.4123 },
    status: 'online',
    area: '清泉谷',
    lastReport: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'mp-006',
    name: '月牙泉监测站',
    location: { lat: 25.0678, lng: 110.2345 },
    status: 'online',
    area: '月牙岭',
    lastReport: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: 'mp-007',
    name: '九曲溪入口',
    location: { lat: 24.8789, lng: 110.3876 },
    status: 'alert',
    area: '九曲景区',
    lastReport: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: 'mp-008',
    name: '桃花溪取水点',
    location: { lat: 25.0345, lng: 110.4534 },
    status: 'online',
    area: '桃花源景区',
    lastReport: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
]

function randomInRange(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(decimals))
}

export function generateWaterQualityRecords(): WaterQualityRecord[] {
  const records: WaterQualityRecord[] = []
  const now = Date.now()

  for (const point of monitoringPoints) {
    const baseFlow = randomInRange(1.0, 2.5)
    const baseTemp = randomInRange(14, 19)
    const baseTurbidity = randomInRange(1.0, 4.0)
    const basePH = randomInRange(6.8, 7.8)
    const baseChlorine = randomInRange(0.2, 0.6)

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now - i * 3600 * 1000).toISOString()
      records.push({
        pointId: point.id,
        timestamp,
        flow: Math.max(0.5, randomInRange(baseFlow - 0.3, baseFlow + 0.3)),
        temperature: randomInRange(baseTemp - 2, baseTemp + 2),
        turbidity: Math.max(0.5, randomInRange(baseTurbidity - 1.0, baseTurbidity + 1.5)),
        pH: Math.min(8.5, Math.max(6.5, randomInRange(basePH - 0.3, basePH + 0.3))),
        residualChlorine: Math.min(0.8, Math.max(0.1, randomInRange(baseChlorine - 0.1, baseChlorine + 0.1))),
      })
    }
  }

  return records
}

export const alerts: AlertRecord[] = [
  {
    id: 'alert-001',
    pointId: 'mp-002',
    pointName: '龙潭取水口',
    indicator: 'turbidity',
    value: 8.6,
    threshold: 5.0,
    level: 'critical',
    status: 'pending',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    description: '浊度严重超标，疑似上游泥石流影响',
  },
  {
    id: 'alert-002',
    pointId: 'mp-007',
    pointName: '九曲溪入口',
    indicator: 'pH',
    value: 5.8,
    threshold: 6.5,
    level: 'critical',
    status: 'processing',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    description: 'pH值低于安全下限，可能存在酸性污染源',
  },
  {
    id: 'alert-003',
    pointId: 'mp-002',
    pointName: '龙潭取水口',
    indicator: 'flow',
    value: 0.3,
    threshold: 0.5,
    level: 'warning',
    status: 'pending',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    description: '流量低于最小阈值，泉水可能干涸',
  },
  {
    id: 'alert-004',
    pointId: 'mp-001',
    pointName: '翠湖泉眼',
    indicator: 'temperature',
    value: 23.5,
    threshold: 22.0,
    level: 'warning',
    status: 'resolved',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    description: '水温偏高，可能与近期高温天气有关',
    disposition: '经确认系高温天气导致，持续观察中',
  },
  {
    id: 'alert-005',
    pointId: 'mp-005',
    pointName: '清泉汇流处',
    indicator: 'residualChlorine',
    value: 0.05,
    threshold: 0.1,
    level: 'warning',
    status: 'processing',
    createdAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    description: '余氯含量偏低，消毒效果可能不足',
  },
  {
    id: 'alert-006',
    pointId: 'mp-003',
    pointName: '碧溪源头',
    indicator: 'turbidity',
    value: 5.8,
    threshold: 5.0,
    level: 'warning',
    status: 'resolved',
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    description: '浊度轻微超标，昨夜暴雨冲刷所致',
    disposition: '暴雨过后自然恢复，浊度已恢复正常',
  },
  {
    id: 'alert-007',
    pointId: 'mp-006',
    pointName: '月牙泉监测站',
    indicator: 'pH',
    value: 8.7,
    threshold: 8.5,
    level: 'info',
    status: 'resolved',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    description: 'pH值略高于上限，建议持续关注',
    disposition: '短暂波动，已自行恢复正常范围',
  },
  {
    id: 'alert-008',
    pointId: 'mp-008',
    pointName: '桃花溪取水点',
    indicator: 'flow',
    value: 3.2,
    threshold: 3.0,
    level: 'info',
    status: 'resolved',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    description: '流量略高于上限，上游降雨量增大',
    disposition: '降雨过后流量已回归正常',
  },
  {
    id: 'alert-009',
    pointId: 'mp-004',
    pointName: '白云泉站',
    indicator: 'turbidity',
    value: 9.2,
    threshold: 5.0,
    level: 'critical',
    status: 'pending',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    description: '浊度严重超标，设备离线前最后数据',
  },
  {
    id: 'alert-010',
    pointId: 'mp-007',
    pointName: '九曲溪入口',
    indicator: 'turbidity',
    value: 6.2,
    threshold: 5.0,
    level: 'warning',
    status: 'processing',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    description: '浊度偏高，与上游施工活动有关',
  },
  {
    id: 'alert-011',
    pointId: 'mp-001',
    pointName: '翠湖泉眼',
    indicator: 'residualChlorine',
    value: 0.85,
    threshold: 0.8,
    level: 'info',
    status: 'resolved',
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    description: '余氯含量略高，已通知运维人员检查加氯设备',
    disposition: '加氯设备参数微调后恢复正常',
  },
  {
    id: 'alert-012',
    pointId: 'mp-005',
    pointName: '清泉汇流处',
    indicator: 'temperature',
    value: 22.8,
    threshold: 22.0,
    level: 'info',
    status: 'pending',
    createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    description: '水温略高于阈值，持续观察中',
  },
]

export const samplingTasks: SamplingTask[] = [
  {
    id: 'task-001',
    pointId: 'mp-002',
    pointName: '龙潭取水口',
    assignee: '张明',
    status: 'pending',
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    type: 'recheck',
    indicators: ['turbidity'],
    notes: '浊度超标复检',
  },
  {
    id: 'task-002',
    pointId: 'mp-007',
    pointName: '九曲溪入口',
    assignee: '李芳',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    type: 'recheck',
    indicators: ['pH'],
    notes: 'pH值偏低复检',
  },
  {
    id: 'task-003',
    pointId: 'mp-004',
    pointName: '白云泉站',
    assignee: '王刚',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    type: 'recheck',
    indicators: ['turbidity'],
    notes: '设备离线前浊度超标',
  },
  {
    id: 'task-004',
    pointId: 'mp-001',
    pointName: '翠湖泉眼',
    assignee: '赵婷',
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    type: 'routine',
    results: {
      pointId: 'mp-001',
      timestamp: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
      flow: 1.85,
      temperature: 16.2,
      turbidity: 2.1,
      pH: 7.2,
      residualChlorine: 0.35,
    },
    photos: [],
    indicators: ['flow', 'temperature', 'turbidity', 'pH', 'residualChlorine'],
    notes: '',
  },
  {
    id: 'task-005',
    pointId: 'mp-003',
    pointName: '碧溪源头',
    assignee: '张明',
    status: 'completed',
    createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    type: 'routine',
    results: {
      pointId: 'mp-003',
      timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      flow: 1.52,
      temperature: 15.8,
      turbidity: 1.8,
      pH: 7.1,
      residualChlorine: 0.42,
    },
    photos: [],
    indicators: ['flow', 'temperature', 'turbidity', 'pH', 'residualChlorine'],
    notes: '',
  },
  {
    id: 'task-006',
    pointId: 'mp-005',
    pointName: '清泉汇流处',
    assignee: '陈浩',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    type: 'recheck',
    indicators: ['residualChlorine'],
    notes: '余氯含量偏低复检',
  },
  {
    id: 'task-007',
    pointId: 'mp-006',
    pointName: '月牙泉监测站',
    assignee: '刘洋',
    status: 'completed',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
    type: 'routine',
    results: {
      pointId: 'mp-006',
      timestamp: new Date(Date.now() - 46 * 3600 * 1000).toISOString(),
      flow: 2.13,
      temperature: 14.5,
      turbidity: 1.2,
      pH: 7.4,
      residualChlorine: 0.38,
    },
    photos: [],
    indicators: ['flow', 'temperature', 'turbidity', 'pH', 'residualChlorine'],
    notes: '',
  },
  {
    id: 'task-008',
    pointId: 'mp-008',
    pointName: '桃花溪取水点',
    assignee: '赵婷',
    status: 'pending',
    createdAt: new Date(Date.now() - 0.5 * 3600 * 1000).toISOString(),
    type: 'routine',
    indicators: ['flow', 'temperature', 'turbidity', 'pH', 'residualChlorine'],
    notes: '',
  },
]

export const patrolRecords: PatrolRecord[] = [
  {
    id: 'patrol-001',
    pointId: 'mp-001',
    pointName: '翠湖泉眼',
    inspector: '张明',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '检查取水口格栅完好，流量计运行正常，设备房无渗漏，管道连接处无松动',
    issues: '无',
    photos: [],
  },
  {
    id: 'patrol-002',
    pointId: 'mp-002',
    pointName: '龙潭取水口',
    inspector: '李芳',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '上游有少量泥沙冲入，取水口格栅需清理，水质浑浊度明显升高',
    issues: '格栅需尽快清理，建议增加取样频次',
    photos: [],
  },
  {
    id: 'patrol-003',
    pointId: 'mp-003',
    pointName: '碧溪源头',
    inspector: '王刚',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '源头出水正常，周边植被覆盖良好，无外来污染痕迹，设备箱密封良好',
    issues: '无',
    photos: [],
  },
  {
    id: 'patrol-004',
    pointId: 'mp-004',
    pointName: '白云泉站',
    inspector: '陈浩',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '设备房门锁完好，发现通信模块故障导致数据上传中断，已报修',
    issues: '通信模块故障，设备离线，需尽快维修',
    photos: [],
  },
  {
    id: 'patrol-005',
    pointId: 'mp-005',
    pointName: '清泉汇流处',
    inspector: '刘洋',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '汇流处水量正常，两条支流水色一致，加氯设备运行正常，余氯检测仪读数稳定',
    issues: '加氯设备参数需微调',
    photos: [],
  },
  {
    id: 'patrol-006',
    pointId: 'mp-006',
    pointName: '月牙泉监测站',
    inspector: '赵婷',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '泉眼出水量稳定，水温正常，周边步道有少量落叶需清理，传感器探头清洁',
    issues: '步道落叶清理',
    photos: [],
  },
  {
    id: 'patrol-007',
    pointId: 'mp-007',
    pointName: '九曲溪入口',
    inspector: '张明',
    date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '上游约200米处有施工活动，水体略显浑浊，pH传感器读数偏低',
    issues: '上游施工影响水质，需与施工方沟通防护措施',
    photos: [],
  },
  {
    id: 'patrol-008',
    pointId: 'mp-008',
    pointName: '桃花溪取水点',
    inspector: '李芳',
    date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '取水点周边环境良好，桃花花期已过无落花影响，管道阀门开关灵活',
    issues: '无',
    photos: [],
  },
  {
    id: 'patrol-009',
    pointId: 'mp-001',
    pointName: '翠湖泉眼',
    inspector: '陈浩',
    date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '例行巡查，各设备运行正常，蓄电池电量充足，数据传输稳定',
    issues: '无',
    photos: [],
  },
  {
    id: 'patrol-010',
    pointId: 'mp-005',
    pointName: '清泉汇流处',
    inspector: '刘洋',
    date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().split('T')[0],
    content: '发现汇流处拦污网有破损，已临时修补，水位标尺读数正常',
    issues: '拦污网破损已临时修补，需安排更换',
    photos: [],
  },
]

export const thresholds: ThresholdConfig[] = [
  { indicator: 'flow', label: '流量', unit: 'm³/h', min: 0.5, max: 3.0 },
  { indicator: 'temperature', label: '水温', unit: '°C', min: 10.0, max: 22.0 },
  { indicator: 'turbidity', label: '浊度', unit: 'NTU', min: 0.0, max: 5.0 },
  { indicator: 'pH', label: 'pH值', unit: '', min: 6.5, max: 8.5 },
  { indicator: 'residualChlorine', label: '余氯', unit: 'mg/L', min: 0.1, max: 0.8 },
]

export function generateTimeSeriesData(
  pointId: string,
  indicator: keyof WaterQualityRecord,
  records: WaterQualityRecord[],
  hours = 24,
): { time: string; value: number }[] {
  const now = Date.now()
  const filtered = records.filter((r) => r.pointId === pointId)
  const data: { time: string; value: number }[] = []

  for (let i = hours - 1; i >= 0; i--) {
    const targetTime = new Date(now - i * 3600 * 1000)
    const targetHour = targetTime.toISOString().slice(0, 13)

    const match = filtered.find((r) => r.timestamp.slice(0, 13) === targetHour)
    const value = match
      ? (match[indicator] as number)
      : randomInRange(
          indicator === 'flow' ? 1.0 : indicator === 'temperature' ? 14 : indicator === 'turbidity' ? 1.5 : indicator === 'pH' ? 7.0 : 0.4,
          indicator === 'flow' ? 2.5 : indicator === 'temperature' ? 20 : indicator === 'turbidity' ? 4.0 : indicator === 'pH' ? 7.8 : 0.6,
        )

    data.push({
      time: targetTime.toISOString(),
      value,
    })
  }

  return data
}
