'use strict'

module.exports = class ContractSetDefaultEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
    }

    /**
     * 设置默认执行合同事件
     * @param eventName
     * @param contractInfo
     * @returns {Query|void|*|Promise<Collection~updateWriteOpResultObject>}
     */
    handle(eventName, contractInfo) {

        const condition = {
            _id: {$ne: contractInfo.contractId},
            targetId: contractInfo.targetId,
            partyTwo: contractInfo.partyTwo,
            contractType: contractInfo.contractType
        }

        return this.contractProvider.updateMany(condition, {isDefault: 0})
    }
}