'use strict'

const lodash = require('lodash')
const {PresentableAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class PresentableBindContractEventHandler {

    constructor(app) {
        this.app = app
        this.presentableAuthResultProvider = app.dal.presentableAuthResultProvider
        this.presentableBindContractProvider = app.dal.presentableBindContractProvider
    }

    /**
     * presentable授权树创建或者变更事件处理
     * @param presentableAuthTree
     * @returns {Promise<void>}
     */
    async handler(presentableInfo) {

        //此处的resolveReleases应该是确定的版本.由节点服务处理好发送过来
        const {presentableId, resolveReleases} = presentableInfo

        const existAuthResult = await this.presentableAuthResultProvider.findOne({presentableId}).catch(error => {
            console.log('findOne-error', error)
        })
        if (!existAuthResult) {
            console.log('scheme-bind-contract-event-handler-error:异常的数据,无授权结果数据', ...arguments)
            return
        }

        if (resolveReleases.some(x => !x.contracts.length || x.contracts.some(m => !m.contractId))) {
            console.log('scheme-bind-contract-event-handler-error:异常的数据,无合约信息', ...arguments)
            return
        }

        const updateDate = new Date()
        const resolveReleaseContractMap = await this.presentableBindContractProvider.find({presentableId})
            .then(list => new Map(list.map(x => [x.resolveReleaseId, x.associatedContracts]))).catch(error => {
                console.log('findOne-map', error)
            })

        if (!resolveReleaseContractMap.size) {
            return
        }

        const associatedContracts = lodash.chain(resolveReleases).filter(({releaseId, contracts}) => {
            if (!resolveReleaseContractMap.has(releaseId)) {
                return false
            }
            let associatedContracts = resolveReleaseContractMap.get(releaseId)
            return associatedContracts.length !== associatedContracts.length || lodash.differenceBy(contracts, associatedContracts, x => x.contractId).length
        }).map(({releaseId, contracts}) => Object({
            resolveReleaseId: releaseId, status: 0,
            associatedContracts: contracts.map(({contractId}) => Object({
                contractId, updateDate, contractStatus: -1
            }))
        })).value()

        if (associatedContracts.length) {
            return
        }

        const bulkWrites = associatedContracts.map(({resolveReleaseId, associatedContracts, status}) => Object({
            updateOne: {
                filter: {presentableId, resolveReleaseId},
                update: {associatedContracts, status}
            }
        }))

        await this.presentableBindContractProvider.model.bulkWrite(bulkWrites).then(results => {
            return this.app.rabbitClient.publish(Object.assign({}, PresentableAuthResultResetEvent, {
                body: {presentableId, operation: 1} //发送指令,要求计算方案的授权状态(只计算自身绑定的合约部分)
            }))
        }).catch(error => {
            console.log('bulkWrite-error', error)
        })
    }
}