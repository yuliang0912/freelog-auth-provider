/**
 * Created by yuliang on 2017/9/21.
 */

'use strict'

const schedule = require('node-schedule')
const fsmEventHandler = require('../contract-service/contract-fsm-event-handler')
const cycleSettlementDataProvider = require('../data-provider/cycle-settlement-data-provider')

const handler = {

    /***
     * 待处理任务队列
     */
    taskQueue: [],

    /**
     * 定时任务
     */
    scheduleJob(){
        //测试阶段每10S一个周期
        schedule.scheduleJob({rule: '*/10 * * * * *'}, async () => {
            let getTaskQueue = (startSeqId, endSeqId) => {
                if (startSeqId < 1 || endSeqId < 1 || startSeqId > endSeqId) {
                    return
                }
                this.getJobDataList(startSeqId, endSeqId, 100).then(dataList => {
                    if (dataList.length > 0) {
                        this.taskQueue.push(dataList)
                        getTaskQueue(dataList[dataList.length - 1].seqId + 1, endSeqId)
                    }
                })
            }
            cycleSettlementDataProvider.getMaxAndMinSeqId({}, '2017-9-21', '2017-9-22').then(startAndEndSeq => {
                getTaskQueue(startAndEndSeq.minSeqId, startAndEndSeq.maxSeqId)
            })
        })
    },

    /**
     * 获取待结算合同事件数据
     * @param page
     * @returns {*}
     */
    getJobDataList(startSeqId, endSeqId, count){
        return cycleSettlementDataProvider.getCycleSettlementEvents({
            status: 0,
            cycleType: 1
        }, startSeqId, endSeqId, count)
    },

    /**
     * 触发周期到达事件
     */
    triggerEvent(events){
        events.forEach(item => {
            fsmEventHandler.contractEventTriggerHandler(item.eventParams.eventNo)
        })
    }
}

module.exports = {
    startService(){
        handler.scheduleJob()
    }
}

