/**
 * Created by yuliang on 2017/9/25.
 */

'use strict'

const settlementTimerTaskQueue = new (require('../settlement-timer-service/task-queue'))
const cycleSettlementDataProvider = require('../data-provider/cycle-settlement-data-provider')

/**
 * 获取待结算合同事件数据
 * @param page
 * @returns {*}
 */
const getJobDataList = (startSeqId, endSeqId, count) => {
    return cycleSettlementDataProvider.getCycleSettlementEvents({
        status: 0,
        cycleType: 1
    }, startSeqId, endSeqId, count)
}

module.exports = app => {
    return {
        schedule: {
            type: 'worker',
            cron: '*/300 * * * * * *', //测试阶段30秒一个周期
        },
        async task () {
            let getTaskQueue = (startSeqId, endSeqId) => {
                if (startSeqId < 1 || endSeqId < 1 || startSeqId > endSeqId) {
                    return
                }
                getJobDataList(startSeqId, endSeqId, 100).then(dataList => {
                    if (dataList.length > 0) {
                        settlementTimerTaskQueue.push(dataList)
                        getTaskQueue(dataList[dataList.length - 1].seqId + 1, endSeqId)
                    }
                })
            }
            await cycleSettlementDataProvider.getMaxAndMinSeqId({}, '2017-9-21', '2017-10-31').then(startAndEndSeq => {
                getTaskQueue(startAndEndSeq.minSeqId, startAndEndSeq.maxSeqId)
            })
        }
    }
}
