/**
 * Created by yuliang on 2017/9/21.
 */

'use strict'

const moment = require('moment')
const KnexBaseOperation = require('egg-freelog-database/lib/database/knex-base-operation')

module.exports = class CycleSettlementProvider extends KnexBaseOperation {

    constructor(app) {
        super(app.knex.contract("cyclesettlementmanger"))
        this.app = app
        this.contractKnex = app.knex.contract
    }

    /**
     * 注册合同周期触发事件
     * @param model
     * @returns {*|string}
     */
    createCycleSettlementEvent({eventId, contractId, eventParams}) {
        return this.contractKnex.raw(
            `INSERT ignore INTO cyclesettlementmanger(eventId,cycleType,contractId,eventParams,createDate,status)
            VALUES(:eventId,:cycleType,:contractId,:eventParams,:createDate,:status)`, {
                eventId, contractId, eventParams,
                cycleType: 1,
                createDate: moment().toDate(),
                status: 0
            })
    }

    /**
     * 分页获取所有待触发结算的合约
     * @param condition
     * @param page
     * @param pageSize
     */
    getCycleSettlementEvents(condition, beginSeqId, endSeqId, pageSize) {
        return super.queryChain.where(condition)
            .where('seqId', '>=', beginSeqId)
            .where('seqId', '<=', endSeqId)
            .limit(pageSize).orderBy('seqId', 'ASC')
            .select()
    }

    /**
     * 获取起始与终止序列号
     * @param condition
     */
    getMaxAndMinSeqId(condition, startDate, endDate) {
        return super.queryChain
            .where('createDate', '>=', startDate)
            .where('createDate', '<=', endDate)
            .max('seqId as maxSeqId')
            .min('seqId as minSeqId')
            .first()
    }

    /**
     * 更新数据
     * @param condition
     * @param model
     * @returns {*}
     */
    updateCycleSettlementEvent(condition, model) {
        return super.update(model, condition)
    }

    /**
     * 删除数据
     * @param condition
     * @returns {Promise|Promise.<*>}
     */
    deleteCycleSettlementEvent(condition) {
        return super.deleteMany(condition)
    }
}
