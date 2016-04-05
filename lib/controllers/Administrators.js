"use strict"

module.exports = function(app, settings){
	var debug 		= require('debug')('authub')
		, log4js		= require('log4js')
		, logger 		= log4js.getLogger()
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url');

	var router 		= express.Router();
	var dbs 			= app.locals.dbs;

  /**
   * Create an administrator user account - need multi factor authentication
   */
  router.post("/", function(req, res, next){
    var account = res.locals.account.name;

    dbs.connect(account, function(err, db){
      if(err){
        logger.error(err);
        return res.status(500);
      }

      db.model('Administrator')
        .create(req.body)
        .then(function(instance){
          return res.status(201).json({
            success: true,
            data: instance
          });
        })
        .catch(function(err){
          logger.error(err);
          return res.status(500);
        });
    });
  });

	app.use('/administrators', router);
}
