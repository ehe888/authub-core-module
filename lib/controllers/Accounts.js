"use strict"

module.exports = function(app, settings){
	var debug 		= require('debug')('authub')
		, log4js		= require('log4js')
		, logger 		= log4js.getLogger()
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url')
		, validator = require('validator');

	var router 		= express.Router();
	var dbs 			= app.locals.dbs;


	router.get("/activate", function(req, res, next){
		var account = req.x_account_config.name;
		//Activate administrator user, get identity from res.locals.vericode_token;
		var vericodeToken = res.locals.vericode_token;
		debug("get vericode token: ", vericodeToken);
		var identity = vericodeToken.identity;
		if(!identity){
			return res.status(403).json({
				success: false,
				errCode: 403,
				errMsg: "invalid_identity"
			});
		}

		if(validator.isEmail(identity)){
			//It's email verification
			dbs.connectToMaster(function(err, db){
	      if(err){
	        logger.error(err);
	        return res.status(500);
	      }

	      db.model('Account')
	        .findOne({ email: identity })
	        .then(function(instance){
						if(!instance){
							return res.status(403).json({
								success: false,
								errCode: 403,
								errMsg: "invalid_identity"
							});
						}
						instance.activated = true;

						return instance.save();
	        })
					.then(function(){
						return res.status(200).json({
	            success: true
	          });
					})
	        .catch(function(err){
	          logger.error(err);
	          return res.status(500).json({
							success: false,
							errCode: 500,
							errMsg: err.message
						});
	        });
	    });
		}else{
			return res.status(501).json({
				success: false,
				errMsg: "not_supported"
			})
		}
	});

	app.use('/accounts', router);
}
