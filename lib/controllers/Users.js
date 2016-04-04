"use strict"

module.exports = function(app, settings){
	var debug 		= require('debug')('authub')
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url');

	var router 		= express.Router();
	var dbs 			= app.locals.dbs;
	
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

	app.use('/users', router);
}
