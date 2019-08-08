'use strict'

const {PresentableAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class NodeContractAuthChangedEventHandler {

    constructor(app) {
        this.app = app
        this.presentableBindContractProvider = app.dal.presentableBindContractProvider
    }

    /**
     * 节点签的合约授权发生变化时,查找关联的presentable,然后重新计算合同授权问题
     * @param contractId
     * @param prevStatus
     * @param currentStatus
     * @returns {Promise<void>}
     */
    async handler({contractId, prevStatus, currentStatus}) {

        const contractAssociatedPresentables = await this.presentableBindContractProvider.find({'associatedContracts.contractId': contractId}, 'presentableId')

        //合同只在同一个发行的不同版本之间才可能重用,所以数量一般很少.一次批量查询.然后单独分发即可.
        const publishTasks = contractAssociatedPresentables.map(({presentableId}) => {
            return this.app.rabbitClient.publish(Object.assign({}, PresentableAuthResultResetEvent, {
                body: {presentableId, operation: 1}
            }))
        })

        await Promise.all(publishTasks).catch(console.error)
    }

}