/**
 * 自定义事件触发
 */

'use strict'

const {ArgumentError} = require('egg-freelog-base/error')
const {ContractFsmEventTriggerEvent} = require('../../enum/contract-fsm-event')

module.exports = class CustomEventHandler {

    constructor(app) {
        this.app = app
        this.customEventInvokingRecordProvider = app.dal.customEventInvokingRecordProvider
    }

    /**
     * 自定义事件处理
     */
    async handler({contractInfo, eventInfo, userInfo}) {

        const {customEventName} = eventInfo.params
        const {contractId, contractClause} = contractInfo
        const customEventDeclaration = contractClause.fsmDeclarations[customEventName]
        if (!customEventDeclaration || customEventDeclaration.declareType !== 'customEvent') {
            throw new ArgumentError('未找到声明的自定义事件', {eventInfo})
        }

        this.authorization(contractInfo, customEventDeclaration, userInfo)

        return this.customEventInvokingRecordProvider.create({
            contractId,
            eventId: eventInfo.eventId,
            operationUserId: userInfo.userId,
            fsmState: contractClause.currentFsmState
        }).tap(() => {
            this.app.emit(ContractFsmEventTriggerEvent, contractId, eventInfo.eventId)
        })
    }

    /**
     * 认证与授权
     */
    authorization(contractInfo, customEventInfo, userInfo) {
        return customEventInfo.type === 'acceptor' && contractInfo.partyTwoUserId === userInfo.userId
            || customEventInfo.type === 'proposer' && contractInfo.partyOneUserId === userInfo.userId
    }
}