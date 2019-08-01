'use strict'

const lodash = require('lodash')
const {ReleaseSchemeAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class SchemeBindContractEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
        this.releaseSchemeAuthRelationProvider = app.dal.releaseSchemeAuthRelationProvider
    }

    /**
     * 发行方案绑定或者换绑合约时,该事件更新对应的关联合同信息
     * @param schemeId
     * @param resolveReleases
     * @returns {Promise<void>}
     */
    async handler({schemeId, resolveReleases}) {

        const updateDate = new Date()
        const resolveReleaseContractMap = await this.releaseSchemeAuthRelationProvider.find({schemeId})
            .then(list => new Map(list.map(x => [x.resolveReleaseId, x.associatedContracts])))

        if (!resolveReleaseContractMap.size) {
            return
        }

        //找出有差异的绑定
        const associatedContracts = lodash.chain(resolveReleases).filter(({releaseId, contracts}) => {
            if (!resolveReleaseContractMap.has(releaseId)) {
                return false
            }
            let associatedContracts = resolveReleaseContractMap.get(releaseId)
            return associatedContracts.length !== associatedContracts.length || lodash.differenceBy(contracts, associatedContracts, x => x.contractId).length
        }).map(({releaseId, contracts}) => Object({
            resolveReleaseId: releaseId, contractIsAuth: 0,
            associatedContracts: contracts.map(({contractId}) => Object({
                contractId, updateDate, contractStatus: 0
            }))
        })).value()

        if (associatedContracts.length) {
            return
        }

        const bulkWrites = associatedContracts.map(({resolveReleaseId, associatedContracts, contractIsAuth}) => Object({
            updateOne: {
                filter: {schemeId, resolveReleaseId},
                update: {associatedContracts, contractIsAuth}
            }
        }))

        await this.releaseSchemeAuthRelationProvider.model.bulkWrite(bulkWrites).then(results => {
            return this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
                body: {schemeId, operation: 1}
            }))
        })
    }
}