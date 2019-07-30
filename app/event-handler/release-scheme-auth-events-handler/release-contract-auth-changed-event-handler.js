'use strict'

const {ReleaseSchemeAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

/**
 * 监听发行与发行的合同授权状态发生变化事件
 * @type {module.ReleaseContractAuthChangedEventHandler}
 */
module.exports = class ReleaseContractAuthChangedEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.releaseSchemeAuthRelationProvider = app.dal.releaseSchemeAuthRelationProvider
    }

    /**
     * 发行方案绑定的合约授权发生变化事件
     * 事件处理函数通过ID检索出绑定了此合约的所有发行方案,然后发送通知消息
     * 此事件只负责检索与分发任务
     */
    async handler(contractInfo) {

        const contractAssociatedReleaseSchemes = await this.releaseSchemeAuthRelationProvider.find({'associatedContracts.contractId': contractInfo.contractId}, 'schemeId')

        //合同只在同一个发行的不同版本之间才可能重用,所以数量一般很少.一次批量查询.然后单独分发即可.
        const publishTasks = contractAssociatedReleaseSchemes.map(({schemeId}) => {
            return this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
                body: {schemeId, operation: 1}
            }))
        })

        await Promise.all(publishTasks).catch(console.error)
    }
}
