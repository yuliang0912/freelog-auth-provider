'use strict';

module.exports = app => {

    const {router, controller} = app;

    //创建pb资源的合同
    router.post('/v1/contracts/createPageBuildContracts', controller.contract.v1.createPageBuildContracts)

    //消费客户的presentable合约列表
    router.get('/v1/contracts/user/:userId', controller.contract.v1.userContracts)

    //节点商的resource合约列表
    router.get('/v1/contracts/node/:nodeId', controller.contract.v1.nodeContracts)

    router.get('/v1/contracts/list', controller.contract.v1.list)

    //资源商引用其他资源的resource合约列表
    router.get('/v1/contracts/author/:authorId', controller.contract.v1.authorContracts)

    router.post('/v1/contracts/test', controller.contract.v1.testContractFsm)
    router.post('/v1/contracts/signingLicenses', controller.contract.v1.signingLicenses)

    /**
     * 获取合同记录
     */
    router.get('/v1/contracts/contractRecords', controller.contract.v1.contractRecords)
    router.get('/v1/contracts/isCanExecEvent', controller.contract.v1.isCanExecEvent)

    //请求获取presentable资源
    router.get('/v1/presentables/resource/:presentableId.:extName', controller.auth.v1.presentable)
    router.get('/v1/presentables/resource/:presentableId', controller.auth.v1.presentable)

    //直接请求授权资源
    router.get('/v1/auths/resource/:resourceId.:extName', controller.auth.v1.resource)
    router.get('/v1/auths/resource/:resourceId', controller.auth.v1.resource)
    router.get('/v1/auths/presentablePolicyIdentityAuthentication/:presentableId', controller.auth.v1.presentablePolicyIdentityAuthentication)

    /**
     * 资源合约相关REST-API
     */
    router.resources('/v1/contracts', '/v1/contracts', controller.contract.v1)
};
