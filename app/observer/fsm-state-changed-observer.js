/**
 * Created by yuliang on 2017/9/20.
 */
'use strict'

const baseObserver = require('./base-observer')
const globalInfo = require('egg-freelog-base/globalInfo')

/**
 * 合约状态变更观察者
 * @type {FsmStateChangedObserver}
 */

module.exports = class FsmStateChangedObserver extends baseObserver {

    async update(lifeCycle) {

        const {app} = globalInfo
        const {contractId, policySegment, isFirst} = lifeCycle.fsm.contract

        //如果状态是激活状态,则合同未生效状态,否则为执行中状态
        const contractStatus =
            policySegment.activatedStates.some(t => t === lifeCycle.to) ? 3  //激活状态,则生效中
                : policySegment.terminateState === lifeCycle.to ? 6 : 2   //终止状态,则合同终止.否则执行中

        const task1 = app.dataProvider.contractProvider.updateContractFsmState(contractId, lifeCycle.to, contractStatus)
        const task2 = app.dataProvider.contractChangedHistoryProvider.addHistory(contractId, {
            fromState: lifeCycle.from,
            toState: lifeCycle.to,
            eventId: lifeCycle.fsm.currEvent.eventId || 'init',
            triggerDate: app.moment().toDate()
        })

        await Promise.all([task1, task2]).then(() => {
            if (lifeCycle.from === 'none' && isFirst) {
                app.emit(`${app.event.contractEvent.initialContractEvent}_${contractId}`)
            }
            lifeCycle.fsm.contract.fsmState = lifeCycle.to
            console.log(`合同状态变更, from:${lifeCycle.from}, to:${lifeCycle.to}, contractId:${contractId}`)
        }).catch(console.error)
    }
}