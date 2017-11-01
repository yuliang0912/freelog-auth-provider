/**
 * Created by yuliang on 2017/9/25.
 */

'use strict'

const settlementTimerTaskQueue = new (require('../settlement-timer-service/task-queue'))

/**
 * 获取待结算合同事件数据
 * @param page
 * @returns {*}
 */

module.exports = app => {
    return {
        schedule: {
            type: 'worker',
            cron: '*/60 * * * * * *', //测试阶段60秒一个周期
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
            await app.dataProvider.cycleSettlementProvider.getMaxAndMinSeqId({}, '2017-9-21', '2017-10-31').then(startAndEndSeq => {
                getTaskQueue(startAndEndSeq.minSeqId, startAndEndSeq.maxSeqId)
            })
        }
    }

    const getJobDataList = (startSeqId, endSeqId, count) => {
        return app.dataProvider.cycleSettlementProvider.getCycleSettlementEvents({
            status: 0,
            cycleType: 1
        }, startSeqId, endSeqId, count)
    }
}
