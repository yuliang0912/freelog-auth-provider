/**
 * Created by yuliang on 2017/10/10.
 */

'use strict'

const _ = require('lodash')
const Promise = require('bluebird')
const contractFsmHelper = require('./contract-fsm')
const contractFsmEvents = require('./contract-fsm-events')


module.exports = {

    /**
     * 合同组合事件子事件处理
     * @param contractInfo
     * @param compoundEvents
     * @param subEventId
     * @param otherArgs
     * @returns {Promise.<void>}
     */
    async EventGroupHandler(contractInfo, compoundEvent, subEventId, ...otherArgs){

        let condition = {
            contractId: contractInfo.contractId,
            groupEventId: compoundEvent.eventId
        }

        let envetGroup = await eggApp.dataProvider.contractEventGroupProvider.getEventGroup(condition)

        if (!envetGroup) {
            return Promise.reject("未找到有效的事件分组")
        }

        let awaitExecuteEvents = _.difference(envetGroup.taskEvents, envetGroup.executedEvents)

        //如果差集中没有当前事件,则该事件已经执行或者是无效的事件
        if (!awaitExecuteEvents.some(event => event === subEventId)) {
            return Promise.resolve(true)
        }

        //如果只有这一个待执行,则当前事件执行完毕.整个事件组即执行完毕
        if (awaitExecuteEvents.length === 1) {
            envetGroup.status = 1
        }

        await eggApp.dataProvider.contractEventGroupProvider.updateEventGroup(condition, {
            $addToSet: {executedEvents: subEventId},
            status: envetGroup.status
        }).catch(console.error)

        if (envetGroup.status !== 1) {
            return Promise.resolve(true)
        }

        let contractFsm = contractFsmHelper.getContractFsm(contractInfo, contractFsmEvents)

        if (!contractFsm.can(compoundEvent.eventId)) {
            console.log(`合同不能执行${compoundEvent.eventId}事件`)
            console.log(contractFsm.state, contractFsm.transitions())
            return
        }

        contractFsm.execEvent(compoundEvent, ...otherArgs)
        return Promise.resolve(true)
    }
}