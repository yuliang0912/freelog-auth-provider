/**
 * Created by yuliang on 2017/10/10.
 */

'use strict'

const lodash = require('lodash')
const contractFsmHelper = require('./contract-fsm')
const contractFsmEvents = require('./contract-fsm-events')
const globalInfo = require('egg-freelog-base/globalInfo')

class ContractEventGroupHandler {

    /**
     * 合同组合事件子事件处理
     * @param contractInfo
     * @param compoundEvents
     * @param subEventId
     * @param otherArgs
     * @returns {Promise.<void>}
     */
    async eventGroupHandler(contractInfo, compoundEvent, subEventId, ...otherArgs) {

        const {app} = globalInfo
        const condition = {
            contractId: contractInfo.contractId,
            groupEventId: compoundEvent.eventId
        }

        if (compoundEvent.eventId === subEventId) {
            return Promise.reject('复合事件不能直接触发执行')
        }

        const envetGroup = await app.dataProvider.contractEventGroupProvider.getEventGroup(condition)
        if (!envetGroup) {
            return Promise.reject("未找到有效的事件分组")
        }

        const awaitExecuteEvents = lodash.difference(envetGroup.taskEvents, envetGroup.executedEvents)
        if (!envetGroup.taskEvents.some(t => t === subEventId)) {
            return Promise.reject("未找到子事件信息")
        }

        await app.dataProvider.contractChangedHistoryProvider.addHistory(contractInfo.contractId, {
            fromState: contractInfo.fsmState,
            toState: contractInfo.fsmState,
            eventId: subEventId,
            triggerDate: app.moment().toDate()
        })

        //如果只有这一个待执行,则当前事件执行完毕.整个事件组即执行完毕
        if (awaitExecuteEvents.length === 1) {
            //如果事件分组中的所有子事件都执行完毕,则直接执行主事件
            let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)

            if (!contractFsm.can(compoundEvent.eventId)) {
                console.log(`合同不能执行${compoundEvent.eventId}事件`)
                console.log(contractFsm.state, contractFsm.transitions())
                return Promise.reject(`合同不能执行${compoundEvent.eventId}事件`)
            }

            return contractFsm.execEvent(compoundEvent, ...otherArgs)
        }

        return app.dataProvider.contractEventGroupProvider.updateEventGroup(condition, {
            $addToSet: {executedEvents: subEventId},
            status: envetGroup.status
        }).then(data => true)
    }
}

module.exports = new ContractEventGroupHandler()