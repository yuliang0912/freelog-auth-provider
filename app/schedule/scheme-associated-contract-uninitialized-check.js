'use strict'

const lodash = require('lodash')
const Subscription = require('egg').Subscription;
const contractStatusEnum = require('../enum/contract-status-enum')
const {ReleaseSchemeAuthResultResetEvent} = require('../enum/rabbit-mq-publish-event')

module.exports = class ReleaseSchemeAssociatedUninitializedContractCheckJob extends Subscription {

    static get schedule() {
        return {
            type: 'worker',
            immediate: true,
            cron: '0 */2 * * * *', //每2分钟执行一次
        }
    }

    /**
     * 定时在发行的授权结果集中查询未计算合同状态的方案,然后查询合约初始化状态.
     * 然后检查已经初始化的合约,然后发送通知消息
     * @returns {Promise<void>}
     */
    async subscribe() {

        const {app} = this
        const noCalculateAuthReleaseSchemes = await this.getNoCalculateAuthReleaseSchemes()
        if (!noCalculateAuthReleaseSchemes.length) {
            return
        }

        const allContractIds = lodash.chain(noCalculateAuthReleaseSchemes).map(x => x.contractGroup).flattenDeep().map(x => x.contractId).value()
        if (!allContractIds.length) {
            return
        }

        const contractMap = await app.dal.contractProvider.find({_id: {$in: allContractIds}}, "status")
            .then(list => new Map(list.map(x => [x.contractId, x.status])))

        const contractAuthChangedSchemeIds = []
        for (let i = 0; i < noCalculateAuthReleaseSchemes.length; i++) {
            let {_id, contractGroup, resolveReleaseIds} = noCalculateAuthReleaseSchemes[i]
            for (let j = 0; j < contractGroup.length; j++) {
                let resolveContracts = contractGroup[j]
                let changedContracts = []
                for (let m = 0; m < resolveContracts.length; m++) {
                    if (!contractMap.has(resolveContracts[m].contractId)) {
                        continue
                    }
                    let {contractId, status} = contractMap.get(resolveContracts[m].contractId)
                    if (status !== contractStatusEnum.uninitialized) {
                        changedContracts.push({contractId, status})
                    }
                }
                if (changedContracts.length) {
                    contractAuthChangedSchemeIds.push(_id)
                }
            }
        }
        
        const publishTasks = lodash.uniq(contractAuthChangedSchemeIds).map(schemeId => this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
            body: {schemeId, operation: 1}
        })))

        await Promise.all(publishTasks)
    }

    /**
     * 获取未计算授权的发行方案以及包含的合约
     * @param limit
     * @returns {Promise<*>}
     */
    async getNoCalculateAuthReleaseSchemes(limit = 200) {

        const noCalculateAuthReleaseSchemes = await this.app.dal.releaseAuthResultProvider.find({status: {$in: [4, 7]}}, 'schemeId', {
            limit, sort: {createDate: -1}
        })

        if (!noCalculateAuthReleaseSchemes.length) {
            return []
        }

        return this.app.dal.releaseSchemeAuthRelationProvider.aggregate([
            {$match: {schemeId: {$in: noCalculateAuthReleaseSchemes.map(x => x.schemeId)}}},
            {
                $group: {
                    _id: "$schemeId",
                    contractGroup: {$push: "$associatedContracts"},
                    resolveReleaseIds: {$push: "$resolveReleaseId"},
                }
            }
        ])
    }
}