'use strict';

module.exports = app => {

    const controller = app.controller.contract
    /**
     * 资源合约相关REST-API
     */
    app.resources('/v1/contracts', '/v1/contracts', controller.v1)

    //消费客户的presentable合约列表
    app.get('/v1/contracts/user/:userId', controller.v1.userContracts)

    //节点商的resource合约列表
    app.get('/v1/contracts/node/:nodeId', controller.v1.nodeContracts)

    //资源商引用其他资源的resource合约列表
    app.get('/v1/contracts/author/:authorId', controller.v1.authorContracts)

    app.post('/v1/contracts/test', controller.v1.testContractFsm)
};
