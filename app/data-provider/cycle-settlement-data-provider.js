/**
 * Created by yuliang on 2017/9/21.
 */

'use strict'

const moment = require('moment')

module.exports = {
    /**
     * 注册合同周期触发事件
     * @param model
     * @returns {*|string}
     */
    createCycleSettlementEvent({eventId, contractId, eventParams}){
        return eggApp.knex.contract.raw(
            `INSERT ignore INTO cyclesettlementmanger(eventId,cycleType,contractId,eventParams,createDate,status)
            VALUES(:eventId,:cycleType,:contractId,:eventParams,:createDate,:status)`, {
                eventId, contractId, eventParams,
                cycleType: 1,
                createDate: moment().toDate(),
                status: 0
            })
    },

    /**
     * 分页获取所有待触发结算的合约
     * @param condition
     * @param page
     * @param pageSize
     */
    getCycleSettlementEvents(condition, beginSeqId, endSeqId, pageSize){
        return eggApp.knex.contract('cyclesettlementmanger')
            .where(condition)
            .where('seqId', '>=', beginSeqId)
            .where('seqId', '<=', endSeqId)
            .limit(pageSize)
            .orderBy('seqId', 'ASC')
            .select()
    },

    /**
     * 获取起始与终止序列号
     * @param condition
     */
    getMaxAndMinSeqId(condition, startDate, endDate){
        return eggApp.knex.contract('cyclesettlementmanger')
            .where('createDate', '>=', startDate)
            .where('createDate', '<=', endDate)
            .max('seqId as maxSeqId')
            .min('seqId as minSeqId')
            .first()
    },

    /**
     * 更新数据
     * @param condition
     * @param model
     * @returns {*}
     */
    updateCycleSettlementEvent(condition, model){
        if (!eggApp.type.object(condition)) {
            return Promise.reject(new Error("condition is not object"))
        }
        if (!eggApp.type.object(model)) {
            return Promise.reject(new Error("model is not object"))
        }
        return eggApp.knex.contract('cyclesettlementmanger').update(model).where(condition).then()
    },

    /**
     * 删除数据
     * @param condition
     * @returns {Promise|Promise.<*>}
     */
    deleteCycleSettlementEvent(condition){
        if (!eggApp.type.object(condition)) {
            return Promise.reject(new Error("condition is not object"))
        }
        return eggApp.knex.contract('cyclesettlementmanger').where(condition).delete().then()
    }
}
