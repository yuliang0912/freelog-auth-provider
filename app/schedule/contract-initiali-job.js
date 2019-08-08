'use strict'

const Subscription = require('egg').Subscription;
const contractStatusEnum = require('../enum/contract-status-enum')

module.exports = class ContractInitialJob extends Subscription {

    static get schedule() {
        return {
            type: 'worker',
            immediate: true,
            cron: '0 */5 * * * *',
        }
    }

    /**
     * 定时在发行的授权结果集中查询未计算合同状态的方案,然后查询合约初始化状态.
     * 然后检查已经初始化的合约,然后发送通知消息
     * @returns {Promise<void>}
     */
    async subscribe() {

        const {app} = this
        const ctx = app.createAnonymousContext()
        const date = new Date()
        date.setMinutes(date.getMinutes() - 2)

        const uninitializedContracts = await app.dal.contractProvider.find({
            status: contractStatusEnum.uninitialized, createDate: {
                $lt: date
            }
        }, null, {limit: 300})

        uninitializedContracts.map(contract => app.contractService.initialContractFsm(ctx, contract))

        // const tasks = await app.dal.contractProvider.find({contractType: {$in: [1, 2]}}).then(contracts => {
        //     return contracts.map(x => app.dal.contractProvider.updateOne({_id: x.contractId}, {targetId: x.partyOne}))
        // })
        //
        // await Promise.all(tasks)
    }
}