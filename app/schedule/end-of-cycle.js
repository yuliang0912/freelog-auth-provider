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

    const getJobDataList = (startSeqId, endSeqId, count) => {
        return app.dataProvider.cycleSettlementProvider.getCycleSettlementEvents({
            status: 0,
            cycleType: 1
        }, startSeqId, endSeqId, count)
    }

    return {
        schedule: {
            type: 'worker',
            cron: '0 0 0 */1 * * *', //每天0点0分0秒
            //immediate: true, //立即执行一次
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
            let beginDate = app.moment().add(-1, "days").toDate().toLocaleString()
            let endDate = app.moment().toDate().toLocaleString()

            await app.dataProvider.cycleSettlementProvider.getMaxAndMinSeqId({}, beginDate, endDate).then(startAndEndSeq => {
                getTaskQueue(startAndEndSeq.minSeqId, startAndEndSeq.maxSeqId)
            })
        }
    }
}
