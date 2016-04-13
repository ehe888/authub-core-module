"use strict"

module.exports = function(app, options){
	var debug 		= require('debug')('authub')
    , log4js    = require('log4js')
    , logger    = log4js.getLogger()
		, express 	= require('express')
		, util 			= require('util')
		, url 			= require('url')
    , jwt 			= require('jsonwebtoken')
    , _         = require("lodash");

	let router 		= express.Router();
	let dbs 			= app.locals.dbs;

	router.use("/activate", function(req, res, next){
		return res.status(200).json({
			success: true
		});
	});

  router.post("/token", function(req, res, next){
		let userType 					= req.body.user_type || 'user'; //Two types supported: admin or user
    let account           = res.locals.account;
    let accountName       = account.name;
    let accessTokenSecret = account.accessToken.secret;
    let accessTokenExpiresIn  = account.accessToken.expiresIn;
    let accessTokenAlgorithm = account.accessToken.algorithm;
    let refreshTokenSecret    = account.refreshToken.secret;
    let refreshTokenExpiresIn = account.refreshToken.expiresIn;
    let refreshTokenAlgorithm = account.refreshToken.algorithm;

    //THe POST request put all parameters by x-www-form-urlencoded
    switch(req.body.grant_type){
      case "code":
        var authCode 		= req.body.code
          ,clientId 		= req.body.client_id
          ,clientSecret = req.body.client_secret;

        return res.status(501).json({
            success: false,
            errCode: 501,
            errMsg: "auth_type_not_implemented_yet"
        });

        break;
      case "password":
        //TODO: validate the request is from a trusted client's
        var username = req.body.username
          ,password = req.body.password
          ,clientId = req.body.client_id;

				if(userType === 'admin'){
					dbs.connect(accountName, function(err, db){
						if(err){
							logger.error(err);
							return res.status(500).json({
								success: false,
								errCode: 500,
								errMsg: err.messag,
								internalError: err
							});
						}
						db.model('Administrator').getAuthenticated(username, password, function(err, user, reason){
									if(err){
										logger.error(err);
										return res.status(403).json({
											success: false,
											errCode: 403,
											errMsg: err.message,
											internalError: err
										});
									}

									if(user !== null){ //success
										//Generate JWT token
										var claims = {
											sub: user.username,
											ut: 'admin',
											iat: _.now(),
											exp: _.now() + accessTokenExpiresIn * 1000,
											iss: req.get('host')
										};
										var accessToken = jwt.sign(claims, accessTokenSecret
																		,{
																				algorithms: [ accessTokenAlgorithm ]
																				,expiresIn: accessTokenExpiresIn
																		});

										//Set refresh expires_in
										claims.exp = _.now() + refreshTokenExpiresIn * 1000;

										var refreshToken = jwt.sign(claims, refreshTokenSecret
																		,{
																				algorithms: [ refreshTokenAlgorithm ]
																				,expiresIn: refreshTokenExpiresIn
																		});
										return res.json({
											success: true
											,access_token: accessToken
											,refresh_token: refreshToken
										});
									}else{
										return res.json({
											success: false,
											errCode: '401',
											errMsg: 'authentication_failed'
										});
									}
								});
					});
				}else{
					//validate username and password
					dbs.connect(accountName, function(err, db){
						if(err){
							logger.error(err);
							return res.status(500).json({
								success: false,
								errCode: 500,
								errMsg: err.messag,
								internalError: err
							});
						}
						db.model('User').getAuthenticated(username, password, function(err, user, reason){
									if(err){
										logger.error(err);
										return res.status(403).json({
											success: false,
											errCode: 403,
											errMsg: err.message
										});
									}

									if(user !== null){ //success
										//Generate JWT token
										var claims = {
											sub: user.username,
											staff: user.staff,
											iat: _.now(),
											exp: _.now() + accessTokenExpiresIn * 1000,
											iss: req.get('host'),
											scope: ['user']
										};
										var accessToken = jwt.sign(claims, accessTokenSecret
																		,{
																				algorithms: [ accessTokenAlgorithm ]
																				,expiresIn: accessTokenExpiresIn
																		});

										//Set refresh expires_in
										claims.exp = _.now() + refreshTokenExpiresIn * 1000;

										var refreshToken = jwt.sign(claims, refreshTokenSecret
																		,{
																				algorithms: [ refreshTokenAlgorithm ]
																				,expiresIn: refreshTokenExpiresIn
																		});
										return res.json({
											success: true
											,access_token: accessToken
											,refresh_token: refreshToken
										});
									}else{
										return res.json({
											success: false,
											errCode: '401',
											errMsg: 'authentication_failed'
										});
									}
								});
					});
				}
        break;
      case 'client_credential':
        var clientId     = req.body.client_id
          , clientSecret = req.body.client_secret;

        dbs.connect(accountName, function(err, db){
          if(err){
            logger.error(err);
            return res.status(500).json({
              success: false,
              errCode: 500,
              errMsg: err.messag,
              internalError: err
            });
          }
          db.model('Client')
            .findById(clientId, function(err, client){
              if(err){
                logger.error(err);
                return res.status(500).json({
                  success: false,
                  errCode: 500,
                  errMsg: err.messag,
                  internalError: err
                });
              }

              if(!client){
                return res.status(401).json({
                  success: false,
                  errCode: 401,
                  errMsg: "invalid_client_credential"
                });
              }

              client.compareClientSecrect(clientSecret, function(err, isMatched){
                if(isMatched === true){
                  //Generate accessToken and refreshToken
                  debug(_.now(), _.now() + accessTokenExpiresIn * 1000);

                  var claims = {
                    sub: client.name,
                    client: client._id,
										ut: 'client',
                    iss: req.get('host'),
										iat: _.now(),
										exp: _.now() + accessTokenExpiresIn * 1000,
                    scope: ['client']
                  };
                  var accessToken = jwt.sign(claims, accessTokenSecret
                                  ,{
                                      algorithms: [ accessTokenAlgorithm ]
                                      ,expiresIn: accessTokenExpiresIn
                                  });
									//Set refresh expires_in
									claims.exp = _.now() + refreshTokenExpiresIn * 1000;
                  var refreshToken = jwt.sign(claims, refreshTokenSecret
                                  ,{
                                      algorithms: [ refreshTokenAlgorithm ]
                                      ,expiresIn: refreshTokenExpiresIn
                                  });
                  return res.json({
                    success: true
                    ,access_token: accessToken
                    ,refresh_token: refreshToken
                  });
                }else{
                  res.status(401).json({
                    success: false,
                    errCode: 401,
                    errMsg: 'invalid_client_credential'
                  });
                }
              })
            });
        });

        break;
      default:
        return res.json({
          success: false,
          message: "Not supported grant type"
        });
    }
  });

	app.use('/oauth2', router);
}
