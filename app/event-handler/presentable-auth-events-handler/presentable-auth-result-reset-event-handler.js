'use strict'

const lodash = require('lodash')
const contractStatusEnum = require('../../enum/contract-status-enum')
const {PresentableAuthResultResetEvent, PresentableAuthChangedEvent} = require('../../enum/rabbit-mq-publish-event')

/**
 * 计算presentable的授权结果
 * @type {module.ReleaseSchemeAuthResultResetEventHandler}
 */
module.exports = class PresentableAuthResultResetEventHandler {

    constructor(app) {
        this.app = app
        this.contractProvider = app.dal.contractProvider
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
        this.presentableAuthResultProvider = app.dal.presentableAuthResultProvider
        this.presentableBindContractProvider = app.dal.presentableBindContractProvider
        this.presentableLockedDependencyProvider = app.dal.presentableLockedDependencyProvider
    }

    /**
     * 重新计算presentable的授权状态
     * @param presentableId
     * @param operation 1:只重置自身合约授权情况 2:只重置上游发行授权情况 3:前两种都重置
     */
    async handler({presentableId, operation}) {

        const presentableAuthResult = await this.presentableAuthResultProvider.findOne({presentableId})
        if (!presentableAuthResult) {
            return
        }

        let {status, selfContractAuthStatus, upstreamAuthStatus} = presentableAuthResult
        const resolveReleases = await this.presentableBindContractProvider.find({presentableId})
        const lockedDependencies = await this.presentableLockedDependencyProvider.find({presentableId})

        const tasks = []
        if ((operation & 1) == 1) {
            tasks.push(this.getPresentableSelfAuthStatus(presentableId, resolveReleases).then(authStatus => selfContractAuthStatus = authStatus))
        }
        if ((operation & 2) == 2) {
            tasks.push(this.getUpstreamReleaseAuthStatus(presentableId, lockedDependencies).then(authStatus => upstreamAuthStatus = authStatus))
        }

        const resetAuthStatus = await Promise.all(tasks).then(() => selfContractAuthStatus | upstreamAuthStatus)

        console.log(resetAuthStatus)

        if (resetAuthStatus !== status) {
            await this.presentableAuthChangedHandle(presentableAuthResult, resetAuthStatus)
        }
    }

    /**
     * 方案的授权结果发生变化事件
     * @param schemeId
     * @param resetAuthStatus
     * @returns {Promise<void>}
     */
    async presentableAuthChangedHandle(presentableAuthResult, resetAuthStatus) {

        const {isAuth, presentableId} = presentableAuthResult
        const schemeIsAuth = resetAuthStatus === 5 ? 1 : 0

        await this.presentableAuthResultProvider.updateOne({presentableId}, {
            status: resetAuthStatus, isAuth: schemeIsAuth
        })

        if (isAuth === schemeIsAuth) {
            return
        }

        await this.app.rabbitClient.publish(Object.assign({}, PresentableAuthChangedEvent, {
            body: {presentableId, status: resetAuthStatus}
        }))
    }

    /**
     * 获取方案自身的授权情况
     * @returns {Promise<int>}
     */
    async getPresentableSelfAuthStatus(presentableId, resolveReleases) {

        const updateDate = new Date()
        const allContractIds = lodash.chain(resolveReleases).map(x => x.associatedContracts).flatten().filter(x => x.contractId).map(x => x.contractId).value()
        const contractMap = await this.contractProvider.find({_id: {$in: allContractIds}})
            .then(list => new Map(list.map(x => [x.contractId, x])))

        const changedResolveReleases = []
        resolveReleases.forEach(resolveRelease => {
            let isChanged = false
            resolveRelease.associatedContracts.forEach(contract => {
                let newContractStatus = this._convertContractStatus(contractMap.get(contract.contractId).status)
                if (contract.contractStatus !== newContractStatus) {
                    isChanged = true
                    contract.updateDate = updateDate
                    contract.contractStatus = newContractStatus
                }
            })
            if (!isChanged) {
                return
            }
            changedResolveReleases.push(resolveRelease)
            resolveRelease.status = resolveRelease.associatedContracts.some(x => (x.contractStatus & 8) === 8) ? 1 : 2
        })

        if (changedResolveReleases.length) {
            const bulkWrites = changedResolveReleases.map(({resolveReleaseId, associatedContracts, status}) => Object({
                updateOne: {
                    filter: {presentableId, resolveReleaseId},
                    update: {associatedContracts, status}
                }
            }))
            this.presentableBindContractProvider.model.bulkWrite(bulkWrites).catch(console.error)
        }

        const isExistUninitializedContract = resolveReleases.some(x => x.associatedContracts.some(m => m.contractStatus === -1))
        const isEveryContractGroupIsAuth = resolveReleases.every(x => x.status === 1)

        //签约,但是实际未使用的合约,在授权的过程中不予校验,默认获得授权
        return isExistUninitializedContract ? 0 : isEveryContractGroupIsAuth ? 1 : 2
    }

    /**
     * 计算上游发行的授权情况
     * @returns {Promise<int>}
     */
    async getUpstreamReleaseAuthStatus(presentableId, lockedDependencies) {

        const {app} = this
        const presentableResolveReleaseVersions = []

        lockedDependencies.forEach(({dependReleaseId, lockedReleaseVersions}) => lockedReleaseVersions.forEach(({version}) => {
            presentableResolveReleaseVersions.push({releaseId: dependReleaseId, version})
        }))

        const upstreamSchemeAuthResults = await this.releaseAuthResultProvider.find({$or: presentableResolveReleaseVersions})

        if (lodash.differenceWith(presentableResolveReleaseVersions, upstreamSchemeAuthResults, (x, y) => x.releaseId === y.releaseId && x.version === y.version).length) {
            setTimeout(() => app.rabbitClient.publish(Object.assign({}, PresentableAuthResultResetEvent, {
                body: {presentableId, operation: 2} //重新计算上游发行的状态
            })), 5000)
            console.log('上游发行授权结果不全,已发送重新计算任务')
            return 0
        }

        return upstreamSchemeAuthResults.some(x => !x.isAuth) ? 8 : 4
    }

    /**
     * 把合约的状态转换成关系链中规定的状态值
     * @param contractStatus
     * @returns {number}
     * @private
     */
    _convertContractStatus(contractStatus) {
        return contractStatus === contractStatusEnum.uninitialized ? -1 : contractStatus === contractStatusEnum.active ? 8 : 2
    }
}