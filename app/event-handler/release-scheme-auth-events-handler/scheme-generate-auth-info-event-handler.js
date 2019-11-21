'use strict'

const {ReleaseSchemeAuthResultResetEvent} = require('../../enum/rabbit-mq-publish-event')

module.exports = class SchemeGenerateAuthInfoEventHandler {

    constructor(app) {
        this.app = app
        this.releaseAuthResultProvider = app.dal.releaseAuthResultProvider
        this.releaseSchemeAuthRelationProvider = app.dal.releaseSchemeAuthRelationProvider
    }

    /**
     * 发行方案创建事件
     * @param releaseId
     * @param schemeId
     * @param resourceId
     * @param version
     * @param resolveReleases
     */
    async handler({releaseId, version}) {

        const {app} = this
        const schemeInfoTask = app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}/versions/${version}`)
        const schemeAuthTreeTask = app.curlIntranetApi(`${app.webApi.releaseInfo}/${releaseId}/authTree?version=${version}`)

        const [schemeInfo, schemeAuthTree] = await Promise.all([schemeInfoTask, schemeAuthTreeTask])
        if (!schemeInfo || !schemeAuthTree) {
            return
        }

        const {schemeId, resourceId} = schemeInfo
        if (schemeAuthTree.some(x => !x.contracts.length || x.contracts.some(m => !m.contractId))) {
            console.log('scheme-created-event-handler:异常的数据,无合约信息', JSON.stringify(schemeAuthTree))
            return
        }

        //授权树种存在合并解决一个发行的情况,但是实际依赖不同的版本,所以需要记录下来分别授权.也存在解决了发行,但是实际未依赖的情况,也需要记录下来
        const updateDate = new Date()
        const schemeResolveReleases = schemeAuthTree.map(resolveReleaseInfo => Object({
            releaseId, schemeId, resourceId, version,
            resolveReleaseId: resolveReleaseInfo.releaseId,
            resolveReleaseVersionRanges: resolveReleaseInfo.versionRanges || [],
            associatedContracts: resolveReleaseInfo.contracts.map(({contractId}) => {
                return {contractId, contractStatus: -1, updateDate}
            }),
            contractIsAuth: 0
        }))

        //先删除之前的
        await this.releaseSchemeAuthRelationProvider.deleteMany({schemeId})

        const createOrUpdateAuthResultTask = this.releaseAuthResultProvider.findOneAndUpdate({schemeId}, {resolveReleaseCount: resolveReleases.length}).then(model => {
            return model || this.releaseAuthResultProvider.create({
                releaseId, schemeId, resourceId, version,
                status: resolveReleases.length ? 0 : 5,
                isAuth: resolveReleases.length ? 0 : 1,
                resolveReleaseCount: resolveReleases.length
            })
        })

        const createReleaseSchemeAuthRelationTask = this.releaseSchemeAuthRelationProvider.insertMany(schemeResolveReleases)

        //后续mongodb环境改成副本集群,改为事务的方式调用
        await Promise.all([createOrUpdateAuthResultTask, createReleaseSchemeAuthRelationTask]).then(() => this.app.rabbitClient.publish(Object.assign({}, ReleaseSchemeAuthResultResetEvent, {
            body: {schemeId, operation: 3} //发送指令,要求计算当前方案的授权状态
        })))
    }
}