/**
 * Created by yuliang on 2017/9/25.
 */

'use strict'

const Subscription = require('egg').Subscription;
const settlementTimerTaskQueue = new (require('../settlement-timer-service/task-queue'))

/**
 * 获取待结算合同事件数据
 * @param page
 * @returns {*}
 */
module.exports = class EndOfCycleTask extends Subscription {

    static get schedule() {
        return {
            type: 'worker',
            immediate: false,
            cron: '0 0 */1 * * * *', //0点开始每1天执行一次
        }
    }

    async subscribe() {

        const beginDate = this.app.moment().add(-1, "day").toDate().toLocaleString()
        const endDate = this.app.moment().toDate().toLocaleString()

        await this.app.dataProvider.cycleSettlementProvider.getMaxAndMinSeqId({}, beginDate, endDate).then(startAndEndSeq => {
            this.getTaskQueue(startAndEndSeq.minSeqId, startAndEndSeq.maxSeqId)
        })
    }

    /**
     * 获取需要执行周期任务的合同数据
     * @param startSeqId
     * @param endSeqId
     */
    getTaskQueue(startSeqId, endSeqId) {
        if (startSeqId < 1 || endSeqId < 1 || startSeqId > endSeqId) {
            return
        }
        this.getJobDataList(startSeqId, endSeqId, 100).then(dataList => {
            if (dataList.length > 0) {
                settlementTimerTaskQueue.push(dataList)
                this.getTaskQueue(dataList[dataList.length - 1].seqId + 1, endSeqId)
            }
        })
    }

    getJobDataList(startSeqId, endSeqId, count) {
        return this.app.dataProvider.cycleSettlementProvider.getCycleSettlementEvents({
            status: 0,
            cycleType: 1
        }, startSeqId, endSeqId, count)
    }
}
