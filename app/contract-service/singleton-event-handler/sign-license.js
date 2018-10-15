'use strict'

const lodash = require('lodash')
const {ContractFsmEventTriggerEvent} = require('../../enum/contract-fsm-event')

module.exports = class SignLicenseHandler {

    constructor(app) {
        this.app = app
        this.licenseSignRecordProvider = app.dal.licenseSignRecordProvider
    }

    /**
     * 签约license事件处理
     */
    async handler({contractInfo, eventInfo, userInfo, licenseIds, nodeId}) {

        const {licenseResourceId} = eventInfo.params

        //如果有多个协议,必须一次全部签署
        if (!Array.isArray(licenseIds) || licenseIds.length !== licenseResourceId.length || lodash.difference(licenseIds, licenseResourceId).length) {
            throw new Error(`协议ID与事件中规定的协议不匹配`)
        }

        return this.licenseSignRecordProvider.create({
            licenseIds,
            eventId: eventInfo.eventId,
            operationUserId: userInfo.userId,
            contractId: contractInfo.contractId,
            fsmState: contractInfo.contractClause.currentFsmState
        }).tap(() => {
            this.app.emit(ContractFsmEventTriggerEvent, contractInfo.contractId, eventInfo.eventId)
        })
    }
}