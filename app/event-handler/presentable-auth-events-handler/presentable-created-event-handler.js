'use strict'

const lodash = require('lodash')
const {PresentableAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class PresentableCreatedEventHandler {

    constructor(app) {
        this.app = app
        this.presentableAuthResultProvider = app.dal.presentableAuthResultProvider
        this.presentableBindContractProvider = app.dal.presentableBindContractProvider
        this.presentableLockedDependencyProvider = app.dal.presentableLockedDependencyProvider
    }

    /**
     * presentable授权树创建或者变更事件处理
     * @param presentableAuthTree
     * @returns {Promise<void>}
     */
    async handler({presentableInfo, presentableAuthTreeInfo}) {

        //此处的resolveReleases应该是确定的版本.由节点服务处理好发送过来
        const {presentableId, releaseInfo, resolveReleases} = presentableInfo

        const existPresentableAuthResult = await this.presentableAuthResultProvider.findOne({presentableId})
        if (existPresentableAuthResult) {
            return
        }
        if (!resolveReleases.length || resolveReleases.some(x => !x.contracts.length || x.contracts.some(m => !m.contractId))) {
            console.log('presentable-created-event-handler:异常的数据', ...arguments)
            return
        }

        //授权树种存在合并解决一个发行的情况,但是实际依赖不同的版本,所以需要记录下来分别授权.也存在解决了发行,但是实际未依赖的情况,也需要记录下来
        const updateDate = new Date()
        const presentableBindContracts = resolveReleases.map(resolveReleaseInfo => Object({
            presentableId, status: 0,
            resolveReleaseId: resolveReleaseInfo.releaseId,
            associatedContracts: resolveReleaseInfo.contracts.map(({contractId}) => {
                return {contractId, contractStatus: -1, updateDate}
            })
        }))

        const presentableLockedDependencies = this._presentableAuthTreeGroupByReleaseId(presentableAuthTreeInfo).map(({releaseId, versions}) => Object({
            presentableId,
            dependReleaseId: releaseId, status: 0,
            lockedReleaseVersions: versions.map(version => Object({
                version, updateDate, authStatus: 0
            }))
        }))

        //先保存初始状态,再计算上游合约的授权的状态以及发行方案自身的授权状态
        const createPresentableAuthResultTask = this.presentableAuthResultProvider.create({
            presentableId,
            associatedReleaseId: releaseInfo.releaseId,
            version: releaseInfo.version,
            status: 0, isAuth: 0,
            resolveReleaseCount: resolveReleases.length
        })

        const createReleaseSchemeAuthRelationTask = this.presentableBindContractProvider.insertMany(presentableBindContracts)
        const createPresentableLockedDependencyTask = this.presentableLockedDependencyProvider.insertMany(presentableLockedDependencies)

        await Promise.all([createPresentableAuthResultTask, createReleaseSchemeAuthRelationTask, createPresentableLockedDependencyTask]).then(() => this.app.rabbitClient.publish(Object.assign({}, PresentableAuthResultResetEvent, {
            body: {presentableId, operation: 3} //发送指令,要求计算当前方案的授权状态
        })))
    }

    /**
     * 根据发行ID获取分组版本
     * @param authTree
     * @returns {*}
     * @private
     */
    _presentableAuthTreeGroupByReleaseId({authTree}) {

        return lodash.chain(authTree).groupBy('releaseId').entries().map(([releaseId, values]) => Object({
            releaseId, versions: lodash.chain(values).map(x => x.version).uniq().value()
        })).value()
    }
}