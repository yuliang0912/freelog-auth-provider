'use strict';

module.exports = app => {
    /**
     * 资源合约相关API
     */
    app.resources('/v1/contracts', '/v1/contracts', app.controller.contract.v1)

    app.resources('/v1/contracts/target', '/v1/contracts/target', app.controller.contract.target.v1)
};
