"use strict"

module.exports = function(app, settings){
	var debug 		= require('debug')('authub')
		, logger 		= require("log4js").getLogger('authub')
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url')
		, validator = require('validator');

	var router 		= express.Router();
	var dbs 			= app.locals.dbs;

	router.get("/activate", function(req, res, next){
		var account = res.locals.account.name;
		//Activate user, get identity from res.locals.vericode_token;
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
			dbs.connect(account, function(err, db){
	      if(err){
	        logger.error(err);
	        return res.status(500);
	      }

	      db.model('User')
	        .findOne({ email: identity })
	        .then(function(instance){
						debug("user instance: ", instance);
						if(!instance){
							// return res.status(403).json({
							// 	success: false,
							// 	errCode: 403,
							// 	errMsg: "invalid_identity"
							// });
							throw new Error("invalid_identity");
						}else{
							instance.activated = true;
							return instance.save();
						}
	        })
					.then(function(){
						return res.status(200).json({
	            success: true
	          });
					})
	        .catch(function(err){
						debug(err);
	          logger.error(err);
	          return res.status(500).json({
							success: false,
							errCode: 500,
							errMsg: err.message
						});
	        });
	    });
		}else{
			//It's mobilephone validation
			//TODO: should validate mobilephone
			dbs.connect(account, function(err, db){
	      if(err){
	        logger.error(err);
	        return res.status(500);
	      }

	      db.model('User')
	        .findOne({ mobile: identity })
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
		}
	});
  /**
   * Create an client - need multi factor authentication
   */
  router.post("/", function(req, res, next){
    let account = res.locals.account.name;

    //Should validate user model submitted in req.body

    dbs.connect(account, function(err, db){
      if(err){
        logger.error(err);
        return res.status(500);
      }

      db.model('User')
        .create(req.body)
        .then(function(user){
          return res.status(201).json({
            success: true,
            data: user
          });
        })
        .catch(function(err){
          if(err){
            logger.error(err);
            return res.status(500);
          }
          return res.status(200);
        });
    });

  });
	//
	// router.post("/bind", function(req, res, next){
	// 	let bindType = req.body.bind_type;		// email, mobile, etc.
	// 	let identity = req.body.
	//
	// });

	app.use('/users', router);
}
