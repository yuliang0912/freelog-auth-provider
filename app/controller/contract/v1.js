/**
 * Created by yuliang on 2017/8/16.
 */

'use strict'

const _ = require('lodash')
const contractFsmEventHandler = require('../../contract-service/contract-fsm-event-handler')

module.exports = app => {

    const dataProvider = app.dataProvider

    return class ContractController extends app.Controller {

        /**
         * 当前登录用户的合约列表(作为甲方和作为乙方)
         * @param ctx
         * @returns {Promise.<void>}
         */
        async index(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let contractType = ctx.checkQuery('contractType').default(0).in([0, 1, 2, 3]).value
            let partyOne = ctx.checkQuery('partyOne').default(0).toInt().value
            let partyTwo = ctx.checkQuery('partyTwo').default(0).toInt().value
            let resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().value
            ctx.validate()

            let condition = {}
            if (contractType) {
                condition.contractType = contractType
            }
            if (partyOne) {
                condition.partyOne = partyOne
            }
            if (partyTwo) {
                condition.partyTwo = partyTwo
            }
            if (resourceIds) {
                condition.resourceId = {$in: resourceIds.split(',')}
            }
            if (!Object.keys(condition).length) {
                ctx.error({msg: '最少需要一个查询条件'})
            }

            let dataList = []
            let totalItem = await dataProvider.contractProvider.getCount(condition)

            let projection = "_id segmentId contractType targetId resourceId policySegment partyOne partyTwo status createDate"
            if (totalItem > (page - 1) * pageSize) {
                dataList = await dataProvider.contractProvider.getContractList(condition, projection, page, pageSize).bind(ctx)
                    .catch(ctx.error)
            }

            ctx.success({page, pageSize, totalItem, dataList})
        }

        /**
         * 批量获取合同
         * @param ctx
         * @returns {Promise<void>}
         */
        async list(ctx) {
            let contractIds = ctx.checkQuery('contractIds').isSplitMongoObjectId('contractIds格式错误').toSplitArray().len(1, 100).value

            ctx.validate()

            let condition = {
                _id: {$in: contractIds}
            }

            let projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status createDate"

            await dataProvider.contractProvider.getContracts(condition, projection)
                .bind(ctx).then(ctx.success).catch(ctx.error)
        }

        /**
         * 展示合约信息
         * @param ctx
         * @returns {Promise.<void>}
         */
        async show(ctx) {
            let contractId = ctx.checkParams("id").notEmpty().isMongoObjectId().value
            ctx.validate()

            await dataProvider.contractProvider.getContractById(contractId).bind(ctx).then(buildReturnContract)
                .then(ctx.success).catch(ctx.error)
        }

        /**
         * 创建资源合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async create(ctx) {
            let contractType = ctx.checkBody('contractType').in([1, 2, 3]).value
            let segmentId = ctx.checkBody('segmentId').exist().isMd5().value
            let serialNumber = ctx.checkBody('serialNumber').exist().isMongoObjectId().value
            // 此处为资源ID或者presentableId
            let targetId = ctx.checkBody('targetId').exist().notEmpty().value
            let partyTwo = ctx.checkBody('partyTwo').toInt().gt(0).value

            ctx.validate()

            await dataProvider.contractProvider.getContract({
                targetId: targetId,
                partyTwo: partyTwo,
                segmentId: segmentId,
            }).then(oldContract => {
                oldContract && ctx.error({msg: "已经存在一份同样的合约,不能重复签订", errCode: 105, data: oldContract})
            })

            if (contractType === ctx.app.contractType.ResourceToNode) {
                let nodeInfo = await ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/nodes/${partyTwo}`)
                if (!nodeInfo || nodeInfo.ownerUserId !== ctx.request.userId) {
                    ctx.errors.push({partyTwo: '未找到节点或者用户与节点信息不匹配'})
                }
                ctx.validate()
            }

            let policyInfo = await ctx.curlIntranetApi(contractType === ctx.app.contractType.PresentableToUer
                ? `${this.config.gatewayUrl}/api/v1/presentables/${targetId}`
                : `${this.config.gatewayUrl}/api/v1/resources/policies/${targetId}`)

            if (!policyInfo) {
                ctx.error({msg: 'targetId错误'})
            }
            if (policyInfo.serialNumber !== serialNumber) {
                ctx.error({msg: 'serialNumber不匹配,policy已变更,变更时间' + new Date(policyInfo.updateDate).toLocaleString()})
            }

            let policySegment = policyInfo.policy.find(t => t.segmentId === segmentId)
            if (!policySegment) {
                ctx.error({msg: 'segmentId错误,未找到策略段'})
            }

            let contractModel = {
                segmentId, policySegment, contractType,
                targetId: targetId,
                resourceId: policyInfo.resourceId,
                partyTwo: partyTwo,
                languageType: policyInfo.languageType,
                partyOne: contractType === ctx.app.contractType.PresentableToUer
                    ? policyInfo.nodeId
                    : policyInfo.userId
            }

            let policyTextBuffer = new Buffer(policyInfo.policyText, 'utf8')

            /**
             * 保持策略原文副本,以备以后核查
             */
            await ctx.app.upload.putBuffer(`contracts/${serialNumber}.txt`, policyTextBuffer).then(data => {
                contractModel.policyCounterpart = data.url
            })

            await dataProvider.contractProvider.createContract(contractModel).then(contractInfo => {
                contractFsmEventHandler.initContractFsm(contractInfo.toObject())
                return contractInfo
            }).bind(ctx).then(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 用户签订的presentable合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async userContracts(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let userId = ctx.checkParams("userId").exist().isInt().value
            let presentableId = ctx.checkQuery("presentableId").isMongoObjectId().value

            ctx.validate()

            await dataProvider.contractProvider.getContractList({
                partyTwo: userId,
                targetId: presentableId,
                contractType: ctx.app.contractType.PresentableToUer,
                expireDate: {$gt: new Date()},
                status: 0
            }, null, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 节点商与资源商签订的合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async nodeContracts(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let nodeId = ctx.checkParams("nodeId").exist().isInt().value
            let resourceId = ctx.checkQuery("resourceId").exist().isResourceId().value

            ctx.validate()

            await dataProvider.contractProvider.getContractList({
                partyTwo: nodeId,
                targetId: resourceId,
                contractType: ctx.app.contractType.ResourceToNode,
                expireDate: {$gt: new Date()},
                status: 0
            }, null, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 资源商与资源商签订的合约
         * @param ctx
         * @returns {Promise.<void>}
         */
        async authorContracts(ctx) {
            let page = ctx.checkQuery("page").default(1).gt(0).toInt().value
            let pageSize = ctx.checkQuery("pageSize").default(10).gt(0).lt(101).toInt().value
            let authorId = ctx.checkParams("authorId").exist().isInt().value
            let resourceId = ctx.checkQuery("resourceId").exist().isResourceId().value

            ctx.validate()

            await dataProvider.contractProvider.getContractList({
                partyTwo: authorId,
                targetId: resourceId,
                contractType: ctx.app.contractType.ResourceToResource
            }, null, page, pageSize).bind(ctx).map(buildReturnContract).then(ctx.success).catch(ctx.error)
        }

        /**
         * 测试状态机事件驱动
         * @param ctx
         * @returns {Promise.<void>}
         */
        async testContractFsm(ctx) {

            let contractId = ctx.checkBody('contractId').exist().notEmpty().isMongoObjectId().value
            let eventId = ctx.checkBody('eventId').exist().notEmpty().value

            ctx.allowContentType({type: 'json'}).validate()

            await contractFsmEventHandler.contractEventTriggerHandler(eventId, contractId).then(data => {
                ctx.success(data)
            }).catch(error => {
                ctx.error(error)
            })
        }

        /**
         * 合同记录
         * @param ctx
         * @returns {Promise.<void>}
         */
        async contractRecords(ctx) {

            let resourceIds = ctx.checkQuery('resourceIds').optional().isSplitResourceId().toSplitArray().value
            let contractIds = ctx.checkQuery('contractIds').optional().isSplitMongoObjectId().toSplitArray().value
            let partyTwo = ctx.checkQuery('partyTwo').optional().toInt().gt(0).value

            ctx.validate()

            let condition = {}
            if (resourceIds) {
                if (!partyTwo) {
                    ctx.error({msg: '参数resourceIds必须与partyTwo组合使用'})
                }
                condition.resourceId = {$in: resourceIds}
            }
            if (contractIds) {
                condition._id = {$in: contractIds}
            }
            if (partyTwo) {
                condition.partyTwo = partyTwo
            }
            if (!Object.keys(condition).length) {
                ctx.error({msg: '最少需要一个可选查询条件'})
            }

            let projection = "_id segmentId contractType targetId resourceId partyOne partyTwo status fsmState createDate"

            await dataProvider.contractProvider.getContracts(condition, projection)
                .bind(ctx).then(ctx.success)
        }


        /**
         * 节点创建pb类型资源的合同
         * @returns {Promise.<void>}
         */
        async createPageBuildContracts(ctx) {

            ctx.error({msg: '此接口已停止使用'})

            let nodeId = ctx.checkBody('nodeId').isInt().gt(0).value

            // pb与需要展示的widget资源 此处允许widget后续再创建presentable.
            // 目前不支持presentable合同创建以后在动态新增widget
            let pbContracts = ctx.checkBody('contracts').exist().isArray().len(2, 999).value

            ctx.allowContentType({type: 'json'}).validate().validatePbContractList(pbContracts)

            let resourceIds = [...new Set(pbContracts.map(item => item.resourceId))]

            if (resourceIds.length !== pbContracts.length) {
                ctx.error({msg: 'post-body数据中不允许有重复的resourceId'})
            }

            let resourcesTask = ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/list?resourceIds=${resourceIds.toString()}`)
            let policiesTask = ctx.curlIntranetApi(`${this.config.gatewayUrl}/api/v1/resources/policies?resourceIds=${resourceIds.toString()}`)

            await Promise.all([resourcesTask, policiesTask]).then(([resourceInfos, policyInfos]) => {
                let errors = []
                pbContracts.forEach(item => {
                    item.resourceInfo = resourceInfos.find(t => t.resourceId === item.resourceId)
                    item.policyInfo = policyInfos.find(t => t.resourceId === item.resourceId)

                    if (!item.resourceInfo) {
                        errors.push(`资源(${errorResourceIds.toString()})没有源数据信息`)
                    } else {
                        item.isPbContract = item.resourceInfo.resourceType === ctx.app.resourceType.PAGE_BUILD
                    }

                    if (!item.policyInfo) {
                        errors.push(`资源(${item.resourceId})没有授权策略信息`)
                        return
                    }

                    item.policySegment = item.policyInfo.policy.find(t => t.segmentId === item.segmentId)
                    if (item.policyInfo.serialNumber !== item.serialNumber) {
                        errors.push(`serialNumber(${item.serialNumber})不匹配,policy已变更`)
                    }
                    if (!item.policySegment) {
                        errors.push(`segmentId(${item.segmentId})错误`)
                    }
                })

                resourceInfos.forEach(item => {
                    if (item.resourceType !== ctx.app.resourceType.PAGE_BUILD && item.resourceType !== ctx.app.resourceType.WIDGET) {
                        errors.push(`resourceId(${item.resourceId})资源类型错误`)
                    }
                })

                if (errors.length) {
                    return Promise.reject(Object.assign(new Error('数据校验失败'), {data: errors}))
                }
            }).catch(err => ctx.error(err))

            let pageBuilds = pbContracts.filter(item => item.isPbContract)

            if (pageBuilds.length != 1) {
                ctx.error({msg: 'page_build类型的资源有且只能有一个', data: pageBuilds})
            }

            let pbContract = pageBuilds[0]

            if (pbContract.resourceInfo.systemMeta.widgets.some(x => !pbContracts.some(t => t.resourceId === x.resourceId))) {
                ctx.error({msg: 'PB对应的widget-resource-id与传入的合同数据不匹配', data: pbContract.resourceInfo.systemMeta.widgets})
            }

            let oldContracts = await dataProvider.contractProvider.getContracts({
                resourceId: {$in: resourceIds},
                segmentId: {$in: pbContracts.map(t => t.segmentId)},
                partyTwo: nodeId,
                contractType: ctx.app.contractType.ResourceToNode
            }, '_id resourceId status').map(item => {
                return {
                    contractId: item._id.toString(),
                    resourceId: item.resourceId,
                    status: item.status
                }
            })

            if (oldContracts.some(t => t.resourceId === pbContract.resourceId)) {
                ctx.error({
                    msg: `pageBuild资源(${pbContract.resourceId})不能创建多个合约`,
                    data: oldContracts.find(t => t.resourceId === pbContract.resourceId)
                })
            }

            let awaitCreateContracts = pbContracts.filter(t => !oldContracts.some(x => x.resourceId === t.resourceId)).map(item => {
                let model = {
                    targetId: item.resourceId,
                    resourceId: item.resourceId,
                    segmentId: item.segmentId,
                    partyOne: item.policyInfo.userId,
                    partyTwo: nodeId,
                    contractType: ctx.app.contractType.ResourceToNode,
                    languageType: item.policyInfo.languageType,
                    policyInfo: item.policyInfo,
                    policySegment: item.policySegment,
                    isPbContract: item.resourceInfo.resourceType === ctx.app.resourceType.PAGE_BUILD
                }
                if (model.isPbContract) {
                    model.subsidiaryInfo = {relevanceContractIds: oldContracts.map(t => t.contractId)}
                }
                return model
            })

            let uploadTasks = awaitCreateContracts.map(item => {
                let policyTextBuffer = new Buffer(item.policyInfo.policyText, 'utf8')
                return ctx.app.upload.putBuffer(`contracts/${item.policyInfo.serialNumber}.txt`, policyTextBuffer).then(data => {
                    item.policyCounterpart = data.url
                    //Reflect.deleteProperty(item, 'policyInfo')
                })
            })

            await Promise.all(uploadTasks)

            await dataProvider.contractProvider.createPageBuildContract(awaitCreateContracts).bind(ctx).then(dataList => {
                dataList.forEach(item => {
                    contractFsmEventHandler.initContractFsm(item.toObject())
                })
                ctx.success({
                    oldContracts: oldContracts.map(t => {
                        return {contractId: t.contractId, resourceId: t.resourceId}
                    }),
                    newContracts: dataList.map(t => {
                        return {contractId: t._id.toString(), resourceId: t.resourceId}
                    })
                })
            }).catch(ctx.error)
        }

        /**
         * 给合同签协议
         * @param ctx
         * @returns {Promise.<void>}
         */
        async signingLicenses(ctx) {
            let contractId = ctx.checkBody('contractId').exist().isContractId().value
            let eventId = ctx.checkBody('eventId').exist().isEventId().value
            let licenseIds = ctx.checkBody('licenseIds').exist().isArray().len(1).value
            let userId = ctx.request.userId

            ctx.allowContentType({type: 'json'}).validate()

            let contractInfo = await dataProvider.contractProvider.getContract({_id: contractId}).then(app.toObject)

            if (!contractInfo || contractInfo.partyTwo !== userId) {
                ctx.error({msg: '未找到有效的合同'})
            }

            if (contractInfo.status === 4 || contractInfo.status === 5) {
                ctx.error({msg: '合同已经终止', data: {contractStatus: contractInfo.status}})
            }

            let eventModel = contractInfo.policySegment.fsmDescription.find(item => {
                return item.event.eventId === eventId && item.event.type === 'signing' ||
                    item.currentState === contractInfo.fsmState && item.event.type === 'compoundEvents' &&
                    item.event.params.some(subEvent => subEvent.eventId === eventId && subEvent.type === 'signing')
            })

            if (!eventModel) {
                ctx.error({msg: '未找到事件'})
            }

            eventModel = eventModel.event

            if (eventModel.type === 'compoundEvents') {
                let eventParams = eventModel.params.find(subEvent => subEvent.eventId === eventId).params
                let diffLicenseIds = _.difference(eventParams, licenseIds)
                if (diffLicenseIds.length || eventParams.length !== licenseIds.length) {
                    ctx.error({
                        msg: '参数licenseIds与事件中的协议参数不匹配', data: {
                            contractLicenseIds: eventParams, licenseIds
                        }
                    })
                }
            }

            await contractFsmEventHandler.contractEventExecute(contractInfo, eventModel, eventId).then(data => {
                ctx.success(data)
            }).catch(err => ctx.error(err))
        }

        /**
         * 是否能执行指定事件
         * @returns {Promise<void>}
         */
        async isCanExecEvent(ctx) {

            let contractId = ctx.checkQuery('contractId').exist().isContractId().value
            let eventId = ctx.checkQuery('eventId').exist().value

            ctx.validate()

            let contractInfo = await dataProvider.contractProvider.getContractById(contractId)

            if (!contractInfo) {
                ctx.error({msg: '未找到合同'})
            }

            let result = await contractFsmEventHandler.isCanExecEvent(eventId, contractInfo)

            ctx.success({contractInfo, eventId, isCanExec: result})
        }
    }
}

const buildReturnContract = (data) => {
    if (data) {
        data = data.toObject()
        Reflect.deleteProperty(data, 'languageType')
        Reflect.deleteProperty(data, 'policyCounterpart')
    }
    return data
}