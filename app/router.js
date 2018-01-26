'use strict';

module.exports = app => {

    const controller = app.controller.contract

    //创建pb资源的合同
    app.post('/v1/contracts/createPageBuildContracts', controller.v1.createPageBuildContracts)

    //消费客户的presentable合约列表
    app.get('/v1/contracts/user/:userId', controller.v1.userContracts)

    //节点商的resource合约列表
    app.get('/v1/contracts/node/:nodeId', controller.v1.nodeContracts)

    app.get('/v1/contracts/list', controller.v1.list)

    //资源商引用其他资源的resource合约列表
    app.get('/v1/contracts/author/:authorId', controller.v1.authorContracts)

    app.post('/v1/contracts/test', controller.v1.testContractFsm)
    app.post('/v1/contracts/signingLicenses', controller.v1.signingLicenses)


    /**
     * 获取合同记录
     */
    app.get('/v1/contracts/contractRecords', controller.v1.contractRecords)

    app.get('/v1/contracts/isCanExecEvent', controller.v1.isCanExecEvent)

    /**
     * 授权
     */
    app.get('/v1/auths/presentableAuthorization', app.controller.home.index.presentableAuthorization)

    //请求获取presentable资源
    app.get('/v1/presentables/resource/:presentableId.:extName', app.controller.auth.v1.presentable)
    app.get('/v1/presentables/resource/:presentableId', app.controller.auth.v1.presentable)

    //直接请求资源
    app.get('/v1/auths/resource/:resourceId.:extName', app.controller.auth.v1.resource)
    app.get('/v1/auths/resource/:resourceId', app.controller.auth.v1.resource)

    /**
     * 资源合约相关REST-API
     */
    app.resources('/v1/contracts', '/v1/contracts', controller.v1)
};
