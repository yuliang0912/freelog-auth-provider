/**
 * Created by yuliang on 2017/9/22.
 */

'use strict'

const async = require('async')
const fsmEventHandler = require('../contract-service/contract-fsm-event-handler')
const cycleSettlementDataProvider = require('../data-provider/cycle-settlement-data-provider')

module.exports = class SettlementTimerTaskQueue {

    constructor(concurrencyCount = 20) {
        this.concurrencyCount = concurrencyCount
        this.queue = async.queue(this.taskHandler, concurrencyCount)
    }

    /**
     * 添加待触发对象到队列
     * @param contractEvents
     */
    push(contractEvents) {
        if (Array.isArray(contractEvents)) {
            contractEvents.forEach(event => this.queue.push(event, this.taskCallback))
        } else if (contractEvents) {
            this.queue.push(event)
        }
    }

    /**
     * 暂停执行
     */
    pause() {
        this.queue.pause()
    }

    /**
     * 继续执行
     */
    resume() {
        this.queue.resume()
    }

    /**
     * 获取队列状态
     * @returns {{started: (*|boolean), paused: (*|boolean), saturated: (*|Function)}}
     */
    get queueStatus() {
        return {
            started: this.queue.started,
            paused: this.queue.paused,
            saturated: this.queue.saturated,
        }
    }

    /**
     * 处理函数
     * @param task
     * @param callback
     */
    taskHandler(contractEvent, taskCallback) {
        (async () => {
            try {
                await  fsmEventHandler.contractEventTriggerHandler(contractEvent.eventId, contractEvent.eventParams)
                taskCallback(null)
            } catch (err) {
                taskCallback(err)
            }
        })()
    }

    /**
     *  任务回调函数
     * @param err
     */
    taskCallback(err) {

    }
}

