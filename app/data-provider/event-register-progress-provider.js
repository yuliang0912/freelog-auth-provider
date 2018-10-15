'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class EventRegisterProgressSchemaProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.EventRegisterProgress)
    }

    /**
     * 创建合同状态事件注册进度
     */
    create(model) {

        const condition = {contractId: model.contractId}

        return super.findOneAndUpdate(condition, {
            allEvents: model.allEvents,
            registeredEvents: [],
            attachInfo: model.attachInfo
        }, {new: true}).then(progressInfo => {
            return progressInfo ? progressInfo : super.create(model)
        })
    }

    /**
     * 新增已经完成注册的事件
     */
    addRegisterCompletedEvent(contractId, eventId) {
        return super.findOneAndUpdate({contractId, allEvents: {$in: [eventId]}}, {
            $addToSet: {registeredEvents: eventId}
        }, {new: true})
    }
}

