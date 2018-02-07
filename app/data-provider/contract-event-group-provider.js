/**
 * Created by yuliang on 2017/10/9.
 */

'use strict'

const MongoBaseOperation = require('egg-freelog-database/lib/database/mongo-base-operation')

module.exports = class ContractEventGroupProvider extends MongoBaseOperation {

    constructor(app) {
        super(app.model.ContractEventGroup)
    }

    /**
     * 注册分组事件
     */
    registerEventGroup(eventGroup) {
        return super.findOneAndUpdate({
            contractId: eventGroup.contractId,
            groupEventId: eventGroup.groupEventId
        }, {
            taskEvents: eventGroup.taskEvents,
            executedEvents: []
        }).then(model => {
            return model ? model : super.create(eventGroup)
        })
    }

    /**
     * 执行子事件
     * @param contractId
     * @param groupEventId
     * @param subEventId
     */
    executeSubEvent(contractId, groupEventId, subEventId) {
        return super.update({contractId: contractId, groupEventId: groupEventId}, {
            $addToSet: {executedEvents: subEventId},
        })
    }

    /**
     * 删除事件分组
     */
    deletEventGroup(contractId, groupEventId) {
        return super.deleteOne({contractId: contractId, groupEventId: groupEventId})
    }

    /**
     * 更新事件分组
     * @param condition
     * @param model
     */
    updateEventGroup(condition, model) {
        return super.update(condition, model)
    }

    /**
     * 查询单个事件分组
     * @param condition
     * @returns {Promise}
     */
    getEventGroup(condition) {
        return super.findOne(condition)
    }
}